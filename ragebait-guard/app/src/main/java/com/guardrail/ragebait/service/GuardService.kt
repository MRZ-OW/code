package com.guardrail.ragebait.service

import android.accessibilityservice.AccessibilityService
import android.content.res.Configuration
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import com.guardrail.ragebait.R
import com.guardrail.ragebait.classify.Classifier
import com.guardrail.ragebait.classify.LlmJudge
import com.guardrail.ragebait.classify.TopicPacks
import com.guardrail.ragebait.data.GuardPrefs
import com.guardrail.ragebait.data.Logs
import com.guardrail.ragebait.data.TrainingStore
import com.guardrail.ragebait.model.VideoSnapshot

/**
 * The guard itself. While TikTok is in the foreground it:
 *  1. reads the visible video's caption/hashtags/creator via accessibility
 *     nodes (nothing is recorded off-device),
 *  2. shows the draggable 😤 flag button,
 *  3. auto-swipes past videos matching the blocklist, topic packs, learned
 *     terms, or blocked creators.
 *
 * 😤 tap = record the current video as a training example (terms seen in 3+
 * flagged videos start auto-skipping; creators flagged twice get blocked),
 * then swipe past it.
 */
class GuardService : AccessibilityService() {

    private lateinit var prefs: GuardPrefs
    private lateinit var training: TrainingStore
    private lateinit var skips: SkipController
    private lateinit var llm: LlmJudge
    private lateinit var ocr: OcrReader
    private var overlay: FlagButtonOverlay? = null

    private val handler = Handler(Looper.getMainLooper())
    private var evaluateQueued = false

    private var currentSnapshot: VideoSnapshot? = null
    private var lastSignature: String? = null
    private var lastActedSignature: String? = null
    private var lastJudgedSignature: String? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        Logs.init(this)
        try {
            prefs = GuardPrefs(this)
            training = TrainingStore(this)
            skips = SkipController(this)
            llm = LlmJudge(prefs)
            ocr = OcrReader()
            overlay = FlagButtonOverlay(this, prefs, onFlag = ::onFlagPressed)
            Logs.i(TAG, "Service connected")
        } catch (t: Throwable) {
            Logs.e(TAG, "onServiceConnected failed", t)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // This runs on the main thread; an escaping exception crashes the
        // whole app. Contain everything.
        try {
            val pkg = event.packageName

            // Window switches: keep the overlay in sync with TikTok visibility.
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
                event.eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED
            ) {
                when {
                    ScreenReader.isTikTok(pkg) -> overlay?.show()
                    // Our own overlay window also fires state events.
                    pkg != null && pkg.toString() != packageName -> overlay?.hide()
                }
            }

            if (!ScreenReader.isTikTok(pkg)) return
            scheduleEvaluate()
        } catch (t: Throwable) {
            Logs.e(TAG, "onAccessibilityEvent failed", t)
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // Z Fold 6 fold/unfold (or rotation) — re-anchor the button on the
        // new display bounds.
        try {
            overlay?.reposition()
            Logs.i(TAG, "Config changed; overlay repositioned")
        } catch (t: Throwable) {
            Logs.e(TAG, "onConfigurationChanged failed", t)
        }
    }

    override fun onInterrupt() = Unit

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        overlay?.hide()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        overlay?.hide()
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    // ------------------------------------------------------------------

    /** Coalesce the event firehose into one evaluation per DEBOUNCE window. */
    private fun scheduleEvaluate() {
        if (evaluateQueued) return
        evaluateQueued = true
        handler.postDelayed({
            evaluateQueued = false
            evaluate()
        }, DEBOUNCE_MS)
    }

    private fun evaluate() {
        try {
            evaluateInner()
        } catch (t: Throwable) {
            Logs.e(TAG, "evaluate failed", t)
        }
    }

    private fun evaluateInner() {
        val root = rootInActiveWindow ?: return
        if (!ScreenReader.isTikTok(root.packageName)) {
            overlay?.hide()
            return
        }
        overlay?.show()

        val capture = ScreenReader.capture(root)
        val snapshot = capture.snapshot
        if (snapshot.isEmpty()) return

        currentSnapshot = snapshot

        // Same video we already acted on (skip dispatched, animation still
        // settling) — don't act twice.
        if (snapshot.signature == lastActedSignature) return

        if (snapshot.signature != lastSignature) {
            lastSignature = snapshot.signature
            skips.noteHumanProgress()
        }

        if (!prefs.guardEnabled) return
        // Comment sheet / search / reply box open: a swipe would scroll the
        // wrong surface.
        if (capture.hasEditText) return

        val blockedTerms = prefs.blockedTerms + TopicPacks.termsFor(prefs.enabledPackIds)
        val verdict = Classifier.evaluate(
            snapshot = snapshot,
            blockedTerms = blockedTerms,
            learnedTerms = training.activeLearnedTerms().keys,
            blockedCreators = prefs.blockedCreators,
        )

        if (verdict.shouldSkip) {
            if (skips.maybeSkip()) {
                lastActedSignature = snapshot.signature
                prefs.incrementSkipped()
                Logs.i(TAG, "Skipped (list): ${reason(verdict)}")
            }
            return
        }

        // Local list didn't match. Escalate once per video: screenshot OCR
        // (on-device, catches text baked into the frames), re-check the list
        // for free, and only then ask the AI judge if it's enabled.
        if (!prefs.llmEnabled) return
        if (snapshot.signature == lastJudgedSignature) return
        lastJudgedSignature = snapshot.signature
        val sig = snapshot.signature
        Logs.i(TAG, "No list match → escalating to OCR/AI for @${snapshot.creator ?: "?"}")

        llm.cachedVerdict(sig)?.let { cached ->
            if (cached) skipIfStillShowing(sig)
            return
        }

        ocr.read(this) { ocrText ->
            try {
                // Only act if the same video is still on screen after OCR.
                if (currentSnapshot?.signature != sig) return@read
                val enriched =
                    if (ocrText.isNullOrBlank()) snapshot
                    else snapshot.copy(texts = snapshot.texts + ocrText)

                val ocrVerdict = Classifier.evaluate(
                    snapshot = enriched,
                    blockedTerms = blockedTerms,
                    learnedTerms = training.activeLearnedTerms().keys,
                    blockedCreators = prefs.blockedCreators,
                )
                if (ocrVerdict.shouldSkip) {
                    if (skipIfStillShowing(sig)) Logs.i(TAG, "Skipped (OCR): ${reason(ocrVerdict)}")
                    return@read
                }

                llm.judgeAsync(sig, enriched.joinedText, blockedTerms) { isBad ->
                    if (isBad) skipIfStillShowing(sig)
                }
            } catch (t: Throwable) {
                Logs.e(TAG, "OCR/LLM stage failed", t)
            }
        }
    }

    private fun reason(v: Classifier.Verdict): String =
        v.matchedCreator?.let { "creator $it" }
            ?: v.matchedTerms.joinToString(", ").ifEmpty { "matched" }

    /**
     * Async verdicts race against the user's own scrolling: only swipe if
     * the judged video is still the one on screen and the guard is still on.
     */
    private fun skipIfStillShowing(signature: String): Boolean {
        if (!prefs.guardEnabled) return false
        if (currentSnapshot?.signature != signature) return false
        if (lastActedSignature == signature) return false
        if (skips.maybeSkip()) {
            lastActedSignature = signature
            prefs.incrementSkipped()
            return true
        }
        return false
    }

    /** 😤 button tapped: learn from this video, then swipe past it. */
    private fun onFlagPressed() {
        try {
            val snapshot = currentSnapshot ?: return
            val result = training.recordFlag(snapshot)
            prefs.incrementFlagged()
            Logs.i(TAG, "Flagged video (creator=${snapshot.creator ?: "?"})")

            result.newlyBlockedCreator?.let { creator ->
                prefs.addBlockedCreator(creator)
                toast(getString(R.string.toast_creator_blocked, creator))
                Logs.i(TAG, "Auto-blocked creator: $creator")
            }
            if (result.newlyLearnedTerms.isNotEmpty()) {
                toast(
                    getString(
                        R.string.toast_terms_learned,
                        result.newlyLearnedTerms.joinToString(", "),
                    )
                )
                Logs.i(TAG, "Learned terms: ${result.newlyLearnedTerms.joinToString(", ")}")
            }

            overlay?.flashFlagged()
            lastActedSignature = snapshot.signature
            skips.maybeSkip(force = true)
        } catch (t: Throwable) {
            Logs.e(TAG, "onFlagPressed failed", t)
        }
    }

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    companion object {
        private const val TAG = "GuardService"
        private const val DEBOUNCE_MS = 350L
    }
}
