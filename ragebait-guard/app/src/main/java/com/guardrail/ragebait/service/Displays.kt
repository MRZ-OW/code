package com.guardrail.ragebait.service

import android.content.Context
import android.graphics.Rect
import android.hardware.display.DisplayManager
import android.os.Build
import android.util.DisplayMetrics
import android.view.Display
import android.view.WindowManager

/**
 * Live display bounds, queried at the moment of use — never cached.
 *
 * This is what makes the app fold-aware: the Z Fold 6 cover screen
 * (~968 x 2376) and inner screen (~2160 x 1856) have wildly different sizes
 * and aspect ratios, and the user can fold/unfold mid-scroll. Gestures and
 * overlay positions are always computed against whatever display is active
 * right now.
 */
object Displays {

    fun bounds(context: Context): Rect {
        val displayManager =
            context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val display = displayManager.getDisplay(Display.DEFAULT_DISPLAY)
            ?: return Rect(0, 0, 1080, 1920)

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val wm = context.createDisplayContext(display)
                .getSystemService(WindowManager::class.java)
            wm.maximumWindowMetrics.bounds
        } else {
            val metrics = DisplayMetrics()
            @Suppress("DEPRECATION")
            display.getRealMetrics(metrics)
            Rect(0, 0, metrics.widthPixels, metrics.heightPixels)
        }
    }
}
