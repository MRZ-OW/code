package com.slovko.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.data.audio.PronunciationPlayer
import com.slovko.domain.model.Phrase
import com.slovko.domain.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class PhrasebookUiState(
    val query: String = "",
    val phrases: List<Phrase> = emptyList(),
)

@HiltViewModel
class PhrasebookViewModel @Inject constructor(
    private val content: ContentRepository,
    private val player: PronunciationPlayer,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    val state: StateFlow<PhrasebookUiState> =
        combine(content.observePhrases(), _query) { phrases, query ->
            val trimmed = query.trim()
            val filtered = if (trimmed.isEmpty()) {
                phrases
            } else {
                phrases.filter {
                    it.sk.contains(trimmed, ignoreCase = true) ||
                        it.en.contains(trimmed, ignoreCase = true)
                }
            }
            PhrasebookUiState(query = query, phrases = filtered)
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = PhrasebookUiState(),
        )

    fun onQueryChange(value: String) {
        _query.value = value
    }

    fun speak(text: String) {
        player.speak(text)
    }
}
