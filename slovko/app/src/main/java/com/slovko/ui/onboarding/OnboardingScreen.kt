package com.slovko.ui.onboarding

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.slovko.core.designsystem.component.CicmanyDivider
import com.slovko.core.designsystem.component.MajaMascot
import com.slovko.core.designsystem.component.OptionChip
import com.slovko.core.designsystem.component.OptionState
import com.slovko.core.designsystem.component.PrimaryButton
import com.slovko.core.designsystem.component.SecondaryButton
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.GamificationConfig
import kotlinx.coroutines.launch

private const val PAGE_COUNT = 5

private val GOALS = listOf(
    "Chat with friends",
    "Travel",
    "Culture",
    "Keep sharp",
)

private data class LevelOption(val title: String, val blurb: String, val emoji: String)

private val LEVELS = listOf(
    LevelOption("Brand new", "Začíname od nuly — and that's perfect.", "🌱"),
    LevelOption("I know a little", "A few words and phrases already.", "🌤️"),
    LevelOption("I can get by", "I can hold a simple conversation.", "🏔️"),
)

@Composable
fun OnboardingScreen(
    onFinish: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel(),
) {
    val pagerState = rememberPagerState(pageCount = { PAGE_COUNT })
    val scope = rememberCoroutineScope()

    var goalIndex by remember { mutableIntStateOf(0) }
    var levelIndex by remember { mutableIntStateOf(0) }
    var goalXp by remember { mutableIntStateOf(GamificationConfig.DEFAULT_DAILY_GOAL) }

    val notifLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { _ ->
        viewModel.finish(goalXp)
        onFinish()
    }

    fun finishNow() {
        viewModel.finish(goalXp)
        onFinish()
    }

    fun requestReminders() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            finishNow()
        }
    }

    Column(Modifier.fillMaxSize().padding(MaterialTheme.spacing.screenEdge)) {
        StepDots(current = pagerState.currentPage, total = PAGE_COUNT)
        Spacer(Modifier.height(MaterialTheme.spacing.md))

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
        ) { page ->
            when (page) {
                0 -> WelcomePage()
                1 -> WhyPage(selected = goalIndex, onSelect = { goalIndex = it })
                2 -> LevelPage(selected = levelIndex, onSelect = { levelIndex = it })
                3 -> GoalPage(selectedXp = goalXp, onSelect = { goalXp = it })
                else -> RemindersPage()
            }
        }

        Spacer(Modifier.height(MaterialTheme.spacing.md))
        BottomBar(
            page = pagerState.currentPage,
            isLast = pagerState.currentPage == PAGE_COUNT - 1,
            onBack = {
                scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
            },
            onContinue = {
                scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
            },
            onTurnOnReminders = ::requestReminders,
            onMaybeLater = ::finishNow,
        )
    }
}

@Composable
private fun StepDots(current: Int, total: Int) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(
            MaterialTheme.spacing.xs,
            Alignment.CenterHorizontally,
        ),
    ) {
        repeat(total) { i ->
            val active = i <= current
            val dotWidth: Dp = if (i == current) 28.dp else 14.dp
            Box(
                Modifier
                    .height(6.dp)
                    .width(dotWidth)
                    .clip(RoundedCornerShape(3.dp))
                    .background(
                        if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceVariant,
                    ),
            )
        }
    }
}

@Composable
private fun PageColumn(content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        content = content,
    )
}

@Composable
private fun WelcomePage() {
    PageColumn {
        Spacer(Modifier.height(MaterialTheme.spacing.xxl))
        MajaMascot(pose = "waving", size = 120)
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        Text(
            "Slovko",
            style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.xs))
        Text(
            "Po našom.",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        CicmanyDivider()
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        Text(
            "Learn Slovak a little every day — the warm, friendly way.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = MaterialTheme.spacing.md),
        )
    }
}

@Composable
private fun PageHeader(title: String, subtitle: String? = null) {
    Text(
        title,
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
    )
    if (subtitle != null) {
        Spacer(Modifier.height(MaterialTheme.spacing.xs))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun WhyPage(selected: Int, onSelect: (Int) -> Unit) {
    PageColumn {
        Spacer(Modifier.height(MaterialTheme.spacing.xl))
        PageHeader("Why learn Slovak?", "Pick what matters most to you.")
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        GOALS.forEachIndexed { i, goal ->
            OptionChip(
                text = goal,
                state = if (i == selected) OptionState.SELECTED else OptionState.DEFAULT,
                onClick = { onSelect(i) },
                modifier = Modifier.padding(vertical = MaterialTheme.spacing.xxs),
            )
        }
    }
}

@Composable
private fun LevelPage(selected: Int, onSelect: (Int) -> Unit) {
    PageColumn {
        Spacer(Modifier.height(MaterialTheme.spacing.xl))
        PageHeader("How much Slovak do you know?")
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        LEVELS.forEachIndexed { i, level ->
            LevelCard(
                option = level,
                selected = i == selected,
                onClick = { onSelect(i) },
            )
            Spacer(Modifier.height(MaterialTheme.spacing.sm))
        }
    }
}

@Composable
private fun LevelCard(option: LevelOption, selected: Boolean, onClick: () -> Unit) {
    val container =
        if (selected) MaterialTheme.colorScheme.primaryContainer
        else MaterialTheme.colorScheme.surfaceContainer
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = container),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(option.emoji, style = MaterialTheme.typography.displaySmall)
            Spacer(Modifier.width(MaterialTheme.spacing.md))
            Column {
                Text(
                    option.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    option.blurb,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun GoalPage(selectedXp: Int, onSelect: (Int) -> Unit) {
    val tiers = GamificationConfig.DAILY_GOAL_TIERS
    val selectedTier = tiers.firstOrNull { it.second == selectedXp }
    val pose = when {
        selectedXp >= 250 -> "celebrating"
        selectedXp >= 120 -> "proud"
        else -> "waving"
    }
    PageColumn {
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        MajaMascot(pose = pose, size = 96)
        Spacer(Modifier.height(MaterialTheme.spacing.md))
        PageHeader("Daily goal", "How much do you want to do each day?")
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(MaterialTheme.spacing.xs)) {
                tiers.forEach { (label, xp) ->
                    GoalTierRow(
                        label = label,
                        xp = xp,
                        selected = xp == selectedXp,
                        onClick = { onSelect(xp) },
                    )
                }
            }
        }
        Spacer(Modifier.height(MaterialTheme.spacing.md))
        Text(
            selectedTier?.let { "${it.first} · ${it.second} XP a day" } ?: "${selectedXp} XP a day",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.slovkoColors.gold,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun GoalTierRow(label: String, xp: Int, selected: Boolean, onClick: () -> Unit) {
    val container =
        if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.surface
    val content =
        if (selected) MaterialTheme.colorScheme.onPrimary
        else MaterialTheme.colorScheme.onSurface
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = container,
        modifier = Modifier
            .fillMaxWidth()
            .padding(MaterialTheme.spacing.xxs),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = MaterialTheme.spacing.md, vertical = MaterialTheme.spacing.sm),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                color = content,
            )
            Text(
                "$xp XP",
                style = MaterialTheme.typography.bodyLarge,
                color = content,
            )
        }
    }
}

@Composable
private fun RemindersPage() {
    PageColumn {
        Spacer(Modifier.height(MaterialTheme.spacing.xl))
        MajaMascot(pose = "thinking", size = 110)
        Spacer(Modifier.height(MaterialTheme.spacing.lg))
        PageHeader("Stay on track")
        Spacer(Modifier.height(MaterialTheme.spacing.md))
        Text(
            "A gentle nudge once a day keeps your streak alive. No spam, no guilt — just a friendly reminder from Maja when it's time to practise.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = MaterialTheme.spacing.sm),
        )
    }
}

@Composable
private fun BottomBar(
    page: Int,
    isLast: Boolean,
    onBack: () -> Unit,
    onContinue: () -> Unit,
    onTurnOnReminders: () -> Unit,
    onMaybeLater: () -> Unit,
) {
    if (isLast) {
        Column(
            Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xs),
        ) {
            PrimaryButton(
                text = "Turn on reminders",
                onClick = onTurnOnReminders,
                modifier = Modifier.fillMaxWidth(),
            )
            SecondaryButton(
                text = "Maybe later",
                onClick = onMaybeLater,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    } else {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.sm),
        ) {
            if (page > 0) {
                SecondaryButton(
                    text = "Back",
                    onClick = onBack,
                    modifier = Modifier.weight(1f),
                )
            }
            PrimaryButton(
                text = "Continue",
                onClick = onContinue,
                modifier = Modifier.weight(if (page > 0) 2f else 1f),
            )
        }
    }
}
