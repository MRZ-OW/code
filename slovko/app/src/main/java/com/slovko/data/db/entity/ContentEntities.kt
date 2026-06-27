package com.slovko.data.db.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Content tables — seeded from bundled JSON. Stable slug PKs for clean re-seed. */

@Entity(tableName = "skills")
data class SkillEntity(
    @PrimaryKey val id: String,
    val unitId: String,
    val unitName: String,
    val unitCefr: String,
    val unitOrder: Int,
    val title: String,
    val description: String,
    val iconKey: String,
    val colorKey: String,
    val orderIndex: Int,
    val cefrLevel: String,
)

@Entity(
    tableName = "lessons",
    indices = [Index("skillId")],
)
data class LessonEntity(
    @PrimaryKey val id: String,
    val skillId: String,
    val title: String,
    val orderIndex: Int,
    val type: String,
    val xpReward: Int,
)

@Entity(
    tableName = "exercises",
    indices = [Index("lessonId")],
)
data class ExerciseEntity(
    @PrimaryKey val id: String,
    val lessonId: String,
    val orderIndex: Int,
    val type: String,
    val promptSk: String?,
    val promptEn: String?,
    val answer: String,
    val acceptableJson: String,
    val choicesJson: String,
    val pairsJson: String,
    val audioKey: String?,
    val vocabCardId: String?,
    val hint: String?,
    val caseTag: String?,
    val aspectTag: String?,
    val register: String,
)

@Entity(tableName = "vocab_cards")
data class VocabCardEntity(
    @PrimaryKey val id: String,
    val sk: String,
    val en: String,
    val partOfSpeech: String,
    val ipa: String?,
    val exampleSk: String?,
    val exampleEn: String?,
    val gender: String?,
    val audioKey: String?,
    val register: String,
    val frequencyRank: Int,
)

@Entity(tableName = "chat_scenarios")
data class ChatScenarioEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val cefrLevel: String,
    val starterLineSk: String,
    val iconKey: String,
    val locked: Boolean,
    val orderIndex: Int,
    val turnsJson: String,
)

@Entity(tableName = "phrases")
data class PhraseEntity(
    @PrimaryKey val id: String,
    val sk: String,
    val en: String,
    val register: String,
    val note: String?,
    val vocabCardId: String?,
    val orderIndex: Int,
)
