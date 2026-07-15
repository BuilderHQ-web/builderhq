package au.com.builderhq.app.feature.messaging

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import au.com.builderhq.app.core.design.theme.Bhq
import kotlinx.coroutines.delay

/** Round initials avatar — the messaging identity unit. */
@Composable
internal fun InitialsAvatar(initials: String, modifier: Modifier = Modifier, size: Int = 48) {
    Box(
        modifier.size(size.dp).clip(CircleShape).background(Bhq.colors.accent.copy(alpha = 0.16f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            initials.ifBlank { "·" }.take(2).uppercase(),
            color = Bhq.colors.accentLight,
            fontWeight = FontWeight.Bold,
            fontSize = (size * 0.36f).sp,
        )
    }
}

/** Calls [onTick] every [intervalMs] while the screen is RESUMED, pausing on
 *  background and stopping when the screen leaves composition. Mirrors the RN
 *  useFocusEffect polling (inbox 15s / thread 4s). */
@Composable
internal fun FocusPolling(intervalMs: Long, onTick: () -> Unit) {
    val owner = LocalLifecycleOwner.current
    LaunchedEffect(owner, intervalMs) {
        owner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                delay(intervalMs)
                onTick()
            }
        }
    }
}
