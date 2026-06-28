package com.slovko.ui.chathub

import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.IconKeys
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.ChatScenario

@Composable
fun ChatHubScreen(
    onOpenChat: (String) -> Unit,
    onOpenPhrasebook: () -> Unit,
    viewModel: ChatHubViewModel = hiltViewModel(),
) {
    val scenarios by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = MaterialTheme.spacing.screenEdge,
            end = MaterialTheme.spacing.screenEdge,
            top = MaterialTheme.spacing.lg,
            bottom = MaterialTheme.spacing.xl,
        ),
        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
    ) {
        item {
            Text(
                "Chat practice",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.xxs))
            Text(
                "Practice real conversations",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.md))
        }

        item {
            PhrasebookCard(onClick = onOpenPhrasebook)
            Spacer(Modifier.height(MaterialTheme.spacing.xs))
        }

        items(scenarios, key = { it.id }) { scenario ->
            ScenarioCard(
                scenario = scenario,
                onClick = { if (!scenario.locked) onOpenChat(scenario.id) },
            )
        }
    }
}

@Composable
private fun PhrasebookCard(onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        ),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.lg),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("📒", style = MaterialTheme.typography.displaySmall)
            Spacer(Modifier.size(MaterialTheme.spacing.md))
            Column(Modifier.weight(1f)) {
                Text(
                    "Texting phrasebook",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xxs))
                Text(
                    "Handy lines for every chat",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun ScenarioCard(
    scenario: ChatScenario,
    onClick: () -> Unit,
) {
    val locked = scenario.locked
    val baseModifier = Modifier.fillMaxWidth()
    val cardModifier = if (locked) baseModifier else baseModifier.clickable { onClick() }

    Card(
        modifier = cardModifier,
        colors = CardDefaults.cardColors(
            containerColor = if (locked) {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            } else {
                MaterialTheme.colorScheme.surfaceContainer
            },
        ),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(48.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    IconKeys[scenario.iconKey],
                    style = MaterialTheme.typography.headlineMedium,
                )
            }
            Spacer(Modifier.size(MaterialTheme.spacing.md))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        scenario.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (locked) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        },
                    )
                    if (locked) {
                        Spacer(Modifier.size(MaterialTheme.spacing.xs))
                        Text("🔒", style = MaterialTheme.typography.titleMedium)
                    }
                }
                Spacer(Modifier.height(MaterialTheme.spacing.xxs))
                Text(
                    scenario.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xs))
                CefrChip(scenario.cefrLevel, dimmed = locked)
            }
        }
    }
}

@Composable
private fun CefrChip(level: String, dimmed: Boolean) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = if (dimmed) {
            MaterialTheme.colorScheme.surfaceVariant
        } else {
            MaterialTheme.slovkoColors.gold.copy(alpha = 0.20f)
        },
    ) {
        Text(
            level,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}
