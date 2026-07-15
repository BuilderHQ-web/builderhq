package au.com.builderhq.app.core.design.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion

/** Animated circular progress ring with a teal sweep + faint track. */
@Composable
fun ProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    diameter: Dp = 64.dp,
    thickness: Dp = 6.dp,
) {
    val animated by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(900, easing = Motion.EaseOutSoft),
        label = "ring",
    )
    val c = Bhq.colors
    Canvas(modifier.size(diameter)) {
        val stroke = Stroke(width = thickness.toPx(), cap = StrokeCap.Round)
        val inset = thickness.toPx() / 2f
        val arcSize = Size(size.width - thickness.toPx(), size.height - thickness.toPx())
        drawArc(
            color = c.accent.copy(alpha = 0.18f),
            startAngle = 0f, sweepAngle = 360f, useCenter = false,
            topLeft = Offset(inset, inset), size = arcSize, style = stroke,
        )
        drawArc(
            brush = Brush.sweepGradient(listOf(c.accent, c.accentLight, c.accent)),
            startAngle = -90f, sweepAngle = 360f * animated, useCenter = false,
            topLeft = Offset(inset, inset), size = arcSize, style = stroke,
        )
    }
}

/** Shimmering skeleton placeholder — perceived-speed loading state. */
@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 12.dp,
) {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val x by transition.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(1400, easing = LinearEasing)),
        label = "shimmer",
    )
    val c = Bhq.colors
    Box(
        modifier
            .clip(RoundedCornerShape(cornerRadius))
            .drawWithCache {
                val w = size.width
                val band = Brush.linearGradient(
                    listOf(c.fillFaint, c.fillStrong, c.fillFaint),
                    start = Offset(w * (x * 2f - 1f), 0f),
                    end = Offset(w * (x * 2f), 0f),
                )
                onDrawBehind {
                    drawRect(c.surface)
                    drawRect(band)
                }
            },
    )
}
