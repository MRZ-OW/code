package com.slovko.ui.navigation

object Routes {
    const val ONBOARDING = "onboarding"

    // Top-level tabs
    const val HOME = "home"
    const val PRACTICE = "practice"
    const val CHATHUB = "chathub"
    const val LEADERBOARD = "leaderboard"
    const val PROFILE = "profile"

    // Pushed screens
    const val LESSON = "lesson/{lessonId}"
    const val CHAT = "chat/{scenarioId}"
    const val PHRASEBOOK = "phrasebook"
    const val ACHIEVEMENTS = "achievements"
    const val SETTINGS = "settings"

    fun lesson(lessonId: String) = "lesson/$lessonId"
    fun chat(scenarioId: String) = "chat/$scenarioId"

    val tabs = listOf(HOME, PRACTICE, CHATHUB, LEADERBOARD, PROFILE)
}
