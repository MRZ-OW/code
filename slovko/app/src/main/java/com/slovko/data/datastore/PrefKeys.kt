package com.slovko.data.datastore

import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey

object PrefKeys {
    val SEED_VERSION = intPreferencesKey("seed_version")

    val ONBOARDED = booleanPreferencesKey("onboarded")
    val DAILY_GOAL = intPreferencesKey("daily_goal_xp")
    val TARGET_RETENTION = floatPreferencesKey("target_retention")
    val REMINDER_HOUR = intPreferencesKey("reminder_hour")
    val REMINDER_MINUTE = intPreferencesKey("reminder_minute")
    val SMART_TIMING = booleanPreferencesKey("smart_timing")
    val DAILY_REMINDER = booleanPreferencesKey("daily_reminder_on")
    val STREAK_REMINDER = booleanPreferencesKey("streak_reminder_on")
    val REVIEW_REMINDER = booleanPreferencesKey("review_reminder_on")
    val REENGAGE = booleanPreferencesKey("reengage_on")
    val QUIET_START = intPreferencesKey("quiet_start")
    val QUIET_END = intPreferencesKey("quiet_end")
    val SOUND_FX = booleanPreferencesKey("sound_fx")
    val AUTOPLAY = booleanPreferencesKey("autoplay_audio")
    val SPEAKING = booleanPreferencesKey("speaking_enabled")
    val CHALLENGE = booleanPreferencesKey("challenge_mode")
    val REDUCED_MOTION = booleanPreferencesKey("reduced_motion")
    val THEME_MODE = stringPreferencesKey("theme_mode")
    val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
    val AI_ENDPOINT = stringPreferencesKey("ai_endpoint")
    val AI_KEY = stringPreferencesKey("ai_key")
    val AI_ENABLED = booleanPreferencesKey("ai_enabled")
    val LAST_COPY_ID = stringPreferencesKey("last_copy_id")
    val LAST_REENGAGE_DAY = intPreferencesKey("last_reengage_day")
}
