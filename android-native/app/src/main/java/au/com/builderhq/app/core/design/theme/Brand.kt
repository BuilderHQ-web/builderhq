package au.com.builderhq.app.core.design.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import au.com.builderhq.app.R

/**
 * The brand's typographic voice.
 *
 * Two faces: **Instrument Serif** (bundled, OFL — the same editorial
 * face the web app and iOS use) for the display accent (the one
 * serif-italic word per headline — the single most identity-defining
 * type decision), and the system sans for all UI. Tabular figures use
 * mono.
 */
val DisplaySerif: FontFamily = FontFamily(
    Font(R.font.instrument_serif_regular, weight = FontWeight.Normal, style = FontStyle.Normal),
    Font(R.font.instrument_serif_italic, weight = FontWeight.Normal, style = FontStyle.Italic),
)
val FiguresMono: FontFamily = FontFamily.Monospace

/**
 * A headline where [accent] is painted in serif-italic + the brand gradient
 * and [plain] stays in the surrounding sans. Takes the active palette so the
 * gradient stays legible in both modes: luminous teal on dark, deep teal on
 * light (bright #00D4C8 is a fill color, not a text color, on cream).
 *
 *   Text(brandDisplay(Bhq.colors, "Tender your", "build."))
 */
fun brandDisplay(c: BhqColors, plain: String, accent: String): AnnotatedString {
    val accentBrush = Brush.linearGradient(
        if (c.isDark) listOf(c.accentLight, c.accent)
        else listOf(c.accentLight, c.accentDeep),
    )
    return buildAnnotatedString {
        if (plain.isNotEmpty()) append(if (plain.endsWith(" ")) plain else "$plain ")
        withStyle(
            SpanStyle(
                brush = accentBrush,
                fontFamily = DisplaySerif,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.Normal,
            ),
        ) {
            append(accent)
        }
    }
}
