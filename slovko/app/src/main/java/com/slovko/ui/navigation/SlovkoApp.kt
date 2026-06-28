package com.slovko.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.slovko.ui.achievements.AchievementsScreen
import com.slovko.ui.chat.ChatScreen
import com.slovko.ui.chat.PhrasebookScreen
import com.slovko.ui.chathub.ChatHubScreen
import com.slovko.ui.home.HomeScreen
import com.slovko.ui.leaderboard.LeaderboardScreen
import com.slovko.ui.lesson.LessonScreen
import com.slovko.ui.onboarding.OnboardingScreen
import com.slovko.ui.practice.PracticeScreen
import com.slovko.ui.profile.ProfileScreen
import com.slovko.ui.settings.SettingsScreen

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val bottomTabs = listOf(
    Tab(Routes.HOME, "Learn", Icons.Filled.Home),
    Tab(Routes.PRACTICE, "Practice", Icons.Filled.Refresh),
    Tab(Routes.CHATHUB, "Chat", Icons.Filled.Chat),
    Tab(Routes.LEADERBOARD, "League", Icons.Filled.EmojiEvents),
    Tab(Routes.PROFILE, "Profile", Icons.Filled.Person),
)

@Composable
fun SlovkoApp(
    onboarded: Boolean,
    settingsLoaded: Boolean,
    deepLinkHost: String?,
) {
    if (!settingsLoaded) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showBottomBar = currentRoute in Routes.tabs

    LaunchedEffect(deepLinkHost) {
        when (deepLinkHost) {
            "practice", "review" -> if (onboarded) navController.navigate(Routes.PRACTICE)
        }
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomTabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = if (onboarded) Routes.HOME else Routes.ONBOARDING,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.ONBOARDING) {
                OnboardingScreen(
                    onFinish = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.ONBOARDING) { inclusive = true }
                        }
                    },
                )
            }
            composable(Routes.HOME) {
                HomeScreen(
                    onOpenLesson = { navController.navigate(Routes.lesson(it)) },
                    onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                )
            }
            composable(Routes.PRACTICE) {
                PracticeScreen()
            }
            composable(Routes.CHATHUB) {
                ChatHubScreen(
                    onOpenChat = { navController.navigate(Routes.chat(it)) },
                    onOpenPhrasebook = { navController.navigate(Routes.PHRASEBOOK) },
                )
            }
            composable(Routes.LEADERBOARD) {
                LeaderboardScreen()
            }
            composable(Routes.PROFILE) {
                ProfileScreen(
                    onOpenAchievements = { navController.navigate(Routes.ACHIEVEMENTS) },
                    onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                )
            }
            composable(Routes.LESSON) { entry ->
                val lessonId = entry.arguments?.getString("lessonId").orEmpty()
                LessonScreen(lessonId = lessonId, onExit = { navController.popBackStack() })
            }
            composable(Routes.CHAT) { entry ->
                val scenarioId = entry.arguments?.getString("scenarioId").orEmpty()
                ChatScreen(scenarioId = scenarioId, onExit = { navController.popBackStack() })
            }
            composable(Routes.PHRASEBOOK) {
                PhrasebookScreen(onExit = { navController.popBackStack() })
            }
            composable(Routes.ACHIEVEMENTS) {
                AchievementsScreen(onExit = { navController.popBackStack() })
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(onExit = { navController.popBackStack() })
            }
        }
    }
}
