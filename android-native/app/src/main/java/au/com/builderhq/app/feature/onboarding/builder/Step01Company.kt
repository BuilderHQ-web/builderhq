package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.AuPhoneField
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion

/**
 * Step 01 · Company — ABN-first. Verify against the ABR to lock the
 * legal name in, or skip into manual entry after a failed lookup.
 * Business details + contact phone reveal once the ABN question is
 * settled. Mirrors the iOS Step01Company 1:1.
 */
@Composable
internal fun Step01Company(vm: BuilderWizardViewModel) {
    val c = Bhq.colors

    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.Company.index,
                kicker = WizardStep.Company.label,
                title = "Start with",
                titleAccent = "your ABN.",
                caption = "We'll look you up on the ABR and pre-fill the rest. Takes a second.",
            )
            Spacer(Modifier.height(24.dp))

            // ── ABN + verify ─────────────────────────────────────────
            BhqTextField(
                value = vm.abnDraft,
                onValueChange = { v ->
                    if (!vm.abnLocked) vm.abnDraft = v.filter(Char::isDigit).take(11)
                },
                label = "ABN",
                keyboardType = KeyboardType.Number,
                enabled = !vm.abnLocked,
                error = vm.fieldErrors["abn"],
                modifier = Modifier.alpha(if (vm.abnLocked) 0.7f else 1f),
            )
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                val digits = vm.abnDraft.count { it.isDigit() }
                if (vm.abnDraft.isNotEmpty() && digits < 11 && !vm.abnLocked) {
                    Text("$digits / 11 digits", color = c.textDim, fontSize = 12.sp)
                }
                Spacer(Modifier.weight(1f))
                if (vm.abnLocked) {
                    Row(
                        Modifier
                            .clip(CircleShape)
                            .background(c.fillSubtle)
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Rounded.Lock, contentDescription = null,
                            tint = c.textMuted, modifier = Modifier.size(13.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text("Locked", color = c.textMuted, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                } else {
                    val verifying = vm.abnVerifyState is AbnVerifyState.Verifying
                    val canVerify = digits == 11 && !verifying
                    Row(
                        Modifier
                            .clip(CircleShape)
                            .background(if (canVerify || verifying) c.accent else c.accent.copy(alpha = 0.35f))
                            .pressable(enabled = canVerify, onClick = vm::runAbnVerify)
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (verifying) {
                            CircularProgressIndicator(
                                color = c.accentContrast, strokeWidth = 2.dp,
                                modifier = Modifier.size(14.dp),
                            )
                        } else {
                            Text("Verify", color = c.accentContrast, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            // ── verify outcome ───────────────────────────────────────
            when (val s = vm.abnVerifyState) {
                is AbnVerifyState.Verified -> {
                    Spacer(Modifier.height(16.dp))
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(c.accentMuted)
                            .border(1.dp, c.accent.copy(alpha = 0.30f), RoundedCornerShape(14.dp))
                            .padding(16.dp),
                    ) {
                        Text(
                            "VERIFIED",
                            color = c.accentLight,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(s.matchedName, color = c.text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "ABN locked. We'll show this name on your public profile.",
                            color = c.textMuted,
                            fontSize = 13.sp,
                            lineHeight = 18.sp,
                        )
                    }
                }
                is AbnVerifyState.Failed -> {
                    Spacer(Modifier.height(16.dp))
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(c.warning.copy(alpha = 0.10f))
                            .border(1.dp, c.warning.copy(alpha = 0.28f), RoundedCornerShape(14.dp))
                            .padding(16.dp),
                    ) {
                        Text(
                            "COULDN'T VERIFY",
                            color = c.warning,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(s.reason, color = c.text, fontSize = 14.sp, lineHeight = 20.sp)
                        Spacer(Modifier.height(12.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Try a different ABN",
                                color = c.accentLight,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .pressable(onClick = vm::tryDifferentAbn)
                                    .padding(vertical = 4.dp),
                            )
                            Spacer(Modifier.width(20.dp))
                            Text(
                                "Skip for now",
                                color = c.textMuted,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .pressable(onClick = vm::skipAbnForNow)
                                    .padding(vertical = 4.dp),
                            )
                        }
                    }
                }
                else -> Unit
            }

            // ── business details (post-verify / manual) ──────────────
            val verifyState = vm.abnVerifyState
            val detailsVisible = verifyState !is AbnVerifyState.Verifying &&
                (vm.manualMode ||
                    verifyState is AbnVerifyState.Verified ||
                    verifyState is AbnVerifyState.Failed)
            AnimatedVisibility(
                visible = detailsVisible,
                enter = fadeIn(tween(Motion.BASE, easing = Motion.EaseOut)) +
                    expandVertically(tween(Motion.BASE, easing = Motion.EaseOutSoft)),
                exit = fadeOut(tween(Motion.FAST)) +
                    shrinkVertically(tween(Motion.FAST)),
            ) {
                Column {
                    Spacer(Modifier.height(28.dp))
                    WizardSectionLabel("Business details")
                    Spacer(Modifier.height(14.dp))
                    BhqTextField(
                        value = vm.companyNameDraft,
                        onValueChange = { if (!vm.abnLocked) vm.companyNameDraft = it },
                        label = if (vm.abnLocked) "Legal entity name (from ABR)" else "Legal entity name",
                        enabled = !vm.abnLocked,
                        error = vm.fieldErrors["companyName"],
                        modifier = Modifier.alpha(if (vm.abnLocked) 0.7f else 1f),
                    )
                    Spacer(Modifier.height(16.dp))
                    BhqTextField(
                        value = vm.tradingNameDraft,
                        onValueChange = { vm.tradingNameDraft = it },
                        label = "Trading name (optional)",
                        error = vm.fieldErrors["tradingName"],
                    )
                    Spacer(Modifier.height(16.dp))
                    BhqTextField(
                        value = vm.acnDraft,
                        onValueChange = { v -> vm.acnDraft = v.filter(Char::isDigit) },
                        label = "ACN (optional)",
                        keyboardType = KeyboardType.Number,
                        error = vm.fieldErrors["acn"],
                    )
                    Spacer(Modifier.height(16.dp))
                    BhqTextField(
                        value = vm.yearsDraft,
                        onValueChange = { v -> vm.yearsDraft = v.filter(Char::isDigit) },
                        label = "Years",
                        keyboardType = KeyboardType.Number,
                        error = vm.fieldErrors["yearsInOperation"],
                    )
                    Spacer(Modifier.height(28.dp))
                    WizardSectionLabel("Contact phone")
                    Spacer(Modifier.height(14.dp))
                    AuPhoneField(
                        value = vm.phoneDraft,
                        onValueChange = { vm.phoneDraft = it },
                        error = vm.fieldErrors["phone"],
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Used for tender coordination and account verification.",
                        color = c.textDim,
                        fontSize = 12.sp,
                        lineHeight = 17.sp,
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = vm.canContinueCompany,
            isSaving = vm.isSaving,
            onContinue = vm::saveCompanyStep,
            modifier = Modifier.padding(bottom = 16.dp),
        )
    }
}
