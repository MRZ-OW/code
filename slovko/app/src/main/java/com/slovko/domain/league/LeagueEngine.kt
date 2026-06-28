package com.slovko.domain.league

import com.slovko.domain.GamificationConfig.League as Cfg
import com.slovko.domain.model.League
import com.slovko.domain.model.LeagueStanding
import com.slovko.domain.model.LeagueTier
import java.util.Random
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Backend-free, deterministic, honest league. A cohort of 14 bots is generated
 * each week clustered around the user's trailing average so the race is always
 * winnable. Bot XP accrues lazily from elapsed time. See DESIGN.md §7.
 */
class LeagueEngine {

    data class Bot(val name: String, val avatarKey: String, val dailyMean: Int, val variance: Int)

    private val names = listOf(
        "Mária", "Jakub", "Sofia", "Adam", "Nina", "Marek", "Ema", "Tomáš",
        "Laura", "Filip", "Hana", "Lukáš", "Viktória", "Martin", "Zuzka",
        "Peter", "Klára", "Samo", "Dáša", "Oliver", "Terka", "Matej",
    )
    private val avatars = listOf("fox", "bear", "owl", "deer", "hedgehog", "wolf", "lynx")

    /** Deterministic per-week seed from the ISO week id (e.g. "2026-W26"). */
    private fun seedFor(weekId: String): Long = weekId.hashCode().toLong() * 2654435761L

    fun generateBots(weekId: String, userTrailingDailyAvg: Int): List<Bot> {
        val rng = Random(seedFor(weekId))
        val baseline = max(Cfg.MIN_BOT_MEAN, userTrailingDailyAvg)
        return (0 until Cfg.COHORT_SIZE - 1).map { i ->
            val factor = Cfg.MEAN_FACTOR_MIN +
                rng.nextDouble() * (Cfg.MEAN_FACTOR_MAX - Cfg.MEAN_FACTOR_MIN)
            val mean = max(Cfg.MIN_BOT_MEAN, (baseline * factor).roundToInt())
            Bot(
                name = names[(seedFor(weekId).toInt() + i).mod(names.size)],
                avatarKey = avatars[(i + weekId.length).mod(avatars.size)],
                dailyMean = mean,
                variance = max(5, mean / 4),
            )
        }
    }

    /** Bot cumulative XP after [daysElapsed] (fractional) of the week. */
    fun botXp(weekId: String, bot: Bot, botIndex: Int, daysElapsed: Double): Int {
        val rng = Random(seedFor(weekId) xor (botIndex.toLong() * 1_000_003L))
        var total = 0.0
        val fullDays = daysElapsed.toInt()
        for (d in 0 until fullDays) {
            val jitter = (rng.nextDouble() * 2 - 1) * bot.variance
            total += max(0.0, bot.dailyMean + jitter)
        }
        // partial current day
        val frac = daysElapsed - fullDays
        total += max(0.0, bot.dailyMean * frac)
        return total.roundToInt()
    }

    fun standings(
        weekId: String,
        tier: LeagueTier,
        userXp: Int,
        userName: String,
        userAvatar: String,
        userTrailingDailyAvg: Int,
        daysElapsed: Double,
        daysRemaining: Int,
    ): League {
        val bots = generateBots(weekId, userTrailingDailyAvg)
        val rows = buildList {
            add(Triple(userName, userXp, true) to userAvatar)
            bots.forEachIndexed { i, bot ->
                add(Triple(bot.name, botXp(weekId, bot, i, daysElapsed), false) to bot.avatarKey)
            }
        }.sortedByDescending { it.first.second }

        val standings = rows.mapIndexed { idx, (triple, avatar) ->
            LeagueStanding(
                rank = idx + 1,
                name = triple.first,
                xp = triple.second,
                isUser = triple.third,
                avatarKey = avatar,
            )
        }
        return League(
            tier = tier,
            daysRemaining = daysRemaining,
            standings = standings,
            promoteCutoff = Cfg.PROMOTE_TOP,
            demoteCutoff = Cfg.COHORT_SIZE - Cfg.DEMOTE_BOTTOM,
        )
    }
}
