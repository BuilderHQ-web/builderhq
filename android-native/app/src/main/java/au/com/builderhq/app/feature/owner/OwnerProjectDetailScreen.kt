package au.com.builderhq.app.feature.owner

import android.content.Intent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.IosShare
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.OwnerRepository
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.OwnerProjectDetailDto
import au.com.builderhq.app.core.network.dto.ProjectDocumentDto
import au.com.builderhq.app.core.network.dto.ProjectFieldsDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OwnerDetailUi(
    val loading: Boolean = true,
    val detail: OwnerProjectDetailDto? = null,
    val error: String? = null,
    val notFound: Boolean = false,
    val deleting: Boolean = false,
    val deleteError: String? = null,
)

@HiltViewModel
class OwnerProjectDetailViewModel @Inject constructor(
    private val repo: OwnerRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val slug: String = savedState.get<String>("slug").orEmpty()
    var ui by mutableStateOf(OwnerDetailUi()); private set

    init { load() }

    fun load() {
        ui = ui.copy(loading = ui.detail == null, error = null, notFound = false)
        viewModelScope.launch {
            ui = when (val r = repo.projectDetail(slug)) {
                is ApiResult.Success -> ui.copy(loading = false, detail = r.data)
                is ApiResult.Error -> if (r.httpStatus == 404) ui.copy(loading = false, notFound = true) else ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError -> ui.copy(loading = false, error = "No connection. Check your internet and try again.")
            }
        }
    }

    fun delete(onDeleted: () -> Unit) {
        if (ui.deleting) return
        ui = ui.copy(deleting = true, deleteError = null)
        viewModelScope.launch {
            when (val r = repo.delete(slug)) {
                is ApiResult.Success -> { ui = ui.copy(deleting = false); onDeleted() }
                is ApiResult.Error -> ui = ui.copy(deleting = false, deleteError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(deleting = false, deleteError = "No connection. Check your internet and try again.")
            }
        }
    }
}

@Composable
fun OwnerProjectDetailScreen(
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onReview: () -> Unit,
    vm: OwnerProjectDetailViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    var resumes by remember { mutableStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        resumes++
        if (resumes > 1) vm.load() // rehydrate after edit / award
    }
    AmbientBackground {
        when {
            ui.detail != null -> DetailContent(ui, vm, onBack, onEdit, onReview)
            ui.notFound -> DetailMessage("Project not found", "It may have been removed.", onBack)
            ui.error != null -> DetailMessage(ui.error, "Pull back and try again.", onBack)
            else -> DetailLoading(onBack)
        }
    }
}

@Composable
private fun DetailContent(ui: OwnerDetailUi, vm: OwnerProjectDetailViewModel, onBack: () -> Unit, onEdit: () -> Unit, onReview: () -> Unit) {
    val detail = ui.detail!!
    val p = detail.project
    val context = LocalContext.current
    var confirmDelete by remember { mutableStateOf(false) }
    val tenders = detail.stats.tenderCount

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            // Header
            Row(
                Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                CircleBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
                CircleBtn(Icons.Rounded.IosShare, "Share") {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, "https://builderhq.com.au/projects/${p.slug}")
                    }
                    runCatching { context.startActivity(Intent.createChooser(send, "Share project")) }
                }
            }

            Column(Modifier.padding(horizontal = 20.dp)) {
                Hero(p)
                Spacer(Modifier.height(20.dp))
                StatsRow(detail.stats.unlockCount, tenders, detail.stats.unreadMessages)
                Spacer(Modifier.height(24.dp))

                Kicker("Project details")
                Spacer(Modifier.height(12.dp))
                DetailsCard(p)

                if (!p.description.isNullOrBlank()) {
                    Spacer(Modifier.height(24.dp))
                    Kicker("Scope")
                    Spacer(Modifier.height(10.dp))
                    Text(p.description!!, color = Bhq.colors.textMuted, fontSize = 15.sp, lineHeight = 23.sp)
                }

                Spacer(Modifier.height(24.dp))
                Kicker("Location")
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(fullAddress(p), color = Bhq.colors.textMuted, fontSize = 14.sp)
                }

                Spacer(Modifier.height(24.dp))
                Kicker("Documents")
                Spacer(Modifier.height(10.dp))
                if (detail.documents.isEmpty()) {
                    Text("No documents yet. Add architectural plans to publish.", color = Bhq.colors.textMuted, fontSize = 14.sp)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        detail.documents.forEach { DocRow(it) }
                    }
                }

                Spacer(Modifier.height(24.dp))
                DeleteRow { confirmDelete = true }
                if (ui.deleteError != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(ui.deleteError, color = Bhq.colors.danger, fontSize = 13.sp)
                }
                Spacer(Modifier.height(120.dp))
            }
        }

        // Bottom CTA bar
        Row(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, Bhq.colors.scrimHeavy)))
                .navigationBarsPadding()
                .padding(20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (tenders > 0) {
                Box(Modifier.weight(1f)) { GhostFullButton("Edit", onEdit) }
                Box(Modifier.weight(1f)) { PrimaryButton("Review $tenders", onClick = onReview, modifier = Modifier.fillMaxWidth()) }
            } else {
                PrimaryButton("Edit project", onClick = onEdit, modifier = Modifier.fillMaxWidth())
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { if (!ui.deleting) confirmDelete = false },
            containerColor = Bhq.colors.surface,
            titleContentColor = Bhq.colors.text,
            textContentColor = Bhq.colors.textMuted,
            title = { Text("Delete project?") },
            text = { Text("This permanently removes the project. Builders who unlocked it will lose access.") },
            confirmButton = {
                TextButton(onClick = { confirmDelete = false; vm.delete(onBack) }) {
                    Text("Delete", color = Bhq.colors.danger, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel", color = Bhq.colors.textMuted) } },
        )
    }
}

// ── Hero ────────────────────────────────────────────────────────────

@Composable
private fun Hero(p: ProjectFieldsDto) {
    val infinite = rememberInfiniteTransition(label = "dot")
    val pulse by infinite.animateFloat(0.5f, 1f, infiniteRepeatable(tween(1300, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "pulse")
    CardSurface(Modifier.fillMaxWidth().padding(top = 8.dp), shape = RoundedCornerShape(24.dp)) {
        Column(Modifier.padding(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(7.dp).clip(CircleShape).background(Bhq.colors.accent).graphicsLayer { alpha = pulse })
                Spacer(Modifier.width(8.dp))
                Text("YOUR PROJECT", color = Bhq.colors.accent, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.2.sp)
            }
            Spacer(Modifier.height(14.dp))
            Text(p.title, color = Bhq.colors.text, fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold, maxLines = 3, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusPill(p.status)
                Spacer(Modifier.width(8.dp))
                au.com.builderhq.app.core.design.components.Pill(ProjectLabels.type(p.type))
            }
            p.publishedAtIso?.let {
                daysSince(it)?.let { d ->
                    Spacer(Modifier.height(10.dp))
                    Text(if (d == 0) "Published today" else "Published ${d}d ago", color = Bhq.colors.textDim, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun StatsRow(unlocks: Int, tenders: Int, unread: Int) {
    CardSurface(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(vertical = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            StatCell("Unlocks", unlocks, Modifier.weight(1f))
            Divider()
            StatCell("Tenders", tenders, Modifier.weight(1f))
            Divider()
            StatCell("Unread", unread, Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatCell(label: String, value: Int, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        AnimatedCount(value, color = if (value > 0) Bhq.colors.accentLight else Bhq.colors.text, fontSize = 24.sp)
        Spacer(Modifier.height(2.dp))
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.2.sp)
    }
}

@Composable
private fun Divider() {
    Box(Modifier.height(34.dp).width(1.dp).background(Bhq.colors.blueprintLine.copy(alpha = 0.12f)))
}

// ── Details ─────────────────────────────────────────────────────────

@Composable
private fun DetailsCard(p: ProjectFieldsDto) {
    val rows = buildList {
        ProjectLabels.budget(p.budgetBand)?.let { add("Budget" to it) }
        p.bedrooms?.let { add("Bedrooms" to it.toString()) }
        p.bathrooms?.let { add("Bathrooms" to it.toString()) }
        p.floors?.let { add("Floors" to it.toString()) }
        p.dwellingCount?.let { add("Dwellings" to it.toString()) }
        ProjectLabels.sizeBand(p.buildSizeBand)?.let { add("Build size" to it) }
        ProjectLabels.sizeBand(p.landSizeBand)?.let { add("Land size" to it) }
        ProjectLabels.pretty(p.renovationScope)?.let { add("Scope" to it) }
        ProjectLabels.pretty(p.extensionType)?.let { add("Extension" to it) }
        p.targetStartMonth?.let { add("Target start" to it) }
        p.targetCompletionMonth?.let { add("Target finish" to it) }
    }
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp)) {
            rows.forEachIndexed { i, (label, value) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(label, color = Bhq.colors.textMuted, fontSize = 14.sp)
                    Text(value, color = Bhq.colors.text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                if (i < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(Bhq.colors.blueprintLine.copy(alpha = 0.07f)))
            }
            if (rows.isEmpty()) Text("Add details to help builders quote accurately.", color = Bhq.colors.textMuted, fontSize = 14.sp)
        }
    }
}

@Composable
private fun DocRow(doc: ProjectDocumentDto) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Bhq.colors.surfaceElev)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.10f), RoundedCornerShape(14.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Description, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(doc.filename.ifBlank { "Document" }, color = Bhq.colors.text, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Text(ProjectLabels.pretty(doc.category) ?: "Document", color = Bhq.colors.textDim, fontSize = 12.sp)
        }
    }
}

@Composable
private fun DeleteRow(onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .background(Bhq.colors.danger.copy(alpha = 0.06f))
            .border(1.dp, Bhq.colors.danger.copy(alpha = 0.22f), RoundedCornerShape(14.dp))
            .pressable(onClick = onClick).padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
    ) {
        Text("Delete project", color = Bhq.colors.danger, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

// ── Bits / states ───────────────────────────────────────────────────

@Composable
private fun GhostFullButton(text: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Bhq.colors.fillSubtle)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.14f), RoundedCornerShape(50))
            .pressable(onClick = onClick).padding(vertical = 15.dp),
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(text, color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun CircleBtn(icon: ImageVector, label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(42.dp).clip(CircleShape).background(Bhq.colors.scrimFaint).pressable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = Bhq.colors.text, modifier = Modifier.size(20.dp))
    }
}

private fun fullAddress(p: ProjectFieldsDto): String {
    val base = ProjectLabels.location(p.suburb, p.state).ifBlank { "Australia" }
    return if (!p.addressLine1.isNullOrBlank()) "${p.addressLine1}, $base" else base
}

@Composable
private fun DetailLoading(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp)) {
        CircleBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
        Spacer(Modifier.height(16.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(160.dp), cornerRadius = 24.dp)
        Spacer(Modifier.height(16.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(80.dp), cornerRadius = 18.dp)
        Spacer(Modifier.height(16.dp))
        SkeletonBox(Modifier.fillMaxWidth().height(200.dp), cornerRadius = 18.dp)
    }
}

@Composable
private fun DetailMessage(title: String, subtitle: String, onBack: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(16.dp)) {
            CircleBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
        }
        Column(Modifier.fillMaxSize().padding(36.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text(title, color = Bhq.colors.text, fontSize = 19.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Text(subtitle, color = Bhq.colors.textMuted, fontSize = 14.sp)
        }
    }
}
