package com.guardrail.ragebait.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.SystemClock

/**
 * Dispatches the "swipe up to next video" gesture, with guardrails of its
 * own:
 *  - a cooldown between auto-skips, so a burst of matches can't machine-gun
 *    the feed (which both feels broken and looks bot-like to TikTok);
 *  - a consecutive-skip cap with a pause, so a feed full of matches can't
 *    put the service into an endless skip loop.
 *
 * Swipe coordinates are fractions of the *current* display bounds, queried
 * per gesture — correct on the Z Fold 6 whether folded or unfolded.
 */
class SkipController(private val service: AccessibilityService) {

    private var lastSkipAtMs = 0L
    private var consecutiveSkips = 0
    private var pausedUntilMs = 0L

    /** Call when a new video arrives that we did NOT skip (a human scrolled). */
    fun noteHumanProgress() {
        consecutiveSkips = 0
    }

    /**
     * Try to skip the current video. Returns true if the gesture was
     * dispatched. [force] relaxes the cooldown for explicit 😤-button taps —
     * a human pressing a button is not a bot pattern.
     */
    fun maybeSkip(force: Boolean = false): Boolean {
        val now = SystemClock.uptimeMillis()

        if (!force) {
            if (now < pausedUntilMs) return false
            if (now - lastSkipAtMs < COOLDOWN_MS) return false
            if (consecutiveSkips >= MAX_CONSECUTIVE) {
                pausedUntilMs = now + PAUSE_AFTER_BURST_MS
                consecutiveSkips = 0
                return false
            }
        }

        val bounds = Displays.bounds(service)
        val x = bounds.width() * 0.5f
        val path = Path().apply {
            moveTo(x, bounds.height() * 0.72f)
            lineTo(x, bounds.height() * 0.30f)
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, SWIPE_DURATION_MS))
            .build()

        val dispatched = service.dispatchGesture(gesture, null, null)
        if (dispatched) {
            lastSkipAtMs = now
            if (!force) consecutiveSkips++
        }
        return dispatched
    }

    companion object {
        private const val COOLDOWN_MS = 1600L
        private const val MAX_CONSECUTIVE = 5
        private const val PAUSE_AFTER_BURST_MS = 10_000L
        private const val SWIPE_DURATION_MS = 220L
    }
}
