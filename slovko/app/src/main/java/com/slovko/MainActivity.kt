package com.slovko

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.SlovkoTheme
import com.slovko.domain.model.ThemeMode
import com.slovko.ui.RootViewModel
import com.slovko.ui.navigation.SlovkoApp
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val rootViewModel: RootViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val deepLinkHost = intent?.data?.host

        setContent {
            val settings by rootViewModel.settings.collectAsStateWithLifecycle()
            val s = settings
            val dark = when (s?.themeMode ?: ThemeMode.SYSTEM) {
                ThemeMode.DARK -> true
                ThemeMode.LIGHT -> false
                ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
            }
            SlovkoTheme(
                darkTheme = dark,
                dynamicColor = s?.dynamicColor ?: true,
                reducedMotion = s?.reducedMotion ?: false,
            ) {
                SlovkoApp(
                    onboarded = s?.onboarded ?: false,
                    settingsLoaded = s != null,
                    deepLinkHost = deepLinkHost,
                )
            }
        }
    }
}
