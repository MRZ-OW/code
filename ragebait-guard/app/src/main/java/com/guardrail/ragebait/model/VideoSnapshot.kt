package com.guardrail.ragebait.model

/**
 * Everything we could read off the screen for the video currently in view:
 * creator handle, hashtags, and all visible text (caption, sticker text
 * surfaced through accessibility nodes, UI labels).
 */
data class VideoSnapshot(
    val creator: String?,
    val hashtags: List<String>,
    val texts: List<String>,
    val capturedAtMs: Long,
) {
    /** Lower-cased blob the classifier matches terms against. */
    val joinedText: String = texts.joinToString("\n").lowercase()

    /**
     * Stable-enough identity for "is this still the same video?" checks, so we
     * never double-skip or double-learn one video. Like/comment counters tick
     * while a video plays, so numeric-only chunks are excluded.
     */
    val signature: String =
        (creator ?: "") + "|" + texts.asSequence()
            .filter { it.any(Char::isLetter) }
            .sorted()
            .joinToString("|")
            .take(400)

    fun isEmpty(): Boolean = creator == null && texts.isEmpty()

    companion object {
        val EMPTY = VideoSnapshot(null, emptyList(), emptyList(), 0L)
    }
}
