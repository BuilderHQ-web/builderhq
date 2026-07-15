package au.com.builderhq.app.feature.home

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.DisplaySerif
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.network.dto.BuilderStatsDto
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.random.Random
import kotlinx.coroutines.delay

/**
 * Greeting header — pulsing date kicker, the two-line serif-accent
 * greeting, an accent divider, and the self-typing status ticker.
 * Ported 1:1 from iOS.
 */
@Composable
internal fun GreetingHeader(
    plain: String,
    accentName: String,
    tickerLines: List<String>,
    @Suppress("UNUSED_PARAMETER") revealed: Boolean, // signature parity with the scaffold; header renders immediately
) {
    val c = Bhq.colors
    val accent = accentForTime()

    Column(horizontalAlignment = Alignment.Start) {
        // ── kicker row: pulsing dot + today's date ───────────────────
        val pulse = rememberInfiniteTransition(label = "kickerPulse")
        val dotScale by pulse.animateFloat(
            initialValue = 0.78f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(1800), RepeatMode.Reverse),
            label = "kickerDot",
        )
        val kicker = remember {
            LocalDate.now()
                .format(DateTimeFormatter.ofPattern("EEEE '·' MMMM d", Locale.ENGLISH))
                .uppercase(Locale.ENGLISH)
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier
                    .size(7.dp)
                    .graphicsLayer { scaleX = dotScale; scaleY = dotScale }
                    .clip(CircleShape)
                    .background(accent),
            )
            Text(
                kicker,
                color = accent,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.6.sp,
            )
        }

        // ── headline: plain sans + serif-italic accent name ──────────
        Text(
            buildAnnotatedString {
                append(plain)
                append("\n")
                withStyle(
                    SpanStyle(
                        fontFamily = DisplaySerif,
                        fontStyle = FontStyle.Italic,
                        color = accent,
                    ),
                ) {
                    append(accentName)
                }
            },
            color = c.text,
            fontSize = 40.sp,
            fontWeight = FontWeight.Medium,
            lineHeight = 46.sp,
            letterSpacing = (-0.6).sp,
            modifier = Modifier.padding(top = 14.dp),
        )

        if (tickerLines.isNotEmpty()) {
            // ── accent divider ───────────────────────────────────────
            Box(
                Modifier
                    .padding(top = 18.dp)
                    .size(width = 42.dp, height = 1.5.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(accent.copy(alpha = 0.7f), Color.Transparent),
                        ),
                    ),
            )
            Box(Modifier.padding(top = 12.dp)) {
                TypingTicker(tickerLines)
            }
        }
    }
}

/**
 * The time-shifted teal ramp — the one sanctioned raw-hex exception:
 * the greeting accent warms and cools with the hour, in both palettes.
 */
@Composable
private fun accentForTime(): Color {
    val dark = Bhq.colors.isDark
    return when (LocalTime.now().hour) {
        in 5..8 -> if (dark) Color(0xFF14E0CC) else Color(0xFF0E8A7E)
        in 9..16 -> if (dark) Color(0xFF00D4C8) else Color(0xFF0A7D73)
        in 17..20 -> if (dark) Color(0xFF00BFB8) else Color(0xFF08706A)
        else -> if (dark) Color(0xFF09A8A0) else Color(0xFF06615C)
    }
}

/**
 * Self-typing looping status line: types each line char-by-char with
 * punctuation-aware pacing, holds, erases quickly, then moves on. The
 * caret blinks while typing/holding and hides during the erase.
 */
@Composable
private fun TypingTicker(lines: List<String>) {
    val c = Bhq.colors
    var text by remember { mutableStateOf("") }
    var erasing by remember { mutableStateOf(false) }

    LaunchedEffect(lines) {
        text = ""
        erasing = false
        if (lines.isEmpty()) return@LaunchedEffect
        delay(550)
        var i = 0
        while (true) {
            erasing = false
            val line = lines[i % lines.size]
            for (ch in line) {
                text += ch
                delay(
                    when (ch) {
                        '.', '!', '?' -> 220L
                        ',', '—' -> 140L
                        else -> Random.nextLong(26, 47)
                    },
                )
            }
            delay(2600)
            erasing = true
            while (text.isNotEmpty()) {
                text = text.dropLast(1)
                delay(12)
            }
            delay(150)
            i++
        }
    }

    val blink = rememberInfiniteTransition(label = "caretBlink")
    val caretAlpha by blink.animateFloat(
        initialValue = 0.15f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(tween(650), RepeatMode.Reverse),
        label = "caretAlpha",
    )

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Text(
            text,
            color = c.textMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
        )
        if (!erasing) {
            Box(
                Modifier
                    .size(width = 2.dp, height = 15.dp)
                    .graphicsLayer { alpha = caretAlpha }
                    .clip(RoundedCornerShape(1.dp))
                    .background(c.accent),
            )
        }
    }
}

// ── pulse strip ("This week") ────────────────────────────────────────

private data class PulseTileSpec(val label: String, val value: Int, val icon: ImageVector)

/** Weekly stats — a 2x2 grid of count-up tiles. */
@Composable
internal fun PulseStrip(stats: BuilderStatsDto, revealed: Boolean) {
    val tiles = listOf(
        PulseTileSpec("Active tenders", stats.activeTenders, Icons.AutoMirrored.Rounded.Send),
        PulseTileSpec("Saved", stats.savedProjects, Icons.Rounded.Bookmark),
        PulseTileSpec("Unlocks", stats.unlockedProjects, Icons.Rounded.LockOpen),
        PulseTileSpec("Matches", stats.suggestedCount, Icons.Rounded.AutoAwesome),
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        HomeSectionLabel("This week")
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            tiles.chunked(2).forEachIndexed { rowIdx, row ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    row.forEachIndexed { colIdx, tile ->
                        PulseTile(
                            spec = tile,
                            index = rowIdx * 2 + colIdx,
                            revealed = revealed,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PulseTile(
    spec: PulseTileSpec,
    index: Int,
    revealed: Boolean,
    modifier: Modifier = Modifier,
) {
    val c = Bhq.colors
    val active = spec.value > 0
    val shape = RoundedCornerShape(18.dp)

    val count by animateIntAsState(
        targetValue = if (revealed) spec.value else 0,
        animationSpec = tween(
            durationMillis = 700,
            delayMillis = 40 + index * 60,
            easing = Motion.EaseOut,
        ),
        label = "pulseCount",
    )

    Column(
        modifier
            .clip(shape)
            .background(c.surface)
            .then(
                if (active) {
                    Modifier.background(
                        Brush.linearGradient(
                            listOf(c.accent.copy(alpha = 0.08f), Color.Transparent),
                        ),
                    )
                } else {
                    Modifier
                },
            )
            .border(
                1.dp,
                if (active) c.accent.copy(alpha = 0.22f) else c.blueprintLine.copy(alpha = 0.14f),
                shape,
            )
            .padding(horizontal = 15.dp, vertical = 14.dp),
        horizontalAlignment = Alignment.Start,
        verticalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Box(
            Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(if (active) c.accentMuted else c.surfaceElev),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                spec.icon,
                contentDescription = null,
                tint = if (active) c.accent else c.textDim,
                modifier = Modifier.size(13.dp),
            )
        }
        Text(
            count.toString(),
            color = if (active) c.text else c.textMuted,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"),
        )
        Text(
            spec.label.uppercase(),
            color = c.textDim,
            fontSize = 9.5.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.6.sp,
        )
    }
}
