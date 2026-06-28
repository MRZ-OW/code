package com.slovko.data.mapper

import com.slovko.data.AppJson
import com.slovko.data.db.entity.ChatScenarioEntity
import com.slovko.data.db.entity.ExerciseEntity
import com.slovko.data.db.entity.LessonEntity
import com.slovko.data.db.entity.PhraseEntity
import com.slovko.data.db.entity.SkillEntity
import com.slovko.data.db.entity.SrsStateEntity
import com.slovko.data.db.entity.VocabCardEntity
import com.slovko.data.seed.ExerciseDto
import com.slovko.data.seed.LessonDto
import com.slovko.data.seed.PhraseDto
import com.slovko.data.seed.ScenarioDto
import com.slovko.data.seed.SkillDto
import com.slovko.data.seed.TurnDto
import com.slovko.data.seed.UnitDto
import com.slovko.data.seed.VocabDto
import com.slovko.domain.model.AspectTag
import com.slovko.domain.model.CardDirection
import com.slovko.domain.model.CardState
import com.slovko.domain.model.CaseTag
import com.slovko.domain.model.ChatScenario
import com.slovko.domain.model.Exercise
import com.slovko.domain.model.ExerciseType
import com.slovko.domain.model.Lesson
import com.slovko.domain.model.LessonType
import com.slovko.domain.model.Phrase
import com.slovko.domain.model.Register
import com.slovko.domain.model.ReplyOption
import com.slovko.domain.model.ReviewCard
import com.slovko.domain.model.ScenarioTurn
import com.slovko.domain.model.Skill
import com.slovko.domain.model.VocabCard
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer

// ---- enum parsing ----
fun parseRegister(s: String?): Register = when (s?.lowercase()) {
    "informal" -> Register.INFORMAL
    "formal" -> Register.FORMAL
    else -> Register.NEUTRAL
}

fun parseExerciseType(s: String): ExerciseType =
    runCatching { ExerciseType.valueOf(s.uppercase()) }.getOrDefault(ExerciseType.MCQ)

fun parseLessonType(s: String): LessonType =
    runCatching { LessonType.valueOf(s.uppercase()) }.getOrDefault(LessonType.PRACTICE)

fun parseCaseTag(s: String?): CaseTag? =
    s?.let { runCatching { CaseTag.valueOf(it.uppercase()) }.getOrNull() }

fun parseAspectTag(s: String?): AspectTag? =
    s?.let { runCatching { AspectTag.valueOf(it.uppercase()) }.getOrNull() }

private val StringListSer = ListSerializer(String.serializer())
private val PairsSer = ListSerializer(ListSerializer(String.serializer()))

private fun List<String>.toJson(): String = AppJson.encodeToString(StringListSer, this)
private fun String.toStringList(): List<String> =
    runCatching { AppJson.decodeFromString(StringListSer, this) }.getOrDefault(emptyList())

// ---- DTO -> Entity (seeding) ----
fun SkillDto.toEntity(unit: UnitDto): SkillEntity = SkillEntity(
    id = id, unitId = unitId, unitName = unit.name, unitCefr = unit.cefr, unitOrder = unit.order,
    title = title, description = description, iconKey = iconKey, colorKey = colorKey,
    orderIndex = orderIndex, cefrLevel = cefrLevel,
)

fun LessonDto.toEntity(skillId: String): LessonEntity = LessonEntity(
    id = id, skillId = skillId, title = title, orderIndex = orderIndex,
    type = type.uppercase(), xpReward = xpReward,
)

fun ExerciseDto.toEntity(lessonId: String): ExerciseEntity = ExerciseEntity(
    id = id, lessonId = lessonId, orderIndex = orderIndex, type = type.uppercase(),
    promptSk = promptSk, promptEn = promptEn, answer = answer,
    acceptableJson = acceptable.toJson(),
    choicesJson = choices.toJson(),
    pairsJson = AppJson.encodeToString(PairsSer, pairs),
    audioKey = audioKey, vocabCardId = vocabCardId, hint = hint,
    caseTag = caseTag?.uppercase(), aspectTag = aspectTag?.uppercase(),
    register = register.lowercase(),
)

fun VocabDto.toEntity(): VocabCardEntity = VocabCardEntity(
    id = id, sk = sk, en = en, partOfSpeech = partOfSpeech, ipa = ipa,
    exampleSk = exampleSk, exampleEn = exampleEn, gender = gender, audioKey = audioKey,
    register = register.lowercase(), frequencyRank = frequencyRank,
)

fun ScenarioDto.toEntity(): ChatScenarioEntity = ChatScenarioEntity(
    id = id, title = title, description = description, cefrLevel = cefrLevel,
    starterLineSk = starterLineSk, iconKey = iconKey, locked = locked, orderIndex = orderIndex,
    turnsJson = AppJson.encodeToString(ListSerializer(TurnDto.serializer()), turns),
)

fun PhraseDto.toEntity(): PhraseEntity = PhraseEntity(
    id = id, sk = sk, en = en, register = register.lowercase(), note = note,
    vocabCardId = vocabCardId, orderIndex = orderIndex,
)

// ---- Entity -> Domain ----
fun ExerciseEntity.toDomain(): Exercise {
    val pairs: List<Pair<String, String>> = runCatching {
        AppJson.decodeFromString(PairsSer, pairsJson)
            .mapNotNull { if (it.size >= 2) it[0] to it[1] else null }
    }.getOrDefault(emptyList())
    return Exercise(
        id = id, lessonId = lessonId, orderIndex = orderIndex, type = parseExerciseType(type),
        promptSk = promptSk, promptEn = promptEn, answer = answer,
        acceptable = acceptableJson.toStringList(),
        choices = choicesJson.toStringList(),
        pairs = pairs,
        audioKey = audioKey, vocabCardId = vocabCardId, hint = hint,
        caseTag = parseCaseTag(caseTag), aspectTag = parseAspectTag(aspectTag),
        register = parseRegister(register),
    )
}

fun LessonEntity.toDomain(exercises: List<Exercise>): Lesson = Lesson(
    id = id, skillId = skillId, title = title, orderIndex = orderIndex,
    type = parseLessonType(type), xpReward = xpReward, exercises = exercises,
)

fun SkillEntity.toDomain(lessons: List<Lesson>): Skill = Skill(
    id = id, unitId = unitId, title = title, description = description, iconKey = iconKey,
    colorKey = colorKey, orderIndex = orderIndex, cefrLevel = cefrLevel, lessons = lessons,
)

fun VocabCardEntity.toDomain(): VocabCard = VocabCard(
    id = id, sk = sk, en = en, partOfSpeech = partOfSpeech, ipa = ipa,
    exampleSk = exampleSk, exampleEn = exampleEn, gender = gender, audioKey = audioKey,
    register = parseRegister(register), frequencyRank = frequencyRank,
)

fun PhraseEntity.toDomain(): Phrase = Phrase(
    id = id, sk = sk, en = en, register = parseRegister(register), note = note, vocabCardId = vocabCardId,
)

fun ChatScenarioEntity.toDomain(): ChatScenario {
    val turns = runCatching {
        AppJson.decodeFromString(ListSerializer(TurnDto.serializer()), turnsJson)
    }.getOrDefault(emptyList()).map { t ->
        ScenarioTurn(
            role = t.role,
            sk = t.sk,
            enGloss = t.enGloss,
            replies = t.replies.map { ReplyOption(it.sk, it.enGloss, it.natural) },
        )
    }
    return ChatScenario(
        id = id, title = title, description = description, cefrLevel = cefrLevel,
        starterLineSk = starterLineSk, iconKey = iconKey, locked = locked, turns = turns,
    )
}

fun SrsStateEntity.toReviewCard(card: VocabCard): ReviewCard = ReviewCard(
    card = card,
    direction = CardDirection.from(direction),
    state = CardState.from(state),
    stability = stability,
    difficulty = difficulty,
    due = due,
    reps = reps,
    lapses = lapses,
    lastReviewMillis = lastReview,
)
