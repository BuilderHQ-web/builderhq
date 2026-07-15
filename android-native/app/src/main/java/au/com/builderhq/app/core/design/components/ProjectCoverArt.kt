package au.com.builderhq.app.core.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.Architecture
import androidx.compose.material.icons.rounded.Handyman
import androidx.compose.material.icons.rounded.HomeWork
import androidx.compose.material.icons.rounded.OpenInFull
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlin.math.abs

private val CoverPalettes = listOf(
    listOf(Color(0xFF0E2A33), Color(0xFF06121A)),
    listOf(Color(0xFF13233A), Color(0xFF070D18)),
    listOf(Color(0xFF1B2433), Color(0xFF0A0E18)),
    listOf(Color(0xFF223041), Color(0xFF0B121C)),
    listOf(Color(0xFF14322F), Color(0xFF06120F)),
)

/** Deterministic, generated cover for a project — gradient picked by id,
 *  a faint blueprint grid, a teal corner bloom, and a big architectural
 *  glyph keyed to the project type. No image assets, always on-brand.
 *  Caller is expected to clip (cards/hero already do). */
@Composable
fun ProjectCoverArt(
    seed: String,
    type: String,
    modifier: Modifier = Modifier,
) {
    val pal = CoverPalettes[abs(seed.hashCode()) % CoverPalettes.size]
    val glyph = when (type) {
        "single_dwelling" -> Icons.Rounded.HomeWork
        "multi_dwelling" -> Icons.Rounded.Apartment
        "renovation" -> Icons.Rounded.Handyman
        "extension" -> Icons.Rounded.OpenInFull
        else -> Icons.Rounded.Architecture
    }
    Box(
        modifier
            .background(Brush.verticalGradient(pal))
            .drawBehind {
                val spacing = 26.dp.toPx()
                val line = Color(0xFF64B4FF).copy(alpha = 0.06f)
                var x = spacing
                while (x < size.width) {
                    drawLine(line, Offset(x, 0f), Offset(x, size.height), 1f)
                    x += spacing
                }
                var y = spacing
                while (y < size.height) {
                    drawLine(line, Offset(0f, y), Offset(size.width, y), 1f)
                    y += spacing
                }
                // Seed-varied teal bloom (alternates corner) + an opposite blue
                // depth bloom — every cover reads a little different.
                val left = abs(seed.hashCode()) % 2 == 0
                drawRect(
                    Brush.radialGradient(
                        listOf(Color(0xFF00D4C8).copy(alpha = 0.18f), Color.Transparent),
                        center = Offset(size.width * (if (left) 0.16f else 0.84f), 0f),
                        radius = size.width * 0.6f,
                    ),
                )
                drawRect(
                    Brush.radialGradient(
                        listOf(Color(0xFF1A5FD4).copy(alpha = 0.12f), Color.Transparent),
                        center = Offset(size.width * (if (left) 0.9f else 0.1f), size.height),
                        radius = size.width * 0.5f,
                    ),
                )
                // Blueprint registration corner ticks — the draughting motif.
                val tick = 12.dp.toPx()
                val inset = 12.dp.toPx()
                val tc = Color(0xFF64B4FF).copy(alpha = 0.24f)
                val sw = 1.4.dp.toPx()
                val w = size.width
                val h = size.height
                drawLine(tc, Offset(inset, inset), Offset(inset + tick, inset), sw)
                drawLine(tc, Offset(inset, inset), Offset(inset, inset + tick), sw)
                drawLine(tc, Offset(w - inset, inset), Offset(w - inset - tick, inset), sw)
                drawLine(tc, Offset(w - inset, inset), Offset(w - inset, inset + tick), sw)
                drawLine(tc, Offset(inset, h - inset), Offset(inset + tick, h - inset), sw)
                drawLine(tc, Offset(inset, h - inset), Offset(inset, h - inset - tick), sw)
                drawLine(tc, Offset(w - inset, h - inset), Offset(w - inset - tick, h - inset), sw)
                drawLine(tc, Offset(w - inset, h - inset), Offset(w - inset, h - inset - tick), sw)
            },
    ) {
        Icon(
            glyph,
            contentDescription = null,
            tint = Color(0xFF64B4FF).copy(alpha = 0.10f),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .offset(x = 22.dp, y = 22.dp)
                .size(132.dp),
        )
    }
}
