package com.slovko.core.common

import java.text.Normalizer
import java.util.Locale

/** Diacritic-insensitive, punctuation/whitespace-tolerant normalization for grading. */
object TextNormalizer {

    private val combiningMarks = "\\p{InCombiningDiacriticalMarks}+".toRegex()
    private val nonWord = "[^a-z0-9 ]".toRegex()
    private val spaces = "\\s+".toRegex()

    /** Lowercase, strip diacritics & punctuation, collapse spaces. */
    fun normalize(input: String): String {
        val lowered = input.lowercase(Locale.ROOT).trim()
        val decomposed = Normalizer.normalize(lowered, Normalizer.Form.NFD)
        val noMarks = combiningMarks.replace(decomposed, "")
        return spaces.replace(nonWord.replace(noMarks, " "), " ").trim()
    }

    /** Like [normalize] but keeps diacritics (for strict listen-and-type grading). */
    fun normalizeStrict(input: String): String =
        spaces.replace(input.lowercase(Locale.ROOT).trim(), " ")

    private val blanks = "(_+|\\.{3,})".toRegex()

    /** Strip fill-in blanks ("____", "...") so TTS never reads them aloud. */
    fun forSpeech(input: String): String =
        spaces.replace(blanks.replace(input, " "), " ").trim()

    /** Order-insensitive token comparison (word-bank tolerance). */
    fun sameWords(a: String, b: String): Boolean =
        normalize(a).split(" ").filter { it.isNotEmpty() }.sorted() ==
            normalize(b).split(" ").filter { it.isNotEmpty() }.sorted()
}
