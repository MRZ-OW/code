package com.slovko.core.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationChannelGroup
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.slovko.R

/** Notification channels (DESIGN.md §14). */
object NotificationChannels {
    const val GROUP = "slovko"
    const val DAILY = "daily_practice"
    const val STREAK = "streak"
    const val REVIEWS = "reviews"
    const val REENGAGE = "reengage"
    const val ACHIEVEMENTS = "achievements"

    fun createAll(context: Context) {
        val mgr = context.getSystemService(NotificationManager::class.java) ?: return
        mgr.createNotificationChannelGroup(
            NotificationChannelGroup(GROUP, context.getString(R.string.channel_group)),
        )
        fun channel(id: String, nameRes: Int, descRes: Int, importance: Int) {
            val ch = NotificationChannel(id, context.getString(nameRes), importance).apply {
                description = context.getString(descRes)
                group = GROUP
            }
            mgr.createNotificationChannel(ch)
        }
        channel(DAILY, R.string.channel_daily_name, R.string.channel_daily_desc, NotificationManager.IMPORTANCE_DEFAULT)
        channel(STREAK, R.string.channel_streak_name, R.string.channel_streak_desc, NotificationManager.IMPORTANCE_HIGH)
        channel(REVIEWS, R.string.channel_reviews_name, R.string.channel_reviews_desc, NotificationManager.IMPORTANCE_LOW)
        channel(REENGAGE, R.string.channel_reengage_name, R.string.channel_reengage_desc, NotificationManager.IMPORTANCE_DEFAULT)
        channel(ACHIEVEMENTS, R.string.channel_achievements_name, R.string.channel_achievements_desc, NotificationManager.IMPORTANCE_DEFAULT)
    }
}

/** Rotating, shame-free copy that always teaches a real Slovak phrase (DESIGN.md §14). */
object NotificationCopyProvider {
    data class Copy(val id: String, val title: String, val body: String)

    private val daily = listOf(
        Copy("d1", "Čas na slovenčinu ☕", "Ahoj! 2 minutes of Slovak? \"ahoj\" = hi."),
        Copy("d2", "Daily Brew is ready", "\"Ako sa máš?\" — How are you? Tap to practice."),
        Copy("d3", "Pár slov?", "Just a few words today. \"prosím\" = please."),
        Copy("d4", "Slovko time", "\"ďakujem\" = thank you. Keep it warm today."),
    )
    private val streak = listOf(
        Copy("s1", "Don't lose your flame 🔥", "A quick lesson keeps your streak alive."),
        Copy("s2", "Your streak misses you", "5 minutes saves it. \"poďme!\" = let's go!"),
    )
    private val reviews = listOf(
        Copy("r1", "Cards are ready", "Some words are due for review. Quick refresh?"),
        Copy("r2", "Keep them fresh", "Review now so today's words stick."),
    )
    private val reengage = listOf(
        Copy("e1", "Ešte si tu? 👋", "Slovak's waiting. \"vitaj späť\" = welcome back."),
        Copy("e2", "One small word", "\"čau\" = hi/bye. Come say it back."),
    )

    fun forChannel(channelId: String, lastId: String?): Copy {
        val pool = when (channelId) {
            NotificationChannels.STREAK -> streak
            NotificationChannels.REVIEWS -> reviews
            NotificationChannels.REENGAGE -> reengage
            else -> daily
        }
        return pool.firstOrNull { it.id != lastId } ?: pool.first()
    }
}

/** Builds + posts notifications with a deep-link tap action. */
object NotificationBuilders {

    private fun deepLinkIntent(context: Context, host: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("slovko://$host")).apply {
            setPackage(context.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        return PendingIntent.getActivity(
            context, host.hashCode(), intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    fun post(
        context: Context,
        channelId: String,
        notificationId: Int,
        copy: NotificationCopyProvider.Copy,
        deepLinkHost: String = "practice",
    ) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_slovko)
            .setContentTitle(copy.title)
            .setContentText(copy.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(copy.body))
            .setContentIntent(deepLinkIntent(context, deepLinkHost))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(notificationId, notification) }
    }
}
