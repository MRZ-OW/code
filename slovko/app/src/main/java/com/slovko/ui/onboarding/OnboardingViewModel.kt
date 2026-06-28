package com.slovko.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val settings: SettingsRepository,
) : ViewModel() {

    fun finish(goalXp: Int) {
        viewModelScope.launch {
            settings.update { it.copy(onboarded = true, dailyGoalXp = goalXp) }
        }
    }
}
