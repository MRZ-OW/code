package com.slovko.ui.chat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.component.MajaMascot
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.Phrase
import com.slovko.domain.model.Register

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhrasebookScreen(
    onExit: () -> Unit,
    viewModel: PhrasebookViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Phrasebook") },
                navigationIcon = {
                    IconButton(onClick = onExit) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        horizontal = MaterialTheme.spacing.screenEdge,
                        vertical = MaterialTheme.spacing.xs,
                    ),
                singleLine = true,
                leadingIcon = {
                    Icon(Icons.Filled.Search, contentDescription = null)
                },
                placeholder = { Text("Search Slovak or English…") },
            )

            if (state.phrases.isEmpty()) {
                EmptyPhrasebook(query = state.query)
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(
                        horizontal = MaterialTheme.spacing.screenEdge,
                        vertical = MaterialTheme.spacing.sm,
                    ),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
                ) {
                    items(state.phrases, key = { it.id }) { phrase ->
                        PhraseRow(
                            phrase = phrase,
                            onSpeak = { viewModel.speak(phrase.sk) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PhraseRow(
    phrase: Phrase,
    onSpeak: () -> Unit,
) {
    val clipboard = LocalClipboardManager.current
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    phrase.sk,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xxs))
                Text(
                    phrase.en,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xs))
                RegisterChip(register = phrase.register)
                phrase.note?.let {
                    Spacer(Modifier.height(MaterialTheme.spacing.xs))
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Spacer(Modifier.width(MaterialTheme.spacing.xs))

            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onSpeak) {
                    Icon(
                        Icons.Filled.VolumeUp,
                        contentDescription = "Play pronunciation",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                IconButton(onClick = { clipboard.setText(AnnotatedString(phrase.sk)) }) {
                    Icon(
                        Icons.Filled.ContentCopy,
                        contentDescription = "Copy Slovak",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun RegisterChip(register: Register) {
    val label = when (register) {
        Register.INFORMAL -> "Informal"
        Register.NEUTRAL -> "Neutral"
        Register.FORMAL -> "Formal"
    }
    val container = when (register) {
        Register.INFORMAL -> MaterialTheme.colorScheme.tertiaryContainer
        Register.NEUTRAL -> MaterialTheme.colorScheme.secondaryContainer
        Register.FORMAL -> MaterialTheme.colorScheme.primaryContainer
    }
    val content = when (register) {
        Register.INFORMAL -> MaterialTheme.colorScheme.onTertiaryContainer
        Register.NEUTRAL -> MaterialTheme.colorScheme.onSecondaryContainer
        Register.FORMAL -> MaterialTheme.colorScheme.onPrimaryContainer
    }
    Surface(
        shape = MaterialTheme.shapes.extraSmall,
        color = container,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            color = content,
            modifier = Modifier.padding(
                horizontal = MaterialTheme.spacing.xs,
                vertical = MaterialTheme.spacing.xxs,
            ),
        )
    }
}

@Composable
private fun EmptyPhrasebook(query: String) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(MaterialTheme.spacing.screenEdge),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MajaMascot(pose = "thinking")
        Spacer(Modifier.height(MaterialTheme.spacing.md))
        Text(
            if (query.isBlank()) "No phrases yet" else "Nothing here yet",
            style = MaterialTheme.typography.headlineSmall,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.xs))
        Text(
            if (query.isBlank()) {
                "Phrases will appear here as your phrasebook grows."
            } else {
                "No phrases match “$query”. Try another word."
            },
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
