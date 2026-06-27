package com.slovko.domain.srs

import com.slovko.domain.model.CardState
import com.slovko.domain.model.Grade
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FsrsSchedulerTest {

    private val scheduler = FsrsScheduler()
    private val now = 1_700_000_000_000L

    private fun newState() = SchedulingState(CardState.NEW, 0.0, 0.0, now, 0, 0, null)

    @Test
    fun `good on a new card graduates to review with a future due date`() {
        val next = scheduler.review(newState(), Grade.GOOD, now)
        assertEquals(CardState.REVIEW, next.state)
        assertTrue("due should be in the future", next.dueMillis > now)
        assertTrue("stability positive", next.stability > 0.0)
        assertEquals(1, next.reps)
    }

    @Test
    fun `again on a new card stays in learning with a short step`() {
        val next = scheduler.review(newState(), Grade.AGAIN, now)
        assertEquals(CardState.LEARNING, next.state)
        assertTrue("short learning step (< 1 day)", next.dueMillis - now < 86_400_000L)
    }

    @Test
    fun `easy schedules further out than good`() {
        val good = scheduler.review(newState(), Grade.GOOD, now)
        val easy = scheduler.review(newState(), Grade.EASY, now)
        assertTrue("easy interval >= good interval", easy.dueMillis >= good.dueMillis)
    }

    @Test
    fun `lapsing a review card increments lapses and relearns`() {
        val review = scheduler.review(newState(), Grade.GOOD, now)
        val later = review.dueMillis + 1000
        val lapsed = scheduler.review(review, Grade.AGAIN, later)
        assertEquals(CardState.RELEARNING, lapsed.state)
        assertEquals(1, lapsed.lapses)
    }

    @Test
    fun `retrievability decays toward zero over time`() {
        val r0 = scheduler.retrievability(0.0, 10.0)
        val r100 = scheduler.retrievability(100.0, 10.0)
        assertTrue(r0 > r100)
        assertTrue(r0 <= 1.0)
    }
}
