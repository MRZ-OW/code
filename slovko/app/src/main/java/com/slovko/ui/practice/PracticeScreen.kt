package com.slovko.ui.practice

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import com.slovko.core.designsystem.component.MajaMascot
import com.slovko.core.designsystem.component.PrimaryButton
import com.slovko.core.designsystem.component.SecondaryButton
import com.slovko.core.designsystem.component.WordTile
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.CardDirection
import com.slovko.domain.model.Grade

@Composable
fun PracticeScreen(viewModel: PracticeViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Box(Modifier.fillMaxSize().padding(MaterialTheme.spacing.screenEdge)) {
        when (val s = state) {
            is PracticeUiState.Loading -> {
                Box(Modifier.fillMaxSize(), Alignment.Center) { Text("…") }
            }
            is PracticeUiState.Empty -> EmptyState()
            is PracticeUiState.Reviewing -> ReviewingState(s, viewModel)
            is PracticeUiState.Done -> DoneState(s, onAgain = viewModel::load)
        }
    }
}

@Composable
private fun EmptyState() {
    Column(
        Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MajaMascot(pose = "proud")
        Spacer(Modifier.height(16.dp))
        Text("All caught up!", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(8.dp))
        Text(
            "No cards are due right now. Finish a lesson to grow your deck.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ReviewingState(s: PracticeUiState.Reviewing, viewModel: PracticeViewModel) {
    val front = if (s.card.direction == CardDirection.SK_TO_EN) s.card.card.sk else s.card.card.en
    val back = if (s.card.direction == CardDirection.SK_TO_EN) s.card.card.en else s.card.card.sk

    Column(Modifier.fillMaxSize()) {
        LinearProgressIndicator(
            progress = { (s.index).toFloat() / s.total },
            modifier = Modifier.fillMaxWidth().height(8.dp),
        )
        Spacer(Modifier.height(8.dp))
        Text("${s.index + 1} / ${s.total}", style = MaterialTheme.typography.labelLarge)

        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        front,
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                    )
                    if (s.revealed) {
                        Spacer(Modifier.height(16.dp))
                        Text(
                            back,
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.primary,
                            textAlign = TextAlign.Center,
                        )
                        s.card.card.exampleSk?.let {
                            Spacer(Modifier.height(12.dp))
                            WordTile(text = it, onSpeak = viewModel::speak)
                        }
                    }
                }
            }
        }

        if (!s.revealed) {
            PrimaryButton(
                text = "Show answer",
                onClick = viewModel::reveal,
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GradeButton("Again", Grade.AGAIN, viewModel, Modifier.weight(1f))
                GradeButton("Hard", Grade.HARD, viewModel, Modifier.weight(1f))
                GradeButton("Good", Grade.GOOD, viewModel, Modifier.weight(1f))
                GradeButton("Easy", Grade.EASY, viewModel, Modifier.weight(1f))
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun GradeButton(label: String, grade: Grade, viewModel: PracticeViewModel, modifier: Modifier) {
    SecondaryButton(text = label, onClick = { viewModel.grade(grade) }, modifier = modifier)
}

@Composable
private fun DoneState(s: PracticeUiState.Done, onAgain: () -> Unit) {
    Column(
        Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MajaMascot(pose = "celebrating")
        Spacer(Modifier.height(16.dp))
        Text("Hotovo! 🎉", style = MaterialTheme.typography.displayMedium)
        Spacer(Modifier.height(8.dp))
        Text(
            "Reviewed ${s.reviewed} cards · +${s.xpEarned} XP",
            style = MaterialTheme.typography.bodyLarge,
        )
        Spacer(Modifier.height(24.dp))
        PrimaryButton(text = "Review more", onClick = onAgain, modifier = Modifier.widthIn(min = 200.dp))
    }
}
