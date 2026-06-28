package com.slovko.core.designsystem

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.compose.material3.MaterialTheme

private val LightColors = lightColorScheme(
    primary = FolkRed, onPrimary = OnFolkRed,
    primaryContainer = FolkRedContainer, onPrimaryContainer = OnFolkRedContainer,
    secondary = Pine, onSecondary = OnPine,
    secondaryContainer = PineContainer, onSecondaryContainer = OnPineContainer,
    tertiary = SkySlate, onTertiary = OnSkySlate,
    tertiaryContainer = SkySlateContainer, onTertiaryContainer = OnSkySlateContainer,
    error = ErrorRed, onError = Color.White,
    background = BackgroundLight, onBackground = OnSurfaceLight,
    surface = SurfaceLight, onSurface = OnSurfaceLight,
    surfaceVariant = SurfaceContainerLight, onSurfaceVariant = OnSurfaceVariantLight,
    surfaceContainer = SurfaceContainerLight,
    surfaceContainerHigh = SurfaceContainerHighLight,
    outline = OutlineLight,
)

private val DarkColors = darkColorScheme(
    primary = FolkRedDarkScheme, onPrimary = OnFolkRedDarkScheme,
    primaryContainer = FolkRedContainerDark, onPrimaryContainer = OnFolkRedContainerDark,
    secondary = PineDark, onSecondary = OnPineDark,
    secondaryContainer = PineContainerDark, onSecondaryContainer = OnPineContainerDark,
    tertiary = SkySlateDark, onTertiary = OnSkySlateDark,
    tertiaryContainer = SkySlateContainerDark, onTertiaryContainer = Color.White,
    error = ErrorRedDark, onError = Color(0xFF690005),
    background = BackgroundDark, onBackground = OnSurfaceDark,
    surface = SurfaceDark, onSurface = OnSurfaceDark,
    surfaceVariant = SurfaceContainerDark, onSurfaceVariant = OnSurfaceVariantDark,
    surfaceContainer = SurfaceContainerDark,
    surfaceContainerHigh = SurfaceContainerHighDark,
    outline = OutlineDark,
)

val SlovkoShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(36.dp),
)

/** 4dp spacing grid (DESIGN.md §8). */
data class Spacing(
    val xxs: Dp = 4.dp,
    val xs: Dp = 8.dp,
    val sm: Dp = 12.dp,
    val md: Dp = 16.dp,
    val lg: Dp = 24.dp,
    val xl: Dp = 32.dp,
    val xxl: Dp = 48.dp,
    val xxxl: Dp = 64.dp,
    val screenEdge: Dp = 20.dp,
)

val LocalSpacing = staticCompositionLocalOf { Spacing() }
val LocalReducedMotion = staticCompositionLocalOf { false }

/** Extra semantic colors not in the Material scheme (gold, success, folk lines). */
data class SlovkoColors(
    val gold: Color,
    val onGold: Color,
    val success: Color,
    val cicmanyLine: Color,
    val ice: Color,
    val buttonLedge: Color,
)

val LocalSlovkoColors = staticCompositionLocalOf {
    SlovkoColors(Gold, OnGold, SuccessGreen, CicmanyLineLight, IceBlue, FolkRedDark)
}

/** Convenience accessors: MaterialTheme.spacing / .slovkoColors */
val MaterialTheme.spacing: Spacing
    @Composable get() = LocalSpacing.current
val MaterialTheme.slovkoColors: SlovkoColors
    @Composable get() = LocalSlovkoColors.current

@Composable
fun SlovkoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    reducedMotion: Boolean = false,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        darkTheme -> DarkColors
        else -> LightColors
    }

    val slovkoColors = if (darkTheme) {
        SlovkoColors(GoldDark, OnGoldDark, SuccessGreenDark, CicmanyLineDark, IceBlue, FolkRedDark)
    } else {
        SlovkoColors(Gold, OnGold, SuccessGreen, CicmanyLineLight, IceBlue, FolkRedDark)
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars =
                colorScheme.background.luminance() > 0.5f
        }
    }

    CompositionLocalProvider(
        LocalSpacing provides Spacing(),
        LocalReducedMotion provides reducedMotion,
        LocalSlovkoColors provides slovkoColors,
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = SlovkoTypography,
            shapes = SlovkoShapes,
            content = content,
        )
    }
}
