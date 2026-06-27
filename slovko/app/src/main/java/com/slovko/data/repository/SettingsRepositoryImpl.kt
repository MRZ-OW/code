package com.slovko.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.slovko.data.datastore.PrefKeys
import com.slovko.domain.model.ThemeMode
import com.slovko.domain.model.UserSettings
import com.slovko.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : SettingsRepository {

    override val settings: Flow<UserSettings> = dataStore.data.map { it.toSettings() }

    override suspend fun current(): UserSettings = settings.first()

    override suspend fun update(transform: (UserSettings) -> UserSettings) {
        dataStore.edit { prefs ->
            val updated = transform(prefs.toSettings())
            prefs[PrefKeys.ONBOARDED] = updated.onboarded
            prefs[PrefKeys.DAILY_GOAL] = updated.dailyGoalXp
            prefs[PrefKeys.TARGET_RETENTION] = updated.targetRetention
            prefs[PrefKeys.REMINDER_HOUR] = updated.reminderHour
            prefs[PrefKeys.REMINDER_MINUTE] = updated.reminderMinute
            prefs[PrefKeys.SMART_TIMING] = updated.smartTiming
            prefs[PrefKeys.DAILY_REMINDER] = updated.dailyReminderOn
            prefs[PrefKeys.STREAK_REMINDER] = updated.streakReminderOn
            prefs[PrefKeys.REVIEW_REMINDER] = updated.reviewReminderOn
            prefs[PrefKeys.REENGAGE] = updated.reengageOn
            prefs[PrefKeys.QUIET_START] = updated.quietHoursStart
            prefs[PrefKeys.QUIET_END] = updated.quietHoursEnd
            prefs[PrefKeys.SOUND_FX] = updated.soundEffects
            prefs[PrefKeys.AUTOPLAY] = updated.autoplayAudio
            prefs[PrefKeys.SPEAKING] = updated.speakingEnabled
            prefs[PrefKeys.CHALLENGE] = updated.challengeMode
            prefs[PrefKeys.REDUCED_MOTION] = updated.reducedMotion
            prefs[PrefKeys.THEME_MODE] = updated.themeMode.name
            prefs[PrefKeys.DYNAMIC_COLOR] = updated.dynamicColor
            prefs[PrefKeys.AI_ENDPOINT] = updated.aiEndpoint
            prefs[PrefKeys.AI_KEY] = updated.aiApiKey
            prefs[PrefKeys.AI_ENABLED] = updated.aiEnabled
        }
    }

    private fun Preferences.toSettings(): UserSettings {
        val d = UserSettings()
        return UserSettings(
            onboarded = this[PrefKeys.ONBOARDED] ?: d.onboarded,
            dailyGoalXp = this[PrefKeys.DAILY_GOAL] ?: d.dailyGoalXp,
            targetRetention = this[PrefKeys.TARGET_RETENTION] ?: d.targetRetention,
            reminderHour = this[PrefKeys.REMINDER_HOUR] ?: d.reminderHour,
            reminderMinute = this[PrefKeys.REMINDER_MINUTE] ?: d.reminderMinute,
            smartTiming = this[PrefKeys.SMART_TIMING] ?: d.smartTiming,
            dailyReminderOn = this[PrefKeys.DAILY_REMINDER] ?: d.dailyReminderOn,
            streakReminderOn = this[PrefKeys.STREAK_REMINDER] ?: d.streakReminderOn,
            reviewReminderOn = this[PrefKeys.REVIEW_REMINDER] ?: d.reviewReminderOn,
            reengageOn = this[PrefKeys.REENGAGE] ?: d.reengageOn,
            quietHoursStart = this[PrefKeys.QUIET_START] ?: d.quietHoursStart,
            quietHoursEnd = this[PrefKeys.QUIET_END] ?: d.quietHoursEnd,
            soundEffects = this[PrefKeys.SOUND_FX] ?: d.soundEffects,
            autoplayAudio = this[PrefKeys.AUTOPLAY] ?: d.autoplayAudio,
            speakingEnabled = this[PrefKeys.SPEAKING] ?: d.speakingEnabled,
            challengeMode = this[PrefKeys.CHALLENGE] ?: d.challengeMode,
            reducedMotion = this[PrefKeys.REDUCED_MOTION] ?: d.reducedMotion,
            themeMode = this[PrefKeys.THEME_MODE]?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() } ?: d.themeMode,
            dynamicColor = this[PrefKeys.DYNAMIC_COLOR] ?: d.dynamicColor,
            aiEndpoint = this[PrefKeys.AI_ENDPOINT] ?: d.aiEndpoint,
            aiApiKey = this[PrefKeys.AI_KEY] ?: d.aiApiKey,
            aiEnabled = this[PrefKeys.AI_ENABLED] ?: d.aiEnabled,
        )
    }
}
