package au.com.builderhq.app.feature.owner

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.DisplaySerif
import au.com.builderhq.app.core.design.theme.Motion
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin

enum class CelebrationTone { ACCENT, SUCCESS, GOLD }

/**
 * Full-screen achievement moment. Staged choreography: medallion springs in,
 * a teal ring self-draws, sonar ripples ping outward, a golden-angle particle
 * burst rises, then headline → detail → CTA resolve. Shared by publish + award.
 */
@Composable
fun CelebrationScene(
    icon: ImageVector,
    titlePlain: String,
    titleEmphasis: String,
    detail: String,
    subtitle: String,
    metric: String?,
    ctaLabel: String,
    tone: CelebrationTone,
    onCta: () -> Unit,
) {
    val c = Bhq.colors
    val haptics = rememberHaptics()
    var stage by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        haptics.tick()
        delay(120); stage = 1
        delay(260); stage = 2; haptics.press()
        delay(200); stage = 3
        delay(220); stage = 4; haptics.confirm()
        delay(240); stage = 5
    }
    val color = when (tone) {
        CelebrationTone.ACCENT -> c.accent
        CelebrationTone.SUCCESS -> c.success
        CelebrationTone.GOLD -> c.gold
    }
    val ring by animateFloatAsState(if (stage >= 1) 1f else 0f, tween(950, easing = Motion.EaseOutSoft), label = "ring")
    val medScale by animateFloatAsState(if (stage >= 1) 1f else 0.5f, spring(dampingRatio = 0.5f, stiffness = 520f), label = "med")
    val burst by animateFloatAsState(if (stage >= 2) 1f else 0f, tween(900, easing = Motion.EaseOut), label = "burst")
    val infinite = rememberInfiniteTransition(label = "ripple")
    val rip by infinite.animateFloat(0f, 1f, infiniteRepeatable(tween(2200, easing = LinearEasing)), label = "rip")

    Box(Modifier.fillMaxSize().background(c.scrimHeavy), contentAlignment = Alignment.Center) {
        Column(
            Modifier.padding(36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.size(160.dp), contentAlignment = Alignment.Center) {
                if (stage >= 2) {
                    Canvas(Modifier.fillMaxSize()) {
                        repeat(3) { i ->
                            val p = (rip + i / 3f) % 1f
                            val r = (size.minDimension / 2f) * (0.45f + p * 1.4f)
                            drawCircle(color.copy(alpha = (1f - p) * 0.32f), r, style = Stroke(2.dp.toPx()))
                        }
                    }
                    Canvas(Modifier.fillMaxSize()) {
                        repeat(16) { i ->
                            val ang = i * 2.399963f // golden angle
                            val dist = size.minDimension * (0.16f + burst * 0.42f)
                            val pos = Offset(center.x + cos(ang) * dist, center.y + sin(ang) * dist)
                            drawCircle(color.copy(alpha = (1f - burst) * 0.9f), 2.5.dp.toPx(), pos)
                        }
                    }
                }
                Canvas(Modifier.size(116.dp)) {
                    val sw = 4.dp.toPx()
                    val box = Size(size.width - sw, size.height - sw)
                    val tl = Offset(sw / 2, sw / 2)
                    drawArc(color.copy(0.15f), -90f, 360f, false, topLeft = tl, size = box, style = Stroke(sw))
                    drawArc(
                        brush = Brush.sweepGradient(listOf(color, c.accentLight, color)),
                        startAngle = -90f, sweepAngle = 360f * ring, useCenter = false,
                        topLeft = tl, size = box, style = Stroke(sw, cap = StrokeCap.Round),
                    )
                }
                Box(
                    Modifier
                        .size(80.dp)
                        .graphicsLayer { scaleX = medScale; scaleY = medScale }
                        .clip(RoundedCornerShape(50))
                        .background(Brush.verticalGradient(listOf(c.accentLight, color))),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = c.accentContrast, modifier = Modifier.size(40.dp))
                }
            }

            Spacer(Modifier.height(28.dp))
            AnimatedVisibility(stage >= 3, enter = fadeIn() + slideInVertically { it / 3 }) {
                Text(
                    buildAnnotatedString {
                        append("$titlePlain ")
                        withStyle(SpanStyle(color = color, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)) {
                            append(titleEmphasis)
                        }
                    },
                    color = c.text, fontSize = 30.sp, fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(10.dp))
            AnimatedVisibility(stage >= 4, enter = fadeIn() + slideInVertically { it / 4 }) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(detail, color = color, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(8.dp))
                    Text(subtitle, color = c.textMuted, fontSize = 14.sp, lineHeight = 21.sp, textAlign = TextAlign.Center)
                    if (metric != null) {
                        Spacer(Modifier.height(14.dp))
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(50))
                                .background(color.copy(alpha = 0.12f))
                                .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(50))
                                .padding(horizontal = 14.dp, vertical = 7.dp),
                        ) {
                            Text(metric, color = color, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
            Spacer(Modifier.height(30.dp))
            AnimatedVisibility(stage >= 5, enter = fadeIn() + slideInVertically { it / 3 }) {
                PrimaryButton(ctaLabel, onClick = onCta)
            }
        }
    }
}
