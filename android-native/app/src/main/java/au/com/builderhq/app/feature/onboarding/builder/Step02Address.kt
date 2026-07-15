package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.PostcodeSuburbField
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion

/**
 * Step 02 · Address — registered business address (pre-filled from the
 * ABR when available) plus an optional separate postal address. The
 * whole step is recommended, not required, so Continue is always live.
 * Mirrors the iOS Step02Address 1:1.
 */
@Composable
internal fun Step02Address(vm: BuilderWizardViewModel) {
    val c = Bhq.colors

    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.Address.index,
                kicker = WizardStep.Address.label,
                title = "Where do you",
                titleAccent = "trade from?",
                caption = "Your registered business address. We pre-fill it from the ABR when we can.",
            )
            Spacer(Modifier.height(24.dp))

            // ── business address ─────────────────────────────────────
            WizardSectionLabel("Business address")
            Spacer(Modifier.height(14.dp))
            BhqTextField(
                value = vm.businessStreetDraft,
                onValueChange = { vm.businessStreetDraft = it },
                label = "Street",
                error = vm.fieldErrors["businessAddressLine1"],
            )
            Spacer(Modifier.height(16.dp))
            PostcodeSuburbField(
                selection = vm.businessSelection,
                onSelectionChange = { vm.businessSelection = it },
                lookup = vm::lookupPostcode,
                error = vm.fieldErrors["businessPostcode"],
            )

            Spacer(Modifier.height(24.dp))

            // ── different-postal toggle ──────────────────────────────
            val checked = vm.hasDifferentPostal
            val checkFill by animateColorAsState(
                if (checked) c.accent else c.fillFaint,
                label = "postalCheckFill",
            )
            val checkBorder by animateColorAsState(
                if (checked) c.accent else c.blueprintLine.copy(alpha = 0.30f),
                label = "postalCheckBorder",
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .pressable { vm.hasDifferentPostal = !vm.hasDifferentPostal }
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(20.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(checkFill)
                        .border(1.5.dp, checkBorder, RoundedCornerShape(6.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    if (checked) {
                        Icon(
                            Icons.Rounded.Check, contentDescription = null,
                            tint = c.accentContrast, modifier = Modifier.size(14.dp),
                        )
                    }
                }
                Spacer(Modifier.width(10.dp))
                Text(
                    "Postal address is different from my business address",
                    color = c.text,
                    fontSize = 14.sp,
                    lineHeight = 19.sp,
                    modifier = Modifier.weight(1f),
                )
            }

            // ── postal address ───────────────────────────────────────
            AnimatedVisibility(
                visible = vm.hasDifferentPostal,
                enter = fadeIn(tween(Motion.BASE, easing = Motion.EaseOut)) +
                    expandVertically(tween(Motion.BASE, easing = Motion.EaseOutSoft)),
                exit = fadeOut(tween(Motion.FAST)) +
                    shrinkVertically(tween(Motion.FAST)),
            ) {
                Column {
                    Spacer(Modifier.height(20.dp))
                    WizardSectionLabel("Postal address")
                    Spacer(Modifier.height(14.dp))
                    BhqTextField(
                        value = vm.postalStreetDraft,
                        onValueChange = { vm.postalStreetDraft = it },
                        label = "Street",
                    )
                    Spacer(Modifier.height(16.dp))
                    PostcodeSuburbField(
                        selection = vm.postalSelection,
                        onSelectionChange = { vm.postalSelection = it },
                        lookup = vm::lookupPostcode,
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = true, // recommended, not required
            isSaving = vm.isSaving,
            onContinue = vm::saveAddressStep,
            onBack = vm::goBack,
            modifier = Modifier.padding(bottom = 16.dp),
        )
    }
}
