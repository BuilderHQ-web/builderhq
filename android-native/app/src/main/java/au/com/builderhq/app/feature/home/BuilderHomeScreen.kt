package au.com.builderhq.app.feature.home

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.WifiOff
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion

/**
 * Builder home — greeting, hero (verification / founding access),
 * tender pipeline, weekly stats, pickup lane, suggested feed, and
 * activity. One bundle fetch feeds everything; the reveal cascade
 * plays once, refreshes are silent.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuilderHomeScreen(
    onOpenProject: (String) -> Unit,
    vm: BuilderHomeViewModel = hiltViewModel(),
) {
    val bundle = vm.bundle

    // Tab-return: VM survives tab switches, so a fresh composition with
    // data already present means the user came back — refresh silently.
    LaunchedEffect(Unit) { vm.onTabVisible() }

    // Foreground return.
    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            vm.onForegrounded()
        }
    }

    PullToRefreshBox(
        isRefreshing = vm.isRefreshing,
        onRefresh = vm::refresh,
        modifier = Modifier.fillMaxSize(),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .padding(horizontal = 20.dp),
        ) {
            Spacer(Modifier.height(12.dp))
            when {
                bundle == null && vm.errorMessage != null ->
                    HomeErrorCard(vm.errorMessage!!, onRetry = vm::load)
                bundle == null -> HomeSkeleton()
                else -> {
                    val revealed = vm.hasRevealed
                    val (plain, accentName) = vm.greetingPair()

                    GreetingHeader(
                        plain = plain,
                        accentName = accentName,
                        tickerLines = vm.tickerLines(),
                        revealed = revealed,
                    )
                    Spacer(Modifier.height(28.dp))

                    Reveal(revealed, delayMs = 100) {
                        when {
                            vm.showsApprovalCallout -> VerificationCallout(
                                approvalStatus = bundle.profile.approvalStatus ?: "incomplete",
                                abnVerified = bundle.verification.abnVerified,
                                anyLicenceVerified = bundle.verification.anyLicenceVerified,
                            )
                            vm.showsFbaHero -> FbaHeroCard(fba = bundle.fba, revealed = revealed)
                            else -> InactiveFbaCard(reason = bundle.fba.reason)
                        }
                    }

                    if (bundle.myTenders.isNotEmpty()) {
                        Spacer(Modifier.height(28.dp))
                        Reveal(revealed, delayMs = 160) {
                            TenderPipelineLane(
                                tenders = bundle.myTenders,
                                onOpenProject = onOpenProject,
                            )
                        }
                    }

                    Spacer(Modifier.height(28.dp))
                    Reveal(revealed, delayMs = 200) {
                        PulseStrip(stats = bundle.stats, revealed = revealed)
                    }

                    if (bundle.unlocked.isNotEmpty()) {
                        Spacer(Modifier.height(28.dp))
                        Reveal(revealed, delayMs = 220) {
                            PickupLane(
                                unlocked = bundle.unlocked,
                                onOpenProject = onOpenProject,
                            )
                        }
                    }

                    Spacer(Modifier.height(28.dp))
                    SuggestedFeed(
                        vm = vm,
                        revealed = revealed,
                        onOpenProject = onOpenProject,
                    )

                    if (bundle.activity.isNotEmpty()) {
                        Spacer(Modifier.height(28.dp))
                        Reveal(revealed, delayMs = 360) {
                            ActivityTimeline(
                                items = bundle.activity.take(8),
                                onOpenProject = onOpenProject,
                            )
                        }
                    }

                    Spacer(Modifier.height(80.dp))
                }
            }
        }
    }
}

// ── suggested feed ("For you") ───────────────────────────────────────

@Composable
private fun SuggestedFeed(
    vm: BuilderHomeViewModel,
    revealed: Boolean,
    onOpenProject: (String) -> Unit,
) {
    val c = Bhq.colors
    val bundle = vm.bundle ?: return
    val suggested = bundle.suggested

    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            HomeSectionLabel("For you")
            if (vm.matchDelta > 0) {
                Spacer(Modifier.size(8.dp))
                Text(
                    "+${vm.matchDelta} NEW",
                    color = c.accentContrast,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(c.accent)
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                )
            }
            Spacer(Modifier.weight(1f))
            if (suggested.isNotEmpty()) {
                Text(
                    "${suggested.size} match${if (suggested.size == 1) "" else "es"}",
                    color = c.textDim,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.2.sp,
                )
            }
        }
        Spacer(Modifier.height(14.dp))

        if (suggested.isEmpty()) {
            Reveal(revealed, delayMs = 300) { EmptyFeedCard() }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                suggested.forEachIndexed { i, project ->
                    Reveal(revealed, delayMs = 300 + i * 50) {
                        ProjectFeedCard(
                            project = project,
                            fbaActive = bundle.fba.active,
                            onClick = { onOpenProject(project.slug) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyFeedCard() {
    val c = Bhq.colors
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(c.surface)
            .border(1.dp, c.blueprintLine.copy(alpha = 0.08f), RoundedCornerShape(20.dp))
            .padding(horizontal = 24.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Rounded.AutoAwesome,
            contentDescription = null,
            tint = c.accentLight,
            modifier = Modifier.size(28.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text("No matches yet", color = c.text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(
            "Owners post projects daily. The moment one matches your service area or category, it'll appear here.",
            color = c.textMuted,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
            lineHeight = 19.sp,
        )
    }
}

// ── error + skeleton ─────────────────────────────────────────────────

@Composable
private fun HomeErrorCard(message: String, onRetry: () -> Unit) {
    val c = Bhq.colors
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 80.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(c.surface)
            .border(1.dp, c.warning.copy(alpha = 0.25f), RoundedCornerShape(22.dp))
            .padding(horizontal = 24.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Rounded.WifiOff,
            contentDescription = null,
            tint = c.warning,
            modifier = Modifier.size(28.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            "Couldn't load your dashboard",
            color = c.text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            message,
            color = c.textMuted, fontSize = 13.sp,
            textAlign = TextAlign.Center, lineHeight = 19.sp,
        )
        Spacer(Modifier.height(18.dp))
        Text(
            "Try again",
            color = c.accentContrast,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clip(CircleShape)
                .background(c.accent)
                .pressable(onClick = onRetry)
                .padding(horizontal = 26.dp, vertical = 13.dp),
        )
    }
}

@Composable
private fun HomeSkeleton() {
    Column {
        SkeletonBox(Modifier.fillMaxWidth().height(120.dp), cornerRadius = 22.dp)
        Spacer(Modifier.height(24.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(180.dp), cornerRadius = 22.dp)
        Spacer(Modifier.height(24.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonBox(Modifier.weight(1f).height(96.dp), cornerRadius = 18.dp)
            SkeletonBox(Modifier.weight(1f).height(96.dp), cornerRadius = 18.dp)
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonBox(Modifier.weight(1f).height(96.dp), cornerRadius = 18.dp)
            SkeletonBox(Modifier.weight(1f).height(96.dp), cornerRadius = 18.dp)
        }
        Spacer(Modifier.height(24.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(280.dp), cornerRadius = 20.dp)
        Spacer(Modifier.height(14.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(280.dp), cornerRadius = 20.dp)
    }
}

// ── shared bits for the home package ─────────────────────────────────

/** UPPERCASE dim section label — "YOUR TENDERS", "THIS WEEK", … */
@Composable
internal fun HomeSectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        color = Bhq.colors.textDim,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 2.4.sp,
        modifier = modifier,
    )
}

/**
 * The one-shot reveal: fade + rise, delayed per section. Plays when
 * [revealed] flips true; sections mounted later (e.g. after a refresh
 * adds data) render settled.
 */
@Composable
internal fun Reveal(
    revealed: Boolean,
    delayMs: Int,
    content: @Composable () -> Unit,
) {
    val progress by animateFloatAsState(
        targetValue = if (revealed) 1f else 0f,
        animationSpec = tween(
            durationMillis = Motion.SLOW,
            delayMillis = delayMs,
            easing = Motion.EaseOutSoft,
        ),
        label = "reveal",
    )
    Box(
        Modifier.graphicsLayer {
            alpha = progress
            translationY = (1f - progress) * 18.dp.toPx()
        },
    ) {
        content()
    }
}
