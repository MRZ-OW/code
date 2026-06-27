package com.slovko.work

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.slovko.core.notification.NotificationChannels
import com.slovko.core.notification.NotificationBuilders
import com.slovko.core.notification.NotificationCopyProvider
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SettingsRepository
import com.slovko.domain.repository.SrsRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first

/** Daily practice reminder — skips if already practiced today. */
@HiltWorker
class DailyReminderWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val progress: ProgressRepository,
    private val settings: SettingsRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val s = settings.current()
        if (s.dailyReminderOn && !progress.hasPracticedToday()) {
            NotificationBuilders.post(
                applicationContext,
                NotificationChannels.DAILY,
                NID_DAILY,
                NotificationCopyProvider.forChannel(NotificationChannels.DAILY, null),
                deepLinkHost = "practice",
            )
        }
        return Result.success()
    }
}

/** SRS review-due nudge. */
@HiltWorker
class ReviewDueWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val srs: SrsRepository,
    private val settings: SettingsRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val s = settings.current()
        if (s.reviewReminderOn && srs.dueCount() >= 10) {
            NotificationBuilders.post(
                applicationContext,
                NotificationChannels.REVIEWS,
                NID_REVIEW,
                NotificationCopyProvider.forChannel(NotificationChannels.REVIEWS, null),
                deepLinkHost = "review",
            )
        }
        return Result.success()
    }
}

/** Evening streak-at-risk reminder. */
@HiltWorker
class StreakRiskWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val progress: ProgressRepository,
    private val settings: SettingsRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val s = settings.current()
        val streak = progress.observeUserStats().first().currentStreak
        if (s.streakReminderOn && streak > 0 && !progress.hasPracticedToday()) {
            NotificationBuilders.post(
                applicationContext,
                NotificationChannels.STREAK,
                NID_STREAK,
                NotificationCopyProvider.forChannel(NotificationChannels.STREAK, null),
                deepLinkHost = "practice",
            )
        }
        return Result.success()
    }
}

private const val NID_DAILY = 1001
private const val NID_REVIEW = 1002
private const val NID_STREAK = 1003
