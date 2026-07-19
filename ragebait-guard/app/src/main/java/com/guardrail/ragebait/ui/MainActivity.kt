package com.guardrail.ragebait.ui

import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.materialswitch.MaterialSwitch
import com.guardrail.ragebait.R
import com.guardrail.ragebait.classify.TopicPacks
import com.guardrail.ragebait.data.GuardPrefs
import com.guardrail.ragebait.data.Logs
import com.guardrail.ragebait.data.TrainingStore
import com.guardrail.ragebait.service.GuardService

/**
 * Single-screen settings UI: service status, master switch, blocklist
 * editor, topic pack toggles, learned terms, blocked creators, stats.
 * Lists are small (dozens of entries), so rows are plain views added to
 * LinearLayout containers and rebuilt on each refresh.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var prefs: GuardPrefs
    private lateinit var training: TrainingStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Logs.init(this)
        setContentView(R.layout.activity_main)
        prefs = GuardPrefs(this)
        training = TrainingStore(this)

        findViewById<Button>(R.id.open_settings_button).setOnClickListener {
            openAccessibilitySettings()
        }
        findViewById<Button>(R.id.open_logs_button).setOnClickListener {
            startActivity(Intent(this, LogActivity::class.java))
        }

        val masterSwitch = findViewById<MaterialSwitch>(R.id.master_switch)
        masterSwitch.isChecked = prefs.guardEnabled
        masterSwitch.setOnCheckedChangeListener { _, checked ->
            prefs.guardEnabled = checked
        }

        val input = findViewById<EditText>(R.id.term_input)
        findViewById<Button>(R.id.add_term_button).setOnClickListener {
            if (prefs.addBlockedTerm(input.text.toString())) {
                input.text.clear()
                Toast.makeText(this, R.string.toast_term_added, Toast.LENGTH_SHORT).show()
                refreshTerms()
            }
        }

        // AI judge settings
        val llmSwitch = findViewById<MaterialSwitch>(R.id.llm_switch)
        llmSwitch.isChecked = prefs.llmEnabled
        llmSwitch.setOnCheckedChangeListener { _, checked ->
            prefs.llmEnabled = checked
        }
        val keyInput = findViewById<EditText>(R.id.llm_key_input)
        val modelInput = findViewById<EditText>(R.id.llm_model_input)
        keyInput.setText(prefs.llmApiKey)
        modelInput.setText(prefs.llmModel)
        findViewById<Button>(R.id.llm_save_button).setOnClickListener {
            prefs.llmApiKey = keyInput.text.toString()
            prefs.llmModel = modelInput.text.toString()
            modelInput.setText(prefs.llmModel)
            Toast.makeText(this, R.string.toast_llm_saved, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
        refreshStats()
        refreshTerms()
        refreshPacks()
        refreshLearned()
        refreshCreators()
    }

    // ------------------------------------------------------------------

    /**
     * Land the user as close to our service's toggle as the OS allows.
     * Samsung's One UI buries third-party services under Accessibility →
     * "Installed apps", so the generic settings screen is confusing.
     */
    private fun openAccessibilitySettings() {
        val component = ComponentName(this, GuardService::class.java).flattenToString()

        // 1) Direct per-service detail page (works on recent Android/One UI).
        try {
            startActivity(
                Intent("android.settings.ACCESSIBILITY_DETAILS_SETTINGS")
                    .putExtra("android.intent.extra.COMPONENT_NAME", component)
            )
            return
        } catch (_: Exception) {
            // Fall through.
        }

        // 2) Root accessibility screen, asking Settings to highlight/scroll
        //    to our service where supported.
        try {
            val args = Bundle().apply { putString(":settings:fragment_args_key", component) }
            startActivity(
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    .putExtra(":settings:fragment_args_key", component)
                    .putExtra(":settings:show_fragment_args", args)
            )
        } catch (_: Exception) {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
    }

    private fun refreshStatus() {
        val enabled = isServiceEnabled()
        findViewById<TextView>(R.id.status_text).text =
            getString(if (enabled) R.string.status_service_on else R.string.status_service_off)
    }

    private fun isServiceEnabled(): Boolean {
        val expected = "$packageName/${GuardService::class.java.name}"
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        return enabledServices.split(':').any { it.equals(expected, ignoreCase = true) }
    }

    private fun refreshStats() {
        findViewById<TextView>(R.id.stats_text).text = getString(
            R.string.stats_line,
            prefs.skippedCount,
            prefs.flaggedCount,
            training.exampleCount(),
            prefs.llmCheckCount,
        )
    }

    private fun refreshTerms() {
        val container = findViewById<LinearLayout>(R.id.terms_container)
        container.removeAllViews()
        val terms = prefs.blockedTerms.sorted()
        if (terms.isEmpty()) {
            container.addView(emptyLabel(R.string.blocklist_empty))
            return
        }
        for (term in terms) {
            container.addView(removableRow(term) {
                prefs.removeBlockedTerm(term)
                refreshTerms()
            })
        }
    }

    private fun refreshPacks() {
        val container = findViewById<LinearLayout>(R.id.packs_container)
        container.removeAllViews()
        for (pack in TopicPacks.ALL) {
            val row = MaterialSwitch(this).apply {
                text = getString(R.string.pack_row, pack.title, pack.terms.size)
                isChecked = pack.id in prefs.enabledPackIds
                setOnCheckedChangeListener { _, checked ->
                    prefs.setPackEnabled(pack.id, checked)
                }
            }
            container.addView(row)
        }
    }

    private fun refreshLearned() {
        findViewById<TextView>(R.id.learned_subtitle).text =
            getString(R.string.learned_subtitle, TrainingStore.LEARN_THRESHOLD)

        val container = findViewById<LinearLayout>(R.id.learned_container)
        container.removeAllViews()

        val active = training.activeLearnedTerms().toList().sortedByDescending { it.second }
        val pending = training.pendingTerms().toList().sortedByDescending { it.second }

        if (active.isEmpty() && pending.isEmpty()) {
            container.addView(emptyLabel(R.string.learned_empty))
            return
        }
        for ((term, count) in active) {
            container.addView(
                removableRow(getString(R.string.learned_active_row, term, count)) {
                    training.removeTerm(term)
                    refreshLearned()
                }
            )
        }
        for ((term, count) in pending) {
            val row = removableRow(getString(R.string.learned_pending_row, term, count)) {
                training.removeTerm(term)
                refreshLearned()
            }
            row.alpha = 0.55f
            container.addView(row)
        }
    }

    private fun refreshCreators() {
        val container = findViewById<LinearLayout>(R.id.creators_container)
        container.removeAllViews()
        val creators = prefs.blockedCreators.sorted()
        if (creators.isEmpty()) {
            container.addView(emptyLabel(R.string.creators_empty))
            return
        }
        for (creator in creators) {
            container.addView(removableRow(creator) {
                prefs.removeBlockedCreator(creator)
                refreshCreators()
            })
        }
    }

    // ---- row builders -----------------------------------------------------

    private fun emptyLabel(textRes: Int): TextView =
        TextView(this).apply {
            setText(textRes)
            alpha = 0.7f
        }

    private fun removableRow(label: String, onRemove: () -> Unit): LinearLayout =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(
                TextView(context).apply {
                    text = label
                },
                LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f),
            )
            addView(
                ImageButton(context).apply {
                    setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
                    background = null
                    contentDescription = getString(R.string.remove)
                    setOnClickListener { onRemove() }
                }
            )
        }
}
