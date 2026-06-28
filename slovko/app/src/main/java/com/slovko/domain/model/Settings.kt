package com.slovko.domain.model

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class UserSettings(
    val onboarded: Boolean = false,
    val dailyGoalXp: Int = 60,
    val targetRetention: Float = 0.90f,
    val reminderHour: Int = 19,
    val reminderMinute: Int = 0,
    val smartTiming: Boolean = true,
    val dailyReminderOn: Boolean = true,
    val streakReminderOn: Boolean = true,
    val reviewReminderOn: Boolean = true,
    val reengageOn: Boolean = true,
    val quietHoursStart: Int = 22,
    val quietHoursEnd: Int = 7,
    val soundEffects: Boolean = true,
    val autoplayAudio: Boolean = true,
    val speakingEnabled: Boolean = true,
    val challengeMode: Boolean = false,
    val reducedMotion: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true,
    val aiEndpoint: String = "",
    val aiApiKey: String = "",
    val aiEnabled: Boolean = false,
)
