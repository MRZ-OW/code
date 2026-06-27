package com.slovko.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.slovko.data.db.entity.SrsStateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SrsDao {

    @Query("SELECT COUNT(*) FROM srs_state WHERE due <= :now")
    fun observeDueCount(now: Long): Flow<Int>

    @Query("SELECT COUNT(*) FROM srs_state WHERE due <= :now")
    suspend fun dueCount(now: Long): Int

    @Query("SELECT * FROM srs_state WHERE due <= :now ORDER BY due ASC LIMIT :limit")
    suspend fun dueStates(now: Long, limit: Int): List<SrsStateEntity>

    @Query("SELECT * FROM srs_state WHERE state = 2 ORDER BY due ASC LIMIT :limit")
    suspend fun reviewStates(limit: Int): List<SrsStateEntity>

    @Query("SELECT * FROM srs_state WHERE cardId = :cardId AND direction = :direction LIMIT 1")
    suspend fun getState(cardId: String, direction: Int): SrsStateEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(state: SrsStateEntity): Long

    @Update
    suspend fun update(state: SrsStateEntity)

    @Query("SELECT COUNT(*) FROM srs_state WHERE reps > 0")
    suspend fun learnedCount(): Int

    @Query("SELECT COUNT(*) FROM srs_state WHERE reps > 0")
    fun observeLearnedCount(): Flow<Int>
}
