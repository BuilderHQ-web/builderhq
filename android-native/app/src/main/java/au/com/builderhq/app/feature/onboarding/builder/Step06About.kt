package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.theme.Bhq

/** Step 06 · about — optional bio + profile links, saved as a patch. */
@Composable
internal fun Step06About(vm: BuilderWizardViewModel) {
    val c = Bhq.colors

    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.About.index,
                kicker = WizardStep.About.label,
                title = "Show owners",
                titleAccent = "who you are.",
                caption = "Optional. A short pitch + links go on your public profile when an owner unlocks your contact.",
            )
            Spacer(Modifier.height(24.dp))

            // ── bio ──────────────────────────────────────────────────
            val bioError = vm.fieldErrors["bio"]
            val overLimit = vm.bioDraft.length > vm.bioLimit
            Row(verticalAlignment = Alignment.CenterVertically) {
                WizardSectionLabel("Bio")
                Spacer(Modifier.weight(1f))
                Text(
                    "${vm.bioDraft.length} / ${vm.bioLimit}",
                    color = if (overLimit) c.danger else c.textDim,
                    fontSize = 12.sp,
                )
            }
            Spacer(Modifier.height(8.dp))

            val bioShape = RoundedCornerShape(14.dp)
            Box(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 160.dp)
                    .clip(bioShape)
                    .background(Bhq.brushes.field)
                    .border(
                        1.dp,
                        if (bioError != null) c.danger else c.blueprintLine.copy(alpha = 0.14f),
                        bioShape,
                    )
                    .padding(14.dp),
            ) {
                if (vm.bioDraft.isEmpty()) {
                    Text(
                        "Tell owners what you build best. What makes you the right pick.",
                        color = c.textDim,
                        fontSize = 15.sp,
                        lineHeight = 21.sp,
                    )
                }
                BasicTextField(
                    value = vm.bioDraft,
                    onValueChange = { vm.bioDraft = it },
                    textStyle = TextStyle(color = c.text, fontSize = 15.sp, lineHeight = 21.sp),
                    cursorBrush = SolidColor(c.accent),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 132.dp),
                )
            }
            bioError?.let {
                Spacer(Modifier.height(6.dp))
                Text(it, color = c.danger, fontSize = 12.sp)
            }
            Spacer(Modifier.height(22.dp))

            // ── links ────────────────────────────────────────────────
            BhqTextField(
                value = vm.websiteDraft,
                onValueChange = { vm.websiteDraft = it },
                label = "Website",
                placeholder = "yourcompany.com.au",
                error = vm.fieldErrors["website"],
                keyboardType = KeyboardType.Uri,
            )
            Spacer(Modifier.height(14.dp))
            BhqTextField(
                value = vm.linkedinDraft,
                onValueChange = { vm.linkedinDraft = it },
                label = "LinkedIn",
                placeholder = "linkedin.com/in/you",
                error = vm.fieldErrors["linkedinUrl"],
                keyboardType = KeyboardType.Uri,
            )
            Spacer(Modifier.height(14.dp))
            BhqTextField(
                value = vm.instagramDraft,
                onValueChange = { vm.instagramDraft = it },
                label = "Instagram",
                placeholder = "instagram.com/yourbuild",
                error = vm.fieldErrors["instagramUrl"],
                keyboardType = KeyboardType.Uri,
                imeAction = ImeAction.Done,
            )
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = vm.canContinueAbout,
            isSaving = vm.isSaving,
            onContinue = vm::saveAboutStep,
            onBack = vm::goBack,
            modifier = Modifier.padding(bottom = 16.dp),
        )
    }
}
