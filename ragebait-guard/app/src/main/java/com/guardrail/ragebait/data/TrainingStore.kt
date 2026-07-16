package com.guardrail.ragebait.data

import android.content.Context
import com.guardrail.ragebait.classify.Tokenizer
import com.guardrail.ragebait.model.VideoSnapshot
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Persists what the 😤 button collects: flagged-video examples, per-term
 * sighting counts, and per-creator flag counts. A term becomes an active
 * (auto-skipping) learned blocker once it has appeared in
 * [LEARN_THRESHOLD]+ flagged videos; a creator is auto-blocked after
 * [CREATOR_THRESHOLD] flags.
 *
 * Stored as a single JSON file in app-private storage — nothing leaves the
 * device.
 */
class TrainingStore(context: Context) {

    private val file = File(context.applicationContext.filesDir, "training.json")

    private val examples = ArrayList<JSONObject>()
    private val termCounts = HashMap<String, Int>()
    private val creatorCounts = HashMap<String, Int>()
    private val removedTerms = HashSet<String>()

    init {
        load()
    }

    data class FlagResult(
        val newlyLearnedTerms: List<String>,
        val newlyBlockedCreator: String?,
    )

    @Synchronized
    fun recordFlag(snapshot: VideoSnapshot): FlagResult {
        val example = JSONObject()
            .put("at", snapshot.capturedAtMs)
            .put("creator", snapshot.creator ?: "")
            .put("hashtags", JSONArray(snapshot.hashtags))
            .put("text", snapshot.joinedText.take(600))
        examples.add(example)
        while (examples.size > MAX_EXAMPLES) examples.removeAt(0)

        val newlyLearned = ArrayList<String>()
        for (term in Tokenizer.candidateTerms(snapshot)) {
            if (term in removedTerms) continue
            val count = (termCounts[term] ?: 0) + 1
            termCounts[term] = count
            if (count == LEARN_THRESHOLD) newlyLearned += term
        }

        var newlyBlockedCreator: String? = null
        val creator = snapshot.creator?.lowercase()
        if (creator != null) {
            val count = (creatorCounts[creator] ?: 0) + 1
            creatorCounts[creator] = count
            if (count == CREATOR_THRESHOLD) newlyBlockedCreator = creator
        }

        save()
        return FlagResult(newlyLearned, newlyBlockedCreator)
    }

    /** Terms that have crossed the threshold and now auto-skip. */
    @Synchronized
    fun activeLearnedTerms(): Map<String, Int> =
        termCounts.filterValues { it >= LEARN_THRESHOLD }

    /** Terms still gathering evidence (shown greyed-out in the UI). */
    @Synchronized
    fun pendingTerms(): Map<String, Int> =
        termCounts.filterValues { it in 1 until LEARN_THRESHOLD }

    @Synchronized
    fun exampleCount(): Int = examples.size

    /**
     * User rejected a learned term: forget its count and never re-learn it
     * (otherwise two more flags would just resurrect it).
     */
    @Synchronized
    fun removeTerm(term: String) {
        termCounts.remove(term)
        removedTerms.add(term)
        save()
    }

    @Synchronized
    fun reset() {
        examples.clear()
        termCounts.clear()
        creatorCounts.clear()
        removedTerms.clear()
        save()
    }

    // ---- persistence ------------------------------------------------------

    private fun load() {
        if (!file.exists()) return
        try {
            val root = JSONObject(file.readText())
            root.optJSONArray("examples")?.let { arr ->
                for (i in 0 until arr.length()) examples.add(arr.getJSONObject(i))
            }
            root.optJSONObject("termCounts")?.let { obj ->
                for (key in obj.keys()) termCounts[key] = obj.getInt(key)
            }
            root.optJSONObject("creatorCounts")?.let { obj ->
                for (key in obj.keys()) creatorCounts[key] = obj.getInt(key)
            }
            root.optJSONArray("removedTerms")?.let { arr ->
                for (i in 0 until arr.length()) removedTerms.add(arr.getString(i))
            }
        } catch (_: Exception) {
            // Corrupt store: start fresh rather than crash the service.
            examples.clear()
            termCounts.clear()
            creatorCounts.clear()
            removedTerms.clear()
        }
    }

    private fun save() {
        try {
            val root = JSONObject()
                .put("examples", JSONArray(examples))
                .put("termCounts", JSONObject(termCounts as Map<*, *>))
                .put("creatorCounts", JSONObject(creatorCounts as Map<*, *>))
                .put("removedTerms", JSONArray(removedTerms.toList()))
            file.writeText(root.toString())
        } catch (_: Exception) {
            // Best effort; losing training data must never crash the service.
        }
    }

    companion object {
        const val LEARN_THRESHOLD = 3
        const val CREATOR_THRESHOLD = 2
        private const val MAX_EXAMPLES = 200
    }
}
