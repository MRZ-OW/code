package com.slovko.data.repository

import com.slovko.core.common.AppClock
import com.slovko.core.common.IoDispatcher
import com.slovko.data.ai.ChatPartner
import com.slovko.data.db.dao.ChatDao
import com.slovko.data.db.entity.ChatMessageEntity
import com.slovko.domain.model.ChatMessage
import com.slovko.domain.repository.ChatRepository
import com.slovko.domain.repository.ContentRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val chatDao: ChatDao,
    private val content: ContentRepository,
    private val partner: ChatPartner,
    private val clock: AppClock,
    @IoDispatcher private val io: CoroutineDispatcher,
) : ChatRepository {

    override fun observeMessages(scenarioId: String): Flow<List<ChatMessage>> =
        chatDao.observeMessages(scenarioId).map { list -> list.map { it.toDomain() } }.flowOn(io)

    override suspend fun startIfEmpty(scenarioId: String) = withContext(io) {
        if (chatDao.count(scenarioId) > 0) return@withContext
        val scenario = content.getScenario(scenarioId) ?: return@withContext
        val firstTurn = scenario.turns.firstOrNull()
        chatDao.insert(
            ChatMessageEntity(
                scenarioId = scenarioId,
                role = "partner",
                textSk = firstTurn?.sk ?: scenario.starterLineSk,
                textEnGloss = firstTurn?.enGloss,
                createdAt = clock.nowMillis(),
                turnIndex = 0,
            ),
        )
    }

    override suspend fun sendUserMessage(scenarioId: String, textSk: String, glossEn: String?) {
        withContext(io) {
            val userCount = chatDao.getMessages(scenarioId).count { it.role == "user" }
            chatDao.insert(
                ChatMessageEntity(
                    scenarioId = scenarioId, role = "user", textSk = textSk,
                    textEnGloss = glossEn, createdAt = clock.nowMillis(), turnIndex = userCount,
                ),
            )
        }
    }

    override suspend fun requestPartnerReply(scenarioId: String): Result<ChatMessage> = withContext(io) {
        val scenario = content.getScenario(scenarioId)
            ?: return@withContext Result.failure(IllegalStateException("Scenario not found"))
        val history = chatDao.getMessages(scenarioId).map { it.toDomain() }
        partner.reply(scenario, history).map { text ->
            val id = chatDao.insert(
                ChatMessageEntity(
                    scenarioId = scenarioId, role = "partner", textSk = text,
                    textEnGloss = null, createdAt = clock.nowMillis(),
                    turnIndex = history.count { it.role == "partner" },
                ),
            )
            ChatMessage(id, scenarioId, "partner", text, null, clock.nowMillis())
        }
    }

    override suspend fun reset(scenarioId: String) {
        withContext(io) {
            chatDao.deleteForScenario(scenarioId)
            startIfEmpty(scenarioId)
        }
    }

    private fun ChatMessageEntity.toDomain() =
        ChatMessage(id, scenarioId, role, textSk, textEnGloss, createdAt)
}
