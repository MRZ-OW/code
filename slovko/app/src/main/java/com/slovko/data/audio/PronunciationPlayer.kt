package com.slovko.data.audio

import android.content.Context
import android.speech.tts.TextToSpeech
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

@Singleton
class TtsManager @Inject constructor(
    @ApplicationContext context: Context,
) : PronunciationPlayer {

    private var ready = false
    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        if (status == TextToSpeech.SUCCESS) {
            runCatching { tts.language = Locale("sk", "SK") }
            ready = true
        }
    }

    override fun speak(text: String, slow: Boolean) {
        if (!ready || text.isBlank()) return
        tts.setSpeechRate(if (slow) 0.7f else 1.0f)
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, text.hashCode().toString())
    }

    override fun stop() {
        runCatching { tts.stop() }
    }

    override fun shutdown() {
        runCatching { tts.shutdown() }
    }
}
