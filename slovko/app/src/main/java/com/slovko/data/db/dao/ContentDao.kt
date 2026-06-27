package com.slovko.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.slovko.data.db.entity.ChatScenarioEntity
import com.slovko.data.db.entity.ExerciseEntity
import com.slovko.data.db.entity.LessonEntity
import com.slovko.data.db.entity.PhraseEntity
import com.slovko.data.db.entity.SkillEntity
import com.slovko.data.db.entity.VocabCardEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ContentDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSkills(items: List<SkillEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLessons(items: List<LessonEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExercises(items: List<ExerciseEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVocab(items: List<VocabCardEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScenarios(items: List<ChatScenarioEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhrases(items: List<PhraseEntity>)

    @Query("SELECT * FROM skills ORDER BY unitOrder, orderIndex")
    fun observeSkills(): Flow<List<SkillEntity>>

    @Query("SELECT * FROM skills ORDER BY unitOrder, orderIndex")
    suspend fun getAllSkills(): List<SkillEntity>

    @Query("SELECT * FROM skills WHERE id = :id")
    suspend fun getSkill(id: String): SkillEntity?

    @Query("SELECT * FROM lessons WHERE skillId = :skillId ORDER BY orderIndex")
    suspend fun getLessonsForSkill(skillId: String): List<LessonEntity>

    @Query("SELECT * FROM lessons ORDER BY orderIndex")
    suspend fun getAllLessons(): List<LessonEntity>

    @Query("SELECT * FROM lessons WHERE id = :id")
    suspend fun getLesson(id: String): LessonEntity?

    @Query("SELECT * FROM exercises WHERE lessonId = :lessonId ORDER BY orderIndex")
    suspend fun getExercisesForLesson(lessonId: String): List<ExerciseEntity>

    @Query("SELECT * FROM vocab_cards WHERE id = :id")
    suspend fun getVocab(id: String): VocabCardEntity?

    @Query("SELECT * FROM vocab_cards")
    suspend fun getAllVocab(): List<VocabCardEntity>

    @Query("SELECT COUNT(*) FROM vocab_cards")
    suspend fun vocabCount(): Int

    @Query("SELECT * FROM chat_scenarios ORDER BY orderIndex")
    fun observeScenarios(): Flow<List<ChatScenarioEntity>>

    @Query("SELECT * FROM chat_scenarios WHERE id = :id")
    suspend fun getScenario(id: String): ChatScenarioEntity?

    @Query("SELECT * FROM phrases ORDER BY orderIndex")
    fun observePhrases(): Flow<List<PhraseEntity>>

    @Query("SELECT COUNT(*) FROM skills")
    suspend fun skillCount(): Int

    @Query("DELETE FROM skills") suspend fun clearSkills()
    @Query("DELETE FROM lessons") suspend fun clearLessons()
    @Query("DELETE FROM exercises") suspend fun clearExercises()
    @Query("DELETE FROM vocab_cards") suspend fun clearVocab()
    @Query("DELETE FROM chat_scenarios") suspend fun clearScenarios()
    @Query("DELETE FROM phrases") suspend fun clearPhrases()
}
