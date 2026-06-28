package com.slovko.domain.model

enum class ExerciseType {
    MCQ,
    TRANSLATE_SK_EN,
    TRANSLATE_EN_SK,
    LISTEN_CHOOSE,
    LISTEN_TYPE,
    WORD_BANK,
    SPEAK,
    MATCH_PAIRS,
    FILL_CASE,
    ASPECT_CHOICE,
    DIALOGUE_FILL,
}

enum class LessonType { TEACH, PRACTICE, CHECKPOINT }

enum class Register { INFORMAL, NEUTRAL, FORMAL }

enum class CaseTag { NOM, ACC, LOC, INS, GEN, DAT }

enum class AspectTag { IMPF, PERF }

/** FSRS review grade. Value matches FSRS rating index. */
enum class Grade(val value: Int) {
    AGAIN(1),
    HARD(2),
    GOOD(3),
    EASY(4),
}

enum class CardState(val value: Int) {
    NEW(0),
    LEARNING(1),
    REVIEW(2),
    RELEARNING(3);

    companion object {
        fun from(value: Int): CardState = entries.firstOrNull { it.value == value } ?: NEW
    }
}

/** Direction of a vocab card for SRS granularity. */
enum class CardDirection(val value: Int) {
    SK_TO_EN(0), // recognition
    EN_TO_SK(1); // production

    companion object {
        fun from(value: Int): CardDirection = entries.firstOrNull { it.value == value } ?: SK_TO_EN
    }
}

enum class LeagueTier(val displayName: String) {
    BRONZE("Bronze"),
    SILVER("Silver"),
    GOLD("Gold"),
    SAPPHIRE("Sapphire"),
    RUBY("Ruby"),
    EMERALD("Emerald"),
    DIAMOND("Diamond");

    fun promote(): LeagueTier = entries.getOrElse(ordinal + 1) { this }
    fun demote(): LeagueTier = entries.getOrElse(ordinal - 1) { this }
}

enum class ChestRarity { COMMON, RARE, EPIC }

enum class FocusMode { FOCUS, CHALLENGE }

enum class MajaPose { WAVING, THINKING, CELEBRATING, SLEEPY, PROUD, WORRIED, LISTENING, READING }
