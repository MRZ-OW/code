package com.guardrail.ragebait.classify

import com.guardrail.ragebait.model.VideoSnapshot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClassifierTest {

    private fun snapshot(
        vararg texts: String,
        creator: String? = "@someone",
        hashtags: List<String> = emptyList(),
    ) = VideoSnapshot(creator, hashtags, texts.toList(), capturedAtMs = 1L)

    @Test
    fun `phrase matches as substring`() {
        val snap = snapshot("This will make you SO angry, wait for it...")
        val verdict = Classifier.evaluate(snap, listOf("wait for it"), emptyList(), emptyList())
        assertTrue(verdict.shouldSkip)
        assertEquals(listOf("wait for it"), verdict.matchedTerms)
    }

    @Test
    fun `single word requires word boundary`() {
        val snap = snapshot("cloud storage tips for your phone")
        assertFalse(Classifier.matches(snap, "rage"))

        val rageSnap = snapshot("pure RAGE in this comment section")
        assertTrue(Classifier.matches(rageSnap, "rage"))
    }

    @Test
    fun `hashtag terms match`() {
        val snap = snapshot(
            "who is wrong here? #ragebait #fyp",
            hashtags = listOf("#ragebait", "#fyp"),
        )
        val verdict = Classifier.evaluate(snap, listOf("#ragebait"), emptyList(), emptyList())
        assertTrue(verdict.shouldSkip)
    }

    @Test
    fun `blocked creator skips regardless of caption`() {
        val snap = snapshot("wholesome cooking video", creator = "@drama.merchant")
        val verdict = Classifier.evaluate(
            snap, emptyList(), emptyList(), listOf("@drama.merchant"),
        )
        assertTrue(verdict.shouldSkip)
        assertEquals("@drama.merchant", verdict.matchedCreator)
    }

    @Test
    fun `learned terms also trigger`() {
        val snap = snapshot("classic gender war content again")
        val verdict = Classifier.evaluate(snap, emptyList(), listOf("gender war"), emptyList())
        assertTrue(verdict.shouldSkip)
    }

    @Test
    fun `clean video passes`() {
        val snap = snapshot("golden retriever learns to paddleboard #dogs")
        val verdict = Classifier.evaluate(
            snap,
            listOf("rage bait", "you won't believe"),
            listOf("gender war"),
            listOf("@drama.merchant"),
        )
        assertFalse(verdict.shouldSkip)
    }

    @Test
    fun `case insensitive matching`() {
        val snap = snapshot("RAGE BAIT compilation")
        assertTrue(Classifier.matches(snap, "Rage Bait"))
    }

    @Test
    fun `empty snapshot never skips`() {
        val verdict = Classifier.evaluate(
            VideoSnapshot.EMPTY, listOf("rage bait"), emptyList(), emptyList(),
        )
        assertFalse(verdict.shouldSkip)
    }
}
