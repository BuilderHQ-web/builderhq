package au.com.builderhq.app.core.design

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback

/**
 * Tiered haptics for a tactile, premium feel.
 *   · [tick]    — feather-light, for toggles + selector changes
 *   · [press]   — standard button-commit
 *   · [confirm] — the heavy "thunk" reserved for the big moments
 *                 (unlock, tender submit) via the system vibrator
 */
class BhqHaptics(
    private val compose: HapticFeedback,
    private val vibrator: Vibrator?,
) {
    fun tick() = compose.performHapticFeedback(HapticFeedbackType.TextHandleMove)

    fun press() = compose.performHapticFeedback(HapticFeedbackType.LongPress)

    fun confirm() {
        val v = vibrator
        if (v == null || !v.hasVibrator()) {
            compose.performHapticFeedback(HapticFeedbackType.LongPress)
            return
        }
        if (Build.VERSION.SDK_INT >= 29) {
            v.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(VibrationEffect.createOneShot(22, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }
}

@Composable
fun rememberHaptics(): BhqHaptics {
    val compose = LocalHapticFeedback.current
    val context = LocalContext.current
    return remember(compose, context) { BhqHaptics(compose, vibratorOf(context)) }
}

private fun vibratorOf(context: Context): Vibrator? =
    if (Build.VERSION.SDK_INT >= 31) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
