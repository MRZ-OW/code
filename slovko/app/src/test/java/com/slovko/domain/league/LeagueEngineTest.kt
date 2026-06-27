package com.slovko.domain.league

import com.slovko.domain.GamificationConfig
import com.slovko.domain.model.LeagueTier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LeagueEngineTest {

    private val engine = LeagueEngine()

    @Test
    fun `bot generation is deterministic for a given week`() {
        val a = engine.generateBots("2026-W26", 60)
        val b = engine.generateBots("2026-W26", 60)
        assertEquals(a.map { it.name to it.dailyMean }, b.map { it.name to it.dailyMean })
    }

    @Test
    fun `cohort has the configured size including the user`() {
        val league = engine.standings(
            weekId = "2026-W26", tier = LeagueTier.BRONZE, userXp = 120,
            userName = "Ty", userAvatar = "fox", userTrailingDailyAvg = 60,
            daysElapsed = 3.0, daysRemaining = 4,
        )
        assertEquals(GamificationConfig.League.COHORT_SIZE, league.standings.size)
        assertTrue(league.standings.any { it.isUser })
    }

    @Test
    fun `standings are sorted by xp descending with ranks assigned`() {
        val league = engine.standings(
            "2026-W26", LeagueTier.SILVER, 500, "Ty", "fox", 80, 5.0, 2,
        )
        val xps = league.standings.map { it.xp }
        assertEquals(xps.sortedDescending(), xps)
        assertEquals(1, league.standings.first().rank)
    }
}
