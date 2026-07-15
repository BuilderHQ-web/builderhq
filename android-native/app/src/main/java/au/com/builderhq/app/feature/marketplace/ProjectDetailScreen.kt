package au.com.builderhq.app.feature.marketplace

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import au.com.builderhq.app.core.data.MessagingRepository
import au.com.builderhq.app.core.data.ProjectsRepository
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.GhostButton
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.Pill
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.ProjectCoverArt
import au.com.builderhq.app.core.design.components.SaveButton
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentContrast
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.BuilderTenderSnapshotDto
import au.com.builderhq.app.core.network.dto.ProjectDetailDto
import au.com.builderhq.app.core.network.dto.ProjectDocumentDto
import au.com.builderhq.app.core.network.dto.ProjectFieldsDto
import au.com.builderhq.app.core.network.dto.UnlockAffordanceDto
import au.com.builderhq.app.core.network.dto.UnlockedOwnerDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DetailUi(
    val loading: Boolean = true,
    val detail: ProjectDetailDto? = null,
    val error: String? = null,
    val notFound: Boolean = false,
    val unlocking: Boolean = false,
    val unlockError: String? = null,
    val openingDocId: String? = null,
    val docError: String? = null,
    val messaging: Boolean = false,
    val messageError: String? = null,
)

@HiltViewModel
class ProjectDetailViewModel @Inject constructor(
    private val repo: ProjectsRepository,
    private val messaging: MessagingRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val slug: String = savedState.get<String>("slug").orEmpty()
    var ui by mutableStateOf(DetailUi()); private set

    init { load() }

    fun load() {
        ui = ui.copy(loading = ui.detail == null, error = null, notFound = false)
        viewModelScope.launch {
            ui = when (val r = repo.detail(slug)) {
                is ApiResult.Success -> ui.copy(loading = false, detail = r.data)
                is ApiResult.Error ->
                    if (r.httpStatus == 404) ui.copy(loading = false, notFound = true)
                    else ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError ->
                    ui.copy(loading = false, error = "No connection. Check your internet and try again.")
            }
        }
    }

    fun unlock() {
        if (ui.unlocking) return
        ui = ui.copy(unlocking = true, unlockError = null)
        viewModelScope.launch {
            when (val r = repo.unlock(slug)) {
                is ApiResult.Success -> {
                    // Refetch to hot-swap into unlocked_builder mode.
                    when (val d = repo.detail(slug)) {
                        is ApiResult.Success -> ui = ui.copy(unlocking = false, detail = d.data)
                        else -> ui = ui.copy(unlocking = false)
                    }
                }
                is ApiResult.Error -> ui = ui.copy(unlocking = false, unlockError = r.message)
                is ApiResult.NetworkError ->
                    ui = ui.copy(unlocking = false, unlockError = "No connection. Check your internet and try again.")
            }
        }
    }

    fun toggleSave() {
        val d = ui.detail ?: return
        val target = !d.isSaved
        ui = ui.copy(detail = d.copy(isSaved = target))
        viewModelScope.launch {
            val r = repo.setSaved(slug, target)
            if (r !is ApiResult.Success) ui = ui.copy(detail = ui.detail?.copy(isSaved = !target))
        }
    }

    /** Find-or-create the conversation with this project's owner, then hand
     *  back its id to deep-link into the chat thread. */
    fun messageOwner(onOpened: (String) -> Unit) {
        if (ui.messaging) return
        ui = ui.copy(messaging = true, messageError = null)
        viewModelScope.launch {
            when (val r = messaging.startConversation(slug)) {
                is ApiResult.Success -> {
                    ui = ui.copy(messaging = false)
                    onOpened(r.data.conversation.id)
                }
                is ApiResult.Error -> ui = ui.copy(messaging = false, messageError = r.message)
                is ApiResult.NetworkError ->
                    ui = ui.copy(messaging = false, messageError = "No connection. Check your internet and try again.")
            }
        }
    }

    /** Mint a presigned URL for [documentId] and hand it back to be opened
     *  in the system viewer. One in-flight open at a time. */
    fun openDocument(documentId: String, onUrl: (String) -> Unit) {
        if (ui.openingDocId != null) return
        ui = ui.copy(openingDocId = documentId, docError = null)
        viewModelScope.launch {
            when (val r = repo.documentUrl(documentId)) {
                is ApiResult.Success -> {
                    ui = ui.copy(openingDocId = null)
                    onUrl(r.data.url)
                }
                is ApiResult.Error -> ui = ui.copy(openingDocId = null, docError = r.message)
                is ApiResult.NetworkError ->
                    ui = ui.copy(openingDocId = null, docError = "No connection. Check your internet and try again.")
            }
        }
    }
}

@Composable
fun ProjectDetailScreen(
    onBack: () -> Unit,
    onOpenTender: () -> Unit,
    onOpenConversation: (String) -> Unit,
    vm: ProjectDetailViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    val context = LocalContext.current
    var resumes by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        resumes++
        if (resumes > 1) vm.load() // rehydrate on return (e.g. after submitting a tender)
    }
    val openDocument: (String) -> Unit = { id -> vm.openDocument(id) { url -> openInViewer(context, url) } }
    val messageOwner: () -> Unit = { vm.messageOwner { id -> onOpenConversation(id) } }
    AmbientBackground {
        when {
            ui.detail != null -> DetailContent(ui, onBack, vm::unlock, vm::toggleSave, onOpenTender, openDocument, messageOwner)
            ui.notFound -> DetailMessage("Project not found", "It may have been removed or fully tendered.", onBack)
            ui.error != null -> DetailMessage(ui.error, "Pull back and try again.", onBack)
            else -> DetailLoading(onBack)
        }
    }
}

@Composable
private fun DetailContent(
    ui: DetailUi,
    onBack: () -> Unit,
    onUnlock: () -> Unit,
    onToggleSave: () -> Unit,
    onOpenTender: () -> Unit,
    onOpenDocument: (String) -> Unit,
    onMessageOwner: () -> Unit,
) {
    val detail = ui.detail ?: return
    val p = detail.project
    val unlocked = detail.mode == "unlocked_builder"
    val haptics = rememberHaptics()
    var primedUnlock by remember { mutableStateOf(false) }
    var confirmOpen by remember { mutableStateOf(false) }
    LaunchedEffect(unlocked) {
        if (!primedUnlock) primedUnlock = true else if (unlocked) { haptics.confirm(); confirmOpen = false }
    }
    val scroll = rememberScrollState()
    Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
        Hero(p, detail.isSaved, onBack, onToggleSave, scroll.value)
        Column(Modifier.padding(horizontal = 20.dp)) {
            Spacer(Modifier.height(20.dp))

            SpecGrid(p)

            if (!p.description.isNullOrBlank()) {
                Spacer(Modifier.height(24.dp))
                Kicker("The brief")
                Spacer(Modifier.height(10.dp))
                Text(p.description, color = TextMuted, fontSize = 15.sp, lineHeight = 23.sp)
            }

            Spacer(Modifier.height(24.dp))

            AnimatedContent(
                targetState = unlocked,
                transitionSpec = {
                    (fadeIn(tween(Motion.SLOW, easing = Motion.EaseOutSoft)) +
                        scaleIn(initialScale = 0.96f, animationSpec = tween(Motion.SLOW)))
                        .togetherWith(fadeOut(tween(Motion.FAST)))
                },
                label = "unlockReveal",
            ) { isUnlocked ->
                if (isUnlocked) {
                    UnlockedBody(
                        p, detail.documents, detail.owner, detail.myTender,
                        ui.openingDocId, ui.docError, onOpenDocument, onOpenTender,
                        onMessageOwner, ui.messaging, ui.messageError,
                    )
                } else {
                    detail.unlock?.let {
                        UnlockCard(it, detail.documentCount ?: 0, onRequestUnlock = { confirmOpen = true })
                    }
                }
            }
            Spacer(Modifier.height(40.dp))
        }
    }

    if (confirmOpen) {
        detail.unlock?.let {
            UnlockConfirmSheet(
                unlock = it,
                unlocking = ui.unlocking,
                unlockError = ui.unlockError,
                documentCount = detail.documentCount ?: 0,
                onConfirm = onUnlock,
                onDismiss = { if (!ui.unlocking) confirmOpen = false },
            )
        }
    }
}

// ── Hero ────────────────────────────────────────────────────────────

@Composable
private fun Hero(p: ProjectFieldsDto, saved: Boolean, onBack: () -> Unit, onToggleSave: () -> Unit, scroll: Int) {
    val titleAlpha = (1f - (scroll / 460f)).coerceIn(0f, 1f)
    Box(Modifier.fillMaxWidth().height(300.dp)) {
        // Cover art parallaxes (moves at ~half scroll speed) + slow zoom for depth.
        ProjectCoverArt(
            seed = p.id, type = p.type,
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .graphicsLayer {
                    translationY = scroll * 0.5f
                    val s = 1f + (scroll / 3000f).coerceIn(0f, 0.12f)
                    scaleX = s; scaleY = s
                },
        )
        Box(
            Modifier
                .fillMaxWidth()
                .height(300.dp)
                .graphicsLayer { translationY = scroll * 0.5f }
                .background(
                    Brush.verticalGradient(
                        0f to Color(0x22050810), 0.5f to Color(0x99050810), 1f to Color(0xFF06080F),
                    ),
                ),
        )
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            CircleIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", Color.White, onBack)
            SaveButton(saved, onToggleSave, diameter = 42)
        }
        Column(Modifier.align(Alignment.BottomStart).padding(20.dp).graphicsLayer { alpha = titleAlpha }) {
            Pill(ProjectLabels.type(p.type), accent = true)
            Spacer(Modifier.height(12.dp))
            Text(
                p.title, color = TextPrimary, fontSize = 28.sp, lineHeight = 32.sp,
                fontWeight = FontWeight.Bold, maxLines = 3, overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = AccentLight, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(5.dp))
                Text(
                    locationLine(p),
                    color = TextMuted, fontSize = 14.sp,
                )
            }
        }
    }
}

private fun locationLine(p: ProjectFieldsDto): String {
    val base = ProjectLabels.location(p.suburb, p.state).ifBlank { "Australia" }
    return if (!p.addressLine1.isNullOrBlank()) "${p.addressLine1}, $base" else base
}

// ── Specs ───────────────────────────────────────────────────────────

@Composable
private fun SpecGrid(p: ProjectFieldsDto) {
    val specs = buildList {
        ProjectLabels.budget(p.budgetBand)?.let { add("Budget" to it) }
        p.bedrooms?.let { add("Bedrooms" to it.toString()) }
        p.bathrooms?.let { add("Bathrooms" to it.toString()) }
        p.floors?.let { add("Floors" to it.toString()) }
        p.dwellingCount?.let { add("Dwellings" to it.toString()) }
        ProjectLabels.sizeBand(p.buildSizeBand)?.let { add("Build size" to it) }
        ProjectLabels.sizeBand(p.landSizeBand)?.let { add("Land size" to it) }
        ProjectLabels.pretty(p.extensionType)?.let { add("Extension" to it) }
        ProjectLabels.pretty(p.renovationScope)?.let { add("Scope" to it) }
    }
    if (specs.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        specs.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (label, value) -> SpecTile(label, value, Modifier.weight(1f)) }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun SpecTile(label: String, value: String, modifier: Modifier = Modifier) {
    Box(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF131C2B), Color(0xFF0C1320))))
            .border(1.dp, BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
            .padding(14.dp),
    ) {
        Column {
            Text(label.uppercase(), color = TextDim, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
            Spacer(Modifier.height(6.dp))
            Text(value, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── Unlock CTA (preview mode) ───────────────────────────────────────

@Composable
private fun UnlockCard(
    unlock: UnlockAffordanceDto,
    documentCount: Int,
    onRequestUnlock: () -> Unit,
) {
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Kicker("Unlock to tender")
                Pill(
                    if (unlock.slotsRemaining > 0) "${unlock.slotsRemaining} of ${unlock.unlockCap} open" else "Full",
                    accent = unlock.slotsRemaining > 0,
                )
            }
            Spacer(Modifier.height(16.dp))
            when (unlock.pricing.kind) {
                "free" -> {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text("Free", color = AccentLight, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "\$${unlock.basePriceAud}", color = TextDim, fontSize = 16.sp,
                            textDecoration = TextDecoration.LineThrough,
                            modifier = Modifier.padding(bottom = 4.dp),
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Founding access" + (unlock.pricing.remainingThisCycle?.let { " · $it left this cycle" } ?: ""),
                        color = TextMuted, fontSize = 13.sp,
                    )
                }
                "paid" -> {
                    Text("\$${unlock.pricing.priceAud ?: unlock.basePriceAud}", color = TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text("One-off unlock for this project", color = TextMuted, fontSize = 13.sp)
                }
                else -> {
                    Text("Fully tendered", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(4.dp))
                    Text("All ${unlock.unlockCap} builder slots are taken.", color = TextMuted, fontSize = 13.sp)
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "Unlock to reveal the full plans${if (documentCount > 0) " ($documentCount)" else ""}, the exact address, and the owner — then submit your tender.",
                color = TextMuted, fontSize = 13.sp, lineHeight = 19.sp,
            )
            if (unlock.canUnlock) {
                Spacer(Modifier.height(20.dp))
                PrimaryButton(
                    if (unlock.pricing.kind == "free") "Unlock free" else "Unlock for \$${unlock.pricing.priceAud ?: unlock.basePriceAud}",
                    onClick = onRequestUnlock, modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

// ── Unlock confirm sheet (deliberate, with a 1·2·3 rail) ────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UnlockConfirmSheet(
    unlock: UnlockAffordanceDto,
    unlocking: Boolean,
    unlockError: String?,
    documentCount: Int,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val free = unlock.pricing.kind == "free"
    val price = unlock.pricing.priceAud ?: unlock.basePriceAud
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, containerColor = Color(0xFF0C1320)) {
        Column(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, bottom = 28.dp)) {
            Kicker("Confirm unlock")
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(if (free) "Free" else "\$$price", color = AccentLight, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                if (free) {
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "\$${unlock.basePriceAud}", color = TextDim, fontSize = 15.sp,
                        textDecoration = TextDecoration.LineThrough, modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                if (free) "Founding access — this unlock is on us." else "One-off unlock for this project.",
                color = TextMuted, fontSize = 13.sp,
            )

            Spacer(Modifier.height(22.dp))
            StepRail()
            Spacer(Modifier.height(22.dp))

            Text(
                "You'll see the full plans${if (documentCount > 0) " ($documentCount)" else ""}, the exact address, and the owner — and take one of ${unlock.unlockCap} builder slots.",
                color = TextMuted, fontSize = 13.sp, lineHeight = 20.sp,
            )

            if (unlockError != null) {
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Lock, contentDescription = null, tint = Danger, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(unlockError, color = Danger, fontSize = 13.sp)
                }
            }

            Spacer(Modifier.height(22.dp))
            PrimaryButton(
                if (free) "Unlock free" else "Unlock for \$$price",
                onClick = onConfirm, loading = unlocking, modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(6.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                GhostButton("Not yet", onClick = onDismiss)
            }
        }
    }
}

/** The "1 Unlock · 2 Review · 3 Tender" journey rail — step one is live. */
@Composable
private fun StepRail() {
    val steps = listOf("Unlock", "Review", "Tender")
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        steps.forEachIndexed { i, label ->
            NumStep(i + 1, label, active = i == 0)
            if (i < steps.lastIndex) {
                Box(
                    Modifier
                        .weight(1f)
                        .height(1.5.dp)
                        .padding(horizontal = 8.dp)
                        .background(BlueprintLine.copy(alpha = 0.22f)),
                )
            }
        }
    }
}

@Composable
private fun NumStep(n: Int, label: String, active: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(22.dp).clip(CircleShape)
                .background(if (active) Accent else Color.White.copy(alpha = 0.06f))
                .border(if (active) 0.dp else 1.dp, BlueprintLine.copy(alpha = 0.2f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text("$n", color = if (active) AccentContrast else TextDim, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(7.dp))
        Text(label, color = if (active) TextPrimary else TextMuted, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

// ── Unlocked body ───────────────────────────────────────────────────

@Composable
private fun UnlockedBody(
    p: ProjectFieldsDto,
    docs: List<ProjectDocumentDto>,
    owner: UnlockedOwnerDto?,
    myTender: BuilderTenderSnapshotDto?,
    openingDocId: String?,
    docError: String?,
    onOpenDocument: (String) -> Unit,
    onOpenTender: () -> Unit,
    onMessageOwner: () -> Unit,
    messaging: Boolean,
    messageError: String?,
) {
    if (owner != null) {
        Kicker("The owner")
        Spacer(Modifier.height(10.dp))
        OwnerCard(owner)
        Spacer(Modifier.height(12.dp))
        MessageOwnerButton(owner.name.trim().split(" ").firstOrNull().orEmpty(), messaging, onMessageOwner)
        if (messageError != null) {
            Spacer(Modifier.height(8.dp))
            Text(messageError, color = Danger, fontSize = 13.sp)
        }
        Spacer(Modifier.height(24.dp))
    }
    Kicker("Plans & documents")
    Spacer(Modifier.height(10.dp))
    if (docs.isEmpty()) {
        Text("No documents attached yet.", color = TextMuted, fontSize = 14.sp)
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            docs.forEach { DocumentRow(it, opening = it.id == openingDocId, onOpen = { onOpenDocument(it.id) }) }
        }
        if (docError != null) {
            Spacer(Modifier.height(10.dp))
            Text(docError, color = Danger, fontSize = 13.sp)
        }
    }
    Spacer(Modifier.height(24.dp))
    if (myTender != null && myTender.status != "draft") {
        MyTenderCard(myTender)
    } else {
        PrimaryButton(
            if (myTender != null) "Continue your tender" else "Submit a tender",
            onClick = onOpenTender, modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun MyTenderCard(t: BuilderTenderSnapshotDto) {
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Kicker("Your tender")
                Pill(t.status.replaceFirstChar { it.uppercase() }, accent = true)
            }
            if (t.totalPriceAud != null) {
                Spacer(Modifier.height(12.dp))
                Text("$" + "%,d".format(t.totalPriceAud), color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            }
            t.durationWeeks?.let {
                Spacer(Modifier.height(4.dp))
                Text("$it weeks", color = TextMuted, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun MessageOwnerButton(firstName: String, busy: Boolean, onClick: () -> Unit) {
    val label = if (firstName.isBlank()) "Message owner" else "Message $firstName"
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, Accent.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
            .pressable(enabled = !busy, onClick = onClick)
            .padding(vertical = 13.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (busy) {
            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = AccentLight, strokeWidth = 2.dp)
        } else {
            Icon(Icons.Rounded.ChatBubbleOutline, contentDescription = null, tint = AccentLight, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(8.dp))
            Text(label, color = AccentLight, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun OwnerCard(owner: UnlockedOwnerDto) {
    CardSurface(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(46.dp).clip(CircleShape).background(Accent.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(owner.name.take(1).uppercase(), color = AccentLight, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(owner.name, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.Verified, contentDescription = null, tint = Accent, modifier = Modifier.size(15.dp))
                }
                Spacer(Modifier.height(2.dp))
                Text(
                    if (owner.publishedProjectCount <= 1) "First project on BuilderHQ"
                    else "${owner.publishedProjectCount} projects published",
                    color = TextMuted, fontSize = 13.sp,
                )
            }
        }
    }
}

@Composable
private fun DocumentRow(doc: ProjectDocumentDto, opening: Boolean, onOpen: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF131C2B), Color(0xFF0C1320))))
            .border(1.dp, BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
            .pressable(enabled = !opening, onClick = onOpen)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Description, contentDescription = null, tint = AccentLight, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(doc.filename.ifBlank { "Document" }, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Text(
                listOfNotNull(ProjectLabels.pretty(doc.category), humanSize(doc.sizeBytes)).joinToString(" · "),
                color = TextDim, fontSize = 12.sp,
            )
        }
        Spacer(Modifier.width(10.dp))
        if (opening) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = AccentLight, strokeWidth = 2.dp)
        } else {
            Icon(Icons.Rounded.OpenInNew, contentDescription = "Open", tint = TextDim, modifier = Modifier.size(18.dp))
        }
    }
}

/** Open a presigned document URL in the system browser / PDF viewer. */
private fun openInViewer(context: Context, url: String) {
    if (url.isBlank()) return
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
        context.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
        // No browser/viewer available — nothing to open with.
    }
}

// ── States ──────────────────────────────────────────────────────────

@Composable
private fun DetailLoading(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().height(300.dp)) {
            SkeletonBox(Modifier.fillMaxWidth().height(300.dp), cornerRadius = 0.dp)
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(16.dp)) {
                CircleIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", Color.White, onBack)
            }
            Column(Modifier.align(Alignment.BottomStart).padding(20.dp)) {
                SkeletonBox(Modifier.width(96.dp).height(24.dp), cornerRadius = 50.dp)
                Spacer(Modifier.height(14.dp))
                SkeletonBox(Modifier.fillMaxWidth(0.7f).height(28.dp))
                Spacer(Modifier.height(10.dp))
                SkeletonBox(Modifier.fillMaxWidth(0.4f).height(16.dp))
            }
        }
        Column(Modifier.padding(20.dp)) {
            Spacer(Modifier.height(20.dp))
            repeat(2) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    SkeletonBox(Modifier.weight(1f).height(64.dp), cornerRadius = 14.dp)
                    SkeletonBox(Modifier.weight(1f).height(64.dp), cornerRadius = 14.dp)
                }
                Spacer(Modifier.height(10.dp))
            }
            Spacer(Modifier.height(16.dp))
            SkeletonBox(Modifier.fillMaxWidth().height(180.dp), cornerRadius = 18.dp)
        }
    }
}

@Composable
private fun DetailMessage(title: String, subtitle: String, onBack: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(16.dp)) {
            CircleIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Back", Color.White, onBack)
        }
        Column(
            Modifier.fillMaxSize().padding(36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(title, color = TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Text(subtitle, color = TextMuted, fontSize = 14.sp)
        }
    }
}

// ── Bits ────────────────────────────────────────────────────────────

@Composable
private fun CircleIcon(icon: ImageVector, label: String, tint: Color, onClick: () -> Unit) {
    Box(
        Modifier
            .size(42.dp)
            .clip(CircleShape)
            .background(Color(0x66060A12))
            .pressable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = tint, modifier = Modifier.size(20.dp))
    }
}

private fun humanSize(bytes: Long): String? {
    if (bytes <= 0) return null
    val kb = bytes / 1024.0
    if (kb < 1024) return "${kb.toInt()} KB"
    return "${"%.1f".format(kb / 1024.0)} MB"
}
