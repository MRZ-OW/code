package com.slovko.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.slovko.data.db.dao.ChatDao
import com.slovko.data.db.dao.ContentDao
import com.slovko.data.db.dao.GamificationDao
import com.slovko.data.db.dao.ProgressDao
import com.slovko.data.db.dao.SrsDao
import com.slovko.data.db.entity.AchievementEntity
import com.slovko.data.db.entity.ChatMessageEntity
import com.slovko.data.db.entity.ChatScenarioEntity
import com.slovko.data.db.entity.CompletedLessonEntity
import com.slovko.data.db.entity.DailyGoalEntity
import com.slovko.data.db.entity.ExerciseEntity
import com.slovko.data.db.entity.LeagueWeekEntity
import com.slovko.data.db.entity.LessonEntity
import com.slovko.data.db.entity.PhraseEntity
import com.slovko.data.db.entity.QuestEntity
import com.slovko.data.db.entity.SessionLogEntity
import com.slovko.data.db.entity.SkillEntity
import com.slovko.data.db.entity.SrsStateEntity
import com.slovko.data.db.entity.StreakLogEntity
import com.slovko.data.db.entity.UserProfileEntity
import com.slovko.data.db.entity.VocabCardEntity

@Database(
    entities = [
        SkillEntity::class,
        LessonEntity::class,
        ExerciseEntity::class,
        VocabCardEntity::class,
        ChatScenarioEntity::class,
        PhraseEntity::class,
        SrsStateEntity::class,
        UserProfileEntity::class,
        DailyGoalEntity::class,
        StreakLogEntity::class,
        SessionLogEntity::class,
        CompletedLessonEntity::class,
        AchievementEntity::class,
        QuestEntity::class,
        LeagueWeekEntity::class,
        ChatMessageEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class SlovkoDatabase : RoomDatabase() {
    abstract fun contentDao(): ContentDao
    abstract fun srsDao(): SrsDao
    abstract fun progressDao(): ProgressDao
    abstract fun gamificationDao(): GamificationDao
    abstract fun chatDao(): ChatDao

    companion object {
        const val NAME = "slovko.db"
    }
}
