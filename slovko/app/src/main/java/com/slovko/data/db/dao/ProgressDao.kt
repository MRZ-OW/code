package com.slovko.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.slovko.data.db.entity.CompletedLessonEntity
import com.slovko.data.db.entity.DailyGoalEntity
import com.slovko.data.db.entity.SessionLogEntity
import com.slovko.data.db.entity.StreakLogEntity
import com.slovko.data.db.entity.UserProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProgressDao {

    // ---- profile ----
    @Query("SELECT * FROM user_profile WHERE id = 1")
    fun observeProfile(): Flow<UserProfileEntity?>

    @Query("SELECT * FROM user_profile WHERE id = 1")
    suspend fun getProfile(): UserProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertProfile(profile: UserProfileEntity)

    // ---- daily goal ----
    @Query("SELECT * FROM daily_goal WHERE dateIso = :date")
    fun observeGoal(date: String): Flow<DailyGoalEntity?>

    @Query("SELECT * FROM daily_goal WHERE dateIso = :date")
    suspend fun getGoal(date: String): DailyGoalEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertGoal(goal: DailyGoalEntity)

    @Query("SELECT * FROM daily_goal ORDER BY dateIso DESC LIMIT :limit")
    fun observeRecentGoals(limit: Int): Flow<List<DailyGoalEntity>>

    @Query("SELECT * FROM daily_goal ORDER BY dateIso DESC LIMIT :limit")
    suspend fun recentGoals(limit: Int): List<DailyGoalEntity>

    // ---- streak ----
    @Query("SELECT * FROM streak_log ORDER BY dateIso DESC LIMIT :limit")
    suspend fun recentStreak(limit: Int): List<StreakLogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertStreak(log: StreakLogEntity)

    // ---- sessions ----
    @Insert
    suspend fun insertSession(session: SessionLogEntity)

    @Query("SELECT * FROM session_log WHERE startTs >= :since")
    suspend fun sessionsSince(since: Long): List<SessionLogEntity>

    @Query("SELECT COUNT(*) FROM session_log WHERE startTs >= :startOfDay")
    suspend fun sessionsTodayCount(startOfDay: Long): Int

    // ---- completed lessons ----
    @Query("SELECT * FROM completed_lessons")
    fun observeCompleted(): Flow<List<CompletedLessonEntity>>

    @Query("SELECT lessonId FROM completed_lessons")
    suspend fun completedIds(): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCompleted(lesson: CompletedLessonEntity)
}
