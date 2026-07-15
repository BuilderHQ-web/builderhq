package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.DisplaySerif

/**
 * Chrome for the builder onboarding wizard — progress capsules,
 * two-tone headline, footer nav, error banner, section labels.
 * Mirrors the iOS WizardChrome 1:1.
 */

/** Row of 7 capsules; current = elongated accent pill. "1 of 7" right. */
@Composable
fun WizardProgress(total: Int, current: Int, modifier: Modifier = Modifier) {
    val c = Bhq.colors
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            repeat(total) { i ->
                val width by animateDpAsState(
                    if (i == current) 26.dp else 8.dp,
                    spring(dampingRatio = 0.85f),
                    label = "capsuleW",
                )
                val color by animateColorAsState(
                    when {
                        i == current -> c.accent
                        i < current -> c.accent.copy(alpha = 0.85f)
                        else -> c.blueprintLine.copy(alpha = 0.14f)
                    },
                    label = "capsuleC",
                )
                Box(
                    Modifier
                        .width(width)
                        .height(6.dp)
                        .clip(CircleShape)
                        .background(color),
                )
            }
        }
        Text(
            "${current + 1} of $total",
            color = c.textDim,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

/**
 * The standard step headline: `{index} / {KICKER}` eyebrow, then a
 * two-tone title — [title] in the UI face and [titleAccent] in the
 * serif italic brand face — plus an optional muted caption.
 */
@Composable
fun WizardHeader(
    index: String,
    kicker: String,
    title: String,
    titleAccent: String,
    caption: String? = null,
) {
    val c = Bhq.colors
    Column {
        Text(
            "$index / ${kicker.uppercase()}",
            color = c.accentLight,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            buildAnnotatedString {
                append(title)
                append("\n")
                withStyle(
                    SpanStyle(
                        fontFamily = DisplaySerif,
                        fontStyle = FontStyle.Italic,
                        fontWeight = FontWeight.Normal,
                        color = c.accentLight,
                    ),
                ) { append(titleAccent) }
            },
            color = c.text,
            fontSize = 34.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 40.sp,
        )
        if (caption != null) {
            Spacer(Modifier.height(10.dp))
            Text(caption, color = c.textMuted, fontSize = 14.sp, lineHeight = 20.sp)
        }
    }
}

/** UPPERCASE dim section label for the numbered subsections. */
@Composable
fun WizardSectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        color = Bhq.colors.textDim,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 2.2.sp,
        modifier = modifier,
    )
}

/** Danger banner for VM bannerError. */
@Composable
fun WizardBanner(message: String, modifier: Modifier = Modifier) {
    val c = Bhq.colors
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(c.danger.copy(alpha = 0.10f))
            .border(1.dp, c.danger.copy(alpha = 0.28f), RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.WarningAmber, null, tint = c.danger, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(10.dp))
        Text(message, color = c.danger, fontSize = 13.sp, lineHeight = 18.sp)
    }
}

/**
 * Footer nav: ghost Back pill (hidden when [onBack] is null — step 1)
 * + primary continue pill that morphs idle → spinner → label. The
 * final step's pill shows a check instead of an arrow.
 */
@Composable
fun WizardFooter(
    canContinue: Boolean,
    isSaving: Boolean,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
    continueLabel: String = "Continue",
    isFinal: Boolean = false,
    onBack: (() -> Unit)? = null,
) {
    val c = Bhq.colors
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) {
            Row(
                Modifier
                    .clip(CircleShape)
                    .background(c.fillSubtle)
                    .pressable(onClick = onBack)
                    .padding(horizontal = 18.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowBack, null,
                    tint = c.textMuted, modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text("Back", color = c.textMuted, fontSize = 15.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.width(12.dp))
        }
        val enabled = canContinue && !isSaving
        Row(
            Modifier
                .weight(1f)
                .clip(CircleShape)
                .background(if (enabled) c.accent else c.accent.copy(alpha = 0.35f))
                .pressable(enabled = enabled, onClick = onContinue)
                .padding(vertical = 15.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isSaving) {
                CircularProgressIndicator(
                    color = c.accentContrast, strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp),
                )
            } else {
                Text(
                    continueLabel,
                    color = c.accentContrast,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.width(8.dp))
                Icon(
                    if (isFinal) Icons.Rounded.Check else Icons.AutoMirrored.Rounded.ArrowForward,
                    null,
                    tint = c.accentContrast,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}
