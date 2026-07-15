package au.com.builderhq.app.feature.owner

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.OwnerRepository
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.data.SessionState
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.ProjectCoverArt
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.StaggeredEntrance
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.DisplaySerif
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.OwnerDashboardDto
import au.com.builderhq.app.core.network.dto.OwnerProjectRowDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.TextStyle
import java.util.Locale
import javax.inject.Inject

data class OwnerDashboardUi(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val data: OwnerDashboardDto? = null,
    val error: String? = null,
)

@HiltViewModel
class OwnerDashboardViewModel @Inject constructor(
    private val repo: OwnerRepository,
    session: SessionRepository,
) : ViewModel() {
    val firstName: String =
        (session.state.value as? SessionState.SignedIn)?.user?.name
            ?.trim()?.split(" ")?.firstOrNull()?.ifBlank { null } ?: "there"

    var ui by mutableStateOf(OwnerDashboardUi()); private set

    init { load() }

    fun refresh() { if (ui.refreshing || ui.loading) return; ui = ui.copy(refreshing = true, error = null); fetch() }
    private fun load() { ui = ui.copy(loading = true, error = null); fetch() }
    private fun fetch() {
        viewModelScope.launch {
            ui = when (val r = repo.dashboard()) {
                is ApiResult.Success -> ui.copy(loading = false, refreshing = false, data = r.data, error = null)
                is ApiResult.Error -> ui.copy(loading = false, refreshing = false, error = r.message)
                is ApiResult.NetworkError -> ui.copy(loading = false, refreshing = false, error = "No connection. Check your internet and try again.")
            }
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun OwnerDashboardScreen(
    onOpenProject: (String) -> Unit,
    onCreateProject: () -> Unit,
    vm: OwnerDashboardViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    androidx.compose.animation.Crossfade(targetState = ui.loading, animationSpec = tween(320), label = "ownerDash") { loading ->
        if (loading) {
            DashSkeleton()
        } else if (ui.data == null) {
            DashError(ui.error ?: "Couldn't load your dashboard.", vm::refresh)
        } else {
            androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                isRefreshing = ui.refreshing,
                onRefresh = vm::refresh,
                modifier = Modifier.fillMaxSize(),
            ) {
                val data = ui.data!!
                val live = data.projects.filter { isLive(it.status) }
                val drafts = data.projects.filter { it.status == "draft" }
                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 36.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp),
                ) {
                    item { GreetingHeader(vm.firstName, data) }
                    item {
                        if (data.projects.isEmpty()) EmptyHero(onCreateProject)
                        else PortfolioHero(data, onCreateProject)
                    }
                    item { PulseStrip(data) }
                    if (live.isNotEmpty()) {
                        item { SectionLabel("Live projects", live.size) }
                        items(live, key = { it.id }) { p ->
                            StaggeredEntrance(index = 0) {
                                OwnerRaceCard(p, onClick = { onOpenProject(p.slug) })
                            }
                        }
                    }
                    if (drafts.isNotEmpty()) {
                        item { SectionLabel("Drafts", drafts.size) }
                        items(drafts, key = { it.id }) { p ->
                            DraftRow(p, onClick = { onOpenProject(p.slug) })
                        }
                    }
                    if (data.activity.isNotEmpty()) {
                        item { SectionLabel("Activity", data.activity.size) }
                        items(data.activity.take(8), key = { it.id }) { a ->
                            ActivityRow(a.title, a.body, a.createdAt)
                        }
                    }
                }
            }
        }
    }
}

// ── Greeting ────────────────────────────────────────────────────────

@Composable
private fun GreetingHeader(firstName: String, data: OwnerDashboardDto) {
    val hour = LocalTime.now().hour
    val part = when {
        hour < 12 -> "Good morning,"
        hour < 17 -> "Good afternoon,"
        else -> "Good evening,"
    }
    val weekday = LocalDate.now().dayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH).uppercase()
    val month = LocalDate.now().month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH).uppercase()
    val day = LocalDate.now().dayOfMonth
    Column(Modifier.statusBarsPadding().padding(top = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(6.dp).clip(CircleShape).background(Bhq.colors.accent))
            Spacer(Modifier.width(8.dp))
            Text("$weekday · $month $day", color = Bhq.colors.accent, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.sp)
        }
        Spacer(Modifier.height(10.dp))
        Text(part, color = Bhq.colors.textMuted, fontSize = 22.sp, fontWeight = FontWeight.Medium)
        Text("$firstName.", color = Bhq.colors.accentLight, fontSize = 38.sp, lineHeight = 42.sp, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)
        Spacer(Modifier.height(10.dp))
        Ticker(data)
    }
}

@Composable
private fun Ticker(data: OwnerDashboardDto) {
    val lines = buildList {
        if (data.stats.totalTenders > 0) add("${data.stats.totalTenders} tender${if (data.stats.totalTenders == 1) "" else "s"} waiting on your call.")
        if (data.stats.unreadMessages > 0) add("${data.stats.unreadMessages} unread message${if (data.stats.unreadMessages == 1) "" else "s"}.")
        if (data.stats.activeProjects > 0) add("${data.stats.activeProjects} project${if (data.stats.activeProjects == 1) "" else "s"} live in the marketplace.")
        if (data.stats.draftProjects > 0) add("${data.stats.draftProjects} draft${if (data.stats.draftProjects == 1) "" else "s"} ready to finish.")
        if (isEmpty()) add("Your build journey starts here.")
    }
    var i by remember { mutableStateOf(0) }
    androidx.compose.runtime.LaunchedEffect(lines.size) {
        if (lines.size <= 1) return@LaunchedEffect
        while (true) { kotlinx.coroutines.delay(3500); i = (i + 1) % lines.size }
    }
    AnimatedContent(
        targetState = i.coerceIn(0, lines.lastIndex),
        transitionSpec = { (fadeIn(tween(400)) + androidx.compose.animation.slideInVertically { it / 2 }) togetherWith (fadeOut(tween(250)) + androidx.compose.animation.slideOutVertically { -it / 2 }) },
        label = "ticker",
    ) { idx ->
        Text(lines[idx], color = Bhq.colors.textDim, fontSize = 14.sp)
    }
}

// ── Hero ────────────────────────────────────────────────────────────

@Composable
private fun EmptyHero(onCreate: () -> Unit) {
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(24.dp)) {
            Kicker("Get started")
            Spacer(Modifier.height(14.dp))
            Text("Publish your", color = Bhq.colors.text, fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold)
            Text("first project.", color = Bhq.colors.accentLight, fontSize = 34.sp, lineHeight = 38.sp, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)
            Spacer(Modifier.height(12.dp))
            Text(
                "Upload your plans, set your details, and verified builders will start tendering — usually within days.",
                color = Bhq.colors.textMuted, fontSize = 15.sp, lineHeight = 22.sp,
            )
            Spacer(Modifier.height(20.dp))
            PrimaryButton("Publish a project", onClick = onCreate, leadingIcon = Icons.Rounded.Add, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun PortfolioHero(data: OwnerDashboardDto, onCreate: () -> Unit) {
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(24.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Kicker("Your portfolio")
                Row(
                    Modifier.clip(RoundedCornerShape(50)).background(Bhq.colors.accent.copy(alpha = 0.12f))
                        .border(1.dp, Bhq.colors.accent.copy(alpha = 0.4f), RoundedCornerShape(50))
                        .pressable(onClick = onCreate).padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("New", color = Bhq.colors.accentLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(Modifier.height(18.dp))
            AnimatedCount(data.stats.totalTenders, color = Bhq.colors.accentLight, fontSize = 56.sp)
            Text("tenders received", color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.Medium)
            val active = data.stats.activeProjects
            Text(
                "across $active active project${if (active == 1) "" else "s"}",
                color = Bhq.colors.textMuted, fontSize = 13.sp,
            )
        }
    }
}

// ── Pulse strip ─────────────────────────────────────────────────────

@Composable
private fun PulseStrip(data: OwnerDashboardDto) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            PulseTile("Active", data.stats.activeProjects, Icons.Rounded.Explore, Modifier.weight(1f))
            PulseTile("Drafts", data.stats.draftProjects, Icons.Rounded.Description, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            PulseTile("Tenders", data.stats.totalTenders, Icons.Rounded.Send, Modifier.weight(1f))
            PulseTile("Messages", data.stats.unreadMessages, Icons.Rounded.ChatBubbleOutline, Modifier.weight(1f))
        }
    }
}

@Composable
private fun PulseTile(label: String, value: Int, icon: ImageVector, modifier: Modifier = Modifier) {
    val active = value > 0
    Box(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (active) Bhq.colors.accent.copy(alpha = 0.08f) else Bhq.colors.surfaceElev)
            .border(1.dp, if (active) Bhq.colors.accent.copy(alpha = 0.22f) else Bhq.colors.blueprintLine.copy(alpha = 0.10f), RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Column {
            Box(
                Modifier.size(30.dp).clip(RoundedCornerShape(9.dp))
                    .background(if (active) Bhq.colors.accent.copy(alpha = 0.16f) else Bhq.colors.fillFaint),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = if (active) Bhq.colors.accentLight else Bhq.colors.textDim, modifier = Modifier.size(16.dp))
            }
            Spacer(Modifier.height(12.dp))
            AnimatedCount(value, color = if (active) Bhq.colors.text else Bhq.colors.textMuted, fontSize = 26.sp)
            Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        }
    }
}

// ── Race card (live project) ────────────────────────────────────────

@Composable
private fun OwnerRaceCard(p: OwnerProjectRowDto, onClick: () -> Unit) {
    val tenders = p.stats.tenderCount
    val hot = tenders > 0
    CardSurface(Modifier.fillMaxWidth().pressable(onClick = onClick)) {
        Column(Modifier.padding(18.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                au.com.builderhq.app.core.design.components.Pill(ProjectLabels.type(p.type), accent = true)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusPill(p.status)
                    Spacer(Modifier.width(8.dp))
                    Text(ageLabel(p.publishedAt ?: p.createdAt), color = Bhq.colors.textDim, fontSize = 11.sp)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(p.title, color = Bhq.colors.text, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(14.dp))
            UnlockRace(p.stats.unlockCount, cap = 3)
            Spacer(Modifier.height(8.dp))
            Text(
                if (p.stats.unlockCount == 0) "No builders unlocked yet" else "${p.stats.unlockCount} of 3 builders unlocked",
                color = Bhq.colors.textMuted, fontSize = 12.sp,
            )
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(Bhq.colors.blueprintLine.copy(alpha = 0.10f)))
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text("$tenders", color = if (hot) Bhq.colors.accentLight else Bhq.colors.textMuted, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(6.dp))
                    Text("tender${if (tenders == 1) "" else "s"}", color = Bhq.colors.textMuted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 3.dp))
                }
                ReviewPill(hot)
            }
        }
    }
}

@Composable
private fun UnlockRace(filled: Int, cap: Int) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(cap) { i ->
            Box(
                Modifier.weight(1f).height(7.dp).clip(RoundedCornerShape(50))
                    .background(
                        if (i < filled) Brush.horizontalGradient(listOf(Bhq.colors.accentLight, Bhq.colors.accent))
                        else Brush.horizontalGradient(listOf(Bhq.colors.surfaceElev, Bhq.colors.surfaceElev)),
                    ),
            )
        }
    }
}

@Composable
private fun ReviewPill(hot: Boolean) {
    Box(
        Modifier.clip(RoundedCornerShape(50))
            .background(if (hot) Bhq.colors.accent else Color.White.copy(alpha = 0.06f))
            .padding(horizontal = 16.dp, vertical = 9.dp),
    ) {
        Text(
            if (hot) "Review" else "View",
            color = if (hot) Bhq.colors.accentContrast else Bhq.colors.textMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
        )
    }
}

// ── Draft / activity rows ───────────────────────────────────────────

@Composable
private fun DraftRow(p: OwnerProjectRowDto, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Bhq.colors.surfaceElev)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.10f), RoundedCornerShape(16.dp))
            .pressable(onClick = onClick).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp))) {
            ProjectCoverArt(seed = p.id, type = p.type, modifier = Modifier.fillMaxSize())
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(p.title.ifBlank { "Untitled project" }, color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(4.dp))
            Text(ProjectLabels.location(p.suburb, p.state).ifBlank { "Location not set" }, color = Bhq.colors.textMuted, fontSize = 12.sp)
        }
        Spacer(Modifier.width(10.dp))
        StatusPill(p.status)
    }
}

@Composable
private fun ActivityRow(title: String, body: String?, createdAt: String?) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.padding(top = 5.dp).size(7.dp).clip(CircleShape).background(Bhq.colors.accent.copy(alpha = 0.7f)))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Bhq.colors.text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
            if (!body.isNullOrBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(body, color = Bhq.colors.textMuted, fontSize = 13.sp, lineHeight = 18.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            daysSince(createdAt)?.let {
                Spacer(Modifier.height(3.dp))
                Text(if (it == 0) "Today" else "${it}d ago", color = Bhq.colors.textDim, fontSize = 11.sp)
            }
        }
    }
}

// ── Section label / states ──────────────────────────────────────────

@Composable
private fun SectionLabel(text: String, count: Int) {
    Row(Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Kicker(text)
        Spacer(Modifier.width(8.dp))
        Text("$count", color = Bhq.colors.textDim, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun DashSkeleton() {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(8.dp))
        SkeletonBox(Modifier.fillMaxWidth(0.5f).height(20.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(170.dp), cornerRadius = 18.dp)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SkeletonBox(Modifier.weight(1f).height(96.dp), cornerRadius = 16.dp)
            SkeletonBox(Modifier.weight(1f).height(96.dp), cornerRadius = 16.dp)
        }
        SkeletonBox(Modifier.fillMaxWidth().height(150.dp), cornerRadius = 18.dp)
    }
}

@Composable
private fun DashError(message: String, onRetry: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Couldn't load your dashboard", color = Bhq.colors.text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        Text(message, color = Bhq.colors.textMuted, fontSize = 14.sp)
        Spacer(Modifier.height(20.dp))
        PrimaryButton("Try again", onClick = onRetry)
    }
}
