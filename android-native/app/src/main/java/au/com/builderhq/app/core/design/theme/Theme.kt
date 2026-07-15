package au.com.builderhq.app.core.design.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * User-facing appearance setting. Persisted in ThemeStore; the default
 * is System so a fresh install matches the phone.
 */
enum class ThemeMode { System, Light, Dark }

/**
 * Material 3 slots derived from the SAME BhqColors instance the brand
 * tokens come from, so M3 components (sheets, pull-to-refresh,
 * switches) can never drift from the brand palette.
 *
 * On light, `primary` is the DEEP teal — M3 uses primary for text-ish
 * things (radio dots, progress, links) where bright #00D4C8 would wash
 * out on cream. Custom components that want the bright fill read
 * `Bhq.colors.accent` directly.
 */
private fun schemeFor(c: BhqColors): ColorScheme = if (c.isDark) {
    darkColorScheme(
        primary = c.accent,
        onPrimary = c.accentContrast,
        secondary = c.accentLight,
        onSecondary = c.accentContrast,
        tertiary = c.secondaryBlue,
        background = c.canvas,
        onBackground = c.text,
        surface = c.surface,
        onSurface = c.text,
        surfaceVariant = c.surfaceElev,
        onSurfaceVariant = c.textMuted,
        error = c.danger,
        onError = c.accentContrast,
        outline = c.blueprintLine,
    )
} else {
    lightColorScheme(
        primary = c.accentLight,
        onPrimary = Color.White,
        secondary = c.accentDeep,
        onSecondary = Color.White,
        tertiary = c.secondaryBlue,
        background = c.canvas,
        onBackground = c.text,
        surface = c.surface,
        onSurface = c.text,
        surfaceVariant = c.surfaceElev,
        onSurfaceVariant = c.textMuted,
        error = c.danger,
        onError = Color.White,
        outline = c.blueprintLine.copy(alpha = 0.22f),
    )
}

val LocalBhqColors = staticCompositionLocalOf { BhqDarkColors }

/**
 * The standard gradient surfaces, built from the active palette.
 * Derived (not stored) so they can never fall out of sync with a
 * theme flip.
 */
@Immutable
class BhqBrushes internal constructor(c: BhqColors) {
    /** Premium card fill — CardSurface, quote cards, hero panels. */
    val card: Brush = Brush.verticalGradient(listOf(c.cardTop, c.cardBottom))
    /** Input wells — text fields, steppers, pickers. */
    val field: Brush = Brush.verticalGradient(listOf(c.fieldTop, c.fieldBottom))
    /** List rows — inbox, document lists. */
    val row: Brush = Brush.verticalGradient(listOf(c.rowTop, c.rowBottom))
}

/** Ergonomic accessors: `Bhq.colors.accentLight`, `Bhq.brushes.card`. */
object Bhq {
    val colors: BhqColors
        @Composable get() = LocalBhqColors.current

    val brushes: BhqBrushes
        @Composable get() {
            val c = LocalBhqColors.current
            return remember(c) { BhqBrushes(c) }
        }
}

/**
 * App theme. Resolves [mode] against the system setting, then provides
 * the brand tokens (LocalBhqColors) and the derived Material scheme
 * together. `staticCompositionLocalOf` means a theme flip recomposes
 * the whole tree — exactly right for an explicit toggle.
 */
@Composable
fun BuilderHqTheme(
    mode: ThemeMode = ThemeMode.System,
    content: @Composable () -> Unit,
) {
    val dark = when (mode) {
        ThemeMode.System -> isSystemInDarkTheme()
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
    }
    val colors = if (dark) BhqDarkColors else BhqLightColors
    CompositionLocalProvider(LocalBhqColors provides colors) {
        MaterialTheme(
            colorScheme = remember(colors) { schemeFor(colors) },
            typography = BhqTypography,
            content = content,
        )
    }
}
