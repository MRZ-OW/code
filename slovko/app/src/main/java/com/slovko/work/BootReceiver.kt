package com.slovko.work

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Reschedules all reminder work after reboot / timezone change. See DESIGN.md §14. */
@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject lateinit var scheduler: NotificationScheduler

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_TIMEZONE_CHANGED) {
            val pending = goAsync()
            CoroutineScope(Dispatchers.Default).launch {
                try {
                    scheduler.rescheduleAll()
                } finally {
                    pending.finish()
                }
            }
        }
    }
}
