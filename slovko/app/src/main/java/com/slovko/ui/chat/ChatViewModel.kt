package com.slovko.ui.chat

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.data.audio.PronunciationPlayer
import com.slovko.domain.model.ChatMessage
import com.slovko.domain.model.ChatScenario
import com.slovko.domain.model.ReplyOption
import com.slovko.domain.repository.ChatRepository
import com.slovko.domain.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatUiState(
    val title: String = "",
    val messages: List<ChatMessage> = emptyList(),
    val suggestedReplies: List<ReplyOption> = emptyList(),
    val sending: Boolean = false,
    /** Set when the user picked a reply marked as natural; consume via [praiseShown]. */
    val showNaturalPraise: Boolean = false,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chat: ChatRepository,
    private val content: ContentRepository,
    private val player: PronunciationPlayer,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val scenarioId: String = savedStateHandle.get<String>("scenarioId").orEmpty()

    private val _state = MutableStateFlow(ChatUiState())
    val state: StateFlow<ChatUiState> = _state.asStateFlow()

    private var scenario: ChatScenario? = null

    init {
        viewModelScope.launch {
            chat.startIfEmpty(scenarioId)
            scenario = content.getScenario(scenarioId)
            _state.update { it.copy(title = scenario?.title.orEmpty()) }
        }
        viewModelScope.launch {
            chat.observeMessages(scenarioId).collect { messages ->
                _state.update { current ->
                    current.copy(
                        messages = messages,
                        suggestedReplies = currentSuggestedReplies(messages),
                    )
                }
            }
        }
    }

    /** Replies of the latest partner turn, keyed off how many partner messages exist so far. */
    private fun currentSuggestedReplies(messages: List<ChatMessage>): List<ReplyOption> {
        val turns = scenario?.turns ?: return emptyList()
        val partnerCount = messages.count { it.role == "partner" }
        val index = partnerCount - 1
        return turns.getOrNull(index)?.replies ?: emptyList()
    }

    fun send(reply: ReplyOption) {
        sendInternal(reply.sk, reply.enGloss, natural = reply.natural)
    }

    fun sendText(text: String) {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        sendInternal(trimmed, gloss = null, natural = false)
    }

    private fun sendInternal(text: String, gloss: String?, natural: Boolean) {
        if (_state.value.sending) return
        _state.update { it.copy(sending = true, showNaturalPraise = natural) }
        viewModelScope.launch {
            chat.sendUserMessage(scenarioId, text, gloss)
            chat.requestPartnerReply(scenarioId)
            _state.update { it.copy(sending = false) }
        }
    }

    /** Acknowledge the naturalness snackbar so it is not shown again. */
    fun praiseShown() {
        _state.update { it.copy(showNaturalPraise = false) }
    }

    fun speak(text: String) {
        player.speak(text)
    }
}
