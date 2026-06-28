package com.slovko.content

import com.slovko.data.AppJson
import com.slovko.data.seed.UnitFileDto
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.Locale

/**
 * Guards against LISTEN_CHOOSE exercises whose options cannot be told apart by
 * ear via TTS. The classic offenders in Slovak:
 *   - i/y and í/ý are pronounced IDENTICALLY (a spelling rule, not a sound),
 *   - options that differ only by capitalisation / spacing (e.g. fake stress
 *     markers "A-hoj" vs "a-HOJ") cannot be produced by TTS either.
 *
 * Legitimate audible contrasts (word-level vowel length like sud/súd, or the
 * soft consonants ď/ť/ň/ľ) are intentionally NOT flagged.
 */
class ListenChoiceDistinctTest {

    private val curriculumDir = File("src/main/assets/curriculum")

    /** Collapse the orthographic homophones y↔i and ý↔í. */
    private fun soundKey(s: String): String =
        s.lowercase(Locale.ROOT).replace("ý", "í").replace("y", "i").trim()

    /** Strip case, spacing and punctuation, keeping letters (incl. diacritics). */
    private fun shapeKey(s: String): String =
        s.lowercase(Locale.ROOT).filter { it.isLetter() }

    @Test
    fun listenChooseOptionsAreAudiblyDistinct() {
        val files = curriculumDir.listFiles { f -> f.name.matches(Regex("unit.*\\.json")) }
            ?.sortedBy { it.name }
            ?: emptyList()
        assertTrue("No curriculum unit files found in $curriculumDir", files.isNotEmpty())

        val problems = mutableListOf<String>()
        for (file in files) {
            val unit = AppJson.decodeFromString(UnitFileDto.serializer(), file.readText())
            for (skill in unit.skills) {
                for (lesson in skill.lessons) {
                    for (ex in lesson.exercises) {
                        if (ex.type.uppercase(Locale.ROOT) != "LISTEN_CHOOSE") continue
                        val choices = ex.choices
                        val where = "${file.name} / ${ex.id}"

                        if (choices.size < 2) {
                            problems += "$where: LISTEN_CHOOSE needs >= 2 choices"
                            continue
                        }
                        val sounds = choices.map { soundKey(it) }
                        if (sounds.toSet().size != sounds.size) {
                            problems += "$where: options are homophones (i/y or í/ý sound the same): $choices"
                        }
                        val shapes = choices.map { shapeKey(it) }
                        if (shapes.toSet().size != shapes.size) {
                            problems += "$where: options differ only by case/spacing — TTS can't render them: $choices"
                        }
                        if (ex.answer.isNotBlank() && choices.none { it == ex.answer }) {
                            problems += "$where: answer '${ex.answer}' is not among the choices"
                        }
                    }
                }
            }
        }
        assertTrue(
            "Found audio-indistinguishable LISTEN_CHOOSE exercises:\n${problems.joinToString("\n")}",
            problems.isEmpty(),
        )
    }
}
