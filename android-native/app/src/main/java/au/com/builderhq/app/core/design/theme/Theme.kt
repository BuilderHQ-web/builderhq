package au.com.builderhq.app.core.design.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Core brand colours mapped onto Material 3's fixed slots. The app is
// brand-locked dark — we deliberately ignore Material You dynamic colour.
private val BhqColorScheme = darkColorScheme(
    primary = Accent,
    onPrimary = AccentContrast,
    secondary = AccentLight,
    onSecondary = AccentContrast,
    tertiary = SecondaryBlue,
    background = Canvas,
    onBackground = TextPrimary,
    surface = Surface1,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceElev,
    onSurfaceVariant = TextMuted,
    error = Danger,
    onError = AccentContrast,
    outline = BlueprintLine,
)

/**
 * Brand tokens that don't map onto Material's fixed colour slots (the
 * blueprint line, accent-light, the text tiers, semantics). Exposed via
 * CompositionLocal so any composable can read e.g. `Bhq.colors.blueprintLine`.
 */
@Immutable
data class BhqColors(
    val accent: Color,
    val accentLight: Color,
    val accentMuted: Color,
    val blueprintLine: Color,
    val secondaryBlue: Color,
    val textMuted: Color,
    val textDim: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
)

private val bhqColors = BhqColors(
    accent = Accent,
    accentLight = AccentLight,
    accentMuted = AccentMuted,
    blueprintLine = BlueprintLine,
    secondaryBlue = SecondaryBlue,
    textMuted = TextMuted,
    textDim = TextDim,
    success = Success,
    warning = Warning,
    danger = Danger,
)

val LocalBhqColors = staticCompositionLocalOf { bhqColors }

/** Ergonomic accessor: `Bhq.colors.accentLight`. */
object Bhq {
    val colors: BhqColors
        @Composable get() = LocalBhqColors.current
}

@Composable
fun BuilderHqTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalBhqColors provides bhqColors) {
        MaterialTheme(
            colorScheme = BhqColorScheme,
            typography = BhqTypography,
            content = content,
        )
    }
}
