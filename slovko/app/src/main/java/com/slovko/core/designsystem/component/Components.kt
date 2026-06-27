package com.slovko.core.designsystem.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.RepeatMode
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import com.slovko.core.designsystem.LocalReducedMotion
import com.slovko.core.designsystem.slovkoColors

enum class OptionState { DEFAULT, SELECTED, CORRECT, WRONG }
enum class NodeState { LOCKED, AVAILABLE, COMPLETE }

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
    ) {
        Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(2.dp, MaterialTheme.colorScheme.outline),
    ) {
        Text(text, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun ProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    size: Int = 56,
    stroke: Float = 6f,
    content: @Composable () -> Unit = {},
) {
    val reduced = LocalReducedMotion.current
    val animated by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(if (reduced) 0 else 600),
        label = "ring",
    )
    val track = MaterialTheme.colorScheme.surfaceVariant
    val fill = MaterialTheme.colorScheme.primary
    Box(modifier.size(size.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size.dp)) {
            drawArc(
                color = track, startAngle = 0f, sweepAngle = 360f, useCenter = false,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            drawArc(
                color = fill, startAngle = -90f, sweepAngle = 360f * animated, useCenter = false,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
        content()
    }
}

@Composable
fun XpBar(progress: Float, modifier: Modifier = Modifier, label: String? = null) {
    val gold = MaterialTheme.slovkoColors.gold
    val reduced = LocalReducedMotion.current
    val animated by animateFloatAsState(
        progress.coerceIn(0f, 1f), tween(if (reduced) 0 else 500), label = "xp",
    )
    Column(modifier) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(12.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(animated)
                    .height(12.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(gold),
            )
        }
        if (label != null) {
            Spacer(Modifier.height(4.dp))
            Text(label, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
fun StreakFlame(count: Int, modifier: Modifier = Modifier, frozen: Boolean = false) {
    val color = if (frozen) MaterialTheme.slovkoColors.ice else MaterialTheme.slovkoColors.gold
    Row(modifier.wrapContentSize(), verticalAlignment = Alignment.CenterVertically) {
        Text(if (frozen) "🧊" else "🔥", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.width(4.dp))
        Text(
            "$count",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = color,
        )
    }
}

@Composable
fun OptionChip(
    text: String,
    state: OptionState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    number: Int? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val slovko = MaterialTheme.slovkoColors
    val container = when (state) {
        OptionState.DEFAULT -> scheme.surfaceContainer
        OptionState.SELECTED -> scheme.primaryContainer
        OptionState.CORRECT -> slovko.success.copy(alpha = 0.18f)
        OptionState.WRONG -> scheme.errorContainer
    }
    val border = when (state) {
        OptionState.SELECTED -> scheme.primary
        OptionState.CORRECT -> slovko.success
        OptionState.WRONG -> scheme.error
        OptionState.DEFAULT -> scheme.outline
    }
    Surface(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = container,
        border = BorderStroke(2.dp, border),
    ) {
        Row(
            Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (number != null) {
                Text(
                    "$number",
                    style = MaterialTheme.typography.labelLarge,
                    color = scheme.onSurfaceVariant,
                    modifier = Modifier.width(20.dp),
                )
            }
            Text(text, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
fun WordTile(
    text: String,
    modifier: Modifier = Modifier,
    onSpeak: (() -> Unit)? = null,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.secondaryContainer,
    ) {
        Row(
            Modifier
                .clickable(enabled = onSpeak != null) { onSpeak?.invoke() }
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text, style = MaterialTheme.typography.titleMedium)
            if (onSpeak != null) {
                Spacer(Modifier.width(8.dp))
                Icon(
                    Icons.Filled.VolumeUp, contentDescription = "Play audio",
                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
fun SkillNode(
    state: NodeState,
    glyph: String,
    progress: Float,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val reduced = LocalReducedMotion.current
    val breathing = rememberInfiniteTransition(label = "node")
    val scale by breathing.animateFloat(
        initialValue = 1f,
        targetValue = if (state == NodeState.AVAILABLE && !reduced) 1.06f else 1f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label = "scale",
    )
    val bg = when (state) {
        NodeState.LOCKED -> MaterialTheme.colorScheme.surfaceVariant
        NodeState.AVAILABLE -> MaterialTheme.colorScheme.primaryContainer
        NodeState.COMPLETE -> MaterialTheme.slovkoColors.gold
    }
    Box(contentAlignment = Alignment.Center, modifier = modifier) {
        if (state != NodeState.LOCKED) {
            ProgressRing(progress = progress, size = 84, stroke = 8f)
        }
        Box(
            Modifier
                .size(72.dp)
                .scale(scale)
                .clip(CircleShape)
                .background(bg)
                .clickable { onClick() },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                if (state == NodeState.COMPLETE) "👑" else glyph,
                style = MaterialTheme.typography.headlineMedium,
            )
        }
    }
}

@Composable
fun CicmanyDivider(modifier: Modifier = Modifier) {
    val color = MaterialTheme.slovkoColors.cicmanyLine
    Canvas(
        modifier
            .fillMaxWidth()
            .height(12.dp)
            .padding(horizontal = 16.dp),
    ) {
        val n = (size.width / 24f).toInt().coerceAtLeast(1)
        val w = size.width / n
        for (i in 0 until n) {
            val cx = i * w + w / 2
            val cy = size.height / 2
            val r = size.height / 2.5f
            val path = androidx.compose.ui.graphics.Path().apply {
                moveTo(cx, cy - r); lineTo(cx + r, cy); lineTo(cx, cy + r); lineTo(cx - r, cy); close()
            }
            drawPath(path, color)
        }
    }
}

@Composable
fun MajaMascot(pose: String, modifier: Modifier = Modifier, size: Int = 96) {
    val accessory = when (pose.lowercase()) {
        "celebrating", "proud" -> "🎉"
        "thinking" -> "💭"
        "sleepy" -> "😴"
        "worried" -> "😟"
        "listening" -> "🎧"
        else -> "👋"
    }
    Box(modifier.size(size.dp), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .size(size.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text("🦊", style = MaterialTheme.typography.displayMedium)
        }
        Text(
            accessory,
            modifier = Modifier
                .align(Alignment.TopEnd),
            style = MaterialTheme.typography.titleLarge,
        )
    }
}

@Composable
fun ConfettiOverlay(show: Boolean, modifier: Modifier = Modifier) {
    val reduced = LocalReducedMotion.current
    AnimatedVisibility(visible = show) {
        if (reduced) {
            Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("🎉", style = MaterialTheme.typography.displayLarge)
            }
            return@AnimatedVisibility
        }
        val transition = rememberInfiniteTransition(label = "confetti")
        val t by transition.animateFloat(
            0f, 1f, infiniteRepeatable(tween(1400), RepeatMode.Restart), label = "fall",
        )
        val colors = listOf(
            MaterialTheme.colorScheme.primary,
            MaterialTheme.slovkoColors.gold,
            MaterialTheme.colorScheme.secondary,
            MaterialTheme.colorScheme.tertiary,
        )
        Canvas(modifier.fillMaxWidth().height(220.dp)) {
            val cols = 12
            for (i in 0 until cols) {
                val x = size.width * (i + 0.5f) / cols
                val phase = (t + i * 0.08f) % 1f
                val y = size.height * phase
                drawCircle(
                    color = colors[i % colors.size],
                    radius = 8f,
                    center = Offset(x, y),
                )
            }
        }
    }
}
