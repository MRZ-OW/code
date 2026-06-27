package com.slovko.ui.lesson.exercise

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.slovko.core.designsystem.component.OptionChip
import com.slovko.core.designsystem.component.OptionState
import com.slovko.core.designsystem.component.WordTile
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.Exercise
import com.slovko.domain.model.ExerciseType

/**
 * Renders the body of a single exercise according to its [Exercise.type].
 * Pure presentation — all state lives in the caller (LessonViewModel).
 */
@Composable
fun ExerciseBody(
    exercise: Exercise,
    selected: String?,
    onSelect: (String) -> Unit,
    typed: String,
    onTyped: (String) -> Unit,
    revealedCorrect: Boolean,
    onSpeak: (String) -> Unit,
) {
    Column(Modifier.fillMaxWidth()) {
        PromptHeader(exercise, onSpeak)
        Spacer(Modifier.height(MaterialTheme.spacing.lg))

        when (exercise.type) {
            ExerciseType.MCQ,
            ExerciseType.TRANSLATE_SK_EN,
            ExerciseType.LISTEN_CHOOSE,
            ExerciseType.ASPECT_CHOICE,
            -> ChoiceBody(exercise, selected, onSelect, revealedCorrect)

            ExerciseType.WORD_BANK -> WordBankBody(exercise, typed, onTyped, onSelect)

            ExerciseType.TRANSLATE_EN_SK,
            ExerciseType.LISTEN_TYPE,
            ExerciseType.FILL_CASE,
            ExerciseType.DIALOGUE_FILL,
            -> TypeBody(exercise, typed, onTyped)

            ExerciseType.SPEAK -> SpeakBody(exercise, selected, onSelect, onSpeak)

            ExerciseType.MATCH_PAIRS -> ChoiceBody(exercise, selected, onSelect, revealedCorrect)
        }
    }
}

@Composable
private fun PromptHeader(exercise: Exercise, onSpeak: (String) -> Unit) {
    val instruction = instructionFor(exercise.type)
    val hero = exercise.promptSk ?: exercise.promptEn

    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            instruction,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.sm))

        when (exercise.type) {
            ExerciseType.LISTEN_CHOOSE, ExerciseType.LISTEN_TYPE -> {
                // Audio is the prompt — make a big, tappable speaker tile.
                WordTile(
                    text = "Vypočuj si",
                    onSpeak = { onSpeak(exercise.answer) },
                    modifier = Modifier.wrapContentSize(),
                )
            }
            else -> {
                if (hero != null) {
                    Text(
                        hero,
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = if (exercise.promptSk != null) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center,
                    )
                    // If the hero is Slovak, let the learner hear it.
                    if (exercise.promptSk != null) {
                        Spacer(Modifier.height(MaterialTheme.spacing.sm))
                        WordTile(
                            text = "Prehrať",
                            onSpeak = { onSpeak(exercise.promptSk!!) },
                            modifier = Modifier.wrapContentSize(),
                        )
                    }
                }
            }
        }

        exercise.promptEn?.let { en ->
            if (exercise.promptSk != null) {
                Spacer(Modifier.height(MaterialTheme.spacing.xs))
                Text(
                    en,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ChoiceBody(
    exercise: Exercise,
    selected: String?,
    onSelect: (String) -> Unit,
    revealedCorrect: Boolean,
) {
    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm)) {
        exercise.choices.forEachIndexed { i, choice ->
            val state = when {
                revealedCorrect && choice == exercise.answer -> OptionState.CORRECT
                revealedCorrect && choice == selected -> OptionState.WRONG
                choice == selected -> OptionState.SELECTED
                else -> OptionState.DEFAULT
            }
            OptionChip(
                text = choice,
                state = state,
                number = i + 1,
                onClick = { onSelect(choice) },
            )
        }
    }
}

@Composable
private fun SpeakBody(
    exercise: Exercise,
    selected: String?,
    onSelect: (String) -> Unit,
    onSpeak: (String) -> Unit,
) {
    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md),
    ) {
        Text(
            exercise.answer,
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
        )
        WordTile(
            text = "Vypočuj si vzor",
            onSpeak = { onSpeak(exercise.answer) },
            modifier = Modifier.wrapContentSize(),
        )
        // No real recognizer in this build — confirm aloud to advance.
        OptionChip(
            text = "Povedal som to ✓",
            state = if (selected == exercise.answer) OptionState.SELECTED else OptionState.DEFAULT,
            onClick = { onSelect(exercise.answer) },
        )
    }
}

@Composable
private fun WordBankBody(
    exercise: Exercise,
    typed: String,
    onTyped: (String) -> Unit,
    onSelect: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md)) {
        // The sentence being assembled.
        Box(
            Modifier
                .fillMaxWidth()
                .height(64.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Text(
                typed.ifBlank { "…" },
                style = MaterialTheme.typography.headlineSmall,
                color = if (typed.isBlank()) MaterialTheme.colorScheme.onSurfaceVariant
                else MaterialTheme.colorScheme.onSurface,
            )
        }
        // Word bank chips — tapping appends a word.
        FlowChips(
            words = exercise.choices,
            onWord = { word ->
                val next = if (typed.isBlank()) word else "$typed $word"
                onTyped(next)
            },
        )
    }
}

@Composable
private fun FlowChips(words: List<String>, onWord: (String) -> Unit) {
    // Simple stacked rows of two to stay within the design-system primitives.
    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm)) {
        words.chunked(2).forEach { row ->
            androidx.compose.foundation.layout.Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
            ) {
                row.forEach { word ->
                    OptionChip(
                        text = word,
                        state = OptionState.DEFAULT,
                        onClick = { onWord(word) },
                        modifier = Modifier.weight(1f),
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun TypeBody(
    exercise: Exercise,
    typed: String,
    onTyped: (String) -> Unit,
) {
    val slovak = exercise.type != ExerciseType.TRANSLATE_SK_EN
    OutlinedTextField(
        value = typed,
        onValueChange = onTyped,
        modifier = Modifier.fillMaxWidth(),
        textStyle = MaterialTheme.typography.headlineSmall,
        label = { Text(if (slovak) "Napíš po slovensky" else "Type in English") },
        placeholder = { Text(exercise.hint.orEmpty()) },
        singleLine = false,
        keyboardOptions = KeyboardOptions(
            capitalization = KeyboardCapitalization.Sentences,
        ),
    )
}

private fun instructionFor(type: ExerciseType): String = when (type) {
    ExerciseType.MCQ -> "Vyber správnu odpoveď"
    ExerciseType.TRANSLATE_SK_EN -> "Translate to English"
    ExerciseType.TRANSLATE_EN_SK -> "Prelož do slovenčiny"
    ExerciseType.LISTEN_CHOOSE -> "Počúvaj a vyber"
    ExerciseType.LISTEN_TYPE -> "Počúvaj a napíš, čo počuješ"
    ExerciseType.WORD_BANK -> "Zostav vetu zo slov"
    ExerciseType.SPEAK -> "Povedz nahlas"
    ExerciseType.MATCH_PAIRS -> "Vyber správnu dvojicu"
    ExerciseType.FILL_CASE -> "Doplň správny tvar"
    ExerciseType.ASPECT_CHOICE -> "Vyber správny vid"
    ExerciseType.DIALOGUE_FILL -> "Doplň repliku"
}
