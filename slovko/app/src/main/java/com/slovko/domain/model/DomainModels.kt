package com.slovko.domain.model

/** Pure-Kotlin domain models. No Android / Room annotations. */

data class CurriculumUnit(
    val id: String,
    val name: String,
    val cefr: String,
    val order: Int,
    val skills: List<Skill>,
)

data class Skill(
    val id: String,
    val unitId: String,
    val title: String,
    val description: String,
    val iconKey: String,
    val colorKey: String,
    val orderIndex: Int,
    val cefrLevel: String,
    val lessons: List<Lesson> = emptyList(),
)

data class Lesson(
    val id: String,
    val skillId: String,
    val title: String,
    val orderIndex: Int,
    val type: LessonType,
    val xpReward: Int,
    val exercises: List<Exercise> = emptyList(),
)

data class Exercise(
    val id: String,
    val lessonId: String,
    val orderIndex: Int,
    val type: ExerciseType,
    val promptSk: String?,
    val promptEn: String?,
    val answer: String,
    val acceptable: List<String>,
    val choices: List<String>,
    val pairs: List<Pair<String, String>> = emptyList(),
    val audioKey: String? = null,
    val vocabCardId: String? = null,
    val hint: String? = null,
    val caseTag: CaseTag? = null,
    val aspectTag: AspectTag? = null,
    val register: Register = Register.NEUTRAL,
)

data class VocabCard(
    val id: String,
    val sk: String,
    val en: String,
    val partOfSpeech: String,
    val ipa: String? = null,
    val exampleSk: String? = null,
    val exampleEn: String? = null,
    val gender: String? = null,
    val audioKey: String? = null,
    val register: Register = Register.NEUTRAL,
    val frequencyRank: Int = 9999,
)

// ---- Chat ----
data class ChatScenario(
    val id: String,
    val title: String,
    val description: String,
    val cefrLevel: String,
    val starterLineSk: String,
    val iconKey: String,
    val locked: Boolean,
    val turns: List<ScenarioTurn> = emptyList(),
)

data class ScenarioTurn(
    val role: String, // "partner" | "user"
    val sk: String,
    val enGloss: String,
    val replies: List<ReplyOption> = emptyList(),
)

data class ReplyOption(
    val sk: String,
    val enGloss: String,
    val natural: Boolean,
)

data class ChatMessage(
    val id: Long = 0,
    val scenarioId: String,
    val role: String, // "partner" | "user"
    val textSk: String,
    val textEnGloss: String? = null,
    val createdAt: Long = 0,
)

data class Phrase(
    val id: String,
    val sk: String,
    val en: String,
    val register: Register,
    val note: String? = null,
    val vocabCardId: String? = null,
)

// ---- Progress / gamification ----
data class UserStats(
    val displayName: String,
    val level: Int,
    val totalXp: Int,
    val xpIntoLevel: Int,
    val xpForNextLevel: Int,
    val gems: Int,
    val crowns: Int,
    val currentStreak: Int,
    val longestStreak: Int,
    val wordsLearned: Int,
    val avatarKey: String,
    val memberSinceEpochDay: Long,
)

data class DailyGoal(
    val dateIso: String,
    val goalXp: Int,
    val earnedXp: Int,
    val lessonsCompleted: Int,
    val met: Boolean,
) {
    val progress: Float get() = if (goalXp <= 0) 0f else (earnedXp.toFloat() / goalXp).coerceIn(0f, 1f)
}

data class Quest(
    val id: String,
    val title: String,
    val target: Int,
    val progress: Int,
    val rewardGems: Int,
    val completed: Boolean,
) {
    val fraction: Float get() = if (target <= 0) 0f else (progress.toFloat() / target).coerceIn(0f, 1f)
}

data class Achievement(
    val id: String,
    val title: String,
    val description: String,
    val iconKey: String,
    val threshold: Int,
    val progress: Int,
    val unlockedAtEpoch: Long?,
    val tier: Int,
) {
    val unlocked: Boolean get() = unlockedAtEpoch != null
    val fraction: Float get() = if (threshold <= 0) 0f else (progress.toFloat() / threshold).coerceIn(0f, 1f)
}

data class LeagueStanding(
    val rank: Int,
    val name: String,
    val xp: Int,
    val isUser: Boolean,
    val avatarKey: String,
)

data class League(
    val tier: LeagueTier,
    val daysRemaining: Int,
    val standings: List<LeagueStanding>,
    val promoteCutoff: Int, // ranks <= this promote
    val demoteCutoff: Int,  // ranks > this demote
)

// ---- Lesson runtime ----
data class FocusState(
    val mode: FocusMode,
    val heartsRemaining: Int,
)

data class Feedback(
    val correct: Boolean,
    val title: String,
    val correctAnswer: String,
    val explanation: String? = null,
)

/** A day in the activity heatmap. */
data class HeatDay(
    val epochDay: Long,
    val xp: Int,
    val met: Boolean,
)

/** Result of grading a single exercise answer. */
data class GradeResult(
    val correct: Boolean,
    val grade: Grade,
)

/** A card with its current SRS scheduling state. */
data class ReviewCard(
    val card: VocabCard,
    val direction: CardDirection,
    val state: CardState,
    val stability: Double,
    val difficulty: Double,
    val due: Long,
    val reps: Int,
    val lapses: Int,
    val lastReviewMillis: Long?,
)
