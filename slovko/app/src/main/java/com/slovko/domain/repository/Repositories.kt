package com.slovko.domain.repository

import com.slovko.domain.model.Achievement
import com.slovko.domain.model.ChatMessage
import com.slovko.domain.model.ChatScenario
import com.slovko.domain.model.CardDirection
import com.slovko.domain.model.CurriculumUnit
import com.slovko.domain.model.DailyGoal
import com.slovko.domain.model.Grade
import com.slovko.domain.model.HeatDay
import com.slovko.domain.model.League
import com.slovko.domain.model.Lesson
import com.slovko.domain.model.Phrase
import com.slovko.domain.model.Quest
import com.slovko.domain.model.ReviewCard
import com.slovko.domain.model.Skill
import com.slovko.domain.model.UserSettings
import com.slovko.domain.model.UserStats
import com.slovko.domain.model.VocabCard
import kotlinx.coroutines.flow.Flow

interface ContentRepository {
    suspend fun ensureSeeded()
    fun observeUnits(): Flow<List<CurriculumUnit>>
    suspend fun getLesson(lessonId: String): Lesson?
    suspend fun getSkill(skillId: String): Skill?
    fun observeScenarios(): Flow<List<ChatScenario>>
    suspend fun getScenario(scenarioId: String): ChatScenario?
    fun observePhrases(): Flow<List<Phrase>>
    suspend fun getVocabCard(cardId: String): VocabCard?
    suspend fun wordOfTheDay(): VocabCard?
}

interface ProgressRepository {
    suspend fun ensureProfile()
    fun observeUserStats(): Flow<UserStats>
    fun observeDailyGoal(): Flow<DailyGoal>
    fun observeHeatmap(days: Int): Flow<List<HeatDay>>
    fun observeCompletedLessons(): Flow<Set<String>>
    suspend fun completedLessonIds(): Set<String>
    /** Records a finished lesson; returns the resulting streak delta (+1, 0). */
    suspend fun recordLessonCompletion(
        lessonId: String,
        xpEarned: Int,
        accuracy: Float,
        durationMs: Long,
        newWords: Int,
    ): Int
    suspend fun addXp(amount: Int)
    suspend fun setDisplayName(name: String)
    suspend fun hasPracticedToday(): Boolean
    /** Modal practice hour over last [days] from session logs, or null if too few. */
    suspend fun modalPracticeHour(days: Int): Int?
}

interface SrsRepository {
    fun observeDueCount(): Flow<Int>
    suspend fun dueCount(): Int
    suspend fun dueCards(limit: Int): List<ReviewCard>
    suspend fun warmupCards(limit: Int): List<ReviewCard>
    suspend fun grade(cardId: String, direction: CardDirection, grade: Grade)
    /** Create SRS state the first time a card is correctly produced. */
    suspend fun bornCard(cardId: String, direction: CardDirection)
}

interface GamificationRepository {
    fun observeQuests(): Flow<List<Quest>>
    suspend fun rollDailyQuestsIfNeeded()
    suspend fun progressQuests(xp: Int, lessons: Int, perfect: Boolean)
    fun observeAchievements(): Flow<List<Achievement>>
    /** Re-evaluate criteria; returns newly unlocked achievements. */
    suspend fun evaluateAchievements(): List<Achievement>
    fun observeLeague(): Flow<League>
    suspend fun refreshLeague()
    suspend fun addGems(amount: Int)
    suspend fun spendGems(amount: Int): Boolean
}

interface ChatRepository {
    fun observeMessages(scenarioId: String): Flow<List<ChatMessage>>
    suspend fun startIfEmpty(scenarioId: String)
    suspend fun sendUserMessage(scenarioId: String, textSk: String, glossEn: String?)
    suspend fun requestPartnerReply(scenarioId: String): Result<ChatMessage>
    suspend fun reset(scenarioId: String)
}

interface SettingsRepository {
    val settings: Flow<UserSettings>
    suspend fun update(transform: (UserSettings) -> UserSettings)
    suspend fun current(): UserSettings
}
