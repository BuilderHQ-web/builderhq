package au.com.builderhq.app.feature.owner

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.Gold
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.Warning

// ── Project status labels / colors ──────────────────────────────────

internal fun ownerStatusLabel(status: String): String = when (status) {
    "draft" -> "Draft"
    "published" -> "Live"
    "tendering" -> "Tendering"
    "awarded" -> "Awarded"
    "archived" -> "Archived"
    else -> status.replaceFirstChar { it.uppercase() }
}

internal fun ownerStatusColor(status: String): Color = when (status) {
    "published", "tendering" -> Accent
    "draft" -> Warning
    "awarded" -> Gold
    else -> TextDim
}

internal fun isLive(status: String): Boolean = status == "published" || status == "tendering"

internal fun formatAud(v: Int): String = "$" + "%,d".format(v)

/** Whole days since an ISO instant, or null if unparseable. */
internal fun daysSince(iso: String?): Int? {
    if (iso.isNullOrBlank()) return null
    val t = runCatching { java.time.Instant.parse(iso) }.getOrNull() ?: return null
    val ms = System.currentTimeMillis() - t.toEpochMilli()
    return (ms / (1000L * 60 * 60 * 24)).toInt().coerceAtLeast(0)
}

/** "today" / "live 3d" style age from an ISO instant. */
internal fun ageLabel(iso: String?, prefix: String = "live "): String {
    val d = daysSince(iso) ?: return ""
    return if (d == 0) "${prefix}today" else "$prefix${d}d"
}

/** $48K / $1.2M compact money for tight chips. */
internal fun compactAud(v: Int): String = when {
    v >= 1_000_000 -> "$" + "%.1f".format(v / 1_000_000.0).removeSuffix(".0") + "M"
    v >= 1_000 -> "$" + (v / 1000) + "K"
    else -> "$$v"
}

// ── Animated count-up ───────────────────────────────────────────────

/** Tweens from 0 → [value] on first appearance, then rolls on change. */
@Composable
internal fun AnimatedCount(
    value: Int,
    color: Color,
    fontSize: TextUnit = 30.sp,
    fontWeight: FontWeight = FontWeight.Bold,
    prefix: String = "",
    suffix: String = "",
) {
    var target by remember { mutableIntStateOf(0) }
    LaunchedEffect(value) { target = value }
    val n by animateIntAsState(target, tween(900, easing = androidx.compose.animation.core.FastOutSlowInEasing), label = "count")
    AnimatedContent(
        targetState = n,
        transitionSpec = {
            (slideInVertically { it / 2 } + fadeIn()) togetherWith (slideOutVertically { -it / 2 } + fadeOut())
        },
        label = "rollDigits",
    ) { shown ->
        Text("$prefix$shown$suffix", color = color, fontSize = fontSize, fontWeight = fontWeight)
    }
}

// ── Status pill ─────────────────────────────────────────────────────

@Composable
internal fun StatusPill(status: String) {
    val color = ownerStatusColor(status)
    val live = isLive(status)
    Row(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.12f))
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(50))
            .padding(horizontal = 9.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (live) {
            Box(Modifier.size(6.dp).clip(CircleShape).background(color))
            Spacer(Modifier.width(5.dp))
        }
        Text(
            ownerStatusLabel(status).uppercase(),
            color = color, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp,
        )
    }
}

// ── Small metric chip (icon + value) ────────────────────────────────

@Composable
internal fun MetricChip(icon: ImageVector, value: String, active: Boolean) {
    val tint = if (active) Accent else TextDim
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(4.dp))
        Text(value, color = if (active) Accent else TextDim, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}
