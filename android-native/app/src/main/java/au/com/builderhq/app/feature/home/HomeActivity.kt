package au.com.builderhq.app.feature.home

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Cancel
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.BhqColors
import au.com.builderhq.app.core.network.dto.ActivityRowDto
import java.time.Duration
import java.time.Instant

/**
 * Activity timeline — medallion rail + connector lines, unread
 * emphasis, and relative timestamps. Ported 1:1 from iOS.
 */

/** "now", "4m", "2h", "3d", "1w", "2mo" — compact relative age. */
internal fun relativeTime(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    val instant = try {
        Instant.parse(iso)
    } catch (_: Exception) {
        return ""
    }
    val s = Duration.between(instant, Instant.now()).seconds.coerceAtLeast(0)
    return when {
        s < 60 -> "now"
        s < 3_600 -> "${s / 60}m"
        s < 86_400 -> "${s / 3_600}h"
        s < 604_800 -> "${s / 86_400}d"
        s < 2_592_000 -> "${s / 604_800}w"
        else -> "${s / 2_592_000}mo"
    }
}

/** Pulls the project slug out of an `/projects/{slug}` action URL. */
internal fun activitySlug(actionUrl: String?): String? {
    if (actionUrl == null) return null
    val marker = "/projects/"
    val idx = actionUrl.indexOf(marker)
    if (idx < 0) return null
    val slug = actionUrl
        .substring(idx + marker.length)
        .takeWhile { it != '/' && it != '?' && it != '#' }
    return slug.ifEmpty { null }
}

@Composable
internal fun ActivityTimeline(
    items: List<ActivityRowDto>,
    onOpenProject: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        HomeSectionLabel("Activity")
        CardSurface(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                items.forEachIndexed { i, item ->
                    ActivityRow(
                        item = item,
                        isLast = i == items.lastIndex,
                        onOpenProject = onOpenProject,
                    )
                }
            }
        }
    }
}

@Composable
private fun ActivityRow(
    item: ActivityRowDto,
    isLast: Boolean,
    onOpenProject: (String) -> Unit,
) {
    val c = Bhq.colors
    val (icon, tint) = activityVisual(item.kind, c)
    val slug = activitySlug(item.actionUrl)
    val unread = item.readAt == null

    Row(
        modifier = if (slug != null) Modifier.pressable { onOpenProject(slug) } else Modifier,
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(13.dp),
    ) {
        // ── left rail: medallion + connector ─────────────────────────
        Column(
            Modifier.width(30.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier
                    .size(30.dp)
                    .clip(CircleShape)
                    .background(tint.copy(alpha = 0.15f))
                    .border(1.dp, tint.copy(alpha = 0.35f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(12.dp))
            }
            if (!isLast) {
                Box(
                    Modifier
                        .width(1.5.dp)
                        .height(24.dp)
                        .background(c.blueprintLine.copy(alpha = 0.17f)),
                )
            }
        }

        // ── content ──────────────────────────────────────────────────
        Column(
            Modifier
                .weight(1f)
                .padding(bottom = if (isLast) 0.dp else 18.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    item.title,
                    color = c.text,
                    fontSize = 14.sp,
                    fontWeight = if (unread) FontWeight.Bold else FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    relativeTime(item.createdAt),
                    color = if (unread) c.accent else c.textDim,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
                if (unread) {
                    Box(
                        Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(c.accent),
                    )
                }
            }
            val body = item.body
            if (!body.isNullOrBlank()) {
                Text(
                    body,
                    color = c.textMuted,
                    fontSize = 12.5.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 17.sp,
                    modifier = Modifier.padding(top = 3.dp),
                )
            }
        }
    }
}

/** Kind → medallion icon + tint; substring match, first hit wins. */
private fun activityVisual(kind: String, c: BhqColors): Pair<ImageVector, Color> {
    val k = kind.lowercase()
    return when {
        "award" in k -> Icons.Rounded.EmojiEvents to c.gold
        "shortlist" in k -> Icons.Rounded.Star to c.secondaryBlue
        "reject" in k || "declin" in k -> Icons.Rounded.Cancel to c.textDim
        "tender" in k -> Icons.AutoMirrored.Rounded.Send to c.accent
        "unlock" in k -> Icons.Rounded.LockOpen to c.accent
        "message" in k || "conversation" in k || "chat" in k -> Icons.AutoMirrored.Rounded.Chat to c.accentLight
        "match" in k || "suggest" in k -> Icons.Rounded.AutoAwesome to c.accent
        "publish" in k || "project" in k -> Icons.Rounded.Apartment to c.accentLight
        else -> Icons.Rounded.Notifications to c.textMuted
    }
}
