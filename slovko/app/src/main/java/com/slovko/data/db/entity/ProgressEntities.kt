package com.slovko.data.db.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** User progress, SRS state, and analytics. Never touched by content re-seed. */

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey val id: Int = 1,
    val displayName: String,
    val level: Int,
    val totalXp: Int,
    val gems: Int,
    val crowns: Int,
    val freezesHeld: Int,
    val createdAtEpochDay: Long,
    val avatarKey: String,
)

@Entity(
    tableName = "srs_state",
    indices = [Index(value = ["cardId", "direction"], unique = true), Index("due"), Index("state")],
)
data class SrsStateEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val cardId: String,
    val direction: Int,
    val state: Int,
    val stability: Double,
    val difficulty: Double,
    val due: Long,
    val lastReview: Long?,
    val reps: Int,
    val lapses: Int,
)

@Entity(tableName = "daily_goal")
data class DailyGoalEntity(
    @PrimaryKey val dateIso: String,
    val goalXp: Int,
    val earnedXp: Int,
    val lessonsCompleted: Int,
    val met: Boolean,
)

@Entity(tableName = "streak_log")
data class StreakLogEntity(
    @PrimaryKey val dateIso: String,
    val practiced: Boolean,
    val frozen: Boolean,
)

@Entity(tableName = "session_log")
data class SessionLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startTs: Long,
    val durationMs: Long,
    val xpEarned: Int,
    val hour: Int,
)

@Entity(tableName = "completed_lessons")
data class CompletedLessonEntity(
    @PrimaryKey val lessonId: String,
    val completedAtEpoch: Long,
    val bestAccuracy: Float,
)
