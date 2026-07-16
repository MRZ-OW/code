package com.guardrail.ragebait.classify

import com.guardrail.ragebait.model.VideoSnapshot

/**
 * Turns a flagged video into candidate terms for learning. Pure Kotlin so it
 * is unit-testable on the JVM.
 */
object Tokenizer {

    /** Letters-only words, 4+ chars — drops counters ("12.3K"), emoji, digits. */
    private val WORD = Regex("[\\p{L}']{4,}")

    /**
     * English filler plus TikTok UI chrome that shows up as accessibility text
     * on every single video. Anything here must never be "learned" as a
     * rage-bait signal.
     */
    private val STOPWORDS = setOf(
        // common English
        "that", "this", "with", "from", "have", "will", "your", "what", "when",
        "where", "which", "their", "there", "them", "then", "than", "they",
        "were", "been", "being", "just", "like", "over", "into", "only",
        "some", "such", "very", "would", "could", "should", "about", "after",
        "before", "because", "while", "these", "those", "does", "doing",
        "don't", "can't", "won't", "it's", "i'm", "you're", "she's", "he's",
        "we're", "they're", "isn't", "aren't", "wasn't", "didn't", "doesn't",
        "more", "most", "much", "many", "make", "made", "want", "know", "even",
        "still", "really", "going", "gonna", "people", "everyone", "someone",
        "something", "anything", "nothing", "every", "here", "also", "back",
        "down", "well", "first", "never", "always", "right", "today", "watch",
        // TikTok UI chrome / boilerplate
        "following", "friends", "profile", "inbox", "search", "reply",
        "replies", "views", "shares", "likes", "comments", "comment",
        "original", "sound", "music", "live", "shop", "send", "message",
        "video", "follow", "duet", "stitch", "favorite", "favorites",
        "share", "button", "double", "creator", "sponsored", "promoted",
        "suggested", "trending", "viral", "capcut", "fyp", "foryou",
        "foryoupage", "tiktok", "greenscreen", "photo", "story", "repost",
    )

    /**
     * Candidate learnable terms for one flagged video: cleaned hashtags
     * (kept with their '#' so they read as tags in the UI) plus meaningful
     * caption words.
     */
    fun candidateTerms(snapshot: VideoSnapshot): Set<String> {
        val out = LinkedHashSet<String>()
        for (tag in snapshot.hashtags) {
            val body = tag.removePrefix("#").lowercase()
            if (body.length >= 3 && body !in STOPWORDS) out += "#$body"
        }
        for (match in WORD.findAll(snapshot.joinedText)) {
            val word = match.value.lowercase()
            if (word !in STOPWORDS) out += word
        }
        return out
    }
}
