package com.slovko.domain

import com.slovko.domain.model.ExerciseType

/**
 * Single source of all tunable gamification constants. See DESIGN.md §7.
 * Balance the app by editing numbers here — logic never hardcodes them.
 */
object GamificationConfig {

    object Xp {
        const val LESSON_COMPLETE_BONUS = 10
        const val PERFECT_LESSON_BONUS = 15
        const val FAST_LESSON_BONUS = 8
        const val COMBO_STEP = 1
        const val COMBO_THRESHOLD = 3 // combo starts after this many in a row
        const val COMBO_MAX_BONUS = 10
        const val FIRST_LESSON_OF_DAY = 5
        const val SRS_REVIEW = 5
        const val CHAT_TURN = 12

        fun baseFor(type: ExerciseType): Int = when (type) {
            ExerciseType.WORD_BANK, ExerciseType.TRANSLATE_EN_SK, ExerciseType.TRANSLATE_SK_EN,
            ExerciseType.MCQ, ExerciseType.MATCH_PAIRS, ExerciseType.FILL_CASE,
            ExerciseType.ASPECT_CHOICE, ExerciseType.DIALOGUE_FILL -> 6
            ExerciseType.LISTEN_CHOOSE -> 8
            ExerciseType.LISTEN_TYPE -> 9
            ExerciseType.SPEAK -> 10
        }
    }

    object Streak {
        const val GRACE_HOURS = 3
        const val FREEZE_MAX_HELD = 2
        const val FREEZE_GEM_COST = 200
        const val REPAIR_WINDOW_DAYS = 2
        const val REPAIR_GEM_COST = 350
        const val WEEKEND_AMULET_COST = 100
        val MILESTONES = listOf(3, 7, 14, 30, 50, 100, 365)
        fun milestoneRewardGems(day: Int): Int = when (day) {
            3 -> 20; 7 -> 40; 14 -> 60; 30 -> 120; 50 -> 200; 100 -> 400; 365 -> 1000
            else -> 0
        }
    }

    object Mistake {
        const val REQUEUE_AFTER_N_ITEMS = 3
        const val MAX_REQUEUE = 2
        const val CHALLENGE_MODE_HEARTS = 3
        const val CHALLENGE_MODE_XP_MULT = 1.5
    }

    object League {
        const val COHORT_SIZE = 15 // user + 14 bots
        const val PROMOTE_TOP = 5
        const val DEMOTE_BOTTOM = 4
        const val MIN_BOT_MEAN = 20
        const val MEAN_FACTOR_MIN = 0.55
        const val MEAN_FACTOR_MAX = 1.35
        const val WEEK_DAYS = 7
    }

    /** Daily XP goal tiers (label → goal XP). */
    val DAILY_GOAL_TIERS = listOf(
        "Casual" to 30,
        "Regular" to 60,
        "Serious" to 120,
        "Intense" to 250,
    )
    const val DEFAULT_DAILY_GOAL = 60

    // ---- Level curve: cumulative XP to *reach* level n.  xp(n) = 50n^2 + 50n ----
    fun cumulativeXpForLevel(level: Int): Int {
        if (level <= 1) return 0
        val n = level - 1
        return 50 * n * n + 50 * n
    }

    fun levelForXp(totalXp: Int): Int {
        var level = 1
        while (cumulativeXpForLevel(level + 1) <= totalXp) level++
        return level
    }

    /** XP earned within the current level and XP needed to span the current level. */
    fun levelProgress(totalXp: Int): Pair<Int, Int> {
        val level = levelForXp(totalXp)
        val base = cumulativeXpForLevel(level)
        val next = cumulativeXpForLevel(level + 1)
        return (totalXp - base) to (next - base)
    }
}
