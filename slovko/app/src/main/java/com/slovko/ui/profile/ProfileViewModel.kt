package com.slovko.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.domain.model.Achievement
import com.slovko.domain.model.HeatDay
import com.slovko.domain.model.UserStats
import com.slovko.domain.repository.GamificationRepository
import com.slovko.domain.repository.ProgressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class ProfileUiState(
    val loading: Boolean = true,
    val stats: UserStats? = null,
    val heatmap: List<HeatDay> = emptyList(),
    val achievementsUnlocked: Int = 0,
    val achievementsTotal: Int = 0,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val progress: ProgressRepository,
    private val gamification: GamificationRepository,
) : ViewModel() {

    val state: StateFlow<ProfileUiState> = combine(
        progress.observeUserStats(),
        progress.observeHeatmap(70),
        gamification.observeAchievements(),
    ) { stats, heatmap, achievements ->
        ProfileUiState(
            loading = false,
            stats = stats,
            heatmap = heatmap,
            achievementsUnlocked = achievements.count { it.unlocked },
            achievementsTotal = achievements.size,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ProfileUiState(),
    )
}
