package com.slovko.data.repository

import com.slovko.core.common.AppClock
import com.slovko.core.common.IoDispatcher
import com.slovko.data.db.dao.ContentDao
import com.slovko.data.mapper.toDomain
import com.slovko.data.seed.ContentSeeder
import com.slovko.domain.model.ChatScenario
import com.slovko.domain.model.CurriculumUnit
import com.slovko.domain.model.Lesson
import com.slovko.domain.model.Phrase
import com.slovko.domain.model.Skill
import com.slovko.domain.model.VocabCard
import com.slovko.domain.repository.ContentRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContentRepositoryImpl @Inject constructor(
    private val dao: ContentDao,
    private val seeder: ContentSeeder,
    private val clock: AppClock,
    @IoDispatcher private val io: CoroutineDispatcher,
) : ContentRepository {

    override suspend fun ensureSeeded() = seeder.seedIfNeeded()

    override fun observeUnits(): Flow<List<CurriculumUnit>> =
        dao.observeSkills().map { skillEntities ->
            val units = LinkedHashMap<String, MutableList<Skill>>()
            val meta = LinkedHashMap<String, Triple<String, String, Int>>() // name, cefr, order
            for (e in skillEntities) {
                val lessons = dao.getLessonsForSkill(e.id).map { it.toDomain(emptyList()) }
                units.getOrPut(e.unitId) { mutableListOf() }.add(e.toDomain(lessons))
                meta.putIfAbsent(e.unitId, Triple(e.unitName, e.unitCefr, e.unitOrder))
            }
            units.entries
                .sortedBy { meta[it.key]?.third ?: 0 }
                .map { (unitId, skills) ->
                    val (name, cefr, order) = meta[unitId]!!
                    CurriculumUnit(id = unitId, name = name, cefr = cefr, order = order, skills = skills)
                }
        }.flowOn(io)

    override suspend fun getLesson(lessonId: String): Lesson? {
        val lesson = dao.getLesson(lessonId) ?: return null
        val exercises = dao.getExercisesForLesson(lessonId).map { it.toDomain() }
        return lesson.toDomain(exercises)
    }

    override suspend fun getSkill(skillId: String): Skill? {
        val skill = dao.getSkill(skillId) ?: return null
        val lessons = dao.getLessonsForSkill(skillId).map { it.toDomain(emptyList()) }
        return skill.toDomain(lessons)
    }

    override fun observeScenarios(): Flow<List<ChatScenario>> =
        dao.observeScenarios().map { list -> list.map { it.toDomain() } }.flowOn(io)

    override suspend fun getScenario(scenarioId: String): ChatScenario? =
        dao.getScenario(scenarioId)?.toDomain()

    override fun observePhrases(): Flow<List<Phrase>> =
        dao.observePhrases().map { list -> list.map { it.toDomain() } }.flowOn(io)

    override suspend fun getVocabCard(cardId: String): VocabCard? =
        dao.getVocab(cardId)?.toDomain()

    override suspend fun wordOfTheDay(): VocabCard? {
        val all = dao.getAllVocab().sortedBy { it.frequencyRank }
        if (all.isEmpty()) return null
        val idx = (clock.today().toEpochDay().mod(all.size))
        return all[idx].toDomain()
    }
}
