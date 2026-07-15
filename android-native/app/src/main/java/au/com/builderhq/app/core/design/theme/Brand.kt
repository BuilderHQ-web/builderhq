package au.com.builderhq.app.core.design.theme

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.graphics.Brush

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

private val AccentBrush = Brush.linearGradient(listOf(AccentLight, Accent))

/**
 * A headline where [accent] is painted in serif-italic + the brand gradient
 * and [plain] stays in the surrounding sans. e.g. brandDisplay("Tender your", "build.").
 */
fun brandDisplay(plain: String, accent: String): AnnotatedString = buildAnnotatedString {
    if (plain.isNotEmpty()) append(if (plain.endsWith(" ")) plain else "$plain ")
    withStyle(SpanStyle(brush = AccentBrush, fontFamily = DisplaySerif, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Normal)) {
        append(accent)
    }
}
