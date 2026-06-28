package com.slovko.domain.usecase

import com.slovko.core.common.TextNormalizer
import com.slovko.domain.model.Exercise
import com.slovko.domain.model.ExerciseType
import com.slovko.domain.model.Grade
import com.slovko.domain.model.GradeResult
import javax.inject.Inject

/**
 * Grades a typed/selected answer against an exercise's acceptable set.
 * Diacritic- and word-order-tolerant except for LISTEN_TYPE (strict on diacritics).
 * See DESIGN.md §5.
 */
class GradeAnswerUseCase @Inject constructor() {

    operator fun invoke(
        exercise: Exercise,
        userAnswer: String,
        hintUsed: Boolean = false,
    ): GradeResult {
        val correct = isCorrect(exercise, userAnswer)
        val grade = when {
            !correct -> Grade.AGAIN
            hintUsed -> Grade.HARD
            else -> Grade.GOOD
        }
        return GradeResult(correct = correct, grade = grade)
    }

    fun isCorrect(exercise: Exercise, userAnswer: String): Boolean {
        val candidates = (exercise.acceptable + exercise.answer)
        return when (exercise.type) {
            ExerciseType.LISTEN_TYPE -> {
                val ans = TextNormalizer.normalizeStrict(userAnswer)
                candidates.any { TextNormalizer.normalizeStrict(it) == ans } ||
                    candidates.any { TextNormalizer.normalize(it) == TextNormalizer.normalize(userAnswer) }
            }
            ExerciseType.WORD_BANK, ExerciseType.TRANSLATE_EN_SK, ExerciseType.TRANSLATE_SK_EN -> {
                candidates.any { TextNormalizer.sameWords(it, userAnswer) }
            }
            else -> {
                val ans = TextNormalizer.normalize(userAnswer)
                candidates.any { TextNormalizer.normalize(it) == ans }
            }
        }
    }
}
