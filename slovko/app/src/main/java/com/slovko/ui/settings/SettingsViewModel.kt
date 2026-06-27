package com.slovko.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.domain.model.UserSettings
import com.slovko.domain.repository.SettingsRepository
import com.slovko.work.NotificationScheduler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settings: SettingsRepository,
    private val scheduler: NotificationScheduler,
) : ViewModel() {

    val state: StateFlow<UserSettings> = settings.settings.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        UserSettings(),
    )

    fun update(transform: (UserSettings) -> UserSettings) {
        viewModelScope.launch {
            settings.update(transform)
            scheduler.scheduleAll()
        }
    }
}
