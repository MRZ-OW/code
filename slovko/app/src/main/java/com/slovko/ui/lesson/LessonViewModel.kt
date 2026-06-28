package com.slovko.ui.lesson

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.data.audio.PronunciationPlayer
import com.slovko.domain.GamificationConfig
import com.slovko.domain.model.CardDirection
import com.slovko.domain.model.Exercise
import com.slovko.domain.model.ExerciseType
import com.slovko.domain.model.Feedback
import com.slovko.domain.repository.ContentRepository
import com.slovko.domain.repository.GamificationRepository
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SettingsRepository
import com.slovko.domain.repository.SrsRepository
import com.slovko.domain.usecase.GradeAnswerUseCase
import com.slovko.domain.usecase.XpCalculator
import com.slovko.ui.lesson.exercise.ExerciseInput
import com.slovko.ui.lesson.exercise.MATCH_DONE
import com.slovko.ui.lesson.exercise.inputModeFor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface LessonUiState {
    data object Loading : LessonUiState
    data object Error : LessonUiState

    data class Active(
        val exercise: Exercise,
        /** answered / total — used as a progress fraction in [0,1]. */
        val progress: Float,
        val answered: Int,
        val total: Int,
        val selected: String?,
        val typed: String,
        val feedback: Feedback?,
    ) : LessonUiState

    data class Completed(
        val xpEarned: Int,
        val accuracy: Float,
        val durationMs: Long,
    ) : LessonUiState
}

@HiltViewModel
class LessonViewModel @Inject constructor(
    private val content: ContentRepository,
    private val srs: SrsRepository,
    private val progress: ProgressRepository,
    private val gamification: GamificationRepository,
    private val settings: SettingsRepository,
    private val gradeAnswer: GradeAnswerUseCase,
    private val player: PronunciationPlayer,
) : ViewModel() {

    private val _state = MutableStateFlow<LessonUiState>(LessonUiState.Loading)
    val state: StateFlow<LessonUiState> = _state.asStateFlow()

    private var lessonId: String = ""

    /** Mutable working queue of exercises still to clear. */
    private val queue = ArrayDeque<Exercise>()

    /** Total distinct exercises that must be cleared once (denominator for progress). */
    private var totalToClear = 0

    /** How many distinct exercises have been cleared correctly. */
    private var cleared = 0

    /** Per-exercise (type, correct) in answer order — feeds XpCalculator. */
    private val results = mutableListOf<Pair<ExerciseType, Boolean>>()

    /** Exercises answered correctly (carry vocabCardId for SRS births). */
    private val correctlyAnswered = mutableListOf<Exercise>()

    /** How many times each exercise id has been re-queued after a miss. */
    private val requeueCount = mutableMapOf<String, Int>()

    /** Ids that have already been counted toward [cleared] (avoid double counting). */
    private val clearedIds = mutableSetOf<String>()

    private var newWords = 0
    private var startMs = 0L
    private var loaded = false

    fun start(id: String) {
        if (loaded && id == lessonId) return
        lessonId = id
        loaded = true
        load()
    }

    private fun load() {
        viewModelScope.launch {
            val lesson = content.getLesson(lessonId)
            val exercises = lesson?.exercises.orEmpty().sortedBy { it.orderIndex }
            if (exercises.isEmpty()) {
                _state.value = LessonUiState.Error
                return@launch
            }
            queue.clear()
            queue.addAll(exercises)
            totalToClear = exercises.size
            cleared = 0
            results.clear()
            correctlyAnswered.clear()
            requeueCount.clear()
            clearedIds.clear()
            newWords = 0
            startMs = System.currentTimeMillis()
            emitActive(selected = null, typed = "", feedback = null)
        }
    }

    private fun emitActive(selected: String?, typed: String, feedback: Feedback?) {
        val ex = queue.firstOrNull() ?: return
        _state.value = LessonUiState.Active(
            exercise = ex,
            progress = if (totalToClear <= 0) 0f else cleared.toFloat() / totalToClear,
            answered = cleared,
            total = totalToClear,
            selected = selected,
            typed = typed,
            feedback = feedback,
        )
    }

    fun select(value: String) {
        val s = _state.value as? LessonUiState.Active ?: return
        if (s.feedback != null) return
        _state.value = s.copy(selected = value)
    }

    fun setTyped(value: String) {
        val s = _state.value as? LessonUiState.Active ?: return
        if (s.feedback != null) return
        _state.value = s.copy(typed = value)
    }

    fun speak(text: String) {
        player.speak(text)
    }

    fun check() {
        val s = _state.value as? LessonUiState.Active ?: return
        if (s.feedback != null) return
        val ex = s.exercise
        val answer = when (inputModeFor(ex)) {
            ExerciseInput.TEXT, ExerciseInput.WORDBANK -> s.typed
            else -> s.selected.orEmpty()
        }
        if (answer.isBlank()) return

        val correct = if (ex.type == ExerciseType.MATCH_PAIRS) {
            answer == MATCH_DONE
        } else {
            gradeAnswer(ex, answer).correct
        }
        results.add(ex.type to correct)

        if (correct) {
            if (clearedIds.add(ex.id)) cleared++
            if (correctlyAnswered.none { it.id == ex.id }) {
                correctlyAnswered.add(ex)
                if (ex.vocabCardId != null) newWords++
            }
            _state.value = s.copy(
                feedback = Feedback(
                    correct = true,
                    title = "Správne! — Correct 🎉",
                    correctAnswer = ex.answer,
                ),
            )
        } else {
            _state.value = s.copy(
                feedback = Feedback(
                    correct = false,
                    title = "Not quite",
                    correctAnswer = ex.answer,
                    explanation = ex.hint,
                ),
            )
        }
    }

    fun continueNext() {
        val s = _state.value as? LessonUiState.Active ?: return
        val feedback = s.feedback ?: return
        val ex = queue.removeFirstOrNull() ?: return

        if (!feedback.correct) {
            val seen = requeueCount.getOrDefault(ex.id, 0)
            if (seen < GamificationConfig.Mistake.MAX_REQUEUE) {
                requeueCount[ex.id] = seen + 1
                val insertAt = GamificationConfig.Mistake.REQUEUE_AFTER_N_ITEMS
                    .coerceAtMost(queue.size)
                queue.add(insertAt, ex)
            }
        }

        if (queue.isEmpty()) {
            finish()
        } else {
            emitActive(selected = null, typed = "", feedback = null)
        }
    }

    private fun finish() {
        viewModelScope.launch {
            val durationMs = System.currentTimeMillis() - startMs
            val total = results.size
            val correctCount = results.count { it.second }
            val accuracy = if (total <= 0) 1f else correctCount.toFloat() / total
            val allCorrect = total > 0 && correctCount == total
            val firstOfDay = !progress.hasPracticedToday()
            val challenge = settings.current().challengeMode

            val breakdown = XpCalculator.lessonXp(
                results = results,
                fast = durationMs < 90_000,
                firstOfDay = firstOfDay,
                challenge = challenge,
            )

            progress.recordLessonCompletion(
                lessonId = lessonId,
                xpEarned = breakdown.total,
                accuracy = accuracy,
                durationMs = durationMs,
                newWords = newWords,
            )

            for (ex in correctlyAnswered) {
                ex.vocabCardId?.let { srs.bornCard(it, CardDirection.EN_TO_SK) }
            }

            gamification.progressQuests(xp = breakdown.total, lessons = 1, perfect = allCorrect)
            gamification.evaluateAchievements()

            _state.value = LessonUiState.Completed(
                xpEarned = breakdown.total,
                accuracy = accuracy,
                durationMs = durationMs,
            )
        }
    }
}
