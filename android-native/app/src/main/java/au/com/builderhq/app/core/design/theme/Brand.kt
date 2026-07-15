package au.com.builderhq.app.core.design.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle

/**
 * The brand's typographic voice.
 *
 * Two faces: an editorial **serif** for the display accent (the one
 * serif-italic word per headline — the single most identity-defining type
 * decision, shared with the web + iOS apps) and the system sans for all UI.
 * Tabular figures use mono. We use the system serif/mono so there are zero
 * bundled assets and no runtime font fetch — swap [DisplaySerif] to a bundled
 * Instrument Serif `res/font` later and every headline upgrades for free.
 */
val DisplaySerif: FontFamily = FontFamily.Serif
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
