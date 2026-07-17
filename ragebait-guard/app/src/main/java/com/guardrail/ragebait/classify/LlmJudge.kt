package com.guardrail.ragebait.classify

import android.os.Handler
import android.os.Looper
import com.guardrail.ragebait.data.GuardPrefs
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Optional second opinion from a fast, cheap LLM (Gemini Flash-Lite by
 * default). Called only when the local blocklist did NOT match: the model
 * sees the screen text (captions + hashtags + OCR) and the blocked-topic
 * list, and answers Yes/No — "is this related to any blocked topic, or
 * obvious rage-bait?".
 *
 * Design constraints, in order:
 *  - FAIL OPEN: any error, timeout, or missing key means "No" — the guard
 *    must never block scrolling because a server hiccuped.
 *  - One request in flight at a time; one attempt per video (verdicts are
 *    cached by video signature, max 300 entries LRU).
 *  - Answer is a single word, so latency ≈ time-to-first-token (~0.3-1 s)
 *    and cost ≈ prompt tokens only (~$0.00004/video on Flash-Lite).
 */
class LlmJudge(private val prefs: GuardPrefs) {

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val inFlight = AtomicBoolean(false)

    private val verdicts = object : LinkedHashMap<String, Boolean>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Boolean>) =
            size > 300
    }

    /** Cached verdict for this video, if we already judged it. */
    fun cachedVerdict(signature: String): Boolean? =
        synchronized(verdicts) { verdicts[signature] }

    /**
     * Judge asynchronously; [onVerdict] fires on the main thread ONLY for a
     * successful "Yes"/"No" — errors are swallowed (fail-open).
     */
    fun judgeAsync(
        signature: String,
        screenText: String,
        blockedTopics: Collection<String>,
        onVerdict: (Boolean) -> Unit,
    ) {
        if (!prefs.llmEnabled || prefs.llmApiKey.isBlank()) return
        synchronized(verdicts) {
            verdicts[signature]?.let { cached ->
                mainHandler.post { onVerdict(cached) }
                return
            }
        }
        if (!inFlight.compareAndSet(false, true)) return

        val apiKey = prefs.llmApiKey
        val model = prefs.llmModel
        executor.execute {
            val verdict = try {
                call(apiKey, model, screenText, blockedTopics)
            } catch (_: Exception) {
                null
            } finally {
                inFlight.set(false)
            }
            if (verdict != null) {
                synchronized(verdicts) { verdicts[signature] = verdict }
                mainHandler.post { onVerdict(verdict) }
            }
        }
    }

    // ------------------------------------------------------------------

    private fun call(
        apiKey: String,
        model: String,
        screenText: String,
        topics: Collection<String>,
    ): Boolean? {
        val prompt = buildString {
            append("You are filtering a TikTok feed for someone avoiding rage-bait. ")
            append("Below is text captured from the video on screen ")
            append("(caption, hashtags, on-screen OCR text).\n")
            append("Blocked topics: ")
            append(topics.joinToString(", "))
            append(".\nReply with exactly one word. Reply \"Yes\" if the video is ")
            append("related to any blocked topic, or is obvious rage-bait or ")
            append("engagement-bait designed to provoke anger or arguments. ")
            append("Otherwise reply \"No\".\n\n--- screen text ---\n")
            append(screenText.take(1500))
        }

        // First attempt disables Gemini 2.5 "thinking" for minimum latency;
        // if the model rejects that config, retry once without it.
        return request(apiKey, model, prompt, includeThinkingConfig = true)
            ?: request(apiKey, model, prompt, includeThinkingConfig = false)
    }

    private fun request(
        apiKey: String,
        model: String,
        prompt: String,
        includeThinkingConfig: Boolean,
    ): Boolean? {
        val generationConfig = JSONObject().put("temperature", 0)
        if (includeThinkingConfig) {
            generationConfig
                .put("maxOutputTokens", 8)
                .put("thinkingConfig", JSONObject().put("thinkingBudget", 0))
        }
        val body = JSONObject()
            .put(
                "contents",
                JSONArray().put(
                    JSONObject()
                        .put("role", "user")
                        .put(
                            "parts",
                            JSONArray().put(JSONObject().put("text", prompt)),
                        )
                ),
            )
            .put("generationConfig", generationConfig)

        val url = URL("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent")
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 2000
            connection.readTimeout = 4000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("x-goog-api-key", apiKey)
            connection.outputStream.use { it.write(body.toString().toByteArray()) }

            if (connection.responseCode !in 200..299) return null

            val response = connection.inputStream.bufferedReader().readText()
            val text = JSONObject(response)
                .optJSONArray("candidates")?.optJSONObject(0)
                ?.optJSONObject("content")
                ?.optJSONArray("parts")?.optJSONObject(0)
                ?.optString("text") ?: return null
            return text.trim().lowercase().startsWith("yes")
        } finally {
            connection.disconnect()
        }
    }
}
