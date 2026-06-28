package com.slovko.ui.lesson.exercise

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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

/** Sentinel the match exercise emits via onSelect once every pair is connected. */
const val MATCH_DONE = "DONE"

/** What kind of input an exercise needs — shared by the renderer and the ViewModel. */
enum class ExerciseInput { CHOICE, TEXT, WORDBANK, MATCH, SPEAK }

fun inputModeFor(exercise: Exercise): ExerciseInput = when (exercise.type) {
    ExerciseType.MATCH_PAIRS -> ExerciseInput.MATCH
    ExerciseType.SPEAK -> ExerciseInput.SPEAK
    ExerciseType.WORD_BANK -> ExerciseInput.WORDBANK
    ExerciseType.LISTEN_TYPE -> ExerciseInput.TEXT
    else -> if (exercise.choices.isNotEmpty()) ExerciseInput.CHOICE else ExerciseInput.TEXT
}

/**
 * Renders the body of a single exercise. All instructions and chrome are in
 * ENGLISH so a non-Slovak speaker always knows what to do; only the Slovak
 * content being taught is shown in Slovak.
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

        when (inputModeFor(exercise)) {
            ExerciseInput.CHOICE -> ChoiceBody(exercise, selected, onSelect, revealedCorrect)
            ExerciseInput.WORDBANK -> WordBankBody(exercise, typed, onTyped)
            ExerciseInput.TEXT -> TypeBody(exercise, typed, onTyped)
            ExerciseInput.SPEAK -> SpeakBody(exercise, selected, onSelect, onSpeak)
            ExerciseInput.MATCH -> MatchBody(exercise, onSelect, onSpeak)
        }
    }
}

@Composable
private fun PromptHeader(exercise: Exercise, onSpeak: (String) -> Unit) {
    val instruction = instructionFor(exercise)

    // Which language is the question in?  For "produce Slovak" tasks the English
    // sentence is the prompt; otherwise prefer the Slovak hero word.
    val heroIsEnglishTask = exercise.type == ExerciseType.TRANSLATE_EN_SK ||
        exercise.type == ExerciseType.WORD_BANK
    val hero = if (heroIsEnglishTask) {
        exercise.promptEn ?: exercise.promptSk
    } else {
        exercise.promptSk ?: exercise.promptEn
    }
    val heroIsSlovak = hero != null && hero == exercise.promptSk && !heroIsEnglishTask

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
                WordTile(
                    text = "🔊  Tap to listen",
                    onSpeak = { onSpeak(exercise.answer) },
                    modifier = Modifier.wrapContentSize(),
                )
            }
            // SPEAK and MATCH render their own prompt/content in the body — the
            // header shows only the instruction to avoid showing it twice.
            ExerciseType.SPEAK, ExerciseType.MATCH_PAIRS -> Unit
            else -> {
                if (hero != null) {
                    Text(
                        hero,
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = if (heroIsSlovak) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center,
                    )
                    if (heroIsSlovak) {
                        Spacer(Modifier.height(MaterialTheme.spacing.sm))
                        WordTile(
                            text = "🔊  Tap to hear",
                            onSpeak = { onSpeak(hero) },
                            modifier = Modifier.wrapContentSize(),
                        )
                    }
                    // English gloss under a Slovak hero.
                    if (heroIsSlovak) {
                        exercise.promptEn?.let { en ->
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
private fun MatchBody(
    exercise: Exercise,
    onSelect: (String) -> Unit,
    onSpeak: (String) -> Unit,
) {
    // Left = Slovak (in order), Right = English (shuffled), matched by index.
    val pairs = exercise.pairs
    val rightOrder = remember(exercise.id) { pairs.indices.shuffled() }
    val matched = remember(exercise.id) { mutableStateListOf<Int>() }
    var selectedLeft by remember(exercise.id) { mutableIntStateOf(-1) }
    var wrongFlash by remember(exercise.id) { mutableIntStateOf(-1) }

    LaunchedEffect(matched.size) {
        if (pairs.isNotEmpty() && matched.size == pairs.size) onSelect(MATCH_DONE)
    }

    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
    ) {
        // Slovak column
        Column(
            Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
        ) {
            pairs.forEachIndexed { i, pair ->
                val done = matched.contains(i)
                OptionChip(
                    text = pair.first,
                    state = when {
                        done -> OptionState.CORRECT
                        selectedLeft == i -> OptionState.SELECTED
                        else -> OptionState.DEFAULT
                    },
                    onClick = {
                        if (!done) {
                            selectedLeft = i
                            onSpeak(pair.first)
                        }
                    },
                )
            }
        }
        // English column (shuffled)
        Column(
            Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
        ) {
            rightOrder.forEach { idx ->
                val done = matched.contains(idx)
                OptionChip(
                    text = pairs[idx].second,
                    state = when {
                        done -> OptionState.CORRECT
                        wrongFlash == idx -> OptionState.WRONG
                        else -> OptionState.DEFAULT
                    },
                    onClick = {
                        if (!done) {
                            if (selectedLeft == idx) {
                                matched.add(idx)
                                selectedLeft = -1
                                wrongFlash = -1
                            } else if (selectedLeft >= 0) {
                                wrongFlash = idx
                                selectedLeft = -1
                            }
                        }
                    },
                )
            }
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
        exercise.promptEn?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
        WordTile(
            text = "🔊  Tap to hear it",
            onSpeak = { onSpeak(exercise.answer) },
            modifier = Modifier.wrapContentSize(),
        )
        OptionChip(
            text = "I said it ✓",
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
) {
    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md)) {
        // The sentence being assembled — tap to clear and start over.
        Box(
            Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clickable { onTyped("") },
            contentAlignment = Alignment.CenterStart,
        ) {
            Text(
                typed.ifBlank { "Tap the words below…" },
                style = MaterialTheme.typography.headlineSmall,
                color = if (typed.isBlank()) MaterialTheme.colorScheme.onSurfaceVariant
                else MaterialTheme.colorScheme.onSurface,
            )
        }
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
    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm)) {
        words.chunked(2).forEach { row ->
            Row(
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
    val typeEnglish = exercise.type == ExerciseType.TRANSLATE_SK_EN
    OutlinedTextField(
        value = typed,
        onValueChange = onTyped,
        modifier = Modifier.fillMaxWidth(),
        textStyle = MaterialTheme.typography.headlineSmall,
        label = { Text(if (typeEnglish) "Type in English" else "Type in Slovak") },
        placeholder = { exercise.hint?.let { Text(it) } },
        singleLine = false,
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
    )
}

private fun instructionFor(exercise: Exercise): String = when (inputModeFor(exercise)) {
    ExerciseInput.MATCH -> "Tap a Slovak word, then its English match"
    ExerciseInput.SPEAK -> "Say it out loud"
    ExerciseInput.WORDBANK -> "Tap the words to build the Slovak sentence"
    ExerciseInput.TEXT -> when (exercise.type) {
        ExerciseType.LISTEN_TYPE -> "Listen and type what you hear"
        ExerciseType.TRANSLATE_SK_EN -> "Type the English translation"
        ExerciseType.TRANSLATE_EN_SK -> "Type it in Slovak"
        else -> "Type the missing word"
    }
    ExerciseInput.CHOICE -> when (exercise.type) {
        ExerciseType.LISTEN_CHOOSE -> "Listen, then tap what you heard"
        ExerciseType.TRANSLATE_SK_EN -> "Tap the English meaning"
        ExerciseType.TRANSLATE_EN_SK -> "Tap the Slovak translation"
        ExerciseType.ASPECT_CHOICE -> "Tap the correct verb"
        ExerciseType.FILL_CASE -> "Tap the correct form"
        ExerciseType.DIALOGUE_FILL -> "Tap the best reply"
        else -> "Tap the correct answer"
    }
}
