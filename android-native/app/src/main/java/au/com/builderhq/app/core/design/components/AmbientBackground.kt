package au.com.builderhq.app.core.design.components

import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.dp
import au.com.builderhq.app.core.design.theme.Bhq

/**
 * The signature atmospheric backdrop every screen sits on: a vertical
 * canvas gradient, two breathing radial blooms (teal + blue depth axis),
 * and a faint blueprint grid. Calm, alive-but-restrained — the brand's
 * depth.
 *
 * Art surface: owns its palettes per mode rather than mapping 1:1 to
 * tokens. Dark is the original navy atmosphere (unchanged values);
 * light is the web app's cream field with the same two blooms at
 * whisper strength (Screen blending washes out on light, so those
 * blooms composite normally at low alpha).
 */
@Composable
fun AmbientBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    val isDark = Bhq.colors.isDark
    val transition = rememberInfiniteTransition(label = "ambient")
    val breath by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(7000, easing = EaseInOut), RepeatMode.Reverse),
        label = "breath",
    )

    Box(
        modifier
            .fillMaxSize()
            .drawBehind {
                if (isDark) {
                    drawRect(
                        Brush.verticalGradient(
                            0f to Color(0xFF06080F),
                            0.5f to Color(0xFF080C16),
                            1f to Color(0xFF05070D),
                        ),
                    )
                    drawRect(
                        Brush.radialGradient(
                            listOf(Color(0x3300D4C8), Color(0x0000D4C8)),
                            center = Offset(size.width * 0.86f, size.height * (0.10f + breath * 0.03f)),
                            radius = size.minDimension * (0.62f + breath * 0.04f),
                        ),
                        blendMode = BlendMode.Screen,
                    )
                    drawRect(
                        Brush.radialGradient(
                            listOf(Color(0x221A5FD4), Color(0x001A5FD4)),
                            center = Offset(size.width * 0.08f, size.height * 0.92f),
                            radius = size.minDimension * 0.6f,
                        ),
                        blendMode = BlendMode.Screen,
                    )
                    blueprintGrid(spacing = 64.dp.toPx(), color = Color(0xFF64B4FF).copy(alpha = 0.05f))
                } else {
                    drawRect(
                        Brush.verticalGradient(
                            0f to Color(0xFFECE7DD),
                            0.5f to Color(0xFFF1EDE4),
                            1f to Color(0xFFE3DDD0),
                        ),
                    )
                    drawRect(
                        Brush.radialGradient(
                            listOf(Color(0x14099489), Color(0x00099489)),
                            center = Offset(size.width * 0.86f, size.height * (0.10f + breath * 0.03f)),
                            radius = size.minDimension * (0.62f + breath * 0.04f),
                        ),
                    )
                    drawRect(
                        Brush.radialGradient(
                            listOf(Color(0x0D1A5FD4), Color(0x001A5FD4)),
                            center = Offset(size.width * 0.08f, size.height * 0.92f),
                            radius = size.minDimension * 0.6f,
                        ),
                    )
                    blueprintGrid(spacing = 64.dp.toPx(), color = Color(0xFF18222C).copy(alpha = 0.04f))
                }
            },
        content = content,
    )
}

private fun DrawScope.blueprintGrid(spacing: Float, color: Color) {
    var x = 0f
    while (x <= size.width) {
        drawLine(color, Offset(x, 0f), Offset(x, size.height), strokeWidth = 1f)
        x += spacing
    }
    var y = 0f
    while (y <= size.height) {
        drawLine(color, Offset(0f, y), Offset(size.width, y), strokeWidth = 1f)
        y += spacing
    }
}
