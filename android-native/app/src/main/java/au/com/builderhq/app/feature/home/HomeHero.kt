package au.com.builderhq.app.feature.home

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Autorenew
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Circle
import androidx.compose.material.icons.rounded.HourglassEmpty
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.ProgressRing
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.network.dto.FoundingAccessDto
import kotlin.math.roundToLong

/**
 * Builder home hero cards — the top slot of the dashboard. Exactly one
 * renders at a time: the verification callout while an account is in
 * review, the founding-access hero while a grant is live, or the quiet
 * inactive card once a grant has lapsed. Ported 1:1 from iOS.
 */

// ── verification callout ─────────────────────────────────────────────

/** Everything the callout derives from the approval status. */
private class CalloutSpec(
    val tone: Color,
    val pillLabel: String,
    val icon: ImageVector,
    val headline: String,
)

@Composable
internal fun VerificationCallout(
    approvalStatus: String,
    abnVerified: Boolean,
    anyLicenceVerified: Boolean,
) {
    val c = Bhq.colors

    val spec = when (approvalStatus) {
        "pending_review" -> CalloutSpec(
            tone = c.accent,
            pillLabel = "REVIEWING",
            icon = Icons.Rounded.HourglassEmpty,
            headline = "We're reviewing your account.",
        )
        "rejected" -> CalloutSpec(
            tone = c.danger,
            pillLabel = "ACTION NEEDED",
            icon = Icons.Rounded.WarningAmber,
            headline = "Your application needs attention.",
        )
        "suspended" -> CalloutSpec(
            tone = c.danger,
            pillLabel = "ACCOUNT PAUSED",
            icon = Icons.Rounded.WarningAmber,
            headline = "Your account is on hold.",
        )
        "incomplete" -> CalloutSpec(
            tone = c.warning,
            pillLabel = "INCOMPLETE",
            icon = Icons.Rounded.MoreHoriz,
            headline = "Finish setting up your profile.",
        )
        else -> CalloutSpec(
            tone = c.warning,
            pillLabel = approvalStatus.uppercase(),
            icon = Icons.Rounded.Circle,
            headline = "Account under review.",
        )
    }

    val body = when {
        approvalStatus == "pending_review" && abnVerified && anyLicenceVerified ->
            "Both checks landed — we'll be in touch within 24 hours. You can browse projects in the meantime."
        approvalStatus == "pending_review" ->
            "We're working through your details. The items below are still in review."
        approvalStatus == "rejected" ->
            "Tap support@builderhq.com.au and we'll walk you through what's needed."
        approvalStatus == "suspended" ->
            "Get in touch with support@builderhq.com.au to reactivate."
        approvalStatus == "incomplete" ->
            "Open the You tab to pick up where you left off."
        else -> "Hang tight — we'll have an answer soon."
    }

    val shape = RoundedCornerShape(24.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Bhq.brushes.card)
            .border(1.dp, spec.tone.copy(alpha = 0.32f), shape)
            .padding(horizontal = 22.dp, vertical = 22.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Status pill — breathes gently so review states read as "live".
        val pulseTransition = rememberInfiniteTransition(label = "pillPulse")
        val pulse by pulseTransition.animateFloat(
            initialValue = 1f,
            targetValue = 1.03f,
            animationSpec = infiniteRepeatable(tween(1600), RepeatMode.Reverse),
            label = "pillScale",
        )
        Row(
            Modifier
                .graphicsLayer {
                    scaleX = pulse
                    scaleY = pulse
                }
                .clip(CircleShape)
                .background(spec.tone.copy(alpha = 0.12f))
                .border(1.dp, spec.tone.copy(alpha = 0.35f), CircleShape)
                .padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                spec.icon,
                contentDescription = null,
                tint = spec.tone,
                modifier = Modifier.size(12.dp),
            )
            Text(
                spec.pillLabel,
                color = spec.tone,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            )
        }

        Text(
            spec.headline,
            color = c.text,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
        )

        Text(
            body,
            color = c.textMuted,
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )

        Column(
            Modifier.padding(top = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            VerificationChecklistRow("ABN verified against ABR", complete = abnVerified)
            VerificationChecklistRow("Builder licence on file", complete = anyLicenceVerified)
        }
    }
}

@Composable
private fun VerificationChecklistRow(label: String, complete: Boolean) {
    val c = Bhq.colors
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            if (complete) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
            contentDescription = null,
            tint = if (complete) c.accent else c.textDim,
            modifier = Modifier.size(17.dp),
        )
        Text(
            label,
            color = if (complete) c.text else c.textMuted,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

// ── founding access hero ─────────────────────────────────────────────

@Composable
internal fun FbaHeroCard(fba: FoundingAccessDto, revealed: Boolean) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(26.dp)

    // Count-up + ring sweep play once on reveal; refreshes settle instantly.
    val count by animateIntAsState(
        targetValue = if (revealed) fba.remainingThisCycle else 0,
        animationSpec = tween(700, easing = Motion.EaseOut),
        label = "fbaCount",
    )
    val ringTarget =
        if (fba.monthlyQuota == 0) 0f
        else (fba.monthlyQuota - fba.remainingThisCycle) / fba.monthlyQuota.toFloat()
    val ringProgress by animateFloatAsState(
        targetValue = if (revealed) ringTarget else 0f,
        animationSpec = tween(700, easing = Motion.EaseOut),
        label = "fbaRing",
    )

    Box(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Bhq.brushes.card)
            .border(1.dp, c.accent.copy(alpha = 0.34f), shape),
    ) {
        // Ambient glows — teal upper-right, faint gold lower-left.
        Box(
            Modifier
                .matchParentSize()
                .drawBehind {
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(c.accent.copy(alpha = 0.20f), c.accent.copy(alpha = 0f)),
                            center = Offset(size.width * 0.88f, size.height * 0.28f),
                            radius = (size.width * 0.55f).coerceAtLeast(1f),
                        ),
                    )
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(c.gold.copy(alpha = 0.10f), c.gold.copy(alpha = 0f)),
                            center = Offset(size.width * 0.08f, size.height * 0.92f),
                            radius = (size.width * 0.45f).coerceAtLeast(1f),
                        ),
                    )
                },
        )

        Column(
            Modifier.padding(horizontal = 22.dp, vertical = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            // Kicker row.
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(5.dp)
                        .clip(CircleShape)
                        .background(c.accent),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "FOUNDING ACCESS",
                    color = c.accent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.4.sp,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    if (fba.totalCycles > 1) "CYCLE ${fba.cycleIndex + 1} OF ${fba.totalCycles}"
                    else "CURRENT CYCLE",
                    color = c.textDim,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.6.sp,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                Column(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        count.toString(),
                        color = c.text,
                        fontSize = 54.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "of ${fba.monthlyQuota} unlocks left",
                        color = c.textMuted,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Box(
                        Modifier
                            .padding(vertical = 6.dp)
                            .width(32.dp)
                            .height(1.dp)
                            .background(c.blueprintLine.copy(alpha = 0.10f)),
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                Icons.Rounded.Autorenew,
                                contentDescription = null,
                                tint = c.textDim,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                "Refreshes in ${fba.daysToRefresh} day${if (fba.daysToRefresh == 1) "" else "s"}",
                                color = c.textMuted,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                Icons.Rounded.AutoAwesome,
                                contentDescription = null,
                                tint = c.textDim,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                compactDollars(fba.totalSavedAud),
                                color = c.accentLight,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                " saved so far",
                                color = c.textMuted,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }

                Box(Modifier.size(96.dp), contentAlignment = Alignment.Center) {
                    ProgressRing(
                        progress = ringProgress,
                        diameter = 96.dp,
                        thickness = 10.dp,
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            count.toString(),
                            color = c.text,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "LEFT",
                            color = c.textDim,
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                        )
                    }
                }
            }
        }
    }
}

/** "$450", "$1.2K", "$48K", "$1.2M", "$2M". */
private fun compactDollars(aud: Int): String {
    fun scaled(value: Double, suffix: String): String {
        val tenths = (value * 10).roundToLong()
        return if (tenths % 10L == 0L) "$${tenths / 10}$suffix"
        else "$${tenths / 10}.${tenths % 10}$suffix"
    }
    return when {
        aud < 1_000 -> "$$aud"
        aud < 1_000_000 -> scaled(aud / 1_000.0, "K")
        else -> scaled(aud / 1_000_000.0, "M")
    }
}

// ── inactive founding access ─────────────────────────────────────────

@Composable
internal fun InactiveFbaCard(reason: String?) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(22.dp)

    val title = when (reason) {
        "expired" -> "Your founding cycle has ended."
        "revoked" -> "Founding access was revoked."
        "no_grant" -> "Founding access isn't active on this account."
        else -> "Founding access is currently inactive."
    }

    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(c.surface)
            .border(1.dp, c.blueprintLine.copy(alpha = 0.08f), shape)
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                Icons.Rounded.AutoAwesome,
                contentDescription = null,
                tint = c.textDim,
                modifier = Modifier.size(12.dp),
            )
            Text(
                "FOUNDING ACCESS",
                color = c.textDim,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.4.sp,
            )
        }
        Text(
            title,
            color = c.text,
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "You can still unlock projects individually — see the suggested feed below.",
            color = c.textMuted,
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )
    }
}
