package au.com.builderhq.app.core.design.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentContrast
import au.com.builderhq.app.core.design.theme.TextMuted

private val BarHeight = 38.dp

/**
 * Pill segmented control with a teal thumb that *glides* between options on a
 * spring — the app-wide replacement for hard background-swap selectors.
 *
 * Pass [selectedIndex] = -1 to hide the thumb (for optional / toggle-off
 * groups like quote-validity): the thumb fades out but holds its last slot,
 * so re-selecting fades back in without sliding from zero.
 */
@Composable
fun SegmentedControl(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val haptics = rememberHaptics()
    val count = options.size.coerceAtLeast(1)
    var lastValid by remember { mutableIntStateOf(selectedIndex.coerceAtLeast(0)) }
    LaunchedEffect(selectedIndex) { if (selectedIndex >= 0) lastValid = selectedIndex }

    Box(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(50))
            .background(Color(0x14FFFFFF))
            .padding(4.dp),
    ) {
        BoxWithConstraints {
            val segW = maxWidth / count
            val thumbX by animateDpAsState(
                targetValue = segW * lastValid,
                animationSpec = spring(dampingRatio = 0.82f, stiffness = 360f),
                label = "thumbX",
            )
            val thumbAlpha by animateFloatAsState(if (selectedIndex >= 0) 1f else 0f, label = "thumbAlpha")
            Box(
                Modifier
                    .offset(x = thumbX)
                    .width(segW)
                    .height(BarHeight)
                    .alpha(thumbAlpha)
                    .clip(RoundedCornerShape(50))
                    .background(Accent),
            )
            Row(Modifier.fillMaxWidth().height(BarHeight)) {
                options.forEachIndexed { i, label ->
                    val on = i == selectedIndex
                    val color by animateColorAsState(if (on) AccentContrast else TextMuted, label = "segText")
                    Box(
                        Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(50))
                            .clickable(remember { MutableInteractionSource() }, indication = null) {
                                haptics.tick(); onSelect(i)
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(label, color = color, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
