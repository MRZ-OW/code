package com.slovko.ui.chathub

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.domain.model.ChatScenario
import com.slovko.domain.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class ChatHubViewModel @Inject constructor(
    private val content: ContentRepository,
) : ViewModel() {

    val state: StateFlow<List<ChatScenario>> =
        content.observeScenarios()
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5000),
                initialValue = emptyList(),
            )
}
