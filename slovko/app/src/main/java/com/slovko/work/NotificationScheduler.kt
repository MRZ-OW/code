package com.slovko.work

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.slovko.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/** Central (re)enqueue of all reminder work. Idempotent unique names. See DESIGN.md §14. */
@Singleton
class NotificationScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val settings: SettingsRepository,
) {
    private val wm get() = WorkManager.getInstance(context)

    suspend fun scheduleAll() {
        val s = settings.current()

        // Daily practice reminder at the chosen time.
        if (s.dailyReminderOn) {
            val delay = delayUntil(s.reminderHour, s.reminderMinute)
            val req = PeriodicWorkRequestBuilder<DailyReminderWorker>(1, TimeUnit.DAYS)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .build()
            wm.enqueueUniquePeriodicWork(DAILY, ExistingPeriodicWorkPolicy.UPDATE, req)
        } else {
            wm.cancelUniqueWork(DAILY)
        }

        // Review-due nudge, a few times a day.
        if (s.reviewReminderOn) {
            val req = PeriodicWorkRequestBuilder<ReviewDueWorker>(6, TimeUnit.HOURS)
                .setInitialDelay(2, TimeUnit.HOURS)
                .build()
            wm.enqueueUniquePeriodicWork(REVIEW, ExistingPeriodicWorkPolicy.KEEP, req)
        } else {
            wm.cancelUniqueWork(REVIEW)
        }

        // Evening streak-at-risk check.
        if (s.streakReminderOn) {
            val delay = delayUntil(20, 30)
            val req = PeriodicWorkRequestBuilder<StreakRiskWorker>(1, TimeUnit.DAYS)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .build()
            wm.enqueueUniquePeriodicWork(STREAK, ExistingPeriodicWorkPolicy.UPDATE, req)
        } else {
            wm.cancelUniqueWork(STREAK)
        }
    }

    suspend fun rescheduleAll() = scheduleAll()

    private fun delayUntil(hour: Int, minute: Int): Long {
        val zone = ZoneId.systemDefault()
        val now = LocalDateTime.now(zone)
        var target = now.toLocalDate().atTime(LocalTime.of(hour.coerceIn(0, 23), minute.coerceIn(0, 59)))
        if (!target.isAfter(now)) target = target.plusDays(1)
        return ChronoUnit.MILLIS.between(now, target).coerceAtLeast(60_000L)
    }

    companion object {
        const val DAILY = "slovko_daily_reminder"
        const val REVIEW = "slovko_review_due"
        const val STREAK = "slovko_streak_risk"
    }
}
