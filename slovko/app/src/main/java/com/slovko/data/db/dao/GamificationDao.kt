package com.slovko.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.slovko.data.db.entity.AchievementEntity
import com.slovko.data.db.entity.LeagueWeekEntity
import com.slovko.data.db.entity.QuestEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GamificationDao {

    // ---- achievements ----
    @Query("SELECT * FROM achievements ORDER BY orderIndex")
    fun observeAchievements(): Flow<List<AchievementEntity>>

    @Query("SELECT * FROM achievements ORDER BY orderIndex")
    suspend fun getAchievements(): List<AchievementEntity>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAchievements(items: List<AchievementEntity>)

    @Update
    suspend fun updateAchievement(item: AchievementEntity)

    // ---- quests ----
    @Query("SELECT * FROM quests WHERE dateAssigned = :date ORDER BY id")
    fun observeQuests(date: String): Flow<List<QuestEntity>>

    @Query("SELECT * FROM quests WHERE dateAssigned = :date ORDER BY id")
    suspend fun getQuests(date: String): List<QuestEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertQuests(items: List<QuestEntity>)

    @Update
    suspend fun updateQuest(item: QuestEntity)

    @Query("DELETE FROM quests WHERE dateAssigned != :keepDate")
    suspend fun clearOldQuests(keepDate: String)

    // ---- league ----
    @Query("SELECT * FROM league_week WHERE weekId = :weekId")
    suspend fun getWeek(weekId: String): LeagueWeekEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertWeek(week: LeagueWeekEntity)
}
