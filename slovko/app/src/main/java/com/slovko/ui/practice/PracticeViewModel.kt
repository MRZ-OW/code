package com.slovko.ui.practice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.data.audio.PronunciationPlayer
import com.slovko.domain.GamificationConfig
import com.slovko.domain.model.Grade
import com.slovko.domain.model.ReviewCard
import com.slovko.domain.repository.GamificationRepository
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SrsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface PracticeUiState {
    data object Loading : PracticeUiState
    data object Empty : PracticeUiState
    data class Reviewing(
        val card: ReviewCard,
        val index: Int,
        val total: Int,
        val revealed: Boolean,
    ) : PracticeUiState

    data class Done(val reviewed: Int, val xpEarned: Int) : PracticeUiState
}

@HiltViewModel
class PracticeViewModel @Inject constructor(
    private val srs: SrsRepository,
    private val progress: ProgressRepository,
    private val gamification: GamificationRepository,
    private val player: PronunciationPlayer,
) : ViewModel() {

    private val _state = MutableStateFlow<PracticeUiState>(PracticeUiState.Loading)
    val state: StateFlow<PracticeUiState> = _state.asStateFlow()

    private var queue: List<ReviewCard> = emptyList()
    private var index = 0
    private var xp = 0

    init { load() }

    fun load() {
        viewModelScope.launch {
            queue = srs.dueCards(limit = 30)
            index = 0
            xp = 0
            _state.value = if (queue.isEmpty()) PracticeUiState.Empty else current(revealed = false)
        }
    }

    private fun current(revealed: Boolean) = PracticeUiState.Reviewing(
        card = queue[index], index = index, total = queue.size, revealed = revealed,
    )

    fun reveal() {
        val s = _state.value
        if (s is PracticeUiState.Reviewing) _state.value = s.copy(revealed = true)
    }

    fun speak() {
        (_state.value as? PracticeUiState.Reviewing)?.let { player.speak(it.card.card.sk) }
    }

    fun grade(grade: Grade) {
        val card = queue[index]
        viewModelScope.launch {
            srs.grade(card.card.id, card.direction, grade)
            if (grade != Grade.AGAIN) {
                xp += GamificationConfig.Xp.SRS_REVIEW
                progress.addXp(GamificationConfig.Xp.SRS_REVIEW)
            }
            index++
            if (index >= queue.size) {
                gamification.progressQuests(xp = xp, lessons = 0, perfect = false)
                gamification.evaluateAchievements()
                _state.value = PracticeUiState.Done(reviewed = queue.size, xpEarned = xp)
            } else {
                _state.value = current(revealed = false)
            }
        }
    }
}
