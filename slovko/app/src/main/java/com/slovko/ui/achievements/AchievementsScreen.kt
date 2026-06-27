package com.slovko.ui.achievements

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import com.slovko.core.designsystem.IconKeys
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.Achievement

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsScreen(
    onExit: () -> Unit,
    viewModel: AchievementsViewModel = hiltViewModel(),
) {
    val achievements by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Achievements") },
                navigationIcon = {
                    IconButton(onClick = onExit) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
            )
        },
    ) { innerPadding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(MaterialTheme.spacing.screenEdge),
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md),
        ) {
            items(achievements, key = { it.id }) { achievement ->
                BadgeCard(achievement)
            }
        }
    }
}

@Composable
private fun BadgeCard(achievement: Achievement) {
    val unlocked = achievement.unlocked
    val gold = MaterialTheme.slovkoColors.gold

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val ringModifier = if (unlocked) {
                Modifier.border(BorderStroke(3.dp, gold), CircleShape)
            } else {
                Modifier
            }
            Surface(
                modifier = Modifier
                    .size(72.dp)
                    .then(ringModifier)
                    .clip(CircleShape),
                color = if (unlocked) {
                    gold.copy(alpha = 0.18f)
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                },
                shape = CircleShape,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = IconKeys[achievement.iconKey],
                        style = MaterialTheme.typography.headlineMedium,
                        modifier = if (unlocked) Modifier else Modifier.alpha(0.4f),
                    )
                }
            }

            Spacer(Modifier.height(MaterialTheme.spacing.sm))

            Text(
                text = achievement.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (unlocked) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.xs))

            if (unlocked) {
                Text(
                    text = "Unlocked",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = gold,
                    textAlign = TextAlign.Center,
                )
            } else {
                Text(
                    text = "${achievement.progress}/${achievement.threshold}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xxs))
                LinearProgressIndicator(
                    progress = { achievement.fraction },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(CircleShape),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )
            }
        }
    }
}
