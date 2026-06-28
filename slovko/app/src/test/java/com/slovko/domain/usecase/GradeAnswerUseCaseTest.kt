package com.slovko.domain.usecase

import com.slovko.domain.model.Exercise
import com.slovko.domain.model.ExerciseType
import com.slovko.domain.model.Grade
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GradeAnswerUseCaseTest {

    private val useCase = GradeAnswerUseCase()

    private fun ex(
        type: ExerciseType,
        answer: String,
        acceptable: List<String> = emptyList(),
        choices: List<String> = emptyList(),
    ) = Exercise(
        id = "e", lessonId = "l", orderIndex = 0, type = type,
        promptSk = null, promptEn = null, answer = answer,
        acceptable = acceptable, choices = choices,
    )

    @Test
    fun `mcq exact match is correct and graded good`() {
        val result = useCase(ex(ExerciseType.MCQ, "ahoj"), "ahoj")
        assertTrue(result.correct)
        assertEquals(Grade.GOOD, result.grade)
    }

    @Test
    fun `mcq wrong answer is graded again`() {
        val result = useCase(ex(ExerciseType.MCQ, "ahoj"), "dovidenia")
        assertFalse(result.correct)
        assertEquals(Grade.AGAIN, result.grade)
    }

    @Test
    fun `translation is diacritic insensitive`() {
        val result = useCase(ex(ExerciseType.TRANSLATE_EN_SK, "Ďakujem"), "dakujem")
        assertTrue(result.correct)
    }

    @Test
    fun `word bank is word-order tolerant`() {
        val e = ex(ExerciseType.WORD_BANK, "Ako sa máš")
        assertTrue(useCase.isCorrect(e, "máš sa ako"))
    }

    @Test
    fun `hint downgrades a correct answer to hard`() {
        val result = useCase(ex(ExerciseType.MCQ, "ahoj"), "ahoj", hintUsed = true)
        assertEquals(Grade.HARD, result.grade)
    }
}
