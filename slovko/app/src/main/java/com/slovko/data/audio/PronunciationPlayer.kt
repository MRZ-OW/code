package com.slovko.data.audio

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import com.slovko.core.common.TextNormalizer
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/** Speaks Slovak text. TTS-backed; abstracted so bundled MP3s can be added later. */
interface PronunciationPlayer {
    fun speak(text: String, slow: Boolean = false)
    fun stop()
    fun shutdown()
}

/**
 * Slovak TTS.
 *
 * Quality strategy (best on-device option without a paid cloud voice):
 *  1. Prefer Google's TTS engine ("com.google.android.tts") when installed — its
 *     multilingual voices are far more natural than the OEM default (e.g. Samsung).
 *  2. Pick the highest-quality sk-SK voice, preferring offline voices so it keeps
 *     working in airplane mode.
 *
 * It also sanitises text before speaking so placeholders like the "____" blanks
 * in fill-in exercises are never read aloud.
 */
@Singleton
class TtsManager @Inject constructor(
    @ApplicationContext context: Context,
) : PronunciationPlayer {

    private val appContext = context.applicationContext
    @Volatile private var ready = false

    private val enginePackage: String? = run {
        val pm = appContext.packageManager
        val installed = runCatching { pm.getPackageInfo(GOOGLE_TTS, 0); true }.getOrDefault(false)
        if (installed) GOOGLE_TTS else null
    }

    private val onInit = TextToSpeech.OnInitListener { status ->
        if (status == TextToSpeech.SUCCESS) {
            runCatching { tts.language = Locale("sk", "SK") }
            runCatching { selectBestSlovakVoice() }
            runCatching { tts.setPitch(1.0f) }
            ready = true
        }
    }

    private val tts: TextToSpeech =
        if (enginePackage != null) {
            TextToSpeech(appContext, onInit, enginePackage)
        } else {
            TextToSpeech(appContext, onInit)
        }

    private fun selectBestSlovakVoice() {
        val voices: Set<Voice> = tts.voices ?: return
        val slovak = voices.filter { it.locale?.language == "sk" }
        if (slovak.isEmpty()) return
        // Prefer offline (no network) voices, then the highest reported quality.
        val best = slovak
            .sortedWith(
                compareByDescending<Voice> { !it.isNetworkConnectionRequired }
                    .thenByDescending { it.quality },
            )
            .firstOrNull() ?: return
        runCatching { tts.voice = best }
    }

    override fun speak(text: String, slow: Boolean) {
        if (!ready) return
        val clean = TextNormalizer.forSpeech(text)
        if (clean.isBlank()) return
        tts.setSpeechRate(if (slow) 0.7f else 1.0f)
        tts.speak(clean, TextToSpeech.QUEUE_FLUSH, null, clean.hashCode().toString())
    }

    override fun stop() {
        runCatching { tts.stop() }
    }

    override fun shutdown() {
        runCatching { tts.shutdown() }
    }

    companion object {
        private const val GOOGLE_TTS = "com.google.android.tts"
    }
}
