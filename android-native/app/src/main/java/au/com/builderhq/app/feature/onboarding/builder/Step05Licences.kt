package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.HourglassEmpty
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.network.dto.BuilderLicenceDto
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

private val AU_STATES = listOf("NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT")

/**
 * Step 05 · Licences. Licences persist immediately on add/remove; the
 * footer's Continue simply advances. Mirrors the iOS step 1:1.
 */
@Composable
internal fun Step05Licences(vm: BuilderWizardViewModel) {
    val c = Bhq.colors

    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.Licences.index,
                kicker = WizardStep.Licences.label,
                title = "Show us your",
                titleAccent = "credentials.",
                caption = "Add your builder licences. VIC verifies instantly; " +
                    "other states go to manual review.",
            )
            Spacer(Modifier.height(24.dp))

            // ── existing licences ────────────────────────────────────
            if (vm.licences.isNotEmpty()) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    WizardSectionLabel("Your licences")
                    Spacer(Modifier.weight(1f))
                    Text("${vm.licences.size} added", color = c.textDim, fontSize = 12.sp)
                }
                Spacer(Modifier.height(10.dp))
                vm.licences.forEach { licence ->
                    LicenceCard(licence = licence, onRemove = { vm.removeLicence(licence.id) })
                    Spacer(Modifier.height(10.dp))
                }
                Spacer(Modifier.height(6.dp))
            }

            // ── add form / ghost trigger ─────────────────────────────
            if (vm.showingAddForm || vm.licences.isEmpty()) {
                AddLicenceForm(vm)
            } else {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(CircleShape)
                        .background(c.accentMuted)
                        .pressable { vm.showingAddForm = true }
                        .padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Add another licence",
                        color = c.accentLight,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = vm.canContinueLicences,
            isSaving = vm.isSaving,
            onContinue = vm::continueFromLicences,
            onBack = vm::goBack,
        )
    }
}

// ── licence card ─────────────────────────────────────────────────────

@Composable
private fun LicenceCard(licence: BuilderLicenceDto, onRemove: () -> Unit) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(14.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(c.surfaceElev)
            .border(1.dp, c.blueprintLine.copy(alpha = 0.10f), shape)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                licence.state,
                color = c.accentLight,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(c.accentMuted)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            )
            Spacer(Modifier.width(8.dp))
            VerifyChip(licence.verificationStatus)
            Spacer(Modifier.weight(1f))
            Icon(
                Icons.Rounded.Close,
                contentDescription = "Remove licence",
                tint = c.textDim,
                modifier = Modifier
                    .size(18.dp)
                    .pressable(onClick = onRemove),
            )
        }
        Spacer(Modifier.height(10.dp))
        Text(licence.licenceType, color = c.text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(2.dp))
        Text(
            "№ ${licence.licenceNumber}",
            color = c.textMuted,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
        )
    }
}

/** Small-caps verification chip derived from `verificationStatus`. */
@Composable
private fun VerifyChip(status: String?) {
    val c = Bhq.colors
    val (label, color, icon) = when (status) {
        "verified" -> Triple("VERIFIED", c.success, Icons.Rounded.Verified)
        "inactive" -> Triple("INACTIVE", c.warning, Icons.Rounded.WarningAmber)
        "mismatch" -> Triple("NAME MISMATCH", c.warning, Icons.Rounded.WarningAmber)
        "not_found" -> Triple("NOT FOUND", c.warning, Icons.Rounded.WarningAmber)
        "manual_review" -> Triple("MANUAL REVIEW", c.textMuted, Icons.Rounded.HourglassEmpty)
        else -> Triple("PENDING", c.textMuted, Icons.Rounded.HourglassEmpty)
    }
    Row(
        Modifier
            .clip(CircleShape)
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(12.dp))
        Spacer(Modifier.width(4.dp))
        Text(
            label,
            color = color,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
        )
    }
}

// ── add form ─────────────────────────────────────────────────────────

@Composable
private fun AddLicenceForm(vm: BuilderWizardViewModel) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(16.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(c.surfaceElev)
            .padding(16.dp),
    ) {
        WizardSectionLabel(if (vm.licences.isEmpty()) "Add your first licence" else "New licence")
        Spacer(Modifier.height(14.dp))

        // single-select state chips
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            AU_STATES.forEach { state ->
                val selected = vm.licenceDraftState == state
                Text(
                    state,
                    color = if (selected) c.accentContrast else c.textMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(if (selected) c.accent else c.fillSubtle)
                        .pressable { vm.licenceDraftState = state }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
        Spacer(Modifier.height(16.dp))

        BhqTextField(
            value = vm.licenceDraftType,
            onValueChange = { vm.licenceDraftType = it },
            label = "Licence type (e.g. Domestic Builder Unlimited)",
            error = vm.fieldErrors["licenceType"],
        )
        Spacer(Modifier.height(14.dp))
        BhqTextField(
            value = vm.licenceDraftNumber,
            onValueChange = { vm.licenceDraftNumber = it },
            label = "Licence number",
            error = vm.fieldErrors["licenceNumber"],
        )
        Spacer(Modifier.height(14.dp))
        BhqTextField(
            value = vm.licenceDraftHolder,
            onValueChange = { vm.licenceDraftHolder = it },
            label = "Licence holder name (optional)",
        )
        Spacer(Modifier.height(14.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OptionalDateField(
                label = "Issued",
                value = vm.licenceDraftIssuedAt,
                onChange = { vm.licenceDraftIssuedAt = it },
                modifier = Modifier.weight(1f),
            )
            OptionalDateField(
                label = "Expires",
                value = vm.licenceDraftExpiresAt,
                onChange = { vm.licenceDraftExpiresAt = it },
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(18.dp))

        // full-width "Add licence" pill
        Row(
            Modifier
                .fillMaxWidth()
                .clip(CircleShape)
                .background(c.accent)
                .pressable(enabled = !vm.isAddingLicence, onClick = vm::addLicence)
                .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (vm.isAddingLicence) {
                CircularProgressIndicator(
                    color = c.accentContrast,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp),
                )
            } else {
                Icon(
                    Icons.Rounded.AddCircle,
                    contentDescription = null,
                    tint = c.accentContrast,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Add licence",
                    color = c.accentContrast,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

/**
 * Optional ISO-date row: pressable field showing the raw yyyy-MM-dd
 * (or "—"), backed by a Material3 date picker; "Clear date" resets.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OptionalDateField(
    label: String,
    value: String?,
    onChange: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = Bhq.colors
    var showPicker by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(14.dp)

    Column(modifier) {
        Text(
            label.uppercase(),
            color = c.textDim,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.6.sp,
        )
        Spacer(Modifier.height(7.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(c.fillSubtle)
                .border(1.dp, c.blueprintLine.copy(alpha = 0.16f), shape)
                .pressable { showPicker = true }
                .padding(horizontal = 14.dp, vertical = 14.dp),
        ) {
            Text(
                value ?: "—",
                color = if (value != null) c.text else c.textDim,
                fontSize = 15.sp,
            )
        }
        if (value != null) {
            Text(
                "Clear date",
                color = c.danger,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .padding(top = 6.dp)
                    .clip(CircleShape)
                    .pressable { onChange(null) }
                    .padding(horizontal = 4.dp, vertical = 2.dp),
            )
        }
    }

    if (showPicker) {
        val initialMillis = value?.let {
            runCatching {
                LocalDate.parse(it).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
            }.getOrNull()
        }
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        pickerState.selectedDateMillis?.let { millis ->
                            onChange(
                                Instant.ofEpochMilli(millis)
                                    .atZone(ZoneOffset.UTC)
                                    .toLocalDate()
                                    .toString(),
                            )
                        }
                        showPicker = false
                    },
                ) { Text("Set") }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) { Text("Cancel") }
            },
        ) {
            DatePicker(state = pickerState)
        }
    }
}
