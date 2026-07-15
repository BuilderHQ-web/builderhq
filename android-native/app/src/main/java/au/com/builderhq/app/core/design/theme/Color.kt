package au.com.builderhq.app.core.design.theme

import androidx.compose.ui.graphics.Color

/**
 * Brand palette — mirrors the iOS DesignSystem/Palette and the web
 * globals.css 1:1. The single most identity-defining rule: borders are
 * blueprint-blue (#64B4FF), never neutral grey.
 */

internal val Canvas = Color(0xFF06080F)
internal val Surface1 = Color(0xFF0E131F)
internal val SurfaceElev = Color(0xFF141A2A)

internal val Accent = Color(0xFF00D4C8)
internal val AccentLight = Color(0xFF7EF5ED)
internal val AccentMuted = Color(0x2400D4C8) // teal @ ~14%
internal val AccentContrast = Color(0xFF031118)

internal val SecondaryBlue = Color(0xFF1A5FD4)
internal val BlueprintLine = Color(0xFF64B4FF)

internal val TextPrimary = Color(0xFFF5F7FF)
internal val TextMuted = Color(0xFF8E9BB8)
internal val TextDim = Color(0xFF5A6789)

internal val Success = Color(0xFF5EEAD4)
internal val Warning = Color(0xFFFBBF24)
internal val Danger = Color(0xFFFB7185)
internal val Gold = Color(0xFFF5C24A) // award / winner accents
