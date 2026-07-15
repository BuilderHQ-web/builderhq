package au.com.builderhq.app.feature.owner

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material.icons.rounded.Search
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.OwnerRepository
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.ProjectCoverArt
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.StaggeredEntrance
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.brandDisplay
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.OwnerProjectRowDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class OwnerScope(val api: String?, val label: String) {
    ALL(null, "All"),
    DRAFTS("draft", "Drafts"),
    LIVE("published", "Live"),
    TENDERING("tendering", "Tendering"),
    AWARDED("awarded", "Awarded"),
}

data class OwnerProjectsUi(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<OwnerProjectRowDto> = emptyList(),
    val error: String? = null,
    val scope: OwnerScope = OwnerScope.ALL,
    val query: String = "",
)

@HiltViewModel
class OwnerProjectsViewModel @Inject constructor(
    private val repo: OwnerRepository,
) : ViewModel() {
    var ui by mutableStateOf(OwnerProjectsUi()); private set
    private var searchJob: Job? = null

    init { load() }

    fun setScope(s: OwnerScope) {
        if (s == ui.scope) return
        ui = ui.copy(scope = s, items = emptyList())
        load()
    }

    fun onQuery(q: String) {
        ui = ui.copy(query = q)
        searchJob?.cancel()
        searchJob = viewModelScope.launch { delay(400); fetch() }
    }

    fun refresh() { if (ui.refreshing || ui.loading) return; ui = ui.copy(refreshing = true, error = null); fetch() }
    private fun load() { ui = ui.copy(loading = true, error = null); fetch() }
    private fun fetch() {
        viewModelScope.launch {
            ui = when (val r = repo.myProjects(ui.scope.api, ui.query)) {
                is ApiResult.Success -> ui.copy(loading = false, refreshing = false, items = r.data.items, error = null)
                is ApiResult.Error -> ui.copy(loading = false, refreshing = false, error = r.message)
                is ApiResult.NetworkError -> ui.copy(loading = false, refreshing = false, error = "No connection. Check your internet and try again.")
            }
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun OwnerProjectsScreen(
    onOpenProject: (String) -> Unit,
    onCreateProject: () -> Unit,
    vm: OwnerProjectsViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Header(ui.query, vm::onQuery, ui.scope, vm::setScope)
            Crossfade(targetState = ui.loading, animationSpec = tween(320), modifier = Modifier.weight(1f).fillMaxWidth(), label = "ownerProjects") { loading ->
                if (loading) {
                    ProjectsSkeleton()
                } else {
                    androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                        isRefreshing = ui.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize(),
                    ) {
                        when {
                            ui.error != null && ui.items.isEmpty() -> ProjectsEmpty("Couldn't load", ui.error, "Try again", vm::refresh)
                            ui.items.isEmpty() -> EmptyForScope(ui.scope, ui.query, onCreateProject)
                            else -> LazyColumn(
                                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 6.dp, bottom = 110.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                itemsIndexed(ui.items, key = { _, p -> p.id }) { i, p ->
                                    StaggeredEntrance(index = i) {
                                        OwnerProjectCard(p, onClick = { onOpenProject(p.slug) })
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // Floating "New project" CTA
        Row(
            Modifier
                .align(Alignment.BottomEnd)
                .navigationBarsPadding()
                .padding(20.dp)
                .clip(RoundedCornerShape(50))
                .background(Bhq.colors.accent)
                .pressable(onClick = onCreateProject)
                .padding(horizontal = 18.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Add, contentDescription = null, tint = Bhq.colors.accentContrast, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("New project", color = Bhq.colors.accentContrast, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun Header(query: String, onQuery: (String) -> Unit, scope: OwnerScope, onScope: (OwnerScope) -> Unit) {
    Column(Modifier.statusBarsPadding().padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 8.dp)) {
        Kicker("Your portfolio")
        Spacer(Modifier.height(7.dp))
        Text(brandDisplay(Bhq.colors, "Your", "projects"), color = Bhq.colors.text, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(14.dp))
        SearchField(query, onQuery)
        Spacer(Modifier.height(12.dp))
        ScopePills(scope, onScope)
    }
}

@Composable
private fun SearchField(query: String, onQuery: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(44.dp).clip(RoundedCornerShape(50))
            .background(Bhq.colors.fillSubtle)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50))
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Search, contentDescription = null, tint = Bhq.colors.textDim, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (query.isEmpty()) Text("Search your projects", color = Bhq.colors.textDim, fontSize = 14.sp)
            BasicTextField(
                value = query, onValueChange = onQuery,
                singleLine = true,
                textStyle = TextStyle(color = Bhq.colors.text, fontSize = 14.sp),
                cursorBrush = SolidColor(Bhq.colors.accent),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (query.isNotEmpty()) {
            Icon(
                Icons.Rounded.Close, contentDescription = "Clear", tint = Bhq.colors.textDim,
                modifier = Modifier.size(18.dp).pressable { onQuery("") },
            )
        }
    }
}

@Composable
private fun ScopePills(scope: OwnerScope, onScope: (OwnerScope) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OwnerScope.entries.forEach { s ->
            val on = s == scope
            Box(
                Modifier.clip(RoundedCornerShape(50))
                    .background(if (on) Bhq.colors.accent else Bhq.colors.fillSubtle)
                    .border(1.dp, if (on) Color.Transparent else Bhq.colors.blueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50))
                    .pressable(onClick = { onScope(s) })
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Text(s.label, color = if (on) Bhq.colors.accentContrast else Bhq.colors.textMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun OwnerProjectCard(p: OwnerProjectRowDto, onClick: () -> Unit) {
    val live = isLive(p.status)
    CardSurface(Modifier.fillMaxWidth().pressable(onClick = onClick)) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp).clip(RoundedCornerShape(14.dp))) {
                ProjectCoverArt(seed = p.id, type = p.type, modifier = Modifier.fillMaxSize())
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(p.title.ifBlank { "Untitled project" }, color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(5.dp))
                Text(ProjectLabels.location(p.suburb, p.state).ifBlank { "Location not set" }, color = Bhq.colors.textMuted, fontSize = 12.sp)
                Spacer(Modifier.height(9.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusPill(p.status)
                    Spacer(Modifier.width(12.dp))
                    MetricChip(Icons.Rounded.Send, "${p.stats.tenderCount}", active = p.stats.tenderCount > 0)
                    Spacer(Modifier.width(12.dp))
                    MetricChip(Icons.Rounded.LockOpen, "${p.stats.unlockCount}", active = false)
                }
            }
        }
    }
}

// ── States ──────────────────────────────────────────────────────────

@Composable
private fun ProjectsSkeleton() {
    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(4) {
            CardSurface(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    SkeletonBox(Modifier.size(64.dp), cornerRadius = 14.dp)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        SkeletonBox(Modifier.fillMaxWidth(0.7f).height(16.dp))
                        Spacer(Modifier.height(8.dp))
                        SkeletonBox(Modifier.fillMaxWidth(0.4f).height(12.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyForScope(scope: OwnerScope, query: String, onCreate: () -> Unit) {
    val (title, body) = when {
        query.isNotBlank() -> "No matches" to "No projects match \"$query\"."
        scope == OwnerScope.ALL -> "No projects yet" to "Publish your first project and verified builders will start tendering."
        scope == OwnerScope.DRAFTS -> "No drafts" to "Drafts you start will appear here until you publish them."
        scope == OwnerScope.LIVE -> "Nothing live yet" to "Published projects show up here, open to builders."
        scope == OwnerScope.TENDERING -> "No tenders in progress" to "Projects receiving tenders will appear here."
        else -> "Nothing awarded yet" to "Once you award a builder, the project lands here."
    }
    ProjectsEmpty(title, body, if (scope == OwnerScope.ALL && query.isBlank()) "Publish a project" else null, onCreate)
}

@Composable
private fun ProjectsEmpty(title: String, body: String, cta: String?, onCta: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(
                Modifier.fillParentMaxSize().padding(36.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier.size(64.dp).clip(RoundedCornerShape(20.dp))
                        .background(Bhq.colors.accent.copy(alpha = 0.10f))
                        .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.18f), RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(26.dp))
                }
                Spacer(Modifier.height(18.dp))
                Text(title, color = Bhq.colors.text, fontSize = 19.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Text(body, color = Bhq.colors.textMuted, fontSize = 14.sp, lineHeight = 20.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                if (cta != null) {
                    Spacer(Modifier.height(22.dp))
                    PrimaryButton(cta, onClick = onCta, leadingIcon = Icons.Rounded.Add)
                }
            }
        }
    }
}
