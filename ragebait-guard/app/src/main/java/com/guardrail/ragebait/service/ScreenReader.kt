package com.guardrail.ragebait.service

import android.view.accessibility.AccessibilityNodeInfo
import com.guardrail.ragebait.model.VideoSnapshot
import java.util.ArrayDeque

/**
 * Walks TikTok's accessibility node tree and distills it into a
 * [VideoSnapshot]. TikTok's view IDs are obfuscated and shuffle between
 * releases, so this intentionally relies on *content* heuristics (visible
 * text, '@handles', '#hashtags') rather than view IDs.
 */
object ScreenReader {

    /** Global, Asian-market, and Lite package names. */
    private val TIKTOK_PACKAGES = setOf(
        "com.zhiliaoapp.musically",
        "com.ss.android.ugc.trill",
        "com.zhiliaoapp.musically.go",
    )

    private val HASHTAG = Regex("#[\\p{L}\\p{N}_]+")
    private val HANDLE = Regex("^@[\\w.]{2,40}$")

    private const val MAX_NODES = 400

    fun isTikTok(packageName: CharSequence?): Boolean =
        packageName != null && packageName.toString() in TIKTOK_PACKAGES

    data class Capture(
        val snapshot: VideoSnapshot,
        /**
         * An EditText on screen means the comment sheet, search, or a reply
         * box is open — auto-swiping there would scroll the wrong surface,
         * so the service holds fire.
         */
        val hasEditText: Boolean,
    )

    fun capture(root: AccessibilityNodeInfo?): Capture {
        if (root == null || !isTikTok(root.packageName)) {
            return Capture(VideoSnapshot.EMPTY, hasEditText = false)
        }

        val texts = ArrayList<String>()
        var creator: String? = null
        var hasEditText = false

        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        var visited = 0

        while (queue.isNotEmpty() && visited < MAX_NODES) {
            val node = queue.poll() ?: continue
            visited++

            if (node.isVisibleToUser) {
                val className = node.className?.toString().orEmpty()
                if (className.contains("EditText")) hasEditText = true

                collectText(node.text, texts)?.let { if (creator == null) creator = it }
                collectText(node.contentDescription, texts)?.let {
                    if (creator == null) creator = it
                }
            }

            for (i in 0 until node.childCount) {
                node.getChild(i)?.let(queue::add)
            }
        }

        val hashtags = texts
            .flatMap { HASHTAG.findAll(it.lowercase()).map(MatchResult::value) }
            .distinct()

        val snapshot = VideoSnapshot(
            creator = creator,
            hashtags = hashtags,
            texts = texts,
            capturedAtMs = System.currentTimeMillis(),
        )
        return Capture(snapshot, hasEditText)
    }

    /** Adds non-blank text to [sink]; returns the value when it is an @handle. */
    private fun collectText(chars: CharSequence?, sink: MutableList<String>): String? {
        val value = chars?.toString()?.trim().orEmpty()
        if (value.isEmpty() || value.length > 500) return null
        sink.add(value)
        return value.takeIf { HANDLE.matches(it) }
    }
}
