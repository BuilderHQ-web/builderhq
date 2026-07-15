package au.com.builderhq.app.feature.shell

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.theme.DisplaySerif
import au.com.builderhq.app.core.design.components.GhostButton
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion

@Composable
fun WelcomeScreen(onGetStarted: () -> Unit, onLogin: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AmbientBackground {
        Column(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Reveal(visible, 0) { Kicker("Now live in Australia") }
            Spacer(Modifier.height(22.dp))
            Reveal(visible, 1) {
                Text(
                    "Tender your build.",
                    fontSize = 46.sp, lineHeight = 50.sp,
                    fontWeight = FontWeight.SemiBold, color = Bhq.colors.text,
                )
            }
            Reveal(visible, 2) {
                Text(
                    "In days.",
                    fontSize = 48.sp, lineHeight = 52.sp,
                    fontFamily = DisplaySerif, fontStyle = FontStyle.Italic,
                    fontWeight = FontWeight.Normal, color = Bhq.colors.accentLight,
                )
            }
            Spacer(Modifier.height(18.dp))
            Reveal(visible, 3) {
                Text(
                    "Upload your plans. Verified builders match, unlock, and tender. You compare side-by-side and decide.",
                    fontSize = 16.sp, lineHeight = 24.sp, color = Bhq.colors.textMuted,
                )
            }
            Spacer(Modifier.height(12.dp))
            Reveal(visible, 4) {
                Text(
                    "VERIFIED BUILDERS · ABN-CHECKED · AUSTRALIA-WIDE",
                    fontSize = 10.sp, letterSpacing = 1.4.sp,
                    fontWeight = FontWeight.SemiBold, color = Bhq.colors.textDim,
                )
            }
            Spacer(Modifier.height(34.dp))
            Reveal(visible, 5) {
                PrimaryButton(
                    "Get started",
                    onClick = onGetStarted,
                    leadingIcon = Icons.AutoMirrored.Rounded.ArrowForward,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(6.dp))
            Reveal(visible, 6, Modifier.align(Alignment.CenterHorizontally)) {
                GhostButton("I already have an account", onClick = onLogin)
            }
        }
    }
}

@Composable
private fun Reveal(
    visible: Boolean,
    index: Int,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(tween(560, delayMillis = index * 85, easing = Motion.EaseOutSoft)) +
            slideInVertically(tween(560, delayMillis = index * 85, easing = Motion.EaseOutSoft)) { it / 4 },
    ) { content() }
}
