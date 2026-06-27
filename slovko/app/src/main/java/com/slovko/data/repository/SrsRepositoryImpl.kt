package com.slovko.data.repository

import com.slovko.core.common.AppClock
import com.slovko.core.common.IoDispatcher
import com.slovko.data.db.dao.ContentDao
import com.slovko.data.db.dao.SrsDao
import com.slovko.data.db.entity.SrsStateEntity
import com.slovko.data.mapper.toDomain
import com.slovko.data.mapper.toReviewCard
import com.slovko.domain.model.CardDirection
import com.slovko.domain.model.CardState
import com.slovko.domain.model.Grade
import com.slovko.domain.model.ReviewCard
import com.slovko.domain.repository.SettingsRepository
import com.slovko.domain.repository.SrsRepository
import com.slovko.domain.srs.FsrsParams
import com.slovko.domain.srs.FsrsScheduler
import com.slovko.domain.srs.SchedulingState
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SrsRepositoryImpl @Inject constructor(
    private val srsDao: SrsDao,
    private val contentDao: ContentDao,
    private val settings: SettingsRepository,
    private val clock: AppClock,
    @IoDispatcher private val io: CoroutineDispatcher,
) : SrsRepository {

    override fun observeDueCount(): Flow<Int> = srsDao.observeDueCount(clock.nowMillis())

    override suspend fun dueCount(): Int = srsDao.dueCount(clock.nowMillis())

    override suspend fun dueCards(limit: Int): List<ReviewCard> = withContext(io) {
        srsDao.dueStates(clock.nowMillis(), limit).mapNotNull { state ->
            contentDao.getVocab(state.cardId)?.let { state.toReviewCard(it.toDomain()) }
        }
    }

    override suspend fun warmupCards(limit: Int): List<ReviewCard> = withContext(io) {
        srsDao.reviewStates(limit).mapNotNull { state ->
            contentDao.getVocab(state.cardId)?.let { state.toReviewCard(it.toDomain()) }
        }
    }

    override suspend fun grade(cardId: String, direction: CardDirection, grade: Grade) = withContext(io) {
        val now = clock.nowMillis()
        val retention = settings.current().targetRetention.toDouble()
        val scheduler = FsrsScheduler(FsrsParams(requestRetention = retention))
        val existing = srsDao.getState(cardId, direction.value)

        val prev = existing?.let {
            SchedulingState(
                state = CardState.from(it.state),
                stability = it.stability,
                difficulty = it.difficulty,
                dueMillis = it.due,
                reps = it.reps,
                lapses = it.lapses,
                lastReviewMillis = it.lastReview,
            )
        } ?: SchedulingState(CardState.NEW, 0.0, 0.0, now, 0, 0, null)

        val next = scheduler.review(prev, grade, now)
        val entity = SrsStateEntity(
            id = existing?.id ?: 0,
            cardId = cardId,
            direction = direction.value,
            state = next.state.value,
            stability = next.stability,
            difficulty = next.difficulty,
            due = next.dueMillis,
            lastReview = next.lastReviewMillis,
            reps = next.reps,
            lapses = next.lapses,
        )
        if (existing == null) srsDao.insert(entity) else srsDao.update(entity)
    }

    override suspend fun bornCard(cardId: String, direction: CardDirection) = withContext(io) {
        val existing = srsDao.getState(cardId, direction.value)
        if (existing == null) {
            // First correct production grades the card as Good immediately.
            grade(cardId, direction, Grade.GOOD)
        }
    }
}
