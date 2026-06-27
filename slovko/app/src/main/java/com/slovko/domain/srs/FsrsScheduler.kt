package com.slovko.domain.srs

import com.slovko.domain.model.CardState
import com.slovko.domain.model.Grade
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** Snapshot of a card's scheduling state fed into / out of the scheduler. */
data class SchedulingState(
    val state: CardState,
    val stability: Double,
    val difficulty: Double,
    val dueMillis: Long,
    val reps: Int,
    val lapses: Int,
    val lastReviewMillis: Long?,
)

private const val MILLIS_PER_DAY = 86_400_000.0
private const val MILLIS_PER_MIN = 60_000L

/**
 * Pure-Kotlin FSRS-4.5 scheduler. Deterministic function of (state, grade, time)
 * → next state. Fully offline. See DESIGN.md §4.
 */
class FsrsScheduler(private val params: FsrsParams = FsrsParams()) {

    private val w get() = params.w

    /** Probability of recall after [elapsedDays] given [stability]. */
    fun retrievability(elapsedDays: Double, stability: Double): Double {
        if (stability <= 0.0) return 0.0
        return (1.0 + params.factor * elapsedDays / stability).pow(params.decay)
    }

    /** Days until retrievability decays to the requested retention. */
    fun intervalDays(stability: Double): Double {
        val raw = (stability / params.factor) *
            (params.requestRetention.pow(1.0 / params.decay) - 1.0)
        return raw.coerceIn(1.0, params.maximumIntervalDays)
    }

    fun review(prev: SchedulingState, grade: Grade, nowMillis: Long): SchedulingState {
        return if (prev.state == CardState.NEW) {
            firstReview(prev, grade, nowMillis)
        } else {
            subsequentReview(prev, grade, nowMillis)
        }
    }

    private fun firstReview(prev: SchedulingState, grade: Grade, now: Long): SchedulingState {
        val stability = initialStability(grade)
        val difficulty = initialDifficulty(grade)
        return graduateOrStep(
            prev = prev,
            grade = grade,
            now = now,
            stability = stability,
            difficulty = difficulty,
            relearning = false,
            incLapse = false,
        )
    }

    private fun subsequentReview(prev: SchedulingState, grade: Grade, now: Long): SchedulingState {
        val elapsedDays = if (prev.lastReviewMillis != null) {
            max(0.0, (now - prev.lastReviewMillis) / MILLIS_PER_DAY)
        } else 0.0
        val r = retrievability(elapsedDays, prev.stability)
        val difficulty = nextDifficulty(prev.difficulty, grade)

        return if (grade == Grade.AGAIN) {
            val newStability = postLapseStability(prev.difficulty, prev.stability, r)
            graduateOrStep(prev, grade, now, newStability, difficulty, relearning = true, incLapse = true)
        } else {
            val newStability = nextRecallStability(prev.difficulty, prev.stability, r, grade)
            graduateOrStep(prev, grade, now, newStability, difficulty, relearning = false, incLapse = false)
        }
    }

    private fun graduateOrStep(
        prev: SchedulingState,
        grade: Grade,
        now: Long,
        stability: Double,
        difficulty: Double,
        relearning: Boolean,
        incLapse: Boolean,
    ): SchedulingState {
        val reps = prev.reps + 1
        val lapses = prev.lapses + if (incLapse) 1 else 0

        // AGAIN / HARD on a not-yet-graduated card → short learning step.
        val useShortStep = grade == Grade.AGAIN ||
            (grade == Grade.HARD && prev.state != CardState.REVIEW)

        return if (useShortStep) {
            val stepMin = when {
                relearning -> params.relearningStepMinutes
                grade == Grade.AGAIN -> params.learningStepsMinutes.first()
                else -> params.learningStepsMinutes.last()
            }
            SchedulingState(
                state = if (relearning) CardState.RELEARNING else CardState.LEARNING,
                stability = stability,
                difficulty = difficulty,
                dueMillis = now + stepMin * MILLIS_PER_MIN,
                reps = reps,
                lapses = lapses,
                lastReviewMillis = now,
            )
        } else {
            val days = intervalDays(stability)
            SchedulingState(
                state = CardState.REVIEW,
                stability = stability,
                difficulty = difficulty,
                dueMillis = now + (days * MILLIS_PER_DAY).toLong(),
                reps = reps,
                lapses = lapses,
                lastReviewMillis = now,
            )
        }
    }

    // ---- FSRS math ----
    private fun initialStability(grade: Grade): Double =
        max(0.1, w[grade.value - 1])

    private fun initialDifficulty(grade: Grade): Double =
        (w[4] - exp(w[5] * (grade.value - 1)) + 1.0).clampDifficulty()

    private fun nextDifficulty(d: Double, grade: Grade): Double {
        val next = d - w[6] * (grade.value - 3)
        // mean reversion toward initial "Good" difficulty
        val meanReverted = w[7] * initialDifficulty(Grade.GOOD) + (1 - w[7]) * next
        return meanReverted.clampDifficulty()
    }

    private fun nextRecallStability(d: Double, s: Double, r: Double, grade: Grade): Double {
        val hardPenalty = if (grade == Grade.HARD) w[15] else 1.0
        val easyBonus = if (grade == Grade.EASY) w[16] else 1.0
        val growth = exp(w[8]) *
            (11 - d) *
            s.pow(-w[9]) *
            (exp(w[10] * (1 - r)) - 1) *
            hardPenalty *
            easyBonus
        return (s * (1 + growth)).coerceIn(0.1, params.maximumIntervalDays)
    }

    private fun postLapseStability(d: Double, s: Double, r: Double): Double {
        val newS = w[11] *
            d.pow(-w[12]) *
            ((s + 1).pow(w[13]) - 1) *
            exp(w[14] * (1 - r))
        return min(s, max(0.1, newS))
    }

    private fun Double.clampDifficulty(): Double = coerceIn(1.0, 10.0)
}

/** Maps a grade history of n reviews to a readable interval string (debug helper). */
fun daysToHuman(days: Double): String = when {
    days < 1 -> "<1d"
    days < 30 -> "${days.toInt()}d"
    days < 365 -> "${(days / 30).toInt()}mo"
    else -> "${(days / 365).let { "%.1f".format(it) }}y"
}

internal fun lnSafe(x: Double): Double = if (x <= 0) 0.0 else ln(x)
