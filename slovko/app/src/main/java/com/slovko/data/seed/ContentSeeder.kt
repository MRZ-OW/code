package com.slovko.data.seed

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.room.withTransaction
import com.slovko.data.AppJson
import com.slovko.data.datastore.PrefKeys
import com.slovko.data.db.SlovkoDatabase
import com.slovko.data.db.entity.AchievementEntity
import com.slovko.data.db.entity.ExerciseEntity
import com.slovko.data.db.entity.LessonEntity
import com.slovko.data.db.entity.SkillEntity
import com.slovko.data.db.entity.VocabCardEntity
import com.slovko.data.mapper.toEntity
import com.slovko.domain.AchievementsCatalog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Parses bundled curriculum JSON and seeds Room on first launch / version bump.
 * Content tables only — never touches user/SRS/streak/profile. See DESIGN.md §13.
 */
@Singleton
class ContentSeeder @Inject constructor(
    @ApplicationContext private val context: Context,
    private val db: SlovkoDatabase,
    private val dataStore: DataStore<Preferences>,
) {
    private val dao get() = db.contentDao()

    suspend fun seedIfNeeded() {
        val manifest = readAsset("curriculum/manifest.json")
            ?.let { runCatching { AppJson.decodeFromString(ManifestDto.serializer(), it) }.getOrNull() }
            ?: ManifestDto()

        val storedVersion = dataStore.data.first()[PrefKeys.SEED_VERSION] ?: 0
        val needsContent = storedVersion < manifest.version || dao.skillCount() == 0

        if (needsContent) {
            seedContent(manifest)
            dataStore.edit { it[PrefKeys.SEED_VERSION] = manifest.version }
        }
        seedAchievements()
    }

    private suspend fun seedContent(manifest: ManifestDto) {
        val skills = mutableListOf<SkillEntity>()
        val lessons = mutableListOf<LessonEntity>()
        val exercises = mutableListOf<ExerciseEntity>()
        val vocab = mutableListOf<VocabCardEntity>()

        for (file in manifest.skillFiles) {
            val raw = readAsset("curriculum/$file") ?: continue
            val unitFile = runCatching {
                AppJson.decodeFromString(UnitFileDto.serializer(), raw)
            }.getOrNull() ?: continue

            for (skill in unitFile.skills) {
                skills += skill.toEntity(unitFile.unit)
                skill.vocab.forEach { vocab += it.toEntity() }
                for (lesson in skill.lessons) {
                    lessons += lesson.toEntity(skill.id)
                    lesson.exercises.forEach { exercises += it.toEntity(lesson.id) }
                }
            }
        }

        val scenarios = manifest.scenarioFile
            ?.let { readAsset("curriculum/$it") }
            ?.let { runCatching { AppJson.decodeFromString(ScenarioFileDto.serializer(), it) }.getOrNull() }
            ?.scenarios?.map { it.toEntity() } ?: emptyList()

        val phrases = manifest.phrasebookFile
            ?.let { readAsset("curriculum/$it") }
            ?.let { runCatching { AppJson.decodeFromString(PhrasebookFileDto.serializer(), it) }.getOrNull() }
            ?.phrases?.map { it.toEntity() } ?: emptyList()

        db.withTransaction {
            dao.clearExercises(); dao.clearLessons(); dao.clearVocab()
            dao.clearScenarios(); dao.clearPhrases(); dao.clearSkills()
            dao.insertSkills(skills)
            dao.insertVocab(vocab)
            dao.insertLessons(lessons)
            dao.insertExercises(exercises)
            dao.insertScenarios(scenarios)
            dao.insertPhrases(phrases)
        }
    }

    private suspend fun seedAchievements() {
        val items = AchievementsCatalog.ALL.mapIndexed { index, def ->
            AchievementEntity(
                id = def.id, title = def.title, description = def.description,
                iconKey = def.iconKey, threshold = def.threshold, progress = 0,
                unlockedAtEpoch = null, tier = def.tier, orderIndex = index,
            )
        }
        db.gamificationDao().insertAchievements(items) // IGNORE keeps existing progress
    }

    private fun readAsset(path: String): String? = runCatching {
        context.assets.open(path).bufferedReader().use { it.readText() }
    }.getOrNull()
}
