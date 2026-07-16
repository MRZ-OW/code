package com.guardrail.ragebait.classify

import com.guardrail.ragebait.model.VideoSnapshot

/**
 * Decides whether the video on screen should be auto-skipped. Deliberately
 * transparent: a verdict always names the exact terms that matched, and those
 * same terms are visible/removable in the app UI.
 */
object Classifier {

    data class Verdict(
        val shouldSkip: Boolean,
        val matchedTerms: List<String>,
        val matchedCreator: String?,
    ) {
        companion object {
            val PASS = Verdict(false, emptyList(), null)
        }
    }

    private val patternCache = HashMap<String, Regex>()

    fun evaluate(
        snapshot: VideoSnapshot,
        blockedTerms: Collection<String>,
        learnedTerms: Collection<String>,
        blockedCreators: Collection<String>,
    ): Verdict {
        if (snapshot.isEmpty()) return Verdict.PASS

        val creator = snapshot.creator?.lowercase()
        if (creator != null) {
            val hit = blockedCreators.firstOrNull { it.lowercase() == creator }
            if (hit != null) return Verdict(true, emptyList(), hit)
        }

        val matched = ArrayList<String>()
        for (term in blockedTerms) if (matches(snapshot, term)) matched += term
        for (term in learnedTerms) if (matches(snapshot, term)) matched += term

        return if (matched.isEmpty()) Verdict.PASS else Verdict(true, matched, null)
    }

    /**
     * Phrases and #hashtags match as substrings; single words match on word
     * boundaries so "rage" doesn't hit "storage".
     */
    fun matches(snapshot: VideoSnapshot, rawTerm: String): Boolean {
        val term = rawTerm.trim().lowercase()
        if (term.isEmpty()) return false
        return if (term.contains(' ') || term.startsWith("#")) {
            snapshot.joinedText.contains(term)
        } else {
            val pattern = patternCache.getOrPut(term) {
                Regex("(?<![\\p{L}\\p{N}])${Regex.escape(term)}(?![\\p{L}\\p{N}])")
            }
            pattern.containsMatchIn(snapshot.joinedText)
        }
    }
}
