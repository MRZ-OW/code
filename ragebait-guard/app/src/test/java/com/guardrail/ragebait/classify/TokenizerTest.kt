package com.guardrail.ragebait.classify

import com.guardrail.ragebait.model.VideoSnapshot
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TokenizerTest {

    @Test
    fun `keeps meaningful caption words and hashtags`() {
        val snap = VideoSnapshot(
            creator = "@x",
            hashtags = listOf("#divorcecourt", "#fyp"),
            texts = listOf("she took the HOUSE in the divorce #divorcecourt #fyp"),
            capturedAtMs = 1L,
        )
        val terms = Tokenizer.candidateTerms(snap)
        assertTrue("#divorcecourt" in terms)
        assertTrue("divorce" in terms)
        assertTrue("house" in terms)
    }

    @Test
    fun `drops tiktok ui chrome and boilerplate hashtags`() {
        val snap = VideoSnapshot(
            creator = "@x",
            hashtags = listOf("#fyp", "#foryou", "#viral"),
            texts = listOf("Following", "For You", "Likes", "Comments", "Share video"),
            capturedAtMs = 1L,
        )
        val terms = Tokenizer.candidateTerms(snap)
        assertFalse(terms.any { it.contains("fyp") })
        assertFalse(terms.any { it.contains("viral") })
        assertFalse("following" in terms)
        assertFalse("comments" in terms)
    }

    @Test
    fun `drops short words numbers and counters`() {
        val snap = VideoSnapshot(
            creator = "@x",
            hashtags = emptyList(),
            texts = listOf("me at 3am", "12.3K", "487 comments", "so mad"),
            capturedAtMs = 1L,
        )
        val terms = Tokenizer.candidateTerms(snap)
        assertFalse(terms.any { it.any(Char::isDigit) })
        assertFalse("mad" in terms) // under 4 chars
    }
}
