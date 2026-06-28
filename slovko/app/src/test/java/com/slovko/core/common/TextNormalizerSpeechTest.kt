package com.slovko.core.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class TextNormalizerSpeechTest {

    @Test
    fun `underscored blanks are removed before speech`() {
        val spoken = TextNormalizer.forSpeech("Dobrý deň, ___ vám pomôcť?")
        assertFalse("must not contain underscores", spoken.contains("_"))
        assertEquals("Dobrý deň, vám pomôcť?", spoken)
    }

    @Test
    fun `dotted blanks are removed too`() {
        assertEquals("Mám kávu", TextNormalizer.forSpeech("Mám ... kávu"))
    }

    @Test
    fun `plain text is unchanged`() {
        assertEquals("Ako sa máš?", TextNormalizer.forSpeech("Ako sa máš?"))
    }
}
