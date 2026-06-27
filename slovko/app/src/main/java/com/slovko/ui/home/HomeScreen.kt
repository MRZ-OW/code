package com.slovko.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.IconKeys
import com.slovko.core.designsystem.component.CicmanyDivider
import com.slovko.core.designsystem.component.NodeState
import com.slovko.core.designsystem.component.SkillNode
import com.slovko.core.designsystem.component.StreakFlame
import com.slovko.core.designsystem.component.XpBar
import com.slovko.core.designsystem.spacing

@Composable
fun HomeScreen(
    onOpenLesson: (String) -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (val s = state) {
        is HomeUiState.Loading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is HomeUiState.Data -> HomeContent(s, onOpenLesson, onOpenSettings)
    }
}

@Composable
private fun HomeContent(
    data: HomeUiState.Data,
    onOpenLesson: (String) -> Unit,
    onOpenSettings: () -> Unit,
) {
    val spacing = MaterialTheme.spacing
    Column(Modifier.fillMaxSize()) {
        // Sticky top bar: streak, gems, settings.
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(horizontal = spacing.screenEdge, vertical = spacing.sm)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StreakFlame(count = data.stats.currentStreak)
                    Spacer(Modifier.width(spacing.md))
                    Text(
                        "💎 ${data.stats.gems}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = onOpenSettings) {
                        Icon(
                            Icons.Filled.Settings,
                            contentDescription = "Settings",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Spacer(Modifier.height(spacing.sm))
                XpBar(
                    progress = data.goal.progress,
                    label = "${data.goal.earnedXp}/${data.goal.goalXp} XP",
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                horizontal = spacing.screenEdge,
                vertical = spacing.lg,
            ),
            verticalArrangement = Arrangement.spacedBy(spacing.lg),
        ) {
            data.units.forEach { unit ->
                item(key = "unit-${unit.unitId}") {
                    UnitHeader(name = unit.name, cefr = unit.cefr)
                }
                item(key = "divider-${unit.unitId}") {
                    CicmanyDivider()
                }
                itemsIndexed(unit.skills) { index, skill ->
                    SkillRow(
                        skill = skill,
                        leftAligned = index % 2 == 0,
                        onClick = {
                            if (skill.nodeState != NodeState.LOCKED) {
                                skill.nextLessonId?.let(onOpenLesson)
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun UnitHeader(name: String, cefr: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            name,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f, fill = false),
        )
        Spacer(Modifier.width(MaterialTheme.spacing.xs))
        CefrChip(cefr)
    }
}

@Composable
private fun CefrChip(cefr: String) {
    Surface(
        shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.secondaryContainer,
    ) {
        Text(
            cefr,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun SkillRow(
    skill: SkillNodeUi,
    leftAligned: Boolean,
    onClick: () -> Unit,
) {
    val alignment = if (leftAligned) Alignment.Start else Alignment.End
    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = alignment,
    ) {
        // Indent the node toward one side to create a winding path.
        Box(
            Modifier
                .fillMaxWidth()
                .padding(
                    start = if (leftAligned) 24.dp else 0.dp,
                    end = if (leftAligned) 0.dp else 24.dp,
                ),
            contentAlignment = if (leftAligned) Alignment.CenterStart else Alignment.CenterEnd,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                SkillNode(
                    state = skill.nodeState,
                    glyph = IconKeys[skill.iconKey],
                    progress = skill.progress,
                    onClick = onClick,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xs))
                Text(
                    skill.title,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    color = if (skill.nodeState == NodeState.LOCKED) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    },
                    modifier = Modifier.width(120.dp),
                )
            }
        }
    }
}
