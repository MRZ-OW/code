package com.slovko.data.seed

import kotlinx.serialization.Serializable

/** @Serializable DTOs mirroring the bundled curriculum JSON. See DESIGN.md §13 / Appendix A. */

@Serializable
data class ManifestDto(
    val version: Int = 1,
    val skillFiles: List<String> = emptyList(),
    val scenarioFile: String? = null,
    val phrasebookFile: String? = null,
)

@Serializable
data class UnitFileDto(
    val unit: UnitDto,
    val skills: List<SkillDto> = emptyList(),
)

@Serializable
data class UnitDto(
    val id: String,
    val name: String,
    val cefr: String = "A1",
    val order: Int = 0,
)

@Serializable
data class SkillDto(
    val id: String,
    val unitId: String,
    val title: String,
    val description: String = "",
    val iconKey: String = "star",
    val colorKey: String = "red",
    val orderIndex: Int = 0,
    val cefrLevel: String = "A1",
    val vocab: List<VocabDto> = emptyList(),
    val lessons: List<LessonDto> = emptyList(),
)

@Serializable
data class VocabDto(
    val id: String,
    val sk: String,
    val en: String,
    val partOfSpeech: String = "word",
    val ipa: String? = null,
    val exampleSk: String? = null,
    val exampleEn: String? = null,
    val gender: String? = null,
    val audioKey: String? = null,
    val register: String = "neutral",
    val frequencyRank: Int = 9999,
)

@Serializable
data class LessonDto(
    val id: String,
    val title: String,
    val orderIndex: Int = 0,
    val type: String = "practice",
    val xpReward: Int = 15,
    val exercises: List<ExerciseDto> = emptyList(),
)

@Serializable
data class ExerciseDto(
    val id: String,
    val orderIndex: Int = 0,
    val type: String,
    val promptSk: String? = null,
    val promptEn: String? = null,
    val answer: String = "",
    val acceptable: List<String> = emptyList(),
    val choices: List<String> = emptyList(),
    val pairs: List<List<String>> = emptyList(),
    val audioKey: String? = null,
    val vocabCardId: String? = null,
    val hint: String? = null,
    val register: String = "neutral",
    val caseTag: String? = null,
    val aspectTag: String? = null,
)

@Serializable
data class ScenarioFileDto(
    val scenarios: List<ScenarioDto> = emptyList(),
)

@Serializable
data class ScenarioDto(
    val id: String,
    val title: String,
    val description: String = "",
    val cefrLevel: String = "A1",
    val starterLineSk: String = "",
    val iconKey: String = "chat",
    val locked: Boolean = false,
    val orderIndex: Int = 0,
    val turns: List<TurnDto> = emptyList(),
)

@Serializable
data class TurnDto(
    val role: String = "partner",
    val sk: String,
    val enGloss: String = "",
    val replies: List<ReplyDto> = emptyList(),
)

@Serializable
data class ReplyDto(
    val sk: String,
    val enGloss: String = "",
    val natural: Boolean = false,
)

@Serializable
data class PhrasebookFileDto(
    val phrases: List<PhraseDto> = emptyList(),
)

@Serializable
data class PhraseDto(
    val id: String,
    val sk: String,
    val en: String,
    val register: String = "informal",
    val note: String? = null,
    val vocabCardId: String? = null,
    val orderIndex: Int = 0,
)
