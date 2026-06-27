package com.slovko.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.spacing
import com.slovko.domain.GamificationConfig
import com.slovko.domain.model.ThemeMode
import com.slovko.domain.model.UserSettings
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onExit: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val settings by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onExit) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(
                    horizontal = MaterialTheme.spacing.screenEdge,
                    vertical = MaterialTheme.spacing.md,
                ),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md),
        ) {
            LearningSection(settings, viewModel::update)
            NotificationsSection(settings, viewModel::update)
            AppearanceSection(settings, viewModel::update)
            AiPartnerSection(settings, viewModel::update)
            Spacer(Modifier.height(MaterialTheme.spacing.md))
        }
    }
}

@Composable
private fun SettingsCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.lg),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.md),
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            content()
        }
    }
}

@Composable
private fun SettingLabel(text: String, hint: String? = null) {
    Column {
        Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        if (hint != null) {
            Text(
                hint,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SwitchRow(
    label: String,
    hint: String? = null,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SettingLabel(label, hint)
        Spacer(Modifier.width(MaterialTheme.spacing.md))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun LearningSection(
    s: UserSettings,
    update: ((UserSettings) -> UserSettings) -> Unit,
) {
    SettingsCard("Learning") {
        SettingLabel("Daily goal", "How much Slovak each day")
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xs),
        ) {
            GamificationConfig.DAILY_GOAL_TIERS.forEach { (label, goal) ->
                FilterChip(
                    selected = s.dailyGoalXp == goal,
                    onClick = { update { it.copy(dailyGoalXp = goal) } },
                    label = { Text("$label · $goal") },
                    modifier = Modifier.weight(1f),
                    colors = FilterChipDefaults.filterChipColors(),
                )
            }
        }

        SettingLabel(
            "Target retention",
            "How well you want to remember: ${(s.targetRetention * 100).roundToInt()}%",
        )
        Slider(
            value = s.targetRetention,
            onValueChange = { v -> update { it.copy(targetRetention = v) } },
            valueRange = 0.85f..0.95f,
            steps = 9,
        )

        SwitchRow(
            "Sound effects",
            "Chimes and taps as you learn",
            s.soundEffects,
        ) { v -> update { it.copy(soundEffects = v) } }
        SwitchRow(
            "Autoplay audio",
            "Hear new words automatically",
            s.autoplayAudio,
        ) { v -> update { it.copy(autoplayAudio = v) } }
        SwitchRow(
            "Speaking exercises",
            "Practise saying words aloud",
            s.speakingEnabled,
        ) { v -> update { it.copy(speakingEnabled = v) } }
        SwitchRow(
            "Challenge mode",
            "Hearts and a faster pace",
            s.challengeMode,
        ) { v -> update { it.copy(challengeMode = v) } }
    }
}

@Composable
private fun NotificationsSection(
    s: UserSettings,
    update: ((UserSettings) -> UserSettings) -> Unit,
) {
    SettingsCard("Notifications") {
        SwitchRow(
            "Daily reminder",
            "A gentle nudge to practise",
            s.dailyReminderOn,
        ) { v -> update { it.copy(dailyReminderOn = v) } }
        SwitchRow(
            "Streak reminder",
            "Don't let the flame go out",
            s.streakReminderOn,
        ) { v -> update { it.copy(streakReminderOn = v) } }
        SwitchRow(
            "Review reminder",
            "When cards are due",
            s.reviewReminderOn,
        ) { v -> update { it.copy(reviewReminderOn = v) } }
        SwitchRow(
            "Welcome back",
            "A friendly hello after a break",
            s.reengageOn,
        ) { v -> update { it.copy(reengageOn = v) } }

        SettingLabel(
            "Reminder time",
            "Around ${formatHour(s.reminderHour)} each day",
        )
        Slider(
            value = s.reminderHour.toFloat(),
            onValueChange = { v -> update { it.copy(reminderHour = v.roundToInt()) } },
            valueRange = 6f..22f,
            steps = 15,
        )
    }
}

@Composable
private fun AppearanceSection(
    s: UserSettings,
    update: ((UserSettings) -> UserSettings) -> Unit,
) {
    SettingsCard("Appearance") {
        SettingLabel("Theme")
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xs),
        ) {
            ThemeMode.entries.forEach { mode ->
                FilterChip(
                    selected = s.themeMode == mode,
                    onClick = { update { it.copy(themeMode = mode) } },
                    label = { Text(themeLabel(mode)) },
                    modifier = Modifier.weight(1f),
                )
            }
        }

        SwitchRow(
            "Reduced motion",
            "Calmer, fewer animations",
            s.reducedMotion,
        ) { v -> update { it.copy(reducedMotion = v) } }
        SwitchRow(
            "Dynamic color",
            "Match your device wallpaper",
            s.dynamicColor,
        ) { v -> update { it.copy(dynamicColor = v) } }
    }
}

@Composable
private fun AiPartnerSection(
    s: UserSettings,
    update: ((UserSettings) -> UserSettings) -> Unit,
) {
    SettingsCard("AI partner") {
        SwitchRow(
            "Enable AI partner",
            "Chat with Maja powered by your own model",
            s.aiEnabled,
        ) { v -> update { it.copy(aiEnabled = v) } }

        OutlinedTextField(
            value = s.aiEndpoint,
            onValueChange = { v -> update { it.copy(aiEndpoint = v) } },
            label = { Text("Endpoint URL") },
            singleLine = true,
            enabled = s.aiEnabled,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = s.aiApiKey,
            onValueChange = { v -> update { it.copy(aiApiKey = v) } },
            label = { Text("API key") },
            singleLine = true,
            enabled = s.aiEnabled,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

private fun themeLabel(mode: ThemeMode): String = when (mode) {
    ThemeMode.SYSTEM -> "System"
    ThemeMode.LIGHT -> "Light"
    ThemeMode.DARK -> "Dark"
}

private fun formatHour(hour: Int): String {
    val h = hour.coerceIn(0, 23)
    return "%02d:00".format(h)
}
