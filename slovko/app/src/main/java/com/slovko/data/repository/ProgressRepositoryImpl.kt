package com.slovko.data.repository

import com.slovko.core.common.AppClock
import com.slovko.core.common.IoDispatcher
import com.slovko.data.db.dao.ProgressDao
import com.slovko.data.db.dao.SrsDao
import com.slovko.data.db.entity.CompletedLessonEntity
import com.slovko.data.db.entity.DailyGoalEntity
import com.slovko.data.db.entity.SessionLogEntity
import com.slovko.data.db.entity.StreakLogEntity
import com.slovko.data.db.entity.UserProfileEntity
import com.slovko.domain.GamificationConfig
import com.slovko.domain.model.DailyGoal
import com.slovko.domain.model.HeatDay
import com.slovko.domain.model.UserStats
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SettingsRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProgressRepositoryImpl @Inject constructor(
    private val dao: ProgressDao,
    private val srsDao: SrsDao,
    private val settings: SettingsRepository,
    private val clock: AppClock,
    @IoDispatcher private val io: CoroutineDispatcher,
) : ProgressRepository {

    private fun todayIso(): String = clock.today().toString()
    private fun startOfTodayMillis(): Long =
        clock.today().atStartOfDay(clock.zone()).toInstant().toEpochMilli()

    override suspend fun ensureProfile() = withContext(io) {
        if (dao.getProfile() == null) {
            dao.upsertProfile(
                UserProfileEntity(
                    id = 1, displayName = "Ty", level = 1, totalXp = 0, gems = 0,
                    crowns = 0, freezesHeld = 0, createdAtEpochDay = clock.today().toEpochDay(),
                    avatarKey = "fox",
                ),
            )
        }
    }

    override fun observeUserStats(): Flow<UserStats> =
        combine(dao.observeProfile(), srsDao.observeLearnedCount()) { profile, learned ->
            val p = profile ?: UserProfileEntity(
                1, "Ty", 1, 0, 0, 0, 0, clock.today().toEpochDay(), "fox",
            )
            val (into, span) = GamificationConfig.levelProgress(p.totalXp)
            val streaks = dao.recentStreak(400)
            UserStats(
                displayName = p.displayName,
                level = GamificationConfig.levelForXp(p.totalXp),
                totalXp = p.totalXp,
                xpIntoLevel = into,
                xpForNextLevel = span,
                gems = p.gems,
                crowns = p.crowns,
                currentStreak = currentStreak(streaks),
                longestStreak = longestStreak(streaks),
                wordsLearned = learned,
                avatarKey = p.avatarKey,
                memberSinceEpochDay = p.createdAtEpochDay,
            )
        }.flowOn(io)

    override fun observeDailyGoal(): Flow<DailyGoal> =
        combine(dao.observeGoal(todayIso()), settings.settings) { goal, s ->
            val target = s.dailyGoalXp
            DailyGoal(
                dateIso = todayIso(),
                goalXp = goal?.goalXp ?: target,
                earnedXp = goal?.earnedXp ?: 0,
                lessonsCompleted = goal?.lessonsCompleted ?: 0,
                met = goal?.met ?: false,
            )
        }.flowOn(io)

    override fun observeHeatmap(days: Int): Flow<List<HeatDay>> =
        dao.observeRecentGoals(days).map { goals ->
            goals.map {
                HeatDay(
                    epochDay = LocalDate.parse(it.dateIso).toEpochDay(),
                    xp = it.earnedXp,
                    met = it.met,
                )
            }
        }.flowOn(io)

    override fun observeCompletedLessons(): Flow<Set<String>> =
        dao.observeCompleted().map { list -> list.map { it.lessonId }.toSet() }.flowOn(io)

    override suspend fun completedLessonIds(): Set<String> = withContext(io) {
        dao.completedIds().toSet()
    }

    override suspend fun recordLessonCompletion(
        lessonId: String,
        xpEarned: Int,
        accuracy: Float,
        durationMs: Long,
        newWords: Int,
    ): Int = withContext(io) {
        val now = clock.nowMillis()
        dao.upsertCompleted(CompletedLessonEntity(lessonId, now, accuracy))
        dao.insertSession(
            SessionLogEntity(
                startTs = now - durationMs, durationMs = durationMs, xpEarned = xpEarned,
                hour = clock.today().let { java.time.LocalDateTime.now(clock.zone()).hour },
            ),
        )
        applyXp(xpEarned, lessonDelta = 1)
    }

    override suspend fun addXp(amount: Int) {
        withContext(io) { applyXp(amount, lessonDelta = 0) }
    }

    /** Adds XP to profile + today's goal; flips streak when the goal is newly met. Returns streak delta. */
    private suspend fun applyXp(amount: Int, lessonDelta: Int): Int {
        val profile = dao.getProfile() ?: run { ensureProfile(); dao.getProfile()!! }
        val newTotal = profile.totalXp + amount
        dao.upsertProfile(profile.copy(totalXp = newTotal, level = GamificationConfig.levelForXp(newTotal)))

        val date = todayIso()
        val target = settings.current().dailyGoalXp
        val existing = dao.getGoal(date)
        val wasMet = existing?.met ?: false
        val earned = (existing?.earnedXp ?: 0) + amount
        val met = earned >= target
        dao.upsertGoal(
            DailyGoalEntity(
                dateIso = date,
                goalXp = existing?.goalXp ?: target,
                earnedXp = earned,
                lessonsCompleted = (existing?.lessonsCompleted ?: 0) + lessonDelta,
                met = met,
            ),
        )

        return if (met && !wasMet) {
            dao.upsertStreak(StreakLogEntity(date, practiced = true, frozen = false))
            1
        } else 0
    }

    override suspend fun setDisplayName(name: String) = withContext(io) {
        val p = dao.getProfile() ?: return@withContext
        dao.upsertProfile(p.copy(displayName = name.ifBlank { p.displayName }))
    }

    override suspend fun hasPracticedToday(): Boolean = withContext(io) {
        dao.sessionsTodayCount(startOfTodayMillis()) > 0
    }

    override suspend fun modalPracticeHour(days: Int): Int? = withContext(io) {
        val since = clock.nowMillis() - days * 86_400_000L
        val sessions = dao.sessionsSince(since)
        if (sessions.size < 5) return@withContext null
        val byHour = sessions.groupingBy { it.hour }.eachCount()
        val (hour, count) = byHour.maxByOrNull { it.value } ?: return@withContext null
        if (count.toFloat() / sessions.size < 0.4f) null else hour
    }

    // ---- streak math over streak_log (descending by date) ----
    private fun currentStreak(logs: List<StreakLogEntity>): Int {
        if (logs.isEmpty()) return 0
        val byDate = logs.associateBy { it.dateIso }
        var day = clock.today()
        // allow today to be incomplete: start from today if practiced, else yesterday
        if (byDate[day.toString()]?.let { it.practiced || it.frozen } != true) {
            day = day.minusDays(1)
        }
        var count = 0
        while (true) {
            val log = byDate[day.toString()]
            if (log != null && (log.practiced || log.frozen)) {
                if (log.practiced) count++
                day = day.minusDays(1)
            } else break
        }
        return count
    }

    private fun longestStreak(logs: List<StreakLogEntity>): Int {
        val days = logs.filter { it.practiced || it.frozen }
            .map { LocalDate.parse(it.dateIso) }
            .sorted()
        var best = 0
        var run = 0
        var prev: LocalDate? = null
        for (d in days) {
            run = if (prev != null && prev.plusDays(1) == d) run + 1 else 1
            best = maxOf(best, run)
            prev = d
        }
        return best
    }
}
