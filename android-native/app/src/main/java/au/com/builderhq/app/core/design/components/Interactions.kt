package au.com.builderhq.app.core.design.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion
import kotlinx.coroutines.delay

/** Tactile press: springs to [pressedScale] while held + fires [onClick],
 *  no ripple. The app-wide "alive under the finger" modifier. */
fun Modifier.pressable(
    pressedScale: Float = 0.96f,
    enabled: Boolean = true,
    onClick: () -> Unit,
): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed && enabled) pressedScale else 1f, spring(), label = "pressable")
    this
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .clickable(interaction, indication = null, enabled = enabled, onClick = onClick)
}

/** First-appearance fade + rise, staggered by list [index]. Items past
 *  [STAGGER_LIMIT] (i.e. scrolled in later) appear instantly so scrolling
 *  never feels laggy — only the opening viewport choreographs in. */
@Composable
fun StaggeredEntrance(
    index: Int,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    var shown by remember { mutableStateOf(index >= STAGGER_LIMIT) }
    LaunchedEffect(Unit) {
        if (index < STAGGER_LIMIT) {
            delay(index * 55L)
            shown = true
        }
    }
    val alpha by animateFloatAsState(
        if (shown) 1f else 0f,
        tween(Motion.BASE, easing = Motion.EaseOut), label = "stagAlpha",
    )
    val riseFrom = with(LocalDensity.current) { 16.dp.toPx() }
    val translateY by animateFloatAsState(
        if (shown) 0f else riseFrom,
        tween(Motion.BASE, easing = Motion.EaseOut), label = "stagY",
    )
    Box(modifier.graphicsLayer { this.alpha = alpha; translationY = translateY }) { content() }
}

private const val STAGGER_LIMIT = 8

/** Heart toggle with a spring pulse on save + a light haptic. Shared by the
 *  project card and the detail hero. */
@Composable
fun SaveButton(
    saved: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    diameter: Int = 34,
) {
    val haptics = rememberHaptics()
    val pulse = remember { Animatable(1f) }
    var primed by remember { mutableStateOf(false) }
    LaunchedEffect(saved) {
        if (!primed) { primed = true; return@LaunchedEffect }
        if (saved) {
            pulse.animateTo(1.32f, spring(dampingRatio = 0.42f, stiffness = 900f))
            pulse.animateTo(1f, spring(dampingRatio = 0.6f, stiffness = 700f))
        }
    }
    val tint by animateColorAsState(if (saved) Bhq.colors.accent else Color.White, label = "saveTint")
    Box(
        modifier
            .size(diameter.dp)
            .clip(CircleShape)
            .background(Bhq.colors.scrimFaint)
            .clickable(remember { MutableInteractionSource() }, indication = null) { haptics.tick(); onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            if (saved) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
            contentDescription = if (saved) "Unsave" else "Save",
            tint = tint,
            modifier = Modifier
                .size((diameter * 0.53f).dp)
                .graphicsLayer { scaleX = pulse.value; scaleY = pulse.value },
        )
    }
}
