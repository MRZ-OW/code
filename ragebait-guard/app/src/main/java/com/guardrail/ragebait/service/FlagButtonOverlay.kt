package com.guardrail.ragebait.service

import android.accessibilityservice.AccessibilityService
import android.annotation.SuppressLint
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.TextView
import com.guardrail.ragebait.R
import com.guardrail.ragebait.data.GuardPrefs
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * The small, draggable 😤 button floating over TikTok. Tap = "this was rage
 * bait": the service records the current video as a training example and
 * swipes past it.
 *
 * Fold-awareness: position is persisted as *fractions* of the available
 * screen area, not pixels. [reposition] recomputes pixel coordinates from
 * the live display bounds, so folding/unfolding a Z Fold 6 keeps the button
 * in the proportional spot instead of stranding it off-screen.
 */
class FlagButtonOverlay(
    private val service: AccessibilityService,
    private val prefs: GuardPrefs,
    private val onFlag: () -> Unit,
) {

    private val windowManager =
        service.getSystemService(WindowManager::class.java)

    private var view: View? = null
    private var params: WindowManager.LayoutParams? = null

    private val touchSlop = ViewConfiguration.get(service).scaledTouchSlop

    fun show() {
        if (view != null) return

        val inflated = LayoutInflater.from(service)
            .inflate(R.layout.overlay_flag_button, null)

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
        }

        view = inflated
        params = layoutParams
        applyStoredPosition()
        attachTouchHandling(inflated)

        try {
            windowManager.addView(inflated, layoutParams)
        } catch (_: Exception) {
            view = null
            params = null
        }
    }

    fun hide() {
        val current = view ?: return
        try {
            windowManager.removeView(current)
        } catch (_: Exception) {
            // Already detached.
        }
        view = null
        params = null
    }

    val isShowing: Boolean get() = view != null

    /** Re-anchor after fold/unfold or rotation. */
    fun reposition() {
        if (view == null) return
        applyStoredPosition()
        update()
    }

    /** Quick visual confirmation that a flag was recorded. */
    fun flashFlagged() {
        val label = view?.findViewById<TextView>(R.id.flag_button) ?: return
        val original = label.text
        label.text = "✅"
        label.animate().scaleX(1.25f).scaleY(1.25f).setDuration(120).withEndAction {
            label.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
        }.start()
        label.postDelayed({ label.text = original }, 700)
    }

    // ------------------------------------------------------------------

    private fun applyStoredPosition() {
        val layoutParams = params ?: return
        val bounds = Displays.bounds(service)
        val size = view?.width?.takeIf { it > 0 } ?: defaultButtonPx()
        val usableW = (bounds.width() - size).coerceAtLeast(1)
        val usableH = (bounds.height() - size).coerceAtLeast(1)
        layoutParams.x = (prefs.overlayFractionX * usableW).roundToInt().coerceIn(0, usableW)
        layoutParams.y = (prefs.overlayFractionY * usableH).roundToInt().coerceIn(0, usableH)
    }

    private fun storePosition() {
        val layoutParams = params ?: return
        val bounds = Displays.bounds(service)
        val size = view?.width?.takeIf { it > 0 } ?: defaultButtonPx()
        val usableW = (bounds.width() - size).coerceAtLeast(1)
        val usableH = (bounds.height() - size).coerceAtLeast(1)
        prefs.overlayFractionX = layoutParams.x.toFloat() / usableW
        prefs.overlayFractionY = layoutParams.y.toFloat() / usableH
    }

    private fun defaultButtonPx(): Int =
        (48 * service.resources.displayMetrics.density).roundToInt()

    @SuppressLint("ClickableViewAccessibility")
    private fun attachTouchHandling(target: View) {
        var downRawX = 0f
        var downRawY = 0f
        var startX = 0
        var startY = 0
        var dragging = false

        target.setOnTouchListener { v, event ->
            val layoutParams = params ?: return@setOnTouchListener false
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRawX = event.rawX
                    downRawY = event.rawY
                    startX = layoutParams.x
                    startY = layoutParams.y
                    dragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - downRawX
                    val dy = event.rawY - downRawY
                    if (!dragging && (abs(dx) > touchSlop || abs(dy) > touchSlop)) {
                        dragging = true
                    }
                    if (dragging) {
                        val bounds = Displays.bounds(service)
                        val size = v.width.takeIf { it > 0 } ?: defaultButtonPx()
                        layoutParams.x = (startX + dx).roundToInt()
                            .coerceIn(0, (bounds.width() - size).coerceAtLeast(0))
                        layoutParams.y = (startY + dy).roundToInt()
                            .coerceIn(0, (bounds.height() - size).coerceAtLeast(0))
                        update()
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (dragging) {
                        storePosition()
                    } else {
                        v.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                        onFlag()
                    }
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    if (dragging) storePosition()
                    true
                }
                else -> false
            }
        }
    }

    private fun update() {
        val current = view ?: return
        val layoutParams = params ?: return
        try {
            windowManager.updateViewLayout(current, layoutParams)
        } catch (_: Exception) {
            // View got detached mid-drag; ignore.
        }
    }
}
