package au.com.builderhq.app.feature.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import au.com.builderhq.app.core.design.theme.DisplaySerif
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.GhostButton
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentContrast
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.model.Role
import kotlinx.coroutines.launch
import kotlin.math.abs

private data class OnbPage(
    val scene: OnbScene,
    val kicker: String,
    val title: String,
    val accent: String,
    val body: String,
)

private fun pagesFor(role: Role): List<OnbPage> = when (role) {
    Role.OWNER -> listOf(
        OnbPage(OnbScene.POST, "Step 01", "Post your project once", "once",
            "Upload your plans and details in minutes. Your exact address stays private until you choose to share it."),
        OnbPage(OnbScene.RECEIVE, "Step 02", "Tenders come to you", "to you",
            "Verified, ABN-checked builders find your project and send real quotes — no chasing, no cold calls."),
        OnbPage(OnbScene.COMPARE, "Step 03", "Compare like for like", "like for like",
            "Every quote side by side — price, timeline, inclusions — so you judge value, not just the bottom line."),
        OnbPage(OnbScene.AWARD, "Step 04", "Award with confidence", "confidence",
            "Choose your builder, start the conversation, and move forward knowing you chose well."),
    )
    else -> listOf(
        OnbPage(OnbScene.DISCOVER, "Step 01", "Discover live builds", "live",
            "Real residential projects across Australia, the moment owners publish them. Filter to the work you want."),
        OnbPage(OnbScene.UNLOCK, "Step 02", "Unlock the full picture", "full picture",
            "One unlock reveals the plans, the exact address, and the owner — everything you need to quote with confidence."),
        OnbPage(OnbScene.TENDER, "Step 03", "Tender and win work", "win work",
            "Submit a clean, itemised quote in minutes. The owner compares, and you start the conversation."),
    )
}

@Composable
fun OnboardingScreen(role: Role, onDone: () -> Unit) {
    val pages = remember(role) { pagesFor(role) }
    val pager = rememberPagerState(pageCount = { pages.size })
    val haptics = rememberHaptics()
    val scope = rememberCoroutineScope()
    val isLast = pager.currentPage == pages.lastIndex

    LaunchedEffect(pager.currentPage) { haptics.tick() }

    // One-time entrance fade for the whole surface.
    var entered by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { entered = true }
    val enterAlpha by animateFloatAsState(if (entered) 1f else 0f, tween(500), label = "enter")

    val finish: () -> Unit = { haptics.confirm(); onDone() }

    AmbientBackground {
        Column(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .graphicsLayer { alpha = enterAlpha },
        ) {
            Row(
                Modifier.fillMaxWidth().height(48.dp).padding(start = 20.dp, end = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Kicker("BuilderHQ")
                this@Row.AnimatedVisibility(visible = !isLast, enter = fadeIn(), exit = fadeOut()) {
                    GhostButton("Skip", onClick = finish)
                }
            }

            HorizontalPager(state = pager, modifier = Modifier.weight(1f).fillMaxWidth()) { page ->
                val offset = (pager.currentPage - page) + pager.currentPageOffsetFraction
                PageContent(pages[page], offset)
            }

            BottomControls(
                pageCount = pages.size,
                current = pager.currentPage,
                isLast = isLast,
                onNext = { scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } },
                onFinish = finish,
            )
        }
    }
}

@Composable
private fun PageContent(page: OnbPage, pageOffset: Float) {
    val density = LocalDensity.current
    val artShift = with(density) { 46.dp.toPx() }
    val textShift = with(density) { 22.dp.toPx() }
    val fade = (1f - abs(pageOffset).coerceIn(0f, 1f) * 0.4f)

    Column(Modifier.fillMaxSize().padding(horizontal = 28.dp)) {
        Box(
            Modifier
                .fillMaxWidth()
                .weight(1f)
                .graphicsLayer {
                    translationX = pageOffset * artShift
                    alpha = fade
                },
            contentAlignment = Alignment.Center,
        ) {
            OnboardingArt(page.scene, Modifier.fillMaxSize())
        }

        Column(
            Modifier
                .fillMaxWidth()
                .graphicsLayer {
                    translationX = pageOffset * textShift
                    alpha = fade
                },
        ) {
            Kicker(page.kicker)
            Spacer(Modifier.height(16.dp))
            Text(
                accentTitle(page.title, page.accent),
                color = TextPrimary, fontSize = 32.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(14.dp))
            Text(page.body, color = TextMuted, fontSize = 15.sp, lineHeight = 23.sp)
            Spacer(Modifier.height(28.dp))
        }
    }
}

/** Headline with the [accent] phrase painted in the brand gradient. */
@Composable
private fun accentTitle(title: String, accent: String) = buildAnnotatedString {
    val brush = Brush.linearGradient(listOf(AccentLight, Accent))
    val idx = title.indexOf(accent)
    if (idx < 0) {
        append(title)
    } else {
        append(title.substring(0, idx))
        withStyle(SpanStyle(brush = brush, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)) {
            append(accent)
        }
        append(title.substring(idx + accent.length))
    }
}

@Composable
private fun BottomControls(
    pageCount: Int,
    current: Int,
    isLast: Boolean,
    onNext: () -> Unit,
    onFinish: () -> Unit,
) {
    Box(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp)) {
        AnimatedContent(
            targetState = isLast,
            transitionSpec = { fadeIn(tween(260)).togetherWith(fadeOut(tween(160))) },
            label = "controls",
        ) { last ->
            if (last) {
                PrimaryButton(
                    "Enter BuilderHQ",
                    onClick = onFinish,
                    leadingIcon = Icons.AutoMirrored.Rounded.ArrowForward,
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PageDots(pageCount, current)
                    NextCircle(onNext)
                }
            }
        }
    }
}

@Composable
private fun PageDots(count: Int, current: Int) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(count) { i ->
            val active = i == current
            val w by animateDpAsState(if (active) 24.dp else 7.dp, spring(), label = "dotW")
            Box(
                Modifier
                    .width(w)
                    .height(7.dp)
                    .clip(CircleShape)
                    .background(if (active) Accent else Color.White.copy(alpha = 0.22f)),
            )
        }
    }
}

@Composable
private fun NextCircle(onClick: () -> Unit) {
    Box(
        Modifier
            .size(56.dp)
            .shadow(elevation = 14.dp, shape = CircleShape, ambientColor = Accent, spotColor = Accent)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(AccentLight, Accent)))
            .pressable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = "Next",
            tint = AccentContrast, modifier = Modifier.size(22.dp),
        )
    }
}
