package au.com.builderhq.app.feature.shell

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.model.Role
import au.com.builderhq.app.feature.home.BuilderHomeScreen
import au.com.builderhq.app.feature.marketplace.MarketplaceScreen
import au.com.builderhq.app.feature.messaging.InboxScreen
import au.com.builderhq.app.feature.owner.OwnerDashboardScreen
import au.com.builderhq.app.feature.owner.OwnerProjectsScreen
import au.com.builderhq.app.feature.profile.ProfileScreen
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.MessagingCenter
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ShellViewModel @Inject constructor(
    private val center: MessagingCenter,
) : ViewModel() {
    val unread: StateFlow<Int> = center.totalUnread
    fun refreshUnread() { viewModelScope.launch { center.refresh() } }
}

private data class Tab(val label: String, val icon: ImageVector)

/**
 * Owner:   Home (dashboard) · Projects (mine) · Inbox · You
 * Builder: Home (dashboard) · Browse (marketplace) · Inbox · You
 * Mirrors the iOS tab shell — the builder's second tab is discovery,
 * their tenders/projects live on the Home pipeline.
 */
private fun tabsFor(owner: Boolean) = listOf(
    Tab("Home", Icons.Rounded.GridView),
    Tab(if (owner) "Projects" else "Browse", Icons.Rounded.Explore),
    Tab("Inbox", Icons.Rounded.ChatBubbleOutline),
    Tab("You", Icons.Rounded.Person),
)

@Composable
fun MainScaffold(
    role: Role,
    onOpenProject: (String) -> Unit,
    onOpenConversation: (String) -> Unit,
    onCreateProject: () -> Unit,
    vm: ShellViewModel = hiltViewModel(),
) {
    val owner = role == Role.OWNER
    var selected by rememberSaveable { mutableIntStateOf(0) }
    val haptics = rememberHaptics()
    val unread by vm.unread.collectAsStateWithLifecycle()

    // Heartbeat: keep the Inbox tab badge live while the app is foregrounded.
    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                vm.refreshUnread()
                delay(20_000)
            }
        }
    }

    AmbientBackground {
        Column(Modifier.fillMaxSize()) {
            AnimatedContent(
                targetState = selected,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                transitionSpec = {
                    val dir = if (targetState > initialState) 1 else -1
                    (slideInHorizontally(tween(Motion.BASE, easing = Motion.EaseOut)) { dir * it / 8 } +
                        fadeIn(tween(Motion.BASE))).togetherWith(fadeOut(tween(Motion.FAST)))
                },
                label = "tab",
            ) { tab ->
                when (tab) {
                    0 -> if (owner) OwnerDashboardScreen(onOpenProject = onOpenProject, onCreateProject = onCreateProject)
                         else BuilderHomeScreen(onOpenProject = onOpenProject)
                    1 -> if (owner) OwnerProjectsScreen(onOpenProject = onOpenProject, onCreateProject = onCreateProject)
                         else MarketplaceScreen(onOpenProject = onOpenProject)
                    2 -> InboxScreen(onOpenConversation = onOpenConversation)
                    else -> ProfileScreen()
                }
            }
            BottomBar(tabsFor(owner), selected, unread) { if (it != selected) haptics.tick(); selected = it }
        }
    }
}

@Composable
private fun BottomBar(tabs: List<Tab>, selected: Int, unread: Int, onSelect: (Int) -> Unit) {
    val c = Bhq.colors
    Box(Modifier.fillMaxWidth()) {
        // blueprint top hairline
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .height(1.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(Color.Transparent, c.blueprintLine.copy(alpha = 0.22f), Color.Transparent),
                    ),
                ),
        )
        Column(
            Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(c.scrimStrong, c.scrimHeavy)))
                .navigationBarsPadding()
                .padding(top = 9.dp, bottom = 5.dp),
        ) {
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                val tabW = maxWidth / tabs.size
                val pillW = 50.dp
                // A single pill that glides to the active tab.
                val pillX by animateDpAsState(
                    targetValue = tabW * selected + (tabW - pillW) / 2,
                    animationSpec = spring(dampingRatio = 0.78f, stiffness = 320f),
                    label = "navPill",
                )
                Box(
                    Modifier
                        .offset(x = pillX, y = 2.dp)
                        .width(pillW)
                        .height(32.dp)
                        .clip(RoundedCornerShape(50))
                        .background(c.accent.copy(alpha = 0.12f)),
                )
                Row(Modifier.fillMaxWidth()) {
                    tabs.forEachIndexed { i, tab ->
                        BarTab(tab.label, tab.icon, i == selected, badge = if (i == 2) unread else 0) { onSelect(i) }
                    }
                }
            }
        }
    }
}

@Composable
private fun RowScope.BarTab(
    label: String,
    icon: ImageVector,
    active: Boolean,
    badge: Int,
    onClick: () -> Unit,
) {
    val c = Bhq.colors
    val color by animateColorAsState(if (active) c.accentLight else c.textDim, label = "tab")
    val scale by animateFloatAsState(if (active) 1.12f else 1f, spring(dampingRatio = 0.5f, stiffness = 520f), label = "tabScale")
    Column(
        Modifier
            .weight(1f)
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                icon, contentDescription = label, tint = color,
                modifier = Modifier.size(22.dp).graphicsLayer { scaleX = scale; scaleY = scale },
            )
            if (badge > 0) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 9.dp, y = (-7).dp)
                        .defaultMinSize(minWidth = 16.dp)
                        .height(16.dp)
                        .clip(CircleShape)
                        .background(c.accent)
                        .padding(horizontal = 4.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (badge > 9) "9+" else "$badge",
                        color = c.accentContrast, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            label,
            color = color,
            fontSize = 10.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
        )
    }
}
