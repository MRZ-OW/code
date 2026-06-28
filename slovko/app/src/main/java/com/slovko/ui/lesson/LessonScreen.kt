package com.slovko.ui.lesson

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.LocalReducedMotion
import com.slovko.core.designsystem.component.ConfettiOverlay
import com.slovko.core.designsystem.component.MajaMascot
import com.slovko.core.designsystem.component.PrimaryButton
import com.slovko.core.designsystem.component.WordTile
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.Feedback
import com.slovko.ui.lesson.exercise.ExerciseBody

@Composable
fun LessonScreen(
    lessonId: String,
    onExit: () -> Unit,
    viewModel: LessonViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(lessonId) { viewModel.start(lessonId) }

    Box(Modifier.fillMaxSize()) {
        when (val s = state) {
            is LessonUiState.Loading -> LoadingState()
            is LessonUiState.Error -> ErrorState(onExit)
            is LessonUiState.Active -> ActiveState(s, viewModel, onExit)
            is LessonUiState.Completed -> CompletedState(s, onExit)
        }
    }
}

@Composable
private fun LoadingState() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ErrorState(onExit: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(MaterialTheme.spacing.screenEdge),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MajaMascot(pose = "worried")
        Spacer(Modifier.height(MaterialTheme.spacing.md))
        Text("Couldn't load this lesson", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(MaterialTheme.spacing.xs))
        Text(
            "Please try again in a moment.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        PrimaryButton(text = "Back", onClick = onExit)
    }
}

@Composable
private fun ActiveState(
    s: LessonUiState.Active,
    viewModel: LessonViewModel,
    onExit: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        // Top bar: close + progress.
        Row(
            Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = MaterialTheme.spacing.sm,
                    vertical = MaterialTheme.spacing.xs,
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
        ) {
            IconButton(onClick = onExit) {
                Icon(Icons.Filled.Close, contentDescription = "Close")
            }
            LinearProgressIndicator(
                progress = { s.progress },
                modifier = Modifier
                    .weight(1f)
                    .height(10.dp)
                    .clip(RoundedCornerShape(8.dp)),
            )
        }

        // Body — scrollable so long exercises and feedback never clip.
        Column(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = MaterialTheme.spacing.screenEdge)
                .padding(top = MaterialTheme.spacing.lg),
        ) {
            ExerciseBody(
                exercise = s.exercise,
                selected = s.selected,
                onSelect = viewModel::select,
                typed = s.typed,
                onTyped = viewModel::setTyped,
                revealedCorrect = s.feedback != null,
                onSpeak = viewModel::speak,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.lg))
        }

        // Bottom action zone — feedback banner + primary button.
        Column(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.screenEdge),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md),
        ) {
            AnimatedVisibility(visible = s.feedback != null) {
                s.feedback?.let { FeedbackBanner(it, viewModel) }
            }

            val canCheck = s.selected != null || s.typed.isNotBlank()
            PrimaryButton(
                text = if (s.feedback != null) "Continue" else "Check",
                onClick = {
                    if (s.feedback != null) viewModel.continueNext() else viewModel.check()
                },
                enabled = s.feedback != null || canCheck,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun FeedbackBanner(feedback: Feedback, viewModel: LessonViewModel) {
    val container = if (feedback.correct) {
        MaterialTheme.slovkoColors.success.copy(alpha = 0.16f)
    } else {
        MaterialTheme.colorScheme.errorContainer
    }
    val accent = if (feedback.correct) {
        MaterialTheme.slovkoColors.success
    } else {
        MaterialTheme.colorScheme.error
    }

    Surface(
        color = container,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(MaterialTheme.spacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (feedback.correct) "🎉" else "💡",
                    style = MaterialTheme.typography.titleLarge,
                )
                Spacer(Modifier.size(MaterialTheme.spacing.xs))
                Text(
                    feedback.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = accent,
                )
            }
            if (!feedback.correct) {
                Spacer(Modifier.height(MaterialTheme.spacing.xs))
                Text(
                    "Correct answer:",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(MaterialTheme.spacing.xs))
                WordTile(
                    text = feedback.correctAnswer,
                    onSpeak = { viewModel.speak(feedback.correctAnswer) },
                )
                feedback.explanation?.let {
                    Spacer(Modifier.height(MaterialTheme.spacing.xs))
                    Text(
                        it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun CompletedState(s: LessonUiState.Completed, onExit: () -> Unit) {
    val reduced = LocalReducedMotion.current

    val targetXp = s.xpEarned
    val targetAcc = (s.accuracy * 100f).toInt()
    val targetSec = (s.durationMs / 1000L).toInt()

    val xp by animateIntAsState(
        targetValue = targetXp,
        animationSpec = tween(if (reduced) 0 else 900, easing = LinearEasing),
        label = "xp",
    )
    val acc by animateIntAsState(
        targetValue = targetAcc,
        animationSpec = tween(if (reduced) 0 else 900, easing = LinearEasing),
        label = "acc",
    )
    val secs by animateIntAsState(
        targetValue = targetSec,
        animationSpec = tween(if (reduced) 0 else 900, easing = LinearEasing),
        label = "secs",
    )

    Box(Modifier.fillMaxSize()) {
        ConfettiOverlay(show = true, modifier = Modifier.align(Alignment.TopCenter))

        Column(
            Modifier
                .fillMaxSize()
                .padding(MaterialTheme.spacing.screenEdge),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            MajaMascot(pose = "celebrating", size = 120)
            Spacer(Modifier.height(MaterialTheme.spacing.md))
            Text(
                "Lesson complete!",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.xs))
            Text(
                "Great work — keep it up!",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.xl))

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
            ) {
                StatCard(
                    label = "XP",
                    value = "+$xp",
                    accent = MaterialTheme.slovkoColors.gold,
                    modifier = Modifier.weight(1f),
                )
                StatCard(
                    label = "Accuracy",
                    value = "$acc%",
                    accent = MaterialTheme.slovkoColors.success,
                    modifier = Modifier.weight(1f),
                )
                StatCard(
                    label = "Time",
                    value = formatDuration(secs),
                    accent = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.xl))

            PrimaryButton(
                text = "Continue",
                onClick = onExit,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: String,
    accent: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainer,
        shape = RoundedCornerShape(20.dp),
        modifier = modifier,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(vertical = MaterialTheme.spacing.md, horizontal = MaterialTheme.spacing.xs),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = accent,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(MaterialTheme.spacing.xxs))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun formatDuration(totalSeconds: Int): String {
    val m = totalSeconds / 60
    val s = totalSeconds % 60
    return if (m > 0) "${m}m ${s}s" else "${s}s"
}
