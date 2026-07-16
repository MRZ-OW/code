package com.guardrail.ragebait.data

import android.content.Context
import android.content.SharedPreferences
import com.guardrail.ragebait.classify.TopicPacks

/**
 * User-facing settings: the custom blocklist, enabled topic packs, blocked
 * creators, master switch, overlay position (as screen fractions, so the
 * button lands sensibly on both Z Fold 6 screens), and counters.
 */
class GuardPrefs(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences("guard_prefs", Context.MODE_PRIVATE)

    var guardEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    // ---- custom blocklist -------------------------------------------------

    var blockedTerms: Set<String>
        get() {
            if (!prefs.contains(KEY_TERMS)) blockedTerms = DEFAULT_TERMS
            return prefs.getStringSet(KEY_TERMS, DEFAULT_TERMS)!!
        }
        private set(value) {
            prefs.edit().putStringSet(KEY_TERMS, value).apply()
        }

    fun addBlockedTerm(raw: String): Boolean {
        val term = raw.trim().lowercase()
        if (term.isEmpty()) return false
        blockedTerms = blockedTerms + term
        return true
    }

    fun removeBlockedTerm(term: String) {
        blockedTerms = blockedTerms - term
    }

    // ---- topic packs ------------------------------------------------------

    var enabledPackIds: Set<String>
        get() = prefs.getStringSet(KEY_PACKS, DEFAULT_PACKS)!!
        set(value) = prefs.edit().putStringSet(KEY_PACKS, value).apply()

    fun setPackEnabled(id: String, enabled: Boolean) {
        enabledPackIds = if (enabled) enabledPackIds + id else enabledPackIds - id
    }

    // ---- blocked creators -------------------------------------------------

    var blockedCreators: Set<String>
        get() = prefs.getStringSet(KEY_CREATORS, emptySet())!!
        private set(value) {
            prefs.edit().putStringSet(KEY_CREATORS, value).apply()
        }

    fun addBlockedCreator(handle: String) {
        val clean = handle.trim().lowercase()
        if (clean.isNotEmpty()) blockedCreators = blockedCreators + clean
    }

    fun removeBlockedCreator(handle: String) {
        blockedCreators = blockedCreators - handle
    }

    // ---- overlay button position (fractions of usable screen space) -------

    var overlayFractionX: Float
        get() = prefs.getFloat(KEY_OVERLAY_FX, 0.92f)
        set(value) = prefs.edit().putFloat(KEY_OVERLAY_FX, value.coerceIn(0f, 1f)).apply()

    var overlayFractionY: Float
        get() = prefs.getFloat(KEY_OVERLAY_FY, 0.55f)
        set(value) = prefs.edit().putFloat(KEY_OVERLAY_FY, value.coerceIn(0f, 1f)).apply()

    // ---- counters ---------------------------------------------------------

    val skippedCount: Int get() = prefs.getInt(KEY_SKIPPED, 0)
    val flaggedCount: Int get() = prefs.getInt(KEY_FLAGGED, 0)

    fun incrementSkipped() = prefs.edit().putInt(KEY_SKIPPED, skippedCount + 1).apply()
    fun incrementFlagged() = prefs.edit().putInt(KEY_FLAGGED, flaggedCount + 1).apply()

    companion object {
        private const val KEY_ENABLED = "guard_enabled"
        private const val KEY_TERMS = "blocked_terms"
        private const val KEY_PACKS = "enabled_packs"
        private const val KEY_CREATORS = "blocked_creators"
        private const val KEY_OVERLAY_FX = "overlay_fx"
        private const val KEY_OVERLAY_FY = "overlay_fy"
        private const val KEY_SKIPPED = "stat_skipped"
        private const val KEY_FLAGGED = "stat_flagged"

        /** Starter custom list — fully editable in the app. */
        val DEFAULT_TERMS: Set<String> = setOf(
            "rage bait",
            "ragebait",
            "engagement bait",
        )

        val DEFAULT_PACKS: Set<String> = TopicPacks.ALL.map { it.id }.toSet()
    }
}
