package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.HourglassEmpty
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.DisplaySerif
import au.com.builderhq.app.core.design.theme.Motion
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WizardSessionViewModel @Inject constructor(
    private val session: SessionRepository,
) : ViewModel() {
    fun signOut() {
        viewModelScope.launch { session.logout() }
    }
}

/**
 * The 7-step builder onboarding wizard — the server `needsOnboarding`
 * gate. Steps 1/2/6 patch the profile, 3/4 replace-all, licences
 * persist on add. Submitting flips the account to approved or
 * pending_review; "Open dashboard" pushes the fresh user into the
 * session, which routes to the main shell.
 */
@Composable
fun BuilderWizard(
    vm: BuilderWizardViewModel = hiltViewModel(),
    sessionVm: WizardSessionViewModel = hiltViewModel(),
) {
    val c = Bhq.colors

    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 20.dp),
        ) {
            // ── top bar: brand kicker + sign out ─────────────────────
            Row(
                Modifier.fillMaxWidth().padding(top = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(c.accent))
                Spacer(Modifier.width(8.dp))
                Text(
                    "BUILDERHQ",
                    color = c.accentLight,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.4.sp,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    "Sign out",
                    color = c.textDim,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .clip(CircleShape)
                        .pressable { sessionVm.signOut() }
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }
            Spacer(Modifier.height(14.dp))

            if (vm.outcome == null) {
                WizardProgress(
                    total = WizardStep.entries.size,
                    current = vm.step.ordinal,
                )
                Spacer(Modifier.height(8.dp))
            }

            // ── body: outcome view or the animated step ──────────────
            if (vm.outcome != null) {
                WizardOutcomeView(vm)
            } else {
                AnimatedContent(
                    targetState = vm.step,
                    transitionSpec = {
                        val dir = if (vm.forward) 1 else -1
                        (slideInHorizontally(tween(Motion.BASE, easing = Motion.EaseOutSoft)) { it / 3 * dir } +
                            fadeIn(tween(Motion.BASE)))
                            .togetherWith(
                                slideOutHorizontally(tween(Motion.FAST)) { -it / 4 * dir } +
                                    fadeOut(tween(Motion.FAST)),
                            )
                    },
                    label = "wizardStep",
                    modifier = Modifier.weight(1f),
                ) { step ->
                    when (step) {
                        WizardStep.Company -> Step01Company(vm)
                        WizardStep.Address -> Step02Address(vm)
                        WizardStep.Categories -> Step03Categories(vm)
                        WizardStep.ServiceAreas -> Step04ServiceAreas(vm)
                        WizardStep.Licences -> Step05Licences(vm)
                        WizardStep.About -> Step06About(vm)
                        WizardStep.Review -> Step07Review(vm)
                    }
                }
            }
        }

        // ── hydrating overlay ────────────────────────────────────────
        if (vm.isHydrating) {
            Column(
                Modifier
                    .fillMaxSize()
                    .background(c.canvas.copy(alpha = 0.96f)),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                CircularProgressIndicator(color = c.accent, strokeWidth = 2.5.dp, modifier = Modifier.size(28.dp))
                Spacer(Modifier.height(14.dp))
                Text(
                    "Picking up where you left off",
                    color = c.textMuted,
                    fontSize = 14.sp,
                )
            }
        }
    }
}

/** Post-submit outcome: approved ("You're in.") or pending review. */
@Composable
private fun WizardOutcomeView(vm: BuilderWizardViewModel) {
    val c = Bhq.colors
    val approved = vm.outcome == WizardOutcome.Approved

    Column(
        Modifier.fillMaxSize().padding(bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(84.dp)
                .clip(CircleShape)
                .background(if (approved) c.accentMuted else c.fillSubtle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (approved) Icons.Rounded.Check else Icons.Rounded.HourglassEmpty,
                contentDescription = null,
                tint = if (approved) c.accent else c.textMuted,
                modifier = Modifier.size(38.dp),
            )
        }
        Spacer(Modifier.height(22.dp))
        Text(
            if (approved) "You're in." else "Submitted.",
            color = c.text,
            fontSize = 34.sp,
            fontWeight = FontWeight.Normal,
            fontFamily = DisplaySerif,
            fontStyle = FontStyle.Italic,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            if (approved) "Account approved. Welcome to BuilderHQ."
            else "We're reviewing your account. You'll hear from us within 24 hours.",
            color = c.textMuted,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            lineHeight = 21.sp,
            modifier = Modifier.padding(horizontal = 24.dp),
        )
        Spacer(Modifier.height(30.dp))
        WizardFooter(
            canContinue = true,
            isSaving = false,
            onContinue = vm::finish,
            continueLabel = "Open dashboard",
            modifier = Modifier.padding(horizontal = 24.dp),
        )
    }
}
