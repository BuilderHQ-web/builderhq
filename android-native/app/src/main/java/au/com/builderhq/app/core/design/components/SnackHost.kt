package au.com.builderhq.app.core.design.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import au.com.builderhq.app.core.data.SnackController
import au.com.builderhq.app.core.data.SnackMessage
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import javax.inject.Inject

@HiltViewModel
class SnackViewModel @Inject constructor(val controller: SnackController) : ViewModel()

/** The single app-wide snackbar — slides up over everything, auto-dismisses,
 *  with an optional one-tap action (Retry, etc.). Placed once in the root. */
@Composable
fun SnackHost() {
    val vm: SnackViewModel = hiltViewModel()
    val msg by vm.controller.current.collectAsStateWithLifecycle()
    var shown by remember { mutableStateOf<SnackMessage?>(null) }
    LaunchedEffect(msg) { if (msg != null) shown = msg }
    LaunchedEffect(msg?.id) {
        val m = msg ?: return@LaunchedEffect
        delay(4200)
        vm.controller.dismiss(m.id)
    }
    Box(Modifier.fillMaxSize().navigationBarsPadding().padding(16.dp), contentAlignment = Alignment.BottomCenter) {
        AnimatedVisibility(
            visible = msg != null,
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
        ) {
            shown?.let { m ->
                SnackCard(m, onAction = { vm.controller.runAction(m.id) }, onDismiss = { vm.controller.dismiss(m.id) })
            }
        }
    }
}

@Composable
private fun SnackCard(m: SnackMessage, onAction: () -> Unit, onDismiss: () -> Unit) {
    val tint = if (m.isError) Danger else AccentLight
    Row(
        Modifier
            .shadow(18.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black, spotColor = Color.Black)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF16202F), Color(0xFF0C1422))))
            .border(1.dp, BlueprintLine.copy(alpha = 0.16f), RoundedCornerShape(16.dp))
            .padding(start = 14.dp, end = 8.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(22.dp).clip(CircleShape).background(tint.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
            Icon(if (m.isError) Icons.Rounded.ErrorOutline else Icons.Rounded.Info, contentDescription = null, tint = tint, modifier = Modifier.size(14.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(m.text, color = TextPrimary, fontSize = 14.sp, modifier = Modifier.weight(1f, fill = false))
        if (m.actionLabel != null) {
            Spacer(Modifier.width(12.dp))
            Box(
                Modifier.clip(RoundedCornerShape(50)).background(Accent.copy(alpha = 0.14f))
                    .pressable(onClick = onAction).padding(horizontal = 14.dp, vertical = 7.dp),
            ) {
                Text(m.actionLabel, color = AccentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        } else {
            Spacer(Modifier.width(4.dp))
            Box(Modifier.clip(CircleShape).pressable(onClick = onDismiss).padding(8.dp)) {
                Text("✕", color = TextMuted, fontSize = 13.sp)
            }
        }
    }
}
