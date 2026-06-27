package com.slovko.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.domain.model.UserSettings
import com.slovko.domain.repository.ContentRepository
import com.slovko.domain.repository.GamificationRepository
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SettingsRepository
import com.slovko.work.NotificationScheduler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RootViewModel @Inject constructor(
    private val content: ContentRepository,
    private val progress: ProgressRepository,
    private val gamification: GamificationRepository,
    private val scheduler: NotificationScheduler,
    settingsRepo: SettingsRepository,
) : ViewModel() {

    val settings: StateFlow<UserSettings?> = settingsRepo.settings
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    init {
        viewModelScope.launch {
            content.ensureSeeded()
            progress.ensureProfile()
            gamification.rollDailyQuestsIfNeeded()
            gamification.refreshLeague()
            scheduler.scheduleAll()
        }
    }
}
