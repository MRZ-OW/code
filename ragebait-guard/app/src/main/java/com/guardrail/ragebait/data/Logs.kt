package com.guardrail.ragebait.data

import android.content.Context
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * A tiny, file-backed logger so crashes are diagnosable *on the phone*,
 * without adb/Logcat.
 *
 * Key property: an uncaught-exception handler writes the full stack trace to
 * disk **synchronously before the process dies**, then chains to the system
 * handler. In-memory logs would vanish with the crash — this is why every
 * line is flushed to a file.
 *
 * The file is a size-capped ring: when it grows past [MAX_FILE_BYTES] the
 * oldest half is dropped. Everything is on-device; nothing is uploaded.
 */
object Logs {

    private const val MAX_FILE_BYTES = 256 * 1024
    private const val TAG = "RageBaitGuard"

    private val lock = Any()
    private val stamp = SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.US)

    @Volatile private var file: File? = null

    /** Idempotent; safe to call from both the Activity and the Service. */
    fun init(context: Context) {
        synchronized(lock) {
            if (file != null) return
            file = File(context.applicationContext.filesDir, "guard.log")
            installCrashHandler()
        }
        i("Logs", "── log store ready (v${appVersion(context)}) ──")
    }

    fun i(tag: String, message: String) = write("I", tag, message)
    fun w(tag: String, message: String) = write("W", tag, message)

    fun e(tag: String, message: String, t: Throwable? = null) {
        write("E", tag, if (t == null) message else "$message\n${t.stackTraceToString()}")
    }

    fun read(): String = synchronized(lock) {
        file?.takeIf { it.exists() }?.readText().orEmpty()
    }

    fun clear() = synchronized(lock) {
        file?.writeText("")
        i("Logs", "── cleared ──")
    }

    // ------------------------------------------------------------------

    private fun write(level: String, tag: String, message: String) {
        Log.println(
            when (level) { "E" -> Log.ERROR; "W" -> Log.WARN; else -> Log.INFO },
            TAG,
            "$tag: $message",
        )
        val target = file ?: return
        val line = "${stamp.format(Date())} $level/$tag: $message\n"
        synchronized(lock) {
            try {
                target.appendText(line)
                if (target.length() > MAX_FILE_BYTES) trimLocked(target)
            } catch (_: Throwable) {
                // Logging must never itself crash the app.
            }
        }
    }

    /** Drop the oldest half once the file gets large. Caller holds [lock]. */
    private fun trimLocked(target: File) {
        try {
            val text = target.readText()
            val kept = text.substring(text.length / 2)
            val firstNewline = kept.indexOf('\n')
            target.writeText(
                "── (older log lines trimmed) ──\n" +
                    if (firstNewline >= 0) kept.substring(firstNewline + 1) else kept
            )
        } catch (_: Throwable) {
            target.writeText("")
        }
    }

    private fun installCrashHandler() {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                write("E", "CRASH", "Uncaught on '${thread.name}':\n${throwable.stackTraceToString()}")
            } catch (_: Throwable) {
                // Give up quietly; still hand off to the system handler below.
            }
            previous?.uncaughtException(thread, throwable)
        }
    }

    private fun appVersion(context: Context): String = try {
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "?"
    } catch (_: Throwable) {
        "?"
    }
}
