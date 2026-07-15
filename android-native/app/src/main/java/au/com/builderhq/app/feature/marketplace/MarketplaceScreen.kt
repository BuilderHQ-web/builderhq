package au.com.builderhq.app.feature.marketplace

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.Workspaces
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.DashboardRepository
import au.com.builderhq.app.core.data.PrefsStore
import au.com.builderhq.app.core.data.ProjectsRepository
import au.com.builderhq.app.core.data.SnackController
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.GhostButton
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.SegmentedControl
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.StaggeredEntrance
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentContrast
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.design.theme.brandDisplay
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.FoundingAccessDto
import au.com.builderhq.app.core.network.dto.ProjectRowDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class Scope(val api: String, val label: String) {
    ALL("all", "Discover"),
    SAVED("saved", "Saved"),
    UNLOCKED("unlocked", "Unlocked"),
}

data class MktFilters(
    val type: String? = null,
    val budgets: Set<String> = emptySet(),
    val state: String? = null,
) {
    val activeCount: Int
        get() = (if (type != null) 1 else 0) + (if (budgets.isNotEmpty()) 1 else 0) + (if (state != null) 1 else 0)
}

data class MarketplaceUi(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val loadingMore: Boolean = false,
    val items: List<ProjectRowDto> = emptyList(),
    val hasMore: Boolean = false,
    val error: String? = null,
    val forbidden: Boolean = false,
    val scope: Scope = Scope.ALL,
    val allowance: FoundingAccessDto? = null,
    val showCoachmark: Boolean = false,
    val query: String = "",
    val filters: MktFilters = MktFilters(),
    val filterSheetOpen: Boolean = false,
)

private const val PAGE = 20

@HiltViewModel
class MarketplaceViewModel @Inject constructor(
    private val repo: ProjectsRepository,
    private val dashboard: DashboardRepository,
    private val prefs: PrefsStore,
    private val snack: SnackController,
) : ViewModel() {
    var ui by mutableStateOf(MarketplaceUi()); private set
    private var searchJob: Job? = null

    init {
        ui = ui.copy(showCoachmark = !prefs.coachmarkSeen())
        load()
        fetchAllowance()
    }

    private fun fetchAllowance() {
        viewModelScope.launch {
            val r = dashboard.builder()
            if (r is ApiResult.Success && r.data.fba.active) ui = ui.copy(allowance = r.data.fba)
        }
    }

    fun dismissCoachmark() { prefs.setCoachmarkSeen(); ui = ui.copy(showCoachmark = false) }

    fun setScope(s: Scope) {
        if (s == ui.scope) return
        ui = ui.copy(scope = s, items = emptyList())
        load()
    }

    fun onQuery(q: String) {
        ui = ui.copy(query = q)
        searchJob?.cancel()
        searchJob = viewModelScope.launch { delay(380); load() }
    }

    fun openFilters() { ui = ui.copy(filterSheetOpen = true) }
    fun closeFilters() { ui = ui.copy(filterSheetOpen = false) }
    fun applyFilters(f: MktFilters) { ui = ui.copy(filters = f, filterSheetOpen = false, items = emptyList()); load() }
    fun clearFilters() { ui = ui.copy(filters = MktFilters(), filterSheetOpen = false, items = emptyList()); load() }

    /** Pull-to-refresh: reloads page 0, keeping the list visible. */
    fun refresh() {
        if (ui.refreshing || ui.loading) return
        ui = ui.copy(refreshing = true, error = null)
        fetch(append = false)
    }

    /** Infinite scroll — fetch the next page and append. */
    fun loadMore() {
        if (ui.loadingMore || ui.loading || ui.refreshing || !ui.hasMore) return
        ui = ui.copy(loadingMore = true)
        fetch(append = true)
    }

    private fun load() { ui = ui.copy(loading = true, error = null, forbidden = false); fetch(append = false) }

    private fun fetch(append: Boolean) {
        val offset = if (append) ui.items.size else 0
        val f = ui.filters
        viewModelScope.launch {
            val r = repo.browse(
                scope = ui.scope.api,
                q = ui.query,
                type = f.type,
                state = f.state,
                budgets = f.budgets.takeIf { it.isNotEmpty() }?.joinToString(","),
                limit = PAGE,
                offset = offset,
            )
            ui = when (r) {
                is ApiResult.Success -> ui.copy(
                    loading = false, refreshing = false, loadingMore = false,
                    items = if (append) ui.items + r.data.items else r.data.items,
                    hasMore = r.data.hasMore, error = null, forbidden = false,
                )
                is ApiResult.Error -> if (r.httpStatus == 403) {
                    ui.copy(loading = false, refreshing = false, loadingMore = false, forbidden = true, items = emptyList())
                } else {
                    if (ui.items.isNotEmpty()) snack.error(r.message, "Retry") { refresh() }
                    ui.copy(loading = false, refreshing = false, loadingMore = false, error = r.message)
                }
                is ApiResult.NetworkError -> {
                    if (ui.items.isNotEmpty()) snack.error("No connection.", "Retry") { refresh() }
                    ui.copy(loading = false, refreshing = false, loadingMore = false, error = "No connection. Check your internet and try again.")
                }
            }
        }
    }

    /** Optimistic save toggle — flips locally, reverts if the call fails. */
    fun toggleSave(p: ProjectRowDto) {
        val target = !p.isSaved
        ui = ui.copy(items = ui.items.map { if (it.id == p.id) it.copy(isSaved = target) else it })
        viewModelScope.launch {
            val r = repo.setSaved(p.slug, target)
            if (r !is ApiResult.Success) {
                ui = ui.copy(items = ui.items.map { if (it.id == p.id) it.copy(isSaved = !target) else it })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketplaceScreen(
    onOpenProject: (String) -> Unit,
    vm: MarketplaceViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    Box(Modifier.fillMaxSize()) {
      Column(Modifier.fillMaxSize()) {
        MarketplaceHeader(ui, vm)
        Crossfade(
            targetState = ui.loading,
            animationSpec = tween(Motion.BASE),
            modifier = Modifier.weight(1f).fillMaxWidth(),
            label = "marketplaceBody",
        ) { loading ->
            if (loading) {
                LoadingList()
            } else {
                PullToRefreshBox(
                    isRefreshing = ui.refreshing,
                    onRefresh = vm::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    when {
                        ui.forbidden -> StateView(
                            Icons.Rounded.Workspaces, "The marketplace is for builders",
                            "Your projects dashboard is coming soon.",
                        )
                        ui.error != null && ui.items.isEmpty() -> StateView(
                            Icons.Rounded.SearchOff, "Couldn't load projects", ui.error,
                            actionLabel = "Try again", onAction = vm::refresh,
                        )
                        ui.items.isEmpty() -> StateView(
                            if (ui.scope == Scope.SAVED) Icons.Rounded.Bookmark else Icons.Rounded.SearchOff,
                            emptyTitle(ui), emptySubtitle(ui),
                        )
                        else -> ProjectList(ui, vm, onOpenProject)
                    }
                }
            }
        }
      }
      // Only over a usable marketplace — never over the owner-forbidden or error state.
      if (ui.showCoachmark && !ui.loading && !ui.forbidden && ui.error == null) {
          HowItWorksCoach(onDismiss = vm::dismissCoachmark)
      }
      if (ui.filterSheetOpen) {
          FilterSheet(ui.filters, onApply = vm::applyFilters, onClear = vm::clearFilters, onDismiss = vm::closeFilters)
      }
    }
}

@Composable
private fun ProjectList(ui: MarketplaceUi, vm: MarketplaceViewModel, onOpenProject: (String) -> Unit) {
    val listState = rememberLazyListState()
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
            .collect { last -> if (last >= vm.ui.items.size - 3) vm.loadMore() }
    }
    LazyColumn(
        state = listState,
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        itemsIndexed(ui.items, key = { _, p -> p.id }) { i, p ->
            StaggeredEntrance(index = i) {
                ProjectCard(project = p, onClick = { onOpenProject(p.slug) }, onToggleSave = { vm.toggleSave(p) })
            }
        }
        if (ui.loadingMore) {
            item {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(22.dp), color = AccentLight, strokeWidth = 2.dp)
                }
            }
        }
    }
}

@Composable
private fun MarketplaceHeader(ui: MarketplaceUi, vm: MarketplaceViewModel) {
    Column(
        Modifier
            .statusBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 10.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Kicker("The marketplace")
                Spacer(Modifier.height(7.dp))
                Text(brandDisplay("Find your next", "build"), color = TextPrimary, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
            }
            Box(
                Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color(0x14FFFFFF))
                    .border(1.dp, BlueprintLine.copy(alpha = 0.14f), RoundedCornerShape(50))
                    .clickable(remember { MutableInteractionSource() }, indication = null, onClick = vm::refresh),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Refresh, contentDescription = "Refresh", tint = AccentLight, modifier = Modifier.size(20.dp))
            }
        }
        if (ui.allowance != null) {
            Spacer(Modifier.height(12.dp))
            FoundingChip(ui.allowance)
        }
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            SearchField(ui.query, vm::onQuery, Modifier.weight(1f))
            Spacer(Modifier.width(10.dp))
            FilterButton(ui.filters.activeCount, vm::openFilters)
        }
        Spacer(Modifier.height(12.dp))
        SegmentedControl(
            options = Scope.entries.map { it.label },
            selectedIndex = ui.scope.ordinal,
            onSelect = { vm.setScope(Scope.entries[it]) },
        )
    }
}

@Composable
private fun SearchField(query: String, onQuery: (String) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier.height(44.dp).clip(RoundedCornerShape(50)).background(Color(0x14FFFFFF))
            .border(1.dp, BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50)).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Search, contentDescription = null, tint = TextDim, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (query.isEmpty()) Text("Search projects", color = TextDim, fontSize = 14.sp)
            BasicTextField(
                value = query, onValueChange = onQuery, singleLine = true,
                textStyle = TextStyle(color = TextPrimary, fontSize = 14.sp),
                cursorBrush = SolidColor(Accent), modifier = Modifier.fillMaxWidth(),
            )
        }
        if (query.isNotEmpty()) {
            Icon(
                Icons.Rounded.Close, contentDescription = "Clear", tint = TextDim,
                modifier = Modifier.size(18.dp).clickable(remember { MutableInteractionSource() }, indication = null) { onQuery("") },
            )
        }
    }
}

@Composable
private fun FilterButton(activeCount: Int, onClick: () -> Unit) {
    Box {
        Box(
            Modifier.size(44.dp).clip(RoundedCornerShape(50))
                .background(if (activeCount > 0) Accent.copy(alpha = 0.14f) else Color(0x14FFFFFF))
                .border(1.dp, if (activeCount > 0) Accent.copy(alpha = 0.4f) else BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50))
                .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Tune, contentDescription = "Filters", tint = if (activeCount > 0) AccentLight else TextMuted, modifier = Modifier.size(20.dp))
        }
        if (activeCount > 0) {
            Box(
                Modifier.align(Alignment.TopEnd).size(18.dp).clip(CircleShape).background(Accent)
                    .border(2.dp, Color(0xFF06080F), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("$activeCount", color = AccentContrast, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun FoundingChip(fba: FoundingAccessDto) {
    Row(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(Accent.copy(alpha = 0.10f))
            .border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(50))
            .padding(horizontal = 11.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Bolt, contentDescription = null, tint = AccentLight, modifier = Modifier.size(13.dp))
        Spacer(Modifier.width(6.dp))
        Text(
            "${fba.remainingThisCycle} of ${fba.monthlyQuota} free unlocks this cycle",
            color = AccentLight, fontSize = 11.sp, fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun LoadingList() {
    Column(
        Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        repeat(3) {
            CardSurface(Modifier.fillMaxWidth()) {
                Column {
                    SkeletonBox(Modifier.fillMaxWidth().height(150.dp), cornerRadius = 0.dp)
                    Column(Modifier.padding(16.dp)) {
                        SkeletonBox(Modifier.fillMaxWidth(0.7f).height(18.dp))
                        Spacer(Modifier.height(10.dp))
                        SkeletonBox(Modifier.fillMaxWidth(0.4f).height(14.dp))
                    }
                }
            }
        }
    }
}

/** Centred empty/error/forbidden state. Wrapped in a LazyColumn so it still
 *  participates in nested scroll — i.e. pull-to-refresh works on empty too. */
@Composable
private fun StateView(
    icon: ImageVector,
    title: String,
    subtitle: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(
                Modifier.fillParentMaxSize().padding(36.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier
                        .size(66.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Accent.copy(alpha = 0.10f))
                        .border(1.dp, BlueprintLine.copy(alpha = 0.18f), RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = AccentLight, modifier = Modifier.size(28.dp))
                }
                Spacer(Modifier.height(18.dp))
                Text(title, color = TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                Spacer(Modifier.height(8.dp))
                Text(subtitle, color = TextMuted, fontSize = 14.sp, lineHeight = 20.sp, textAlign = TextAlign.Center)
                if (actionLabel != null && onAction != null) {
                    Spacer(Modifier.height(22.dp))
                    PrimaryButton(actionLabel, onClick = onAction)
                }
            }
        }
    }
}

private fun emptyTitle(ui: MarketplaceUi): String = when {
    ui.query.isNotBlank() || ui.filters.activeCount > 0 -> "No matches"
    ui.scope == Scope.SAVED -> "Nothing saved yet"
    ui.scope == Scope.UNLOCKED -> "No unlocks yet"
    else -> "No live projects yet"
}

private fun emptySubtitle(ui: MarketplaceUi): String = when {
    ui.query.isNotBlank() || ui.filters.activeCount > 0 -> "Try a different search, or clear your filters."
    ui.scope == Scope.SAVED -> "Tap the heart on any project to keep it here for later."
    ui.scope == Scope.UNLOCKED -> "Unlock a project to see the plans, address, and owner — and start tendering."
    else -> "New projects appear here the moment owners publish. Pull to refresh."
}

// ── Filter sheet ────────────────────────────────────────────────────

private val FILTER_TYPES = listOf(
    "single_dwelling" to "New home", "multi_dwelling" to "Multi-dwelling",
    "renovation" to "Renovation", "extension" to "Extension",
)
private val FILTER_BUDGETS = listOf("under_500k", "500k_1m", "1m_1_5m", "1_5m_2m", "2m_3m", "3m_5m", "over_5m")
private val FILTER_STATES = listOf("ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun FilterSheet(current: MktFilters, onApply: (MktFilters) -> Unit, onClear: () -> Unit, onDismiss: () -> Unit) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var type by remember { mutableStateOf(current.type) }
    var budgets by remember { mutableStateOf(current.budgets) }
    var state by remember { mutableStateOf(current.state) }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, containerColor = Color(0xFF0C1320)) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 24.dp, end = 24.dp, bottom = 28.dp),
        ) {
            Kicker("Filters")
            Spacer(Modifier.height(20.dp))
            FilterLabel("Project type")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FILTER_TYPES.forEach { (v, l) -> Choice(l, type == v) { type = if (type == v) null else v } }
            }
            Spacer(Modifier.height(20.dp))
            FilterLabel("Budget")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FILTER_BUDGETS.forEach { v -> Choice(ProjectLabels.budget(v) ?: v, v in budgets) { budgets = if (v in budgets) budgets - v else budgets + v } }
            }
            Spacer(Modifier.height(20.dp))
            FilterLabel("State")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FILTER_STATES.forEach { v -> Choice(v, state == v) { state = if (state == v) null else v } }
            }
            Spacer(Modifier.height(26.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                GhostButton("Clear all", onClick = onClear)
                PrimaryButton("Show results", onClick = { onApply(MktFilters(type, budgets, state)) }, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun FilterLabel(text: String) {
    Text(text.uppercase(), color = TextDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
    Spacer(Modifier.height(10.dp))
}

@Composable
private fun Choice(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) Accent.copy(alpha = 0.16f) else Color(0x14FFFFFF))
            .border(1.dp, if (selected) Accent.copy(alpha = 0.5f) else BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50))
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
    ) {
        Text(label, color = if (selected) AccentLight else TextMuted, fontSize = 13.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium)
    }
}

// ── How-it-works coachmark (first browse only) ──────────────────────

@Composable
private fun HowItWorksCoach(onDismiss: () -> Unit) {
    val haptics = rememberHaptics()
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true; haptics.tick() }
    Box(
        Modifier
            .fillMaxSize()
            .background(Color(0xCC03070D))
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedVisibility(
            visible = shown,
            enter = slideInVertically(tween(Motion.SLOW, easing = Motion.EaseOutSoft)) { it / 2 } +
                fadeIn(tween(Motion.BASE)),
        ) {
            CardSurface(
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    // Absorb taps so tapping the card doesn't dismiss via the scrim.
                    .clickable(remember { MutableInteractionSource() }, indication = null) {},
            ) {
                Column(Modifier.padding(22.dp)) {
                    Kicker("How BuilderHQ works")
                    Spacer(Modifier.height(14.dp))
                    Text("Three steps to your next build", color = TextPrimary, fontSize = 21.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(20.dp))
                    CoachStep(1, Icons.Rounded.Bolt, "Browse live projects", "Filter to the work that fits your trade.")
                    Spacer(Modifier.height(16.dp))
                    CoachStep(2, Icons.Rounded.Lock, "Unlock the details", "Reveal the plans, address, and owner.")
                    Spacer(Modifier.height(16.dp))
                    CoachStep(3, Icons.Rounded.CheckCircle, "Tender to win", "Submit an itemised quote in minutes.")
                    Spacer(Modifier.height(24.dp))
                    PrimaryButton("Got it", onClick = onDismiss, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun CoachStep(n: Int, icon: ImageVector, title: String, body: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(13.dp))
                .background(Accent.copy(alpha = 0.12f))
                .border(1.dp, Accent.copy(alpha = 0.30f), RoundedCornerShape(13.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = AccentLight, modifier = Modifier.size(19.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(2.dp))
            Text(body, color = TextMuted, fontSize = 13.sp, lineHeight = 18.sp)
        }
        Text("$n", color = TextDim, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}
