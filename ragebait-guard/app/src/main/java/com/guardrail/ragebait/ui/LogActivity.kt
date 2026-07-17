package com.guardrail.ragebait.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.guardrail.ragebait.R
import com.guardrail.ragebait.data.Logs

/**
 * The Advanced → logs viewer. Shows the accumulated on-device log (service
 * lifecycle, skips, OCR/LLM outcomes, and any crash stack traces), newest at
 * the bottom. Share exports the text; Clear wipes it.
 */
class LogActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Logs.init(this)
        setContentView(R.layout.activity_logs)

        findViewById<Button>(R.id.log_refresh).setOnClickListener { refresh() }
        findViewById<Button>(R.id.log_clear).setOnClickListener {
            Logs.clear()
            refresh()
        }
        findViewById<Button>(R.id.log_share).setOnClickListener { share() }
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun refresh() {
        val text = Logs.read().ifBlank { getString(R.string.logs_empty) }
        findViewById<TextView>(R.id.log_text).text = text
        val scroll = findViewById<ScrollView>(R.id.log_scroll)
        scroll.post { scroll.fullScroll(ScrollView.FOCUS_DOWN) }
    }

    private fun share() {
        val text = Logs.read()
        if (text.isBlank()) {
            Toast.makeText(this, R.string.logs_empty, Toast.LENGTH_SHORT).show()
            return
        }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "RageBait Guard logs")
            putExtra(Intent.EXTRA_TEXT, text)
        }
        startActivity(Intent.createChooser(intent, getString(R.string.logs_share)))
    }
}
