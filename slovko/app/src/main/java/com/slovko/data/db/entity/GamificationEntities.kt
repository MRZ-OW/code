package com.slovko.data.db.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "achievements")
data class AchievementEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val iconKey: String,
    val threshold: Int,
    val progress: Int,
    val unlockedAtEpoch: Long?,
    val tier: Int,
    val orderIndex: Int,
)

@Entity(
    tableName = "quests",
    indices = [Index("dateAssigned")],
)
data class QuestEntity(
    @PrimaryKey val id: String,
    val dateAssigned: String,
    val title: String,
    val kind: String,
    val target: Int,
    val progress: Int,
    val rewardGems: Int,
    val completed: Boolean,
)

@Entity(tableName = "league_week")
data class LeagueWeekEntity(
    @PrimaryKey val weekId: String,
    val tier: String,
    val startTs: Long,
    val endTs: Long,
    val trailingAvg: Int,
)

@Entity(
    tableName = "chat_messages",
    indices = [Index("scenarioId")],
)
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val scenarioId: String,
    val role: String,
    val textSk: String,
    val textEnGloss: String?,
    val createdAt: Long,
    val turnIndex: Int,
)
