package com.slovko.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.slovko.R
import com.slovko.domain.repository.ContentRepository
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SrsRepository
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SlovkoWidgetReceiver : AppWidgetProvider() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface WidgetEntryPoint {
        fun progress(): ProgressRepository
        fun content(): ContentRepository
        fun srs(): SrsRepository
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val ep = EntryPointAccessors.fromApplication(
            context.applicationContext, WidgetEntryPoint::class.java,
        )
        val pending = goAsyncSafe()
        CoroutineScope(Dispatchers.Default).launch {
            val streak = runCatching { ep.progress().observeUserStats().first().currentStreak }.getOrDefault(0)
            val due = runCatching { ep.srs().dueCount() }.getOrDefault(0)
            val word = runCatching { ep.content().wordOfTheDay()?.sk }.getOrNull() ?: "ahoj"

            for (id in ids) {
                val views = RemoteViews(context.packageName, R.layout.widget_slovko).apply {
                    setTextViewText(R.id.widget_streak, "🔥 $streak")
                    setTextViewText(R.id.widget_word, word)
                    setTextViewText(
                        R.id.widget_due,
                        if (due > 0) context.getString(R.string.widget_cards_due, due)
                        else context.getString(R.string.widget_practice_now),
                    )
                    setOnClickPendingIntent(R.id.widget_root, openIntent(context))
                }
                manager.updateAppWidget(id, views)
            }
            pending?.invoke()
        }
    }

    private fun openIntent(context: Context): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("slovko://practice")).apply {
            setPackage(context.packageName)
        }
        return PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    // goAsync() returns a PendingResult; wrap to a simple finisher.
    private fun goAsyncSafe(): (() -> Unit)? {
        val result = goAsync()
        return { result.finish() }
    }
}
