package com.slovko.core.designsystem

import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable

/** Motion language from DESIGN.md §8 — springy by default, gated by Reduced Motion. */
object Motion {
    const val PRESS_SCALE = 0.96f
    const val PRESS_DURATION_MS = 90

    fun <T> defaultSpring(): FiniteAnimationSpec<T> =
        spring(dampingRatio = 0.7f, stiffness = 380f)

    fun <T> bouncy(): FiniteAnimationSpec<T> =
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)

    fun <T> fade(durationMs: Int = 120): FiniteAnimationSpec<T> = tween(durationMs)
}

/** Picks a springy spec normally, a quick fade when Reduced Motion is on. */
@Composable
fun <T> motionSpec(reduced: Boolean): FiniteAnimationSpec<T> =
    if (reduced) Motion.fade() else Motion.defaultSpring()

/** End-of-lesson celebration timing (DESIGN.md §7). */
object CelebrationTiming {
    const val CARD_IN_MS = 280
    const val XP_COUNT_UP_MS = 900
    const val ROW_STAGGER_MS = 140
    const val STREAK_PANEL_MS = 500
    const val TOTAL_CEILING_MS = 4000
}
