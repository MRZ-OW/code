package com.slovko.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.component.CicmanyDivider
import com.slovko.core.designsystem.component.MajaMascot
import com.slovko.core.designsystem.component.StreakFlame
import com.slovko.core.designsystem.component.XpBar
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.HeatDay
import com.slovko.domain.model.UserStats

@Composable
fun ProfileScreen(
    onOpenAchievements: () -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val stats = state.stats

    if (state.loading || stats == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(MaterialTheme.spacing.screenEdge),
        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.lg),
    ) {
        ProfileHeader(stats = stats, onOpenSettings = onOpenSettings)

        StatGrid(stats = stats)

        HeatmapCard(heatmap = state.heatmap)

        AchievementsCard(
            unlocked = state.achievementsUnlocked,
            total = state.achievementsTotal,
            onClick = onOpenAchievements,
        )

        Spacer(Modifier.height(MaterialTheme.spacing.md))
    }
}

@Composable
private fun ProfileHeader(stats: UserStats, onOpenSettings: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        ),
    ) {
        Box(Modifier.fillMaxWidth()) {
            IconButton(
                onClick = onOpenSettings,
                modifier = Modifier.align(Alignment.TopEnd),
            ) {
                Icon(
                    Icons.Filled.Settings,
                    contentDescription = "Settings",
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(MaterialTheme.spacing.lg),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                MajaMascot(pose = "proud", size = 104)
                Spacer(Modifier.height(MaterialTheme.spacing.sm))
                Text(
                    stats.displayName,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xxs))
                Text(
                    "Level ${stats.level}",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )

                Spacer(Modifier.height(MaterialTheme.spacing.md))
                val into = stats.xpIntoLevel
                val needed = stats.xpForNextLevel
                XpBar(
                    progress = if (needed <= 0) 1f else into.toFloat() / needed,
                    modifier = Modifier.fillMaxWidth(),
                    label = "$into / $needed XP to level ${stats.level + 1}",
                )

                Spacer(Modifier.height(MaterialTheme.spacing.md))
                StreakFlame(count = stats.currentStreak)
                Text(
                    "day streak",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                )
            }
        }
    }
}

@Composable
private fun StatGrid(stats: UserStats) {
    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm)) {
        Row(horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm)) {
            StatTile("⭐", "${stats.totalXp}", "Total XP", Modifier.weight(1f))
            StatTile("📖", "${stats.wordsLearned}", "Words learned", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm)) {
            StatTile("🔥", "${stats.longestStreak}", "Longest streak", Modifier.weight(1f))
            StatTile("💎", "${stats.gems}", "Gems", Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatTile(glyph: String, value: String, label: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(glyph, style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(MaterialTheme.spacing.xs))
            Text(
                value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.xxs))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun HeatmapCard(heatmap: List<HeatDay>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.padding(MaterialTheme.spacing.md)) {
            Text(
                "Your last weeks",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.xs))
            CicmanyDivider()
            Spacer(Modifier.height(MaterialTheme.spacing.md))

            val gold = MaterialTheme.slovkoColors.gold
            val empty = MaterialTheme.colorScheme.surfaceVariant
            val maxXp = heatmap.maxOfOrNull { it.xp }?.coerceAtLeast(1) ?: 1
            val columns = 10

            Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xxs)) {
                heatmap.chunked(columns).forEach { week ->
                    Row(horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xxs)) {
                        for (col in 0 until columns) {
                            val day = week.getOrNull(col)
                            val color = when {
                                day == null -> empty
                                day.met -> gold
                                day.xp > 0 -> gold.copy(
                                    alpha = (0.2f + 0.6f * (day.xp.toFloat() / maxXp)).coerceIn(0.2f, 0.85f),
                                )
                                else -> empty
                            }
                            Box(
                                Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(color),
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(MaterialTheme.spacing.sm))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Less",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.width(MaterialTheme.spacing.xs))
                listOf(0.2f, 0.45f, 0.7f, 1f).forEach { a ->
                    Box(
                        Modifier
                            .height(12.dp)
                            .width(12.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(gold.copy(alpha = a)),
                    )
                    Spacer(Modifier.width(MaterialTheme.spacing.xxs))
                }
                Spacer(Modifier.width(MaterialTheme.spacing.xxs))
                Text(
                    "More",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun AchievementsCard(unlocked: Int, total: Int, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("🏆", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.width(MaterialTheme.spacing.md))
            Column(Modifier.weight(1f)) {
                Text(
                    "Achievements",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xxs))
                Text(
                    "$unlocked/$total unlocked",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
