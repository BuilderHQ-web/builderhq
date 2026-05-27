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
    static let hairline         = Color.white.opacity(0.06)
    static let hairlineStrong   = Color.white.opacity(0.12)
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
