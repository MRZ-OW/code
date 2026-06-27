package com.slovko.domain.usecase

import com.slovko.domain.model.ExerciseType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class XpCalculatorTest {

    @Test
    fun `perfect lesson adds the perfect bonus`() {
        val results = List(6) { ExerciseType.MCQ to true }
        val b = XpCalculator.lessonXp(results, fast = false, firstOfDay = false, challenge = false)
        assertTrue(b.perfectBonus > 0)
        assertTrue(b.total > b.base)
    }

    @Test
    fun `a lesson with a mistake earns no perfect bonus`() {
        val results = listOf(
            ExerciseType.MCQ to true, ExerciseType.MCQ to false, ExerciseType.MCQ to true,
        )
        val b = XpCalculator.lessonXp(results, fast = false, firstOfDay = false, challenge = false)
        assertEquals(0, b.perfectBonus)
    }

    @Test
    fun `challenge mode multiplies earned xp`() {
        val results = List(5) { ExerciseType.MCQ to true }
        val normal = XpCalculator.lessonXp(results, false, false, challenge = false)
        val challenge = XpCalculator.lessonXp(results, false, false, challenge = true)
        assertTrue(challenge.total > normal.total)
    }

    @Test
    fun `level curve is monotonic increasing`() {
        var prev = -1
        for (lvl in 1..10) {
            val xp = com.slovko.domain.GamificationConfig.cumulativeXpForLevel(lvl)
            assertTrue(xp >= prev)
            prev = xp
        }
    }
}
