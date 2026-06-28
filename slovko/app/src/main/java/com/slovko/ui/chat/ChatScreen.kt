package com.slovko.ui.chat

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.ChatMessage
import com.slovko.domain.model.ReplyOption

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    scenarioId: String,
    onExit: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val listState = rememberLazyListState()

    LaunchedEffect(state.showNaturalPraise) {
        if (state.showNaturalPraise) {
            snackbarHostState.showSnackbar("Pekne po slovensky! 👌")
            viewModel.praiseShown()
        }
    }

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        state.title.ifBlank { "Conversation" },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onExit) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding(),
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(
                    horizontal = MaterialTheme.spacing.screenEdge,
                    vertical = MaterialTheme.spacing.md,
                ),
                verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
            ) {
                items(state.messages, key = { it.id }) { message ->
                    MessageBubble(
                        message = message,
                        onSpeak = { viewModel.speak(message.textSk) },
                    )
                }
            }

            Composer(
                suggested = state.suggestedReplies,
                sending = state.sending,
                onSendReply = viewModel::send,
                onSendText = viewModel::sendText,
            )
        }
    }
}

@Composable
private fun MessageBubble(
    message: ChatMessage,
    onSpeak: () -> Unit,
) {
    val isUser = message.role == "user"
    val alignment = if (isUser) Alignment.End else Alignment.Start
    val container = if (isUser) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surfaceContainer
    }
    val contentColor = if (isUser) {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurface
    }
    val shape = if (isUser) {
        RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp, bottomStart = 20.dp, bottomEnd = 6.dp)
    } else {
        RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp, bottomStart = 6.dp, bottomEnd = 20.dp)
    }

    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = alignment,
    ) {
        Surface(
            onClick = onSpeak,
            shape = shape,
            color = container,
            contentColor = contentColor,
            modifier = Modifier.widthIn(max = 300.dp),
        ) {
            Text(
                message.textSk,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(
                    horizontal = MaterialTheme.spacing.md,
                    vertical = MaterialTheme.spacing.sm,
                ),
            )
        }
        if (!isUser && !message.textEnGloss.isNullOrBlank()) {
            Spacer(Modifier.height(MaterialTheme.spacing.xxs))
            Text(
                message.textEnGloss!!,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = MaterialTheme.spacing.xs),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun Composer(
    suggested: List<ReplyOption>,
    sending: Boolean,
    onSendReply: (ReplyOption) -> Unit,
    onSendText: (String) -> Unit,
) {
    var draft by remember { mutableStateOf("") }

    Surface(
        tonalElevation = 2.dp,
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = MaterialTheme.spacing.screenEdge,
                    vertical = MaterialTheme.spacing.sm,
                ),
        ) {
            if (suggested.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xs),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xs),
                ) {
                    suggested.forEach { reply ->
                        SuggestedChip(
                            reply = reply,
                            enabled = !sending,
                            onClick = { onSendReply(reply) },
                        )
                    }
                }
                Spacer(Modifier.height(MaterialTheme.spacing.sm))
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Type in Slovak…") },
                    shape = RoundedCornerShape(24.dp),
                    maxLines = 4,
                    enabled = !sending,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(
                        onSend = {
                            if (draft.isNotBlank()) {
                                onSendText(draft)
                                draft = ""
                            }
                        },
                    ),
                )
                Spacer(Modifier.width(MaterialTheme.spacing.xs))
                IconButton(
                    onClick = {
                        if (draft.isNotBlank()) {
                            onSendText(draft)
                            draft = ""
                        }
                    },
                    enabled = !sending && draft.isNotBlank(),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}

@Composable
private fun SuggestedChip(
    reply: ReplyOption,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.secondaryContainer,
        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
        modifier = Modifier.clickable(enabled = enabled, onClick = onClick),
    ) {
        Column(
            Modifier.padding(
                horizontal = MaterialTheme.spacing.md,
                vertical = MaterialTheme.spacing.xs,
            ),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    reply.sk,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                if (reply.natural) {
                    Spacer(Modifier.width(MaterialTheme.spacing.xxs))
                    Text("👌", style = MaterialTheme.typography.labelMedium)
                }
            }
            if (reply.enGloss.isNotBlank()) {
                Text(
                    reply.enGloss,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.75f),
                )
            }
        }
    }
}
