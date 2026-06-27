package com.slovko.data.ai

import com.slovko.domain.model.ChatMessage
import com.slovko.domain.model.ChatScenario
import com.slovko.domain.repository.SettingsRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

/** A conversation partner for the Chat track. Offline by default. */
interface ChatPartner {
    suspend fun reply(scenario: ChatScenario, history: List<ChatMessage>): Result<String>
}

/**
 * Default offline partner: walks the scenario's scripted partner turns; when the
 * script is exhausted, offers warm, encouraging free-form closers. Fully deterministic.
 */
@Singleton
class ScriptedChatPartner @Inject constructor() : ChatPartner {

    private val closers = listOf(
        "Super, ide ti to! 👏",
        "Presne tak. Ešte niečo?",
        "Pekne po slovensky! 😄",
        "Jasné, dohodnuté. Maj sa!",
    )

    override suspend fun reply(scenario: ChatScenario, history: List<ChatMessage>): Result<String> {
        val partnerSoFar = history.count { it.role == "partner" }
        val next = scenario.turns.getOrNull(partnerSoFar)?.sk
        val line = next ?: closers[partnerSoFar % closers.size]
        return Result.success(line)
    }
}

/**
 * Opt-in remote partner using a user-supplied OpenAI-compatible endpoint/key.
 * Uses HttpURLConnection (no extra deps). Falls back to scripted on any error.
 */
@Singleton
class RemoteChatPartner @Inject constructor(
    private val settings: SettingsRepository,
    private val fallback: ScriptedChatPartner,
) : ChatPartner {

    override suspend fun reply(scenario: ChatScenario, history: List<ChatMessage>): Result<String> {
        val cfg = settings.current()
        if (!cfg.aiEnabled || cfg.aiEndpoint.isBlank()) {
            return fallback.reply(scenario, history)
        }
        return withContext(Dispatchers.IO) {
            runCatching {
                val body = JSONObject().apply {
                    put("model", "gpt-4o-mini")
                    val messages = JSONArray()
                    messages.put(
                        JSONObject().put("role", "system").put(
                            "content",
                            "You are a friendly Slovak friend texting. Reply ONLY in casual, modern Slovak, " +
                                "1-2 short sentences. Scenario: ${scenario.description}",
                        ),
                    )
                    history.takeLast(12).forEach { m ->
                        val role = if (m.role == "user") "user" else "assistant"
                        messages.put(JSONObject().put("role", role).put("content", m.textSk))
                    }
                    put("messages", messages)
                    put("temperature", 0.7)
                }.toString()

                val conn = (URL(cfg.aiEndpoint).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 15000
                    readTimeout = 20000
                    setRequestProperty("Content-Type", "application/json")
                    if (cfg.aiApiKey.isNotBlank()) {
                        setRequestProperty("Authorization", "Bearer ${cfg.aiApiKey}")
                    }
                }
                conn.outputStream.use { it.write(body.toByteArray()) }
                val text = conn.inputStream.bufferedReader().use { it.readText() }
                val content = JSONObject(text)
                    .getJSONArray("choices").getJSONObject(0)
                    .getJSONObject("message").getString("content").trim()
                content.ifBlank { error("empty reply") }
            }.recoverCatching {
                fallback.reply(scenario, history).getOrThrow()
            }
        }
    }
}
