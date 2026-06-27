package com.slovko.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.slovko.data.db.entity.ChatMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatDao {

    @Query("SELECT * FROM chat_messages WHERE scenarioId = :scenarioId ORDER BY createdAt ASC, id ASC")
    fun observeMessages(scenarioId: String): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages WHERE scenarioId = :scenarioId ORDER BY createdAt ASC, id ASC")
    suspend fun getMessages(scenarioId: String): List<ChatMessageEntity>

    @Insert
    suspend fun insert(message: ChatMessageEntity): Long

    @Query("SELECT COUNT(*) FROM chat_messages WHERE scenarioId = :scenarioId")
    suspend fun count(scenarioId: String): Int

    @Query("DELETE FROM chat_messages WHERE scenarioId = :scenarioId")
    suspend fun deleteForScenario(scenarioId: String)
}
