package com.slovko.ui.leaderboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.slovko.core.designsystem.slovkoColors
import com.slovko.core.designsystem.spacing
import com.slovko.domain.model.League
import com.slovko.domain.model.LeagueStanding

@Composable
fun LeaderboardScreen(viewModel: LeaderboardViewModel = hiltViewModel()) {
    val league by viewModel.state.collectAsStateWithLifecycle()

    Box(Modifier.fillMaxSize()) {
        when (val l = league) {
            null -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
            else -> LeagueContent(l)
        }
    }
}

@Composable
private fun LeagueContent(league: League) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = MaterialTheme.spacing.screenEdge,
            vertical = MaterialTheme.spacing.lg,
        ),
        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.xs),
    ) {
        item { LeagueHeader(league) }
        item { Spacer(Modifier.height(MaterialTheme.spacing.md)) }

        items(league.standings, key = { it.rank }) { standing ->
            StandingRow(
                standing = standing,
                promoteCutoff = league.promoteCutoff,
                demoteCutoff = league.demoteCutoff,
            )
        }
    }
}

@Composable
private fun LeagueHeader(league: League) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text(
            "🏆",
            style = MaterialTheme.typography.displaySmall,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.xs))
        Text(
            "${league.tier.displayName} League",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.xxs))
        Text(
            "${league.daysRemaining} days left",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(MaterialTheme.spacing.sm))
        Text(
            "Your league is a private practice cohort — race friendly bots.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun StandingRow(
    standing: LeagueStanding,
    promoteCutoff: Int,
    demoteCutoff: Int,
) {
    val scheme = MaterialTheme.colorScheme
    val slovko = MaterialTheme.slovkoColors

    val inPromotionZone = standing.rank <= promoteCutoff
    val inRelegationZone = standing.rank > demoteCutoff

    val container = if (standing.isUser) scheme.primaryContainer else scheme.surfaceContainer
    val accent = when {
        inPromotionZone -> slovko.success
        inRelegationZone -> scheme.error
        else -> null
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = container,
    ) {
        Row(Modifier.height(64.dp), verticalAlignment = Alignment.CenterVertically) {
            // Subtle zone accent on the left edge.
            Box(
                Modifier
                    .width(4.dp)
                    .height(64.dp)
                    .clip(RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp))
                    .then(
                        if (accent != null) {
                            Modifier.background(accent.copy(alpha = 0.85f))
                        } else {
                            Modifier
                        },
                    ),
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = MaterialTheme.spacing.md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "#${standing.rank}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = scheme.onSurfaceVariant,
                    modifier = Modifier.width(40.dp),
                )
                Text(
                    "🦊",
                    style = MaterialTheme.typography.titleLarge,
                )
                Spacer(Modifier.width(MaterialTheme.spacing.sm))
                Text(
                    standing.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (standing.isUser) FontWeight.Bold else FontWeight.Normal,
                    color = if (standing.isUser) scheme.onPrimaryContainer else scheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(MaterialTheme.spacing.sm))
                Text(
                    "${standing.xp} XP",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (standing.isUser) scheme.onPrimaryContainer else scheme.onSurface,
                )
            }
        }
    }
}
