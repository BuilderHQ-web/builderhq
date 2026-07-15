package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.PostcodeSuburbField
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.network.dto.ServiceAreaPayload

/** Step 04 · service areas — postcode + radius drafts, replace-all save. */
@Composable
internal fun Step04ServiceAreas(vm: BuilderWizardViewModel) {
    val c = Bhq.colors

    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.ServiceAreas.index,
                kicker = WizardStep.ServiceAreas.label,
                title = "Where will you",
                titleAccent = "work?",
                caption = "Add the suburbs you cover. ≥50 km gives you statewide reach in that state.",
            )
            Spacer(Modifier.height(24.dp))

            // ── added areas ──────────────────────────────────────────
            if (vm.draftServiceAreas.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    WizardSectionLabel("Your areas")
                    Spacer(Modifier.weight(1f))
                    Text(
                        "${vm.draftServiceAreas.size} added",
                        color = c.textDim,
                        fontSize = 12.sp,
                    )
                }
                Spacer(Modifier.height(10.dp))
                vm.draftServiceAreas.forEachIndexed { index, area ->
                    if (index > 0) Spacer(Modifier.height(8.dp))
                    ServiceAreaRow(
                        area = area,
                        onRemove = { vm.removeDraftServiceArea(index) },
                    )
                }
                Spacer(Modifier.height(20.dp))
            }

            // ── add-area card ────────────────────────────────────────
            val cardShape = RoundedCornerShape(16.dp)
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(c.surfaceElev)
                    .border(1.dp, c.blueprintLine.copy(alpha = 0.10f), cardShape)
                    .padding(16.dp),
            ) {
                WizardSectionLabel(
                    if (vm.draftServiceAreas.isEmpty()) "Add your first area" else "Add another",
                )
                Spacer(Modifier.height(12.dp))

                // Re-key per add so the field's internal postcode input
                // resets instead of instantly re-resolving the same suburb.
                key(vm.draftServiceAreas.size) {
                    PostcodeSuburbField(
                        selection = vm.areaDraftSelection,
                        onSelectionChange = { vm.areaDraftSelection = it },
                        lookup = vm::lookupPostcode,
                    )
                }

                AnimatedVisibility(visible = vm.areaDraftSelection != null) {
                    Column(Modifier.padding(top = 16.dp)) {
                        Row {
                            Text(
                                "${vm.areaDraftRadiusKm.toInt()}",
                                color = c.text,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.alignByBaseline(),
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "km radius",
                                color = c.textMuted,
                                fontSize = 13.sp,
                                modifier = Modifier.alignByBaseline(),
                            )
                        }
                        Slider(
                            value = vm.areaDraftRadiusKm,
                            onValueChange = { vm.areaDraftRadiusKm = it },
                            valueRange = 5f..100f,
                            steps = 18,
                        )
                        Row(Modifier.fillMaxWidth()) {
                            Text("5 km", color = c.textDim, fontSize = 11.sp)
                            Spacer(Modifier.weight(1f))
                            Text("100 km", color = c.textDim, fontSize = 11.sp)
                        }
                        Spacer(Modifier.height(12.dp))

                        val statewide = vm.areaDraftRadiusKm >= 50f
                        Text(
                            if (statewide) "STATEWIDE" else "SUBURB MATCH",
                            color = if (statewide) c.accentLight else c.textMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.6.sp,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(if (statewide) c.accentMuted else c.fillSubtle)
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                        )
                        Spacer(Modifier.height(16.dp))

                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(CircleShape)
                                .background(c.accent)
                                .pressable(onClick = vm::addDraftServiceArea)
                                .padding(vertical = 13.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Rounded.AddCircle,
                                contentDescription = null,
                                tint = c.accentContrast,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "Add area",
                                color = c.accentContrast,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = vm.draftServiceAreas.isNotEmpty(),
            isSaving = vm.isSaving,
            onContinue = vm::saveServiceAreasStep,
            onBack = vm::goBack,
            modifier = Modifier.padding(bottom = 16.dp),
        )
    }
}

@Composable
private fun ServiceAreaRow(
    area: ServiceAreaPayload,
    onRemove: () -> Unit,
) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(14.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(c.surfaceElev)
            .border(1.dp, c.blueprintLine.copy(alpha = 0.10f), shape)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            area.state,
            color = c.accentLight,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clip(CircleShape)
                .background(c.accentMuted)
                .padding(horizontal = 8.dp, vertical = 3.dp),
        )
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                area.suburb ?: "Statewide",
                color = c.text,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
            )
            Text(
                "${area.radiusKm} km" + if (area.suburb != null) " radius" else "",
                color = c.textMuted,
                fontSize = 12.sp,
            )
        }
        Icon(
            Icons.Rounded.Close,
            contentDescription = "Remove area",
            tint = c.textDim,
            modifier = Modifier.size(18.dp).pressable(onClick = onRemove),
        )
    }
}
