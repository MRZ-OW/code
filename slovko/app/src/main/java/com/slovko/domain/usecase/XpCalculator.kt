package com.slovko.domain.usecase

import com.slovko.domain.GamificationConfig
import com.slovko.domain.GamificationConfig.Xp
import com.slovko.domain.model.ExerciseType

/** Pure lesson-XP computation incl. combo & bonuses. See DESIGN.md §7. */
object XpCalculator {

    data class Breakdown(
        val base: Int,
        val combo: Int,
        val lessonBonus: Int,
        val perfectBonus: Int,
        val fastBonus: Int,
        val firstOfDayBonus: Int,
        val challengeMultiplier: Double,
    ) {
        val total: Int
            get() = (((base + combo) * challengeMultiplier).toInt()) +
                lessonBonus + perfectBonus + fastBonus + firstOfDayBonus
    }

    /**
     * @param results per-exercise (type, correct) in answer order.
     * @param fast whether the lesson finished under the fast threshold.
     * @param firstOfDay whether this is the first lesson today.
     * @param challenge Challenge Mode (1.5× on earned XP).
     */
    fun lessonXp(
        results: List<Pair<ExerciseType, Boolean>>,
        fast: Boolean,
        firstOfDay: Boolean,
        challenge: Boolean,
    ): Breakdown {
        var base = 0
        var combo = 0
        var streak = 0
        for ((type, correct) in results) {
            if (correct) {
                base += Xp.baseFor(type)
                streak++
                if (streak > Xp.COMBO_THRESHOLD) {
                    combo = (combo + Xp.COMBO_STEP).coerceAtMost(Xp.COMBO_MAX_BONUS)
                }
            } else {
                streak = 0
            }
        }
        val perfect = results.isNotEmpty() && results.all { it.second }
        return Breakdown(
            base = base,
            combo = combo,
            lessonBonus = Xp.LESSON_COMPLETE_BONUS,
            perfectBonus = if (perfect) Xp.PERFECT_LESSON_BONUS else 0,
            fastBonus = if (fast) Xp.FAST_LESSON_BONUS else 0,
            firstOfDayBonus = if (firstOfDay) Xp.FIRST_LESSON_OF_DAY else 0,
            challengeMultiplier = if (challenge) GamificationConfig.Mistake.CHALLENGE_MODE_XP_MULT else 1.0,
        )
    }
}
