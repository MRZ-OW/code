package com.slovko.data.repository

import com.slovko.core.common.AppClock
import com.slovko.core.common.IoDispatcher
import com.slovko.data.db.dao.GamificationDao
import com.slovko.data.db.dao.ProgressDao
import com.slovko.data.db.dao.SrsDao
import com.slovko.data.db.entity.LeagueWeekEntity
import com.slovko.data.db.entity.QuestEntity
import com.slovko.domain.league.LeagueEngine
import com.slovko.domain.model.Achievement
import com.slovko.domain.model.League
import com.slovko.domain.model.LeagueTier
import com.slovko.domain.model.Quest
import com.slovko.domain.repository.GamificationRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.temporal.WeekFields
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.max

@Singleton
class GamificationRepositoryImpl @Inject constructor(
    private val dao: GamificationDao,
    private val progressDao: ProgressDao,
    private val srsDao: SrsDao,
    private val leagueEngine: LeagueEngine,
    private val clock: AppClock,
    @IoDispatcher private val io: CoroutineDispatcher,
) : GamificationRepository {

    private fun todayIso() = clock.today().toString()

    // ---- quests ----
    override fun observeQuests(): Flow<List<Quest>> =
        dao.observeQuests(todayIso()).map { list ->
            list.map { Quest(it.id, it.title, it.target, it.progress, it.rewardGems, it.completed) }
        }.flowOn(io)

    override suspend fun rollDailyQuestsIfNeeded() = withContext(io) {
        val date = todayIso()
        if (dao.getQuests(date).isNotEmpty()) return@withContext
        dao.clearOldQuests(date)
        val seed = LocalDate.parse(date).toEpochDay()
        val pool = listOf(
            QuestEntity("$date-xp", date, "Earn 50 XP today", "xp", 50, 0, 20, false),
            QuestEntity("$date-lessons", date, "Complete 2 lessons", "lessons", 2, 0, 15, false),
            QuestEntity("$date-perfect", date, "Finish a perfect lesson", "perfect", 1, 0, 25, false),
            QuestEntity("$date-xp2", date, "Earn 100 XP today", "xp", 100, 0, 30, false),
            QuestEntity("$date-lessons3", date, "Complete 3 lessons", "lessons", 3, 0, 25, false),
        )
        // pick a stable rotating subset of 3
        val start = (seed % pool.size).toInt()
        val chosen = (0 until 3).map { pool[(start + it) % pool.size] }
            .distinctBy { it.id }
        dao.insertQuests(chosen)
    }

    override suspend fun progressQuests(xp: Int, lessons: Int, perfect: Boolean) = withContext(io) {
        rollDailyQuestsIfNeeded()
        val quests = dao.getQuests(todayIso())
        for (q in quests) {
            if (q.completed) continue
            val delta = when (q.kind) {
                "xp" -> xp
                "lessons" -> lessons
                "perfect" -> if (perfect) 1 else 0
                else -> 0
            }
            if (delta == 0) continue
            val newProgress = (q.progress + delta).coerceAtMost(q.target)
            val done = newProgress >= q.target
            dao.updateQuest(q.copy(progress = newProgress, completed = done))
            if (done && !q.completed) addGems(q.rewardGems)
        }
    }

    // ---- achievements ----
    override fun observeAchievements(): Flow<List<Achievement>> =
        dao.observeAchievements().map { list ->
            list.map {
                Achievement(it.id, it.title, it.description, it.iconKey, it.threshold, it.progress, it.unlockedAtEpoch, it.tier)
            }
        }.flowOn(io)

    override suspend fun evaluateAchievements(): List<Achievement> = withContext(io) {
        val profile = progressDao.getProfile()
        val totalXp = profile?.totalXp ?: 0
        val gems = profile?.gems ?: 0
        val words = srsDao.learnedCount()
        val completed = progressDao.completedIds().size
        val streak = currentStreak()

        val metricFor: (String) -> Int? = { id ->
            when (id) {
                "prve_slovo" -> completed
                "slovnik" -> words
                "maratonec" -> totalXp
                "ohnivak" -> streak
                "verny" -> streak
                "tyzden_vitazstva" -> streak
                "zberatel" -> gems
                else -> null
            }
        }

        val newlyUnlocked = mutableListOf<Achievement>()
        for (a in dao.getAchievements()) {
            val metric = metricFor(a.id) ?: continue
            val progress = metric.coerceAtMost(a.threshold)
            val unlock = progress >= a.threshold && a.unlockedAtEpoch == null
            if (progress != a.progress || unlock) {
                val updated = a.copy(
                    progress = progress,
                    unlockedAtEpoch = if (unlock) clock.nowMillis() else a.unlockedAtEpoch,
                )
                dao.updateAchievement(updated)
                if (unlock) {
                    addGems(a.tier * 25)
                    newlyUnlocked += Achievement(
                        updated.id, updated.title, updated.description, updated.iconKey,
                        updated.threshold, updated.progress, updated.unlockedAtEpoch, updated.tier,
                    )
                }
            }
        }
        newlyUnlocked
    }

    // ---- league ----
    override fun observeLeague(): Flow<League> =
        combine(progressDao.observeProfile(), progressDao.observeRecentGoals(14)) { _, _ ->
            computeLeague()
        }.flowOn(io)

    override suspend fun refreshLeague() {
        withContext(io) { ensureWeek() }
    }

    private suspend fun ensureWeek(): LeagueWeekEntity {
        val weekId = isoWeekId(clock.today())
        dao.getWeek(weekId)?.let { return it }
        val trailing = trailingDailyAvg()
        val week = LeagueWeekEntity(
            weekId = weekId,
            tier = LeagueTier.BRONZE.name,
            startTs = weekStart().atStartOfDay(clock.zone()).toInstant().toEpochMilli(),
            endTs = weekStart().plusDays(7).atStartOfDay(clock.zone()).toInstant().toEpochMilli(),
            trailingAvg = trailing,
        )
        dao.upsertWeek(week)
        return week
    }

    private suspend fun computeLeague(): League {
        val week = ensureWeek()
        val profile = progressDao.getProfile()
        val tier = runCatching { LeagueTier.valueOf(week.tier) }.getOrDefault(LeagueTier.BRONZE)
        val start = weekStart()
        val userWeekXp = progressDao.recentGoals(7)
            .filter { !LocalDate.parse(it.dateIso).isBefore(start) }
            .sumOf { it.earnedXp }
        val now = clock.nowMillis()
        val elapsedDays = ((now - week.startTs).toDouble() / 86_400_000.0).coerceIn(0.0, 7.0)
        val daysRemaining = max(0, 7 - elapsedDays.toInt())
        return leagueEngine.standings(
            weekId = week.weekId,
            tier = tier,
            userXp = userWeekXp,
            userName = profile?.displayName ?: "Ty",
            userAvatar = profile?.avatarKey ?: "fox",
            userTrailingDailyAvg = week.trailingAvg,
            daysElapsed = elapsedDays,
            daysRemaining = daysRemaining,
        )
    }

    override suspend fun addGems(amount: Int) {
        withContext(io) {
            val p = progressDao.getProfile() ?: return@withContext
            progressDao.upsertProfile(p.copy(gems = max(0, p.gems + amount)))
        }
    }

    override suspend fun spendGems(amount: Int): Boolean = withContext(io) {
        val p = progressDao.getProfile() ?: return@withContext false
        if (p.gems < amount) return@withContext false
        progressDao.upsertProfile(p.copy(gems = p.gems - amount))
        true
    }

    // ---- helpers ----
    private fun weekStart(): LocalDate =
        clock.today().with(WeekFields.ISO.dayOfWeek(), 1)

    private fun isoWeekId(date: LocalDate): String {
        val week = date.get(WeekFields.ISO.weekOfWeekBasedYear())
        val year = date.get(WeekFields.ISO.weekBasedYear())
        return "%d-W%02d".format(year, week)
    }

    private suspend fun trailingDailyAvg(): Int {
        val goals = progressDao.recentGoals(7)
        if (goals.isEmpty()) return 0
        return goals.sumOf { it.earnedXp } / max(1, goals.size)
    }

    private suspend fun currentStreak(): Int {
        val logs = progressDao.recentStreak(400).associateBy { it.dateIso }
        var day = clock.today()
        if (logs[day.toString()]?.let { it.practiced || it.frozen } != true) day = day.minusDays(1)
        var count = 0
        while (logs[day.toString()]?.let { it.practiced || it.frozen } == true) {
            if (logs[day.toString()]?.practiced == true) count++
            day = day.minusDays(1)
        }
        return count
    }
}
