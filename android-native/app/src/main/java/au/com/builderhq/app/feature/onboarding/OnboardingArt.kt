package au.com.builderhq.app.feature.onboarding

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** The animated scene shown above each onboarding page. */
enum class OnbScene { DISCOVER, UNLOCK, TENDER, POST, RECEIVE, COMPARE, AWARD }

private val Ink = Color(0xFF031118)
private val DeepTeal = Color(0xFF00B3A8)

/**
 * Bespoke, self-animating illustrations on the brand blueprint canvas. Each
 * scene runs its own looping motion (radar sweep, unlocking layers, growing
 * tender bars, an award seal) — no static art anywhere.
 */
@Composable
fun OnboardingArt(scene: OnbScene, modifier: Modifier = Modifier) {
    val t = rememberInfiniteTransition(label = "art")
    val spin by t.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(7000, easing = LinearEasing)), label = "spin",
    )
    val pulse by t.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(2200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "pulse",
    )
    val drift by t.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(3400, easing = LinearEasing)), label = "drift",
    )
    Canvas(modifier) {
        drawBackdrop(pulse)
        when (scene) {
            OnbScene.DISCOVER -> drawDiscover(spin, pulse)
            OnbScene.UNLOCK -> drawUnlock(drift, pulse)
            OnbScene.TENDER -> drawTender(pulse)
            OnbScene.POST -> drawPost(drift, pulse)
            OnbScene.RECEIVE -> drawReceive(drift, pulse)
            OnbScene.COMPARE -> drawCompare(pulse)
            OnbScene.AWARD -> drawAward(pulse)
        }
    }
}

// ── Shared backdrop ─────────────────────────────────────────────────

private fun DrawScope.drawBackdrop(pulse: Float) {
    val glow = size.minDimension * 0.56f
    drawCircle(
        brush = Brush.radialGradient(
            listOf(Accent.copy(alpha = 0.14f + 0.06f * pulse), Color.Transparent),
            center = center, radius = glow,
        ),
        radius = glow, center = center,
    )
    val step = size.minDimension / 7f
    val line = BlueprintLine.copy(alpha = 0.06f)
    var x = step
    while (x < size.width) { drawLine(line, Offset(x, 0f), Offset(x, size.height), 1f); x += step }
    var y = step
    while (y < size.height) { drawLine(line, Offset(0f, y), Offset(size.width, y), 1f); y += step }
}

// ── Builder scenes ──────────────────────────────────────────────────

private fun DrawScope.drawDiscover(spin: Float, pulse: Float) {
    val c = center
    val maxR = size.minDimension * 0.42f
    listOf(0.4f, 0.7f, 1f).forEach { f ->
        drawCircle(BlueprintLine.copy(alpha = 0.18f), maxR * f, c, style = Stroke(1.2.dp.toPx()))
    }
    drawLine(BlueprintLine.copy(0.12f), Offset(c.x - maxR, c.y), Offset(c.x + maxR, c.y), 1f)
    drawLine(BlueprintLine.copy(0.12f), Offset(c.x, c.y - maxR), Offset(c.x, c.y + maxR), 1f)
    rotate(spin, pivot = c) {
        drawArc(
            brush = Brush.sweepGradient(listOf(Color.Transparent, Accent.copy(alpha = 0.5f)), c),
            startAngle = 0f, sweepAngle = 80f, useCenter = true,
            topLeft = Offset(c.x - maxR, c.y - maxR), size = Size(maxR * 2, maxR * 2),
        )
    }
    val nodes = listOf(0.55f to 40.0, 0.8f to 150.0, 0.5f to 250.0, 0.85f to 312.0, 0.35f to 95.0)
    nodes.forEachIndexed { i, (rf, deg) ->
        val rad = deg * PI / 180.0
        val p = Offset(c.x + (maxR * rf) * cos(rad).toFloat(), c.y + (maxR * rf) * sin(rad).toFloat())
        val s = 3.5.dp.toPx() * (1f + 0.4f * sin((pulse * 2 * PI + i).toFloat()))
        drawCircle(Accent.copy(0.22f), s * 2.4f, p)
        drawCircle(AccentLight, s, p)
    }
}

private fun DrawScope.drawUnlock(drift: Float, pulse: Float) {
    val c = center
    val unit = size.minDimension
    val lockW = unit * 0.26f
    val lockH = unit * 0.20f
    val lockTop = c.y - unit * 0.34f
    val lockLeft = c.x - lockW / 2
    val lift = unit * 0.02f * (0.5f + 0.5f * pulse)
    drawArc(
        color = AccentLight, startAngle = 180f, sweepAngle = 180f, useCenter = false,
        topLeft = Offset(c.x - lockW * 0.28f, lockTop - lockH * 0.55f - lift),
        size = Size(lockW * 0.56f, lockH * 0.8f),
        style = Stroke(4.dp.toPx(), cap = StrokeCap.Round),
    )
    drawRoundRect(
        brush = Brush.verticalGradient(listOf(Accent, DeepTeal)),
        topLeft = Offset(lockLeft, lockTop), size = Size(lockW, lockH),
        cornerRadius = CornerRadius(8.dp.toPx()),
    )
    drawCircle(Ink, 3.5.dp.toPx(), Offset(c.x, lockTop + lockH * 0.46f))

    val rowW = unit * 0.64f
    val rowH = unit * 0.085f
    val gap = unit * 0.045f
    val startY = c.y + unit * 0.02f
    repeat(3) { i ->
        val ry = startY + i * (rowH + gap)
        val rl = c.x - rowW / 2
        drawRoundRect(Color(0x14FFFFFF), Offset(rl, ry), Size(rowW, rowH), CornerRadius(rowH / 2))
        drawRoundRect(BlueprintLine.copy(0.10f), Offset(rl, ry), Size(rowW, rowH), CornerRadius(rowH / 2), style = Stroke(1f))
        drawCircle(AccentLight.copy(0.85f), rowH * 0.20f, Offset(rl + rowH * 0.62f, ry + rowH / 2))
        drawRoundRect(Color(0x30FFFFFF), Offset(rl + rowH * 1.1f, ry + rowH * 0.34f), Size(rowW * 0.46f, rowH * 0.18f), CornerRadius(2f))
    }
    val totalH = 3 * rowH + 2 * gap
    val bandY = startY + drift * totalH
    drawRect(
        brush = Brush.verticalGradient(
            listOf(Color.Transparent, AccentLight.copy(0.20f), Color.Transparent),
            startY = bandY - rowH, endY = bandY + rowH,
        ),
        topLeft = Offset(c.x - rowW / 2, startY), size = Size(rowW, totalH),
    )
}

private fun DrawScope.drawTender(pulse: Float) {
    val c = center
    val unit = size.minDimension
    val baseY = c.y + unit * 0.28f
    val barW = unit * 0.09f
    val gap = unit * 0.06f
    val heights = listOf(0.18f, 0.30f, 0.24f, 0.40f)
    val totalW = heights.size * barW + (heights.size - 1) * gap
    var x = c.x - totalW / 2
    heights.forEachIndexed { i, h ->
        val osc = 1f + 0.06f * sin((pulse * 2 * PI + i * 0.7).toFloat())
        val bh = unit * h * osc
        val tallest = i == heights.lastIndex
        drawRoundRect(
            brush = if (tallest) Brush.verticalGradient(listOf(AccentLight, Accent)) else SolidColor(BlueprintLine.copy(0.30f)),
            topLeft = Offset(x, baseY - bh), size = Size(barW, bh),
            cornerRadius = CornerRadius(barW * 0.4f),
        )
        if (tallest) drawSeal(Offset(x + barW / 2, baseY - bh - unit * 0.10f), unit * 0.06f * (1f + 0.06f * pulse))
        x += barW + gap
    }
    drawLine(
        BlueprintLine.copy(0.18f),
        Offset(c.x - totalW / 2 - gap, baseY), Offset(c.x + totalW / 2 + gap, baseY),
        1.5.dp.toPx(),
    )
}

// ── Owner scenes ────────────────────────────────────────────────────

private fun DrawScope.drawPost(drift: Float, pulse: Float) {
    val c = center
    val unit = size.minDimension
    val docW = unit * 0.46f
    val docH = unit * 0.56f
    val left = c.x - docW / 2
    val top = c.y - docH / 2
    drawRoundRect(Color(0x12FFFFFF), Offset(left, top), Size(docW, docH), CornerRadius(unit * 0.04f))
    drawRoundRect(BlueprintLine.copy(0.16f), Offset(left, top), Size(docW, docH), CornerRadius(unit * 0.04f), style = Stroke(1.2.dp.toPx()))
    val lineX = left + docW * 0.14f
    val lineH = unit * 0.028f
    val full = docW * 0.72f
    repeat(5) { i ->
        val ly = top + docH * 0.2f + i * (docH * 0.13f)
        val phase = (drift + i * 0.12f) % 1f
        val w = full * (0.3f + 0.7f * sin((phase * PI).toFloat()).coerceIn(0f, 1f))
        drawRoundRect(Color(0x18FFFFFF), Offset(lineX, ly), Size(full, lineH), CornerRadius(lineH / 2))
        drawRoundRect(Accent.copy(0.55f), Offset(lineX, ly), Size(w, lineH), CornerRadius(lineH / 2))
    }
    val bc = Offset(left + docW * 0.92f, top + docH * 0.9f)
    val br = unit * 0.10f * (1f + 0.05f * pulse)
    drawCircle(Brush.verticalGradient(listOf(AccentLight, Accent)), br, bc)
    val a = Path().apply {
        moveTo(bc.x, bc.y - br * 0.42f); lineTo(bc.x, bc.y + br * 0.45f)
        moveTo(bc.x, bc.y - br * 0.42f); lineTo(bc.x - br * 0.35f, bc.y + br * 0.02f)
        moveTo(bc.x, bc.y - br * 0.42f); lineTo(bc.x + br * 0.35f, bc.y + br * 0.02f)
    }
    drawPath(a, Ink, style = Stroke(2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
}

private fun DrawScope.drawReceive(drift: Float, pulse: Float) {
    val c = center
    val unit = size.minDimension
    val hubR = unit * 0.13f * (1f + 0.05f * pulse)
    drawCircle(Brush.radialGradient(listOf(Accent.copy(0.45f), Color.Transparent), c, hubR * 2.3f), hubR * 2.3f, c)
    drawCircle(Brush.verticalGradient(listOf(AccentLight, Accent)), hubR, c)
    val starts = listOf(
        Offset(size.width * 0.12f, size.height * 0.18f),
        Offset(size.width * 0.9f, size.height * 0.22f),
        Offset(size.width * 0.82f, size.height * 0.86f),
    )
    starts.forEachIndexed { i, s0 ->
        val phase = (drift + i * 0.33f) % 1f
        val pos = Offset(s0.x + (c.x - s0.x) * phase, s0.y + (c.y - s0.y) * phase)
        val alpha = (1f - phase).coerceIn(0f, 1f) * 0.9f
        val cw = unit * 0.15f
        val ch = unit * 0.10f
        drawLine(Accent.copy(0.10f), s0, c, 1f)
        drawRoundRect(Color.White.copy(alpha * 0.12f), Offset(pos.x - cw / 2, pos.y - ch / 2), Size(cw, ch), CornerRadius(unit * 0.02f))
        drawRoundRect(BlueprintLine.copy(alpha * 0.4f), Offset(pos.x - cw / 2, pos.y - ch / 2), Size(cw, ch), CornerRadius(unit * 0.02f), style = Stroke(1f))
    }
}

private fun DrawScope.drawCompare(pulse: Float) {
    val c = center
    val unit = size.minDimension
    val baseY = c.y + unit * 0.26f
    val barW = unit * 0.20f
    val gap = unit * 0.12f
    val data = listOf(0.34f to false, 0.46f to true)
    val totalW = 2 * barW + gap
    var x = c.x - totalW / 2
    data.forEach { (h, win) ->
        val bh = unit * h
        drawRoundRect(
            brush = if (win) Brush.verticalGradient(listOf(AccentLight, Accent)) else SolidColor(BlueprintLine.copy(0.28f)),
            topLeft = Offset(x, baseY - bh), size = Size(barW, bh), cornerRadius = CornerRadius(barW * 0.18f),
        )
        if (win) drawSeal(Offset(x + barW / 2, baseY - bh - unit * 0.09f), unit * 0.055f * (1f + 0.06f * pulse))
        x += barW + gap
    }
    drawLine(
        BlueprintLine.copy(0.18f),
        Offset(c.x - totalW / 2 - gap * 0.4f, baseY), Offset(c.x + totalW / 2 + gap * 0.4f, baseY),
        1.5.dp.toPx(),
    )
}

private fun DrawScope.drawAward(pulse: Float) {
    val c = center
    val unit = size.minDimension
    val rays = 12
    val inner = unit * 0.17f
    val outer = inner + unit * 0.10f * (0.7f + 0.3f * pulse)
    repeat(rays) { i ->
        val ang = i * (2.0 * PI / rays)
        val p1 = Offset(c.x + inner * cos(ang).toFloat(), c.y + inner * sin(ang).toFloat())
        val p2 = Offset(c.x + outer * cos(ang).toFloat(), c.y + outer * sin(ang).toFloat())
        drawLine(Accent.copy(0.5f), p1, p2, 2.dp.toPx(), cap = StrokeCap.Round)
    }
    drawCircle(Brush.radialGradient(listOf(Accent.copy(0.4f), Color.Transparent), c, inner * 2.4f), inner * 2.4f, c)
    drawCircle(Brush.verticalGradient(listOf(AccentLight, Accent)), inner, c)
    drawSealCheck(c, inner)
}

// ── Shared seal ─────────────────────────────────────────────────────

private fun DrawScope.drawSeal(at: Offset, r: Float) {
    drawCircle(Accent.copy(0.28f), r * 1.5f, at)
    drawCircle(Accent, r, at)
    drawSealCheck(at, r)
}

private fun DrawScope.drawSealCheck(at: Offset, r: Float) {
    val p = Path().apply {
        moveTo(at.x - r * 0.4f, at.y)
        lineTo(at.x - r * 0.08f, at.y + r * 0.34f)
        lineTo(at.x + r * 0.45f, at.y - r * 0.34f)
    }
    drawPath(p, Ink, style = Stroke((r * 0.16f).coerceAtLeast(2f), cap = StrokeCap.Round, join = StrokeJoin.Round))
}
