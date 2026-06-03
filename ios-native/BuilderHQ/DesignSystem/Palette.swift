/// Palette — the 13-color BuilderHQ system, Swift-native edition.
///
/// 1:1 port of `mobile/lib/theme.ts` palette tokens so the brand reads
/// identical between the (archived) RN build and this native one. If
/// either changes, mirror the change to the other until the RN build
/// is fully retired.
///
/// Naming convention matches the RN tokens for cognitive continuity.

import SwiftUI

enum Palette {
    // ── Canvas + surfaces ─────────────────────────────────────────
    static let canvas       = Color(hex: 0x06080F)
    static let surface      = Color(hex: 0x0E131F)
    static let surfaceElev  = Color(hex: 0x141A2A)

    // ── Borders ───────────────────────────────────────────────────
    //
    // Blueprint-blue tinted, NOT neutral grey — the brand contract
    // (`reference/landing`) specifies `rgba(100,180,255, 0.06–0.18)`.
    // 0x64B4FF == (100,180,255). Tinting every hairline this way is
    // the single most identity-defining token change: the whole app's
    // edges read like draughting lines on blueprint paper rather than
    // generic dark-mode strokes. Every component references these
    // tokens, so this propagates everywhere at once.
    static let blueprintLine    = Color(hex: 0x64B4FF)
    static let hairline         = Color(hex: 0x64B4FF).opacity(0.08)
    static let hairlineStrong   = Color(hex: 0x64B4FF).opacity(0.17)
    static let hairlineAccent   = Color(hex: 0x00D4C8).opacity(0.30)

    // ── Text ──────────────────────────────────────────────────────
    static let text         = Color(hex: 0xF5F7FF)
    static let textMuted    = Color(hex: 0x8E9BB8)
    static let textDim      = Color(hex: 0x5A6789)

    // ── Accent (brand teal) ───────────────────────────────────────
    static let accent          = Color(hex: 0x00D4C8)
    static let accentLight     = Color(hex: 0x7EF5ED)
    static let accentMuted     = Color(hex: 0x00D4C8).opacity(0.08)
    static let accentGlow      = Color(hex: 0x00D4C8).opacity(0.40)
    static let accentContrast  = Color(hex: 0x031118)

    // ── Secondary brand blue ──────────────────────────────────────
    //
    // The landing's secondary brand colour (#1A5FD4), used ONLY in
    // gradients + depth blooms — never as a flat fill or a CTA. Gives
    // the teal-monochrome palette a second axis so heroes, washes and
    // the ambient atmosphere gain real depth (teal foreground → blue
    // depth) instead of reading as one flat hue.
    static let blue        = Color(hex: 0x1A5FD4)
    static let blueLight   = Color(hex: 0x5B8DEF)
    static let blueDeep    = Color(hex: 0x0E3A8C)
    static let blueGlow    = Color(hex: 0x1A5FD4).opacity(0.32)

    /// Teal → blue diagonal — the signature "depth" gradient for
    /// hero washes, the FBA ring, celebration backdrops.
    static let accentToBlue = LinearGradient(
        colors: [Color(hex: 0x00D4C8), Color(hex: 0x1A5FD4)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // ── Semantic ─────────────────────────────────────────────────
    static let success          = Color(hex: 0x5EEAD4)
    static let successMuted     = Color(hex: 0x5EEAD4).opacity(0.10)
    static let warning          = Color(hex: 0xFBBF24)
    static let warningMuted     = Color(hex: 0xFBBF24).opacity(0.10)
    static let danger           = Color(hex: 0xFB7185)
    static let dangerMuted      = Color(hex: 0xFB7185).opacity(0.10)

    /// The signature accent-italic gradient — used on display titles
    /// where one word gets the Instrument Serif italic treatment.
    /// Mirrors the landing page's "accent-italic" device.
    static let accentItalicGradient = LinearGradient(
        colors: [
            Color(hex: 0xEEF6FF),
            Color(hex: 0x7EF5ED),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // ── Premium card system ──────────────────────────────────────
    //
    // The dashboard adopts a "floating-on-the-background" treatment:
    // every card has a 1px top-edge highlight, a soft drop shadow,
    // and a subtle top-down gradient inside the fill. These tokens
    // are what the CardSurface modifier reaches for.

    /// Top stop on the card fill gradient — slightly lighter than the
    /// resting surface so the card has a "light from above" feel.
    static let cardTop           = Color(hex: 0x162033)
    /// Bottom stop on the card fill gradient — slightly darker than
    /// the resting surface so the card recedes at the base.
    static let cardBottom        = Color(hex: 0x0C1424)
    /// 1px highlight rendered along the top edge of every premium
    /// card. A cool near-white so the "light catches the top edge"
    /// read stays crisp while leaning faintly blueprint.
    static let cardEdgeHighlight = Color(hex: 0xCFE6FF).opacity(0.07)
    /// Border for premium cards — blueprint-blue tinted, slightly
    /// stronger than `hairline` so the card edge stays crisp even
    /// with the inner gradient.
    static let cardBorder        = Color(hex: 0x64B4FF).opacity(0.12)
    /// Drop-shadow tone for floating cards. A very-soft accent-tinted
    /// shadow sells the depth more than pure black.
    static let cardShadow        = Color(hex: 0x00D4C8).opacity(0.10)

    // MARK: - Time-of-day accent

    /// Subtly shifted accent based on the user's local clock — a
    /// nearly-imperceptible warmth in the morning, the standard
    /// brand teal during work hours, a cooler turquoise in the
    /// evening + late night.
    ///
    /// Used on personal-feel surfaces (greeting accent line, FBA
    /// hero ring) — NOT on system elements like CTAs or status
    /// pills, which stick to the canonical `accent` so brand reads
    /// consistent across the app.
    static func accentForTime(_ date: Date = .now) -> Color {
        let hour = Calendar.current.component(.hour, from: date)
        switch hour {
        case 5..<9:    return Color(hex: 0x14E0CC)  // dawn — slightly warmer cyan
        case 9..<17:   return Color(hex: 0x00D4C8)  // canonical brand teal
        case 17..<21:  return Color(hex: 0x00BFB8)  // dusk — cooler, slightly darker
        default:       return Color(hex: 0x09A8A0)  // night — deeper, calmer teal
        }
    }
}

// MARK: - Hex initializer

extension Color {
    /// `Color(hex: 0x00D4C8)` — the convenience missing from SwiftUI.
    /// Splits the integer into RGB components in sRGB color space.
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8)  & 0xFF) / 255.0
        let b = Double(hex         & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}
