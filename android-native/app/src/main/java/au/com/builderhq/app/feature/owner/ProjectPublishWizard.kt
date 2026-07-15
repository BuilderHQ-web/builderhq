@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package au.com.builderhq.app.feature.owner

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
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
import androidx.compose.foundation.layout.imePadding
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
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Brush
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.OpenInFull
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Brush as Gradient
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.Pill
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.ProjectCoverArt
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentContrast
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.DisplaySerif
import au.com.builderhq.app.core.design.theme.SurfaceElev
import au.com.builderhq.app.core.design.theme.Success
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.design.theme.Warning
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.dto.SuburbDto

// Option value lists (mirror backend enums).
private val BUDGETS = listOf("under_500k", "500k_1m", "1m_1_5m", "1_5m_2m", "2m_3m", "3m_5m", "over_5m")
private val BUILD_SIZES = listOf("under_100", "100_150", "150_200", "200_250", "250_300", "300_400", "over_400")
private val LAND_SIZES = listOf("under_200", "200_400", "400_600", "600_800", "800_1000", "over_1000")
private val EXT_TYPES = listOf("ground_floor", "first_floor", "ground_and_first", "rear", "side")
private val EXT_SIZES = listOf("under_20", "20_40", "40_60", "60_80", "80_100", "over_100")
private val AGE_BANDS = listOf("under_10", "10_25", "25_50", "50_75", "over_75")
private val RENO_SCOPES = listOf("kitchen", "bathroom", "kitchen_and_bathroom", "full_internal", "full_internal_and_external", "structural")
private val OPTIONAL_DOC_CATEGORIES = listOf("structural_engineering", "specifications", "land_report", "soil_report", "town_planning", "other")

private fun budgetOptions() = BUDGETS.map { it to (ProjectLabels.budget(it) ?: it) }
private fun sizeOptions(values: List<String>) = values.map { it to (ProjectLabels.sizeBand(it) ?: it) }
private fun prettyOptions(values: List<String>) = values.map { it to (ProjectLabels.pretty(it) ?: it) }

@Composable
fun ProjectPublishWizard(
    onClose: () -> Unit,
    onPublished: () -> Unit,
    vm: PublishWizardViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    var pendingCategory by remember { mutableStateOf("architectural") }
    val scanLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let { vm.scanPlan(it) } }
    val docLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let { vm.addDocument(it, pendingCategory) } }
    val pickDoc: (String, String) -> Unit = { category, mime -> pendingCategory = category; docLauncher.launch(mime) }

    BackHandler(enabled = ui.published == null) {
        when (ui.stage) {
            WizardStage.WIZARD -> if (ui.step == WizardStep.TYPE) onClose() else vm.back()
            WizardStage.SCAN -> vm.backToChoice()
            WizardStage.CHOICE -> onClose()
        }
    }

    AmbientBackground {
        Box(Modifier.fillMaxSize()) {
            AnimatedContent(
                targetState = ui.stage,
                transitionSpec = { (fadeIn(tween(400)) ).togetherWith(fadeOut(tween(200))) },
                label = "stage",
            ) { stage ->
                when (stage) {
                    WizardStage.CHOICE -> StartChoice(onClose, vm::chooseAi, vm::chooseManual)
                    WizardStage.SCAN -> PlanScan(ui, onPick = { scanLauncher.launch("application/pdf") }, onSkip = vm::skipScan, onBack = vm::backToChoice)
                    WizardStage.WIZARD -> WizardContent(ui, vm, onClose, pickDoc)
                }
            }

            if (ui.scanPhase == ScanPhase.READING) ScanningOverlay()

            ui.published?.let { result ->
                if (result.savedAsDraft) {
                    CelebrationScene(
                        icon = Icons.Rounded.Description,
                        titlePlain = "Saved as a",
                        titleEmphasis = "draft.",
                        detail = result.title,
                        subtitle = "Add at least one architectural plan to publish and start receiving tenders.",
                        metric = null, ctaLabel = "Done", tone = CelebrationTone.ACCENT, onCta = onPublished,
                    )
                } else {
                    CelebrationScene(
                        icon = Icons.Rounded.CheckCircle,
                        titlePlain = "Your project is",
                        titleEmphasis = "live.",
                        detail = result.title,
                        subtitle = "Verified builders in your area are seeing it now. Tenders usually arrive within days.",
                        metric = null, ctaLabel = "Open dashboard", tone = CelebrationTone.SUCCESS, onCta = onPublished,
                    )
                }
            }
        }
    }
}

// ── Stage A — start choice ──────────────────────────────────────────

@Composable
private fun StartChoice(onClose: () -> Unit, onAi: () -> Unit, onManual: () -> Unit) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(24.dp)) {
        CloseRow(onClose)
        Spacer(Modifier.height(20.dp))
        Kicker("New project")
        Spacer(Modifier.height(12.dp))
        Text("Two ways to", color = TextPrimary, fontSize = 34.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold)
        Text("begin.", color = AccentLight, fontSize = 38.sp, lineHeight = 42.sp, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)
        Spacer(Modifier.height(28.dp))

        // AI hero card
        Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp))
                .background(Gradient.linearGradient(listOf(Accent.copy(alpha = 0.16f), Color(0xFF0C1424))))
                .border(1.dp, Accent.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                .pressable(onClick = onAi).padding(22.dp),
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).background(Gradient.linearGradient(listOf(AccentLight, Accent))), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AccentContrast, modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.weight(1f))
                    Pill("Fastest", accent = true)
                }
                Spacer(Modifier.height(16.dp))
                Text("Auto-fill from plans", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text("Upload your architectural PDF and our AI fills in the details. You review, then publish.", color = TextMuted, fontSize = 14.sp, lineHeight = 20.sp)
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Upload plans", color = AccentLight, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = AccentLight, modifier = Modifier.size(16.dp))
                }
            }
        }
        Spacer(Modifier.height(14.dp))
        // Manual card
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(SurfaceElev)
                .border(1.dp, BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(18.dp))
                .pressable(onClick = onManual).padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.04f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Brush, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text("Enter details myself", color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Text("A quick guided form", color = TextMuted, fontSize = 12.sp)
            }
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = TextDim, modifier = Modifier.size(18.dp))
        }
    }
}

// ── Stage B — plan scan ─────────────────────────────────────────────

@Composable
private fun PlanScan(ui: WizardUi, onPick: () -> Unit, onSkip: () -> Unit, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(24.dp)) {
        CloseRow(onBack, icon = Icons.Rounded.Close)
        Spacer(Modifier.height(20.dp))
        Kicker("Step 1")
        Spacer(Modifier.height(12.dp))
        Text("Upload your", color = TextPrimary, fontSize = 32.sp, lineHeight = 36.sp, fontWeight = FontWeight.Bold)
        Text("plans.", color = AccentLight, fontSize = 36.sp, lineHeight = 40.sp, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)
        Spacer(Modifier.height(28.dp))
        // Dropzone
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp))
                .background(Accent.copy(alpha = 0.05f))
                .border(1.5.dp, Accent.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                .pressable(onClick = onPick).padding(vertical = 40.dp, horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.size(64.dp).clip(CircleShape).background(Accent.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Description, contentDescription = null, tint = AccentLight, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text("Tap to choose a PDF", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Text("Architectural plans · PDF · up to 28 MB", color = TextMuted, fontSize = 13.sp)
        }
        if (ui.scanError != null) {
            Spacer(Modifier.height(14.dp))
            Text(ui.scanError, color = Danger, fontSize = 13.sp)
        }
        Spacer(Modifier.height(16.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SurfaceElev)
                .border(1.dp, BlueprintLine.copy(alpha = 0.1f), RoundedCornerShape(14.dp)).padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Lock, contentDescription = null, tint = AccentLight, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(10.dp))
            Text("Your plans are private. We only read them to pre-fill your details.", color = TextMuted, fontSize = 12.sp, lineHeight = 17.sp)
        }
        Spacer(Modifier.weight(1f))
        Box(Modifier.fillMaxWidth().navigationBarsPadding(), contentAlignment = Alignment.Center) {
            Text("I'll enter the details myself", color = TextMuted, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.pressable(onClick = onSkip).padding(12.dp))
        }
    }
}

@Composable
private fun ScanningOverlay() {
    val t = rememberInfiniteTransition(label = "scan")
    val beam by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1600, easing = LinearEasing)), label = "beam")
    Box(Modifier.fillMaxSize().background(Color(0xF205070D)), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(width = 150.dp, height = 190.dp).clip(RoundedCornerShape(14.dp)).background(SurfaceElev).border(1.dp, Accent.copy(alpha = 0.4f), RoundedCornerShape(14.dp))) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    repeat(6) { Box(Modifier.fillMaxWidth(if (it % 2 == 0) 0.9f else 0.6f).height(6.dp).clip(RoundedCornerShape(50)).background(BlueprintLine.copy(alpha = 0.18f))) }
                }
                Box(Modifier.fillMaxWidth().height(2.dp).background(AccentLight).graphicsAlphaScan(beam))
            }
            Spacer(Modifier.height(24.dp))
            Text("Reading your plans…", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Text("Our AI is pulling out the details", color = TextMuted, fontSize = 13.sp)
        }
    }
}

private fun Modifier.graphicsAlphaScan(beam: Float): Modifier = this.then(
    Modifier.padding(top = (190 * beam).dp.coerceAtMost(184.dp)),
)

// ── Stage C — wizard ────────────────────────────────────────────────

@Composable
private fun WizardContent(ui: WizardUi, vm: PublishWizardViewModel, onClose: () -> Unit, pickDoc: (String, String) -> Unit) {
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        // Chrome
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(38.dp).clip(CircleShape).background(Color(0x14FFFFFF)).pressable(onClick = onClose), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Close, contentDescription = "Close", tint = TextPrimary, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(14.dp))
            WizardProgress(WizardStep.entries.indexOf(ui.step), WizardStep.entries.size, Modifier.weight(1f))
            Spacer(Modifier.width(14.dp))
            Text("${WizardStep.entries.indexOf(ui.step) + 1} of ${WizardStep.entries.size}", color = TextDim, fontSize = 12.sp)
        }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp)) {
            AnimatedVisibility(ui.showPlanReview, enter = fadeIn() + slideInVertically { -it }) {
                PlanReviewBanner(ui.planFilledCount, vm::dismissPlanReview)
            }
            Spacer(Modifier.height(8.dp))
            LivePreviewCard(ui.fields)
            Spacer(Modifier.height(24.dp))
            AnimatedContent(
                targetState = ui.step,
                transitionSpec = {
                    val dir = if (ui.forward) 1 else -1
                    (slideInHorizontally { dir * it / 6 } + fadeIn(tween(280))) togetherWith (fadeOut(tween(160)))
                },
                label = "step",
            ) { step ->
                Column {
                    when (step) {
                        WizardStep.TYPE -> StepType(ui, vm)
                        WizardStep.LOCATION -> StepLocation(ui, vm)
                        WizardStep.SPECS -> StepSpecs(ui, vm)
                        WizardStep.BUDGET -> StepBudget(ui, vm)
                        WizardStep.TITLE -> StepTitle(ui, vm)
                        WizardStep.DOCUMENTS -> StepDocuments(ui, vm, pickDoc)
                        WizardStep.REVIEW -> StepReview(ui, vm)
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }

        // Footer
        Footer(ui, vm)
    }
}

@Composable
private fun WizardProgress(index: Int, total: Int, modifier: Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) {
        repeat(total) { i ->
            val current = i == index
            val w by animateDpAsState(if (current) 24.dp else 7.dp, spring(), label = "seg")
            Box(Modifier.width(w).height(7.dp).clip(RoundedCornerShape(50)).background(when {
                current -> Accent
                i < index -> Accent.copy(alpha = 0.85f)
                else -> BlueprintLine.copy(alpha = 0.18f)
            }))
        }
    }
}

@Composable
private fun PlanReviewBanner(count: Int, onDismiss: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Accent.copy(alpha = 0.10f))
            .border(1.dp, Accent.copy(alpha = 0.3f), RoundedCornerShape(14.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AccentLight, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text("Filled $count detail${if (count == 1) "" else "s"} from your plans", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text("Review each step, then publish.", color = TextMuted, fontSize = 12.sp)
        }
        Icon(Icons.Rounded.Close, contentDescription = "Dismiss", tint = TextDim, modifier = Modifier.size(18.dp).pressable(onClick = onDismiss))
    }
}

@Composable
private fun Footer(ui: WizardUi, vm: PublishWizardViewModel) {
    val onReview = ui.step == WizardStep.REVIEW
    val ctaText = when {
        onReview && ui.hasArchitectural -> "Publish project"
        onReview -> "Save as draft"
        else -> "Continue"
    }
    Row(
        Modifier.fillMaxWidth().background(Gradient.verticalGradient(listOf(Color.Transparent, Color(0xF205070D))))
            .navigationBarsPadding().imePadding().padding(20.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (ui.step != WizardStep.TYPE) {
            Box(Modifier.clip(RoundedCornerShape(50)).background(Color(0x14FFFFFF)).pressable(onClick = vm::back).padding(horizontal = 22.dp, vertical = 15.dp)) {
                Text("Back", color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        PrimaryButton(ctaText, onClick = vm::next, enabled = vm.canContinue(), loading = ui.saving, modifier = Modifier.weight(1f))
    }
}

// ── Live preview ────────────────────────────────────────────────────

@Composable
private fun LivePreviewCard(f: DraftFields) {
    CardSurface(Modifier.fillMaxWidth()) {
        Column {
            Box(Modifier.fillMaxWidth().height(120.dp)) {
                ProjectCoverArt(seed = "preview", type = f.type ?: "", modifier = Modifier.fillMaxWidth().height(120.dp))
                if (f.type != null) {
                    Box(Modifier.padding(12.dp)) { Pill(ProjectLabels.type(f.type), accent = true) }
                }
            }
            Column(Modifier.padding(16.dp)) {
                Text(
                    f.title.ifBlank { f.type?.let { ProjectLabels.type(it) } ?: "Your project" },
                    color = if (f.title.isBlank()) TextDim else TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                val chips = buildList {
                    ProjectLabels.location(f.suburb, f.state).ifBlank { null }?.let { add(it) }
                    f.bedrooms?.let { add("$it bed") }
                    f.bathrooms?.let { add("$it bath") }
                    ProjectLabels.budget(f.budgetBand)?.let { add(it) }
                    f.targetStartMonth?.let { add(it) }
                }
                if (chips.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        chips.forEach { Pill(it) }
                    }
                }
            }
        }
    }
}

// ── Steps ───────────────────────────────────────────────────────────

@Composable
private fun StepType(ui: WizardUi, vm: PublishWizardViewModel) {
    SectionTitle("What are you building?")
    Spacer(Modifier.height(16.dp))
    val types = listOf(
        Triple("single_dwelling", Icons.Rounded.Home, "New home" to "A house on its own title"),
        Triple("multi_dwelling", Icons.Rounded.Apartment, "Multi-dwelling" to "Townhouses, units, duplexes"),
        Triple("renovation", Icons.Rounded.Brush, "Renovation" to "Reworking an existing home"),
        Triple("extension", Icons.Rounded.OpenInFull, "Extension" to "Adding to an existing home"),
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        types.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (value, icon, copy) ->
                    BigChoiceCard(ui.fields.type == value, icon, copy.first, copy.second, Modifier.weight(1f)) {
                        vm.update { it.copy(type = value) }
                    }
                }
            }
        }
    }
}

@Composable
private fun StepLocation(ui: WizardUi, vm: PublishWizardViewModel) {
    SectionTitle("Where's the project?")
    Spacer(Modifier.height(16.dp))
    WizardField("Postcode", ui.fields.postcode, vm::onPostcodeChange, "e.g. 3000")
    if (ui.pcLoading) {
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(Modifier.size(14.dp), color = AccentLight, strokeWidth = 1.5.dp)
            Spacer(Modifier.width(8.dp)); Text("Looking up suburbs…", color = TextDim, fontSize = 12.sp)
        }
    }
    ui.pcError?.let { Spacer(Modifier.height(8.dp)); Text(it, color = Warning, fontSize = 12.sp) }
    if (ui.suburbOptions.isNotEmpty()) {
        Spacer(Modifier.height(10.dp))
        Text("WHICH SUBURB?", color = TextDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ui.suburbOptions.forEach { s -> SuburbRow(s) { vm.chooseSuburb(s) } }
        }
    }
    if (ui.fields.suburb.isNotBlank()) {
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Check, contentDescription = null, tint = Success, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(6.dp))
            Text("${ui.fields.suburb}, ${ui.fields.state}", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(16.dp))
        WizardField("Street address", ui.fields.addressLine1, vm::setStreet, "e.g. 12 Smith Street")
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Accent.copy(alpha = 0.07f))
                .border(1.dp, Accent.copy(alpha = 0.2f), RoundedCornerShape(12.dp)).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Lock, contentDescription = null, tint = AccentLight, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(8.dp))
            Text("Kept private until a builder unlocks your project.", color = TextMuted, fontSize = 12.sp, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun SuburbRow(s: SuburbDto, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SurfaceElev)
            .border(1.dp, BlueprintLine.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
            .pressable(onClick = onClick).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("${s.suburb}, ${s.state}", color = TextPrimary, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = TextDim, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun StepSpecs(ui: WizardUi, vm: PublishWizardViewModel) {
    val f = ui.fields
    SectionTitle("The essentials")
    Spacer(Modifier.height(16.dp))
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        when (f.type) {
            "single_dwelling" -> {
                PillStepper("Bedrooms", f.bedrooms, 1..7) { n -> vm.update { it.copy(bedrooms = n) } }
                PillStepper("Bathrooms", f.bathrooms, 1..5) { n -> vm.update { it.copy(bathrooms = n) } }
                PillStepper("Floors", f.floors, 1..4) { n -> vm.update { it.copy(floors = n) } }
                BandPicker("Build size", sizeOptions(BUILD_SIZES), f.buildSizeBand) { v -> vm.update { it.copy(buildSizeBand = v) } }
                BandPicker("Land size", sizeOptions(LAND_SIZES), f.landSizeBand) { v -> vm.update { it.copy(landSizeBand = v) } }
            }
            "multi_dwelling" -> {
                PillStepper("Dwellings", f.dwellingCount, 2..12) { n -> vm.update { it.copy(dwellingCount = n) } }
                PillStepper("Bedrooms each", f.bedrooms, 1..7) { n -> vm.update { it.copy(bedrooms = n) } }
                PillStepper("Bathrooms each", f.bathrooms, 1..5) { n -> vm.update { it.copy(bathrooms = n) } }
                BandPicker("Land size", sizeOptions(LAND_SIZES), f.landSizeBand) { v -> vm.update { it.copy(landSizeBand = v) } }
            }
            "renovation" -> {
                ChoiceTags("Scope", prettyOptions(RENO_SCOPES), f.renovationScopeTags) { vm.toggleScopeTag(it) }
                BandPicker("Age of home", prettyOptions(AGE_BANDS), f.existingAgeBand) { v -> vm.update { it.copy(existingAgeBand = v) } }
            }
            "extension" -> {
                BandPicker("Extension type", prettyOptions(EXT_TYPES), f.extensionType) { v -> vm.update { it.copy(extensionType = v) } }
                BandPicker("Extension size", sizeOptions(EXT_SIZES), f.extensionSizeBand) { v -> vm.update { it.copy(extensionSizeBand = v) } }
            }
            else -> Text("Pick a project type first.", color = TextMuted, fontSize = 14.sp)
        }
    }
}

@Composable
private fun StepBudget(ui: WizardUi, vm: PublishWizardViewModel) {
    val f = ui.fields
    var showCompletion by remember { mutableStateOf(f.targetCompletionMonth != null) }
    SectionTitle("Budget & timeline")
    Spacer(Modifier.height(16.dp))
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        BandPicker("Budget", budgetOptions(), f.budgetBand) { v -> vm.update { it.copy(budgetBand = v) } }
        MonthGrid("Target start", f.targetStartMonth) { v -> vm.update { it.copy(targetStartMonth = v) } }
        if (showCompletion) {
            MonthGrid("Target completion", f.targetCompletionMonth) { v -> vm.update { it.copy(targetCompletionMonth = v) } }
        } else {
            Box(
                Modifier.clip(RoundedCornerShape(50)).border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(50))
                    .pressable { showCompletion = true }.padding(horizontal = 14.dp, vertical = 9.dp),
            ) {
                Text("+ Add a completion target", color = AccentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun StepTitle(ui: WizardUi, vm: PublishWizardViewModel) {
    val f = ui.fields
    SectionTitle("Name your project")
    Spacer(Modifier.height(16.dp))
    WizardField("Title", f.title, { v -> vm.update { it.copy(title = v.take(90)) } }, "e.g. Coastal family home")
    val suggestions = buildList {
        val typeLabel = f.type?.let { ProjectLabels.type(it) }
        val loc = ProjectLabels.location(f.suburb, f.state).ifBlank { null }
        if (typeLabel != null && loc != null) add("$typeLabel in ${f.suburb}")
        if (typeLabel != null && f.bedrooms != null) add("${f.bedrooms}-bed $typeLabel")
        if (typeLabel != null) add(typeLabel)
    }.distinct().take(3)
    if (suggestions.isNotEmpty()) {
        Spacer(Modifier.height(10.dp))
        androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            suggestions.forEach { sug ->
                Box(
                    Modifier.clip(RoundedCornerShape(50)).background(SurfaceElev).border(1.dp, BlueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50))
                        .pressable { vm.update { it.copy(title = sug) } }.padding(horizontal = 12.dp, vertical = 7.dp),
                ) {
                    Text(sug, color = TextMuted, fontSize = 12.sp)
                }
            }
        }
    }
    Spacer(Modifier.height(20.dp))
    WizardField("Description", f.description, { v -> vm.update { it.copy(description = v.take(2000)) } }, "Tell builders about the project, finishes, priorities…", singleLine = false, minHeight = 110)
}

@Composable
private fun StepDocuments(ui: WizardUi, vm: PublishWizardViewModel, pickDoc: (String, String) -> Unit) {
    SectionTitle("Plans & documents")
    Spacer(Modifier.height(8.dp))
    if (ui.creatingDraft) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(Modifier.size(14.dp), color = AccentLight, strokeWidth = 1.5.dp)
            Spacer(Modifier.width(8.dp)); Text("Saving your project so files can attach…", color = TextDim, fontSize = 12.sp)
        }
        Spacer(Modifier.height(8.dp))
    }
    // Architectural (required)
    DocCategoryCard(
        title = "Architectural plans", required = true,
        docs = ui.docs.filter { it.category == "architectural" },
        onAdd = { pickDoc("architectural", "application/pdf") },
        onRemove = vm::removeDocument,
    )
    Spacer(Modifier.height(12.dp))
    OPTIONAL_DOC_CATEGORIES.forEach { cat ->
        DocCategoryCard(
            title = ProjectLabels.pretty(cat) ?: cat, required = false,
            docs = ui.docs.filter { it.category == cat },
            onAdd = { pickDoc(cat, "*/*") },
            onRemove = vm::removeDocument,
        )
        Spacer(Modifier.height(10.dp))
    }
    Spacer(Modifier.height(8.dp))
    val ready = ui.hasArchitectural
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background((if (ready) Success else Warning).copy(alpha = 0.10f))
            .border(1.dp, (if (ready) Success else Warning).copy(alpha = 0.3f), RoundedCornerShape(12.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(if (ready) Icons.Rounded.CheckCircle else Icons.Rounded.Description, contentDescription = null, tint = if (ready) Success else Warning, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(10.dp))
        Text(if (ready) "Ready to publish." else "Add an architectural plan to publish — otherwise it saves as a draft.", color = if (ready) Success else Warning, fontSize = 12.sp, lineHeight = 16.sp)
    }
}

@Composable
private fun DocCategoryCard(title: String, required: Boolean, docs: List<DocItem>, onAdd: () -> Unit, onRemove: (Long) -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SurfaceElev)
            .border(1.dp, if (required) Accent.copy(alpha = 0.35f) else BlueprintLine.copy(alpha = 0.1f), RoundedCornerShape(16.dp)).padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            if (required) Pill("Required", accent = true)
        }
        docs.forEach { d ->
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                when (d.state) {
                    DocState.UPLOADING -> CircularProgressIndicator(Modifier.size(16.dp), color = AccentLight, strokeWidth = 2.dp)
                    DocState.DONE -> Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = Success, modifier = Modifier.size(16.dp))
                    DocState.FAILED -> Icon(Icons.Rounded.Close, contentDescription = null, tint = Danger, modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(10.dp))
                Text(d.filename, color = if (d.state == DocState.FAILED) Danger else TextMuted, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                Icon(Icons.Rounded.Close, contentDescription = "Remove", tint = TextDim, modifier = Modifier.size(16.dp).pressable { onRemove(d.localId) })
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(
            Modifier.clip(RoundedCornerShape(50)).border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(50))
                .pressable(onClick = onAdd).padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Add, contentDescription = null, tint = AccentLight, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(6.dp))
            Text(if (docs.isEmpty()) "Add files" else "Add more", color = AccentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun StepReview(ui: WizardUi, vm: PublishWizardViewModel) {
    val f = ui.fields
    SectionTitle("Last look")
    Spacer(Modifier.height(16.dp))
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ReviewRow("Type", f.type?.let { ProjectLabels.type(it) } ?: "—") { vm.jumpTo(WizardStep.TYPE) }
        ReviewRow("Location", ProjectLabels.location(f.suburb, f.state).ifBlank { "—" }) { vm.jumpTo(WizardStep.LOCATION) }
        ReviewRow("Budget", ProjectLabels.budget(f.budgetBand) ?: "—") { vm.jumpTo(WizardStep.BUDGET) }
        ReviewRow("Start", f.targetStartMonth ?: "—") { vm.jumpTo(WizardStep.BUDGET) }
        ReviewRow("Title", f.title.ifBlank { "—" }) { vm.jumpTo(WizardStep.TITLE) }
        ReviewRow("Documents", "${ui.docs.count { it.state == DocState.DONE }} attached") { vm.jumpTo(WizardStep.DOCUMENTS) }
    }
    if (!ui.hasArchitectural) {
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Description, contentDescription = null, tint = Warning, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(8.dp))
            Text("Without an architectural plan this saves as a draft.", color = Warning, fontSize = 13.sp)
        }
    }
    ui.publishError?.let {
        Spacer(Modifier.height(14.dp))
        Text(it, color = Danger, fontSize = 13.sp)
    }
}

@Composable
private fun ReviewRow(label: String, value: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SurfaceElev)
            .border(1.dp, BlueprintLine.copy(alpha = 0.1f), RoundedCornerShape(14.dp))
            .pressable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = TextMuted, fontSize = 13.sp, modifier = Modifier.width(96.dp))
        Text(value, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = TextDim, modifier = Modifier.size(15.dp))
    }
}

// ── Bits ────────────────────────────────────────────────────────────

@Composable
private fun CloseRow(onClose: () -> Unit, icon: ImageVector = Icons.Rounded.Close) {
    Box(Modifier.size(40.dp).clip(CircleShape).background(Color(0x14FFFFFF)).pressable(onClick = onClose), contentAlignment = Alignment.Center) {
        Icon(icon, contentDescription = "Close", tint = TextPrimary, modifier = Modifier.size(18.dp))
    }
}
