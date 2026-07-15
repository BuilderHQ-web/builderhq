@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package au.com.builderhq.app.feature.tenders

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AttachMoney
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.GhostButton
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.ProgressRing
import au.com.builderhq.app.core.design.components.SegmentedControl
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.FiguresMono
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.model.TradeCatalog
import kotlinx.coroutines.launch
import java.time.YearMonth

private val VALIDITY_OPTIONS = listOf(7, 14, 30, 60, 90)

@Composable
fun TenderComposerScreen(
    onBack: () -> Unit,
    onDone: () -> Unit,
    vm: TenderComposerViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    // Draft-safety: flush debounced edits before leaving, and whenever the app
    // is backgrounded — the draft never loses the last few keystrokes.
    BackHandler(enabled = !ui.submitted) { vm.flushPending(); onBack() }
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) { vm.flushPending() }
    AmbientBackground {
        when {
            ui.submitted -> SubmittedView(onDone)
            ui.loadError != null && ui.tenderId == null -> LoadFailed(ui.loadError, onBack)
            ui.loading -> LoadingHeader(onBack)
            else -> ComposerForm(ui, vm, onBack)
        }
    }
}

@Composable
private fun ComposerForm(ui: ComposerUi, vm: TenderComposerViewModel, onBack: () -> Unit) {
    var pickerOpen by remember { mutableStateOf(false) }
    var reviewOpen by remember { mutableStateOf(false) }
    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Header(ui, onBack)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            AutosaveChip(ui.saveState)
        }
        Spacer(Modifier.height(14.dp))

        HeroPriceField(ui.price, ui.priceValue, vm::onPrice)

        Spacer(Modifier.height(24.dp))
        BhqTextField(
            value = ui.durationWeeks, onValueChange = vm::onDuration, label = "Build duration (weeks)",
            placeholder = "e.g. 16", keyboardType = KeyboardType.Number, imeAction = ImeAction.Done,
        )

        Spacer(Modifier.height(20.dp))
        Text("QUOTE VALIDITY", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
        Spacer(Modifier.height(8.dp))
        SegmentedControl(
            options = VALIDITY_OPTIONS.map { "${it}d" },
            selectedIndex = VALIDITY_OPTIONS.indexOf(ui.validityDays),
            onSelect = { vm.onValidity(VALIDITY_OPTIONS[it]) },
        )

        Spacer(Modifier.height(20.dp))
        Text("PROPOSED START", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
        Spacer(Modifier.height(8.dp))
        MonthStepper(ui.startMonth, onStep = { delta -> vm.onStartMonth(stepMonth(ui.startMonth, delta)) })

        Spacer(Modifier.height(28.dp))
        CostBreakdown(ui, vm, onAdd = { pickerOpen = true })

        Spacer(Modifier.height(24.dp))
        Kicker("Your pitch")
        Spacer(Modifier.height(12.dp))
        TextArea(ui.pitch, vm::onPitch, "Message to the owner", "Why you're the right builder for this project…")

        Spacer(Modifier.height(24.dp))
        Kicker("Exclusions")
        Spacer(Modifier.height(6.dp))
        Text("What's not included — keeps your quote honest.", color = Bhq.colors.textDim, fontSize = 12.sp)
        Spacer(Modifier.height(12.dp))
        ExclusionsSection(ui.exclusions, vm::addExclusion, vm::removeExclusion)

        Spacer(Modifier.height(24.dp))
        Kicker("Conditions")
        Spacer(Modifier.height(12.dp))
        TextArea(ui.conditions, vm::onConditions, "Conditions (optional)", "Assumptions, provisional sums, access requirements…")

        if (ui.error != null) {
            Spacer(Modifier.height(18.dp))
            Text(ui.error, color = Bhq.colors.danger, fontSize = 13.sp)
        }

        Spacer(Modifier.height(24.dp))
        PrimaryButton(
            "Review & submit", onClick = { reviewOpen = true },
            enabled = ui.canSubmit, modifier = Modifier.fillMaxWidth(),
        )
        if (!ui.canSubmit && ui.missing.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text(
                "Before you submit: ${ui.missing.joinToString(", ") { missingLabel(it) }}.",
                color = Bhq.colors.textMuted, fontSize = 13.sp,
            )
        }
        Spacer(Modifier.height(40.dp))
    }

    if (pickerOpen) {
        TradePickerSheet(
            taken = ui.lines.map { it.trade }.toSet(),
            onPick = { vm.addLine(it); pickerOpen = false },
            onDismiss = { pickerOpen = false },
        )
    }

    if (reviewOpen) {
        ReviewSheet(
            ui = ui,
            onConfirm = vm::submit,
            onDismiss = { if (!ui.submitting) reviewOpen = false },
        )
    }
}

// ── Header with completeness ring ───────────────────────────────────

@Composable
private fun Header(ui: ComposerUi, onBack: () -> Unit) {
    val done = (3 - ui.missing.size).coerceIn(0, 3)
    Row(verticalAlignment = Alignment.CenterVertically) {
        CircleBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text("Your tender", color = Bhq.colors.text, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(
                if (ui.canSubmit) "Ready to submit" else "$done of 3 essentials done",
                color = if (ui.canSubmit) Bhq.colors.accentLight else Bhq.colors.textMuted, fontSize = 13.sp,
            )
        }
        Box(contentAlignment = Alignment.Center) {
            ProgressRing(progress = done / 3f, diameter = 48.dp, thickness = 5.dp)
            Text("$done/3", color = Bhq.colors.text, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

// ── Autosave chip ───────────────────────────────────────────────────

/** Subtle, ever-present reassurance that the draft is being saved. */
@Composable
private fun AutosaveChip(state: SaveState) {
    AnimatedVisibility(visible = state != SaveState.Idle, enter = fadeIn(), exit = fadeOut()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            when (state) {
                SaveState.Saving -> {
                    CircularProgressIndicator(modifier = Modifier.size(11.dp), color = Bhq.colors.textDim, strokeWidth = 1.5.dp)
                    Spacer(Modifier.width(7.dp))
                    Text("Saving…", color = Bhq.colors.textDim, fontSize = 12.sp)
                }
                SaveState.Saved -> {
                    Icon(Icons.Rounded.Check, contentDescription = null, tint = Bhq.colors.accent, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Saved", color = Bhq.colors.textMuted, fontSize = 12.sp)
                }
                SaveState.Failed -> {
                    Icon(Icons.Rounded.CloudOff, contentDescription = null, tint = Bhq.colors.danger, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Couldn't save — we'll retry", color = Bhq.colors.danger, fontSize = 12.sp)
                }
                SaveState.Idle -> Unit
            }
        }
    }
}

// ── Month stepper ───────────────────────────────────────────────────

@Composable
private fun MonthStepper(month: String?, onStep: (Int) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Bhq.brushes.field)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.16f), RoundedCornerShape(14.dp))
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CircleBtn(Icons.Rounded.ChevronLeft, "Earlier", { onStep(-1) }, small = true)
        Text(
            monthLabel(month),
            color = if (month == null) Bhq.colors.textMuted else Bhq.colors.text,
            fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        CircleBtn(Icons.Rounded.ChevronRight, "Later", { onStep(1) }, small = true)
    }
}

// ── Cost breakdown ──────────────────────────────────────────────────

@Composable
private fun CostBreakdown(ui: ComposerUi, vm: TenderComposerViewModel, onAdd: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Kicker("Cost breakdown")
        if (ui.lineSum > 0) Text(formatAud(ui.lineSum), color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
    Spacer(Modifier.height(6.dp))
    Text("Optional, but a trade breakdown wins trust.", color = Bhq.colors.textDim, fontSize = 12.sp)
    Spacer(Modifier.height(12.dp))

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ui.lines.forEachIndexed { i, line ->
            CostLineRow(
                line = line,
                onAmount = { vm.onLineAmount(i, it) },
                onLabel = { vm.onLineLabel(i, it) },
                onRemove = { vm.removeLine(i) },
            )
        }
    }
    if (ui.lines.isNotEmpty()) Spacer(Modifier.height(10.dp))
    AddTradeButton(onAdd)

    val variance = ui.variance
    if (variance != null && ui.priceValue != null) {
        Spacer(Modifier.height(10.dp))
        when {
            variance == 0L -> VarianceNote("Breakdown matches your price.", Bhq.colors.success)
            variance > 0L -> VarianceNote("Breakdown is ${formatAud(variance)} over your price.", Bhq.colors.warning)
            else -> VarianceNote("${formatAud(-variance)} of your price isn't itemised yet.", Bhq.colors.textMuted)
        }
    }
}

@Composable
private fun CostLineRow(line: LineRow, onAmount: (String) -> Unit, onLabel: (String) -> Unit, onRemove: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Bhq.brushes.field)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (line.trade == "other") "Custom line" else TradeCatalog.label(line.trade),
                color = Bhq.colors.text, fontSize = 14.sp, fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            AmountField(line.amount, onAmount)
            Spacer(Modifier.width(6.dp))
            Box(
                Modifier.size(28.dp).clip(RoundedCornerShape(50)).clickable(remember { MutableInteractionSource() }, indication = null, onClick = onRemove),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Close, contentDescription = "Remove", tint = Bhq.colors.textDim, modifier = Modifier.size(16.dp))
            }
        }
        if (line.trade == "other") {
            Spacer(Modifier.height(8.dp))
            BasicTextField(
                value = line.label, onValueChange = onLabel,
                textStyle = TextStyle(color = Bhq.colors.text, fontSize = 13.sp),
                cursorBrush = SolidColor(Bhq.colors.accent),
                decorationBox = { inner ->
                    if (line.label.isEmpty()) Text("Name this line (e.g. Pool)", color = Bhq.colors.textDim, fontSize = 13.sp)
                    inner()
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun AmountField(value: String, onChange: (String) -> Unit) {
    Row(
        Modifier.width(132.dp).clip(RoundedCornerShape(10.dp)).background(Color(0x14000000))
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.14f), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("$", color = Bhq.colors.textDim, fontSize = 14.sp)
        Spacer(Modifier.width(2.dp))
        BasicTextField(
            value = value, onValueChange = onChange,
            textStyle = TextStyle(color = Bhq.colors.text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
            singleLine = true, cursorBrush = SolidColor(Bhq.colors.accent),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            decorationBox = { inner ->
                if (value.isEmpty()) Text("0", color = Bhq.colors.textDim, fontSize = 14.sp)
                inner()
            },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun AddTradeButton(onAdd: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .border(1.dp, Bhq.colors.accent.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
            .pressable(onClick = onAdd)
            .padding(vertical = 13.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Add, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text("Add a trade", color = Bhq.colors.accentLight, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun VarianceNote(text: String, color: Color) {
    Text(text, color = color, fontSize = 12.sp, fontWeight = FontWeight.Medium)
}

// ── Trade picker sheet ──────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TradePickerSheet(taken: Set<String>, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, containerColor = Bhq.colors.sheet) {
        Text(
            "Add a trade", color = Bhq.colors.text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 8.dp),
        )
        LazyColumn(Modifier.fillMaxWidth().heightIn(max = 460.dp)) {
            items(TradeCatalog.all.filter { it.id == "other" || it.id !in taken }, key = { it.id }) { trade ->
                Row(
                    Modifier.fillMaxWidth().clickable(remember { MutableInteractionSource() }, indication = null) { onPick(trade.id) }
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(trade.label, color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        if (trade.hint != null) {
                            Spacer(Modifier.height(2.dp))
                            Text(trade.hint, color = Bhq.colors.textDim, fontSize = 12.sp)
                        }
                    }
                    Icon(Icons.Rounded.Add, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(20.dp))
                }
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}

// ── Review step (final confirm before submit) ───────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReviewSheet(ui: ComposerUi, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, containerColor = Bhq.colors.sheet) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(start = 24.dp, end = 24.dp, bottom = 28.dp),
        ) {
            Kicker("Review your tender")
            Spacer(Modifier.height(16.dp))
            Text(
                ui.priceValue?.let { formatAud(it) } ?: "No price set",
                color = Bhq.colors.accentLight, fontSize = 34.sp, fontWeight = FontWeight.Bold,
            )
            Text("Total price to the owner", color = Bhq.colors.textMuted, fontSize = 13.sp)

            Spacer(Modifier.height(22.dp))
            ReviewRow("Build duration", ui.durationWeeks.toIntOrNull()?.let { "$it weeks" } ?: "—")
            ReviewRow("Quote valid for", ui.validityDays?.let { "$it days" } ?: "—")
            ReviewRow("Proposed start", monthLabel(ui.startMonth))

            val lines = ui.lines.filter { (it.amount.toLongOrNull() ?: 0L) > 0 }
            if (lines.isNotEmpty()) {
                Spacer(Modifier.height(20.dp))
                Text("COST BREAKDOWN", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
                Spacer(Modifier.height(10.dp))
                lines.forEach { l ->
                    ReviewRow(
                        if (l.trade == "other") l.label.ifBlank { "Custom line" } else TradeCatalog.label(l.trade),
                        formatAud(l.amount.toLongOrNull() ?: 0L),
                        dim = true,
                    )
                }
                ui.variance?.let { v ->
                    Spacer(Modifier.height(8.dp))
                    when {
                        v == 0L -> Text("Breakdown matches your price.", color = Bhq.colors.success, fontSize = 12.sp)
                        v > 0L -> Text("Breakdown is ${formatAud(v)} over your price.", color = Bhq.colors.warning, fontSize = 12.sp)
                        else -> Text("${formatAud(-v)} of your price isn't itemised.", color = Bhq.colors.textMuted, fontSize = 12.sp)
                    }
                }
            }

            if (ui.pitch.isNotBlank()) {
                Spacer(Modifier.height(20.dp))
                Text("YOUR PITCH", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
                Spacer(Modifier.height(8.dp))
                Text(ui.pitch, color = Bhq.colors.textMuted, fontSize = 14.sp, lineHeight = 21.sp)
            }
            if (ui.exclusions.isNotEmpty()) {
                Spacer(Modifier.height(20.dp))
                Text("EXCLUSIONS", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
                Spacer(Modifier.height(8.dp))
                Text(ui.exclusions.joinToString("  ·  "), color = Bhq.colors.textMuted, fontSize = 14.sp, lineHeight = 21.sp)
            }
            if (ui.conditions.isNotBlank()) {
                Spacer(Modifier.height(20.dp))
                Text("CONDITIONS", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
                Spacer(Modifier.height(8.dp))
                Text(ui.conditions, color = Bhq.colors.textMuted, fontSize = 14.sp, lineHeight = 21.sp)
            }

            if (ui.error != null) {
                Spacer(Modifier.height(16.dp))
                Text(ui.error, color = Bhq.colors.danger, fontSize = 13.sp)
            }

            Spacer(Modifier.height(24.dp))
            PrimaryButton(
                "Confirm & submit", onClick = onConfirm,
                loading = ui.submitting, modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(6.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                GhostButton("Keep editing", onClick = onDismiss)
            }
        }
    }
}

@Composable
private fun ReviewRow(label: String, value: String, dim: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 7.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Bhq.colors.textMuted, fontSize = 14.sp)
        Text(
            value,
            color = if (dim) Bhq.colors.textMuted else Bhq.colors.text,
            fontSize = 14.sp,
            fontWeight = if (dim) FontWeight.Medium else FontWeight.SemiBold,
        )
    }
}

// ── Multiline text area ─────────────────────────────────────────────

@Composable
private fun TextArea(value: String, onValueChange: (String) -> Unit, label: String, placeholder: String) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val shape = RoundedCornerShape(14.dp)
    val border by animateColorAsState(if (focused) Bhq.colors.accent else Bhq.colors.blueprintLine.copy(alpha = 0.16f), label = "areaBorder")
    Column {
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
        Spacer(Modifier.height(7.dp))
        Box(
            Modifier.fillMaxWidth().clip(shape).background(Bhq.brushes.field).border(1.5.dp, border, shape).padding(14.dp),
        ) {
            if (value.isEmpty()) Text(placeholder, color = Bhq.colors.textDim, fontSize = 15.sp, lineHeight = 21.sp)
            BasicTextField(
                value = value, onValueChange = onValueChange,
                textStyle = TextStyle(color = Bhq.colors.text, fontSize = 15.sp, lineHeight = 21.sp),
                cursorBrush = SolidColor(Bhq.colors.accent), interactionSource = interaction,
                modifier = Modifier.fillMaxWidth().heightIn(min = 96.dp),
            )
        }
    }
}

// ── States ──────────────────────────────────────────────────────────

// ── Hero price field (live-grouped) ─────────────────────────────────

@Composable
private fun HeroPriceField(raw: String, value: Long?, onChange: (String) -> Unit) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("TOTAL PRICE (AUD)", color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
        Spacer(Modifier.height(12.dp))
        Box(contentAlignment = Alignment.Center) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text("$", color = if (value != null) Bhq.colors.accentLight else Bhq.colors.textDim, fontSize = 26.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 6.dp))
                Spacer(Modifier.width(2.dp))
                Text(
                    if (value != null) "%,d".format(value) else "0",
                    color = if (value != null) Bhq.colors.text else Bhq.colors.textDim,
                    fontFamily = FiguresMono, fontSize = 46.sp, fontWeight = FontWeight.Bold,
                )
            }
            BasicTextField(
                value = raw, onValueChange = onChange, singleLine = true,
                textStyle = TextStyle(color = Color.Transparent, fontSize = 46.sp),
                cursorBrush = SolidColor(Color.Transparent),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                modifier = Modifier.matchParentSize().alpha(0f),
            )
        }
        Spacer(Modifier.height(8.dp))
        Box(Modifier.width(120.dp).height(2.dp).clip(RoundedCornerShape(50)).background(if (value != null) Bhq.colors.accent else Bhq.colors.blueprintLine.copy(alpha = 0.2f)))
    }
}

// ── Exclusions ──────────────────────────────────────────────────────

@Composable
private fun ExclusionsSection(items: List<String>, onAdd: (String) -> Unit, onRemove: (Int) -> Unit) {
    var draft by remember { mutableStateOf("") }
    Column {
        if (items.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items.forEachIndexed { i, ex -> ExclusionChip(ex) { onRemove(i) } }
            }
            Spacer(Modifier.height(12.dp))
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(Bhq.brushes.field)
                    .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.14f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 13.dp),
            ) {
                if (draft.isEmpty()) Text("e.g. Landscaping, pool", color = Bhq.colors.textDim, fontSize = 14.sp)
                BasicTextField(
                    value = draft, onValueChange = { draft = it.take(80) }, singleLine = true,
                    textStyle = TextStyle(color = Bhq.colors.text, fontSize = 14.sp), cursorBrush = SolidColor(Bhq.colors.accent),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.width(8.dp))
            Box(
                Modifier.size(46.dp).clip(RoundedCornerShape(12.dp))
                    .background(if (draft.isBlank()) Bhq.colors.accent.copy(alpha = 0.3f) else Bhq.colors.accent)
                    .pressable(enabled = draft.isNotBlank()) { onAdd(draft); draft = "" },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Add exclusion", tint = Bhq.colors.accentContrast, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun ExclusionChip(text: String, onRemove: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(Bhq.colors.fillSubtle)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.14f), RoundedCornerShape(50))
            .padding(start = 12.dp, end = 8.dp, top = 7.dp, bottom = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text, color = Bhq.colors.textMuted, fontSize = 13.sp)
        Spacer(Modifier.width(6.dp))
        Icon(Icons.Rounded.Close, contentDescription = "Remove", tint = Bhq.colors.textDim, modifier = Modifier.size(14.dp).pressable(onClick = onRemove))
    }
}

// ── States ──────────────────────────────────────────────────────────

@Composable
private fun SubmittedView(onDone: () -> Unit) {
    val c = Bhq.colors
    val haptics = rememberHaptics()
    val checkScale = remember { Animatable(0f) }
    val ring = remember { Animatable(0f) }
    var showText by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        haptics.confirm()
        launch { ring.animateTo(1f, tween(720, easing = Motion.EaseOutSoft)) }
        checkScale.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 520f))
        showText = true
    }
    Column(
        Modifier.fillMaxSize().statusBarsPadding().padding(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(150.dp)) {
                val p = ring.value
                if (p in 0.001f..0.999f) {
                    drawCircle(
                        color = c.accent.copy(alpha = (1f - p) * 0.5f),
                        radius = (size.minDimension / 2f) * (0.5f + p * 0.5f),
                        style = Stroke(width = 3.dp.toPx()),
                    )
                }
            }
            Icon(
                Icons.Rounded.CheckCircle, contentDescription = null, tint = c.accent,
                modifier = Modifier
                    .size(86.dp)
                    .graphicsLayer { scaleX = checkScale.value; scaleY = checkScale.value },
            )
        }
        Spacer(Modifier.height(24.dp))
        AnimatedVisibility(
            visible = showText,
            enter = fadeIn(tween(Motion.BASE)) +
                slideInVertically(tween(Motion.BASE, easing = Motion.EaseOut)) { it / 3 },
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Tender submitted", color = Bhq.colors.text, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Text(
                    "The owner has been notified. You'll hear back through your inbox — keep an eye out.",
                    color = Bhq.colors.textMuted, fontSize = 15.sp, lineHeight = 22.sp, textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(30.dp))
                PrimaryButton("Done", onClick = onDone, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun LoadingHeader(onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().padding(16.dp)) {
        CircleBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
    }
}

@Composable
private fun LoadFailed(message: String, onBack: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(16.dp)) {
            CircleBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
        }
        Column(
            Modifier.fillMaxSize().padding(36.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
        ) {
            Text("Couldn't start your tender", color = Bhq.colors.text, fontSize = 19.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Text(message, color = Bhq.colors.textMuted, fontSize = 14.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}

@Composable
private fun CircleBtn(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit, small: Boolean = false) {
    val s = if (small) 32.dp else 42.dp
    Box(
        Modifier.size(s).clip(RoundedCornerShape(50)).background(Bhq.colors.fillSubtle)
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = Bhq.colors.text, modifier = Modifier.size(if (small) 20.dp else 20.dp))
    }
}

// ── helpers ─────────────────────────────────────────────────────────

private fun formatAud(v: Long): String = "$" + "%,d".format(v)

private fun missingLabel(key: String): String = when (key) {
    "total_price" -> "add a price"
    "duration" -> "set a duration"
    "validity" -> "pick a validity period"
    else -> key.replace('_', ' ')
}

private fun monthLabel(month: String?): String {
    if (month == null) return "Flexible"
    val ym = runCatching { YearMonth.parse(month) }.getOrNull() ?: return "Flexible"
    val m = ym.month.name.lowercase().replaceFirstChar { it.uppercase() }
    return "$m ${ym.year}"
}

private fun stepMonth(cur: String?, delta: Int): String {
    val now = YearMonth.now()
    if (cur == null) return now.plusMonths(1).toString()
    val base = runCatching { YearMonth.parse(cur) }.getOrNull() ?: now.plusMonths(1)
    val next = base.plusMonths(delta.toLong())
    return (if (next.isBefore(now)) now else next).toString()
}
