/// Palette — the BuilderHQ color system, now a dual palette behind one
/// static API.
///
/// Every token is backed by a `UIColor(dynamicProvider:)` pair, so the
/// ~1,900 existing `Palette.*` call sites resolve per trait collection
/// with zero call-site changes:
///
///   · DARK — the original brand-locked look (deep navy canvas,
///     blueprint borders, luminous teal). Values unchanged.
///   · LIGHT — the builderhq.com.au web app's cream / ink / deep-teal
///     `@theme` block ported 1:1. Same rule as the web: bright teal
///     (#00D4C8) is for FILLS and glows; teal used AS TEXT drops to
///     the deep readable pair (#0A7D73 / #077E76). Borders swap from
///     blueprint-blue to the web's ink-alpha ramp.
///
/// Derived-opacity tokens (hairlines, muted washes) are explicit pairs
/// — NOT `.opacity()` off a base — because the light ramp uses
/// different alphas than the dark one.
///
/// Generative art surfaces (AmbientBackground, ProjectCoverArt,
/// CelebrationScene) own their palettes per mode via
/// `@Environment(\.colorScheme)` — they are the sanctioned exception
/// to "no hex outside this file."

import SwiftUI
import UIKit

enum Palette {
    // ── Canvas + surfaces ─────────────────────────────────────────
    static let canvas       = dyn(0x06080F, 0xECE7DD)
    static let surface      = dyn(0x0E131F, 0xFFFFFF)
    static let surfaceElev  = dyn(0x141A2A, 0xFAF8F3)

    // ── Borders ───────────────────────────────────────────────────
    //
    // Dark: blueprint-blue tinted, NOT neutral grey — the brand
    // contract; the app's edges read like draughting lines on
    // blueprint paper. Light: the web's ink ramp rgba(24,34,44,…) so
    // edges read like print rules on paper stock.
    static let blueprintLine    = dyn(0x64B4FF, 0x18222C)
    static let hairline         = dyn(0x64B4FF, 0.08, 0x18222C, 0.10)
    static let hairlineStrong   = dyn(0x64B4FF, 0.17, 0x18222C, 0.22)
    static let hairlineAccent   = dyn(0x00D4C8, 0.30, 0x099489, 0.35)

    // ── Text ──────────────────────────────────────────────────────
    static let text         = dyn(0xF5F7FF, 0x161C22)
    static let textMuted    = dyn(0x8E9BB8, 0x48535D)
    static let textDim      = dyn(0x5A6789, 0x78828D)

    // ── Accent (brand teal) ───────────────────────────────────────
    static let accent          = dyn(0x00D4C8, 0x00D4C8)
    /// Teal as TEXT: luminous on dark, deep + readable on light.
    static let accentLight     = dyn(0x7EF5ED, 0x0A7D73)
    static let accentMuted     = dyn(0x00D4C8, 0.08, 0x099489, 0.12)
    static let accentGlow      = dyn(0x00D4C8, 0.40, 0x00D4C8, 0.35)
    static let accentContrast  = dyn(0x031118, 0x031118)

    // ── Secondary brand blue ──────────────────────────────────────
    //
    // The landing's secondary brand colour (#1A5FD4), used ONLY in
    // gradients + depth blooms — never as a flat fill or a CTA.
    static let blue        = dyn(0x1A5FD4, 0x1A5FD4)
    static let blueLight   = dyn(0x5B8DEF, 0x2D63D6)
    static let blueDeep    = dyn(0x0E3A8C, 0x0E3A8C)
    static let blueGlow    = dyn(0x1A5FD4, 0.32, 0x1A5FD4, 0.30)

    /// Teal → blue diagonal — the signature "depth" gradient for
    /// hero washes, the FBA ring, celebration backdrops. Built from
    /// dynamic stops, so it resolves per trait automatically.
    static let accentToBlue = LinearGradient(
        colors: [accent, blue],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // ── Semantic ─────────────────────────────────────────────────
    // Light values match the web's oklch semantic set.
    static let success          = dyn(0x5EEAD4, 0x008A48)
    static let successMuted     = dyn(0x5EEAD4, 0.10, 0x008A48, 0.12)
    static let warning          = dyn(0xFBBF24, 0xB26A08)
    static let warningMuted     = dyn(0xFBBF24, 0.10, 0xB26A08, 0.12)
    static let danger           = dyn(0xFB7185, 0xCC272E)
    static let dangerMuted      = dyn(0xFB7185, 0.10, 0xCC272E, 0.12)
    /// Award / winner accents (trophy tint, awarded pills, winning-
    /// tender edges). Deep amber on light so it stays readable on
    /// cream and white cards.
    static let gold             = dyn(0xF5C24A, 0x8C5A12)

    /// The signature accent-italic gradient — used on display titles
    /// where one word gets the Instrument Serif italic treatment.
    /// Dark: ice-white into luminous teal. Light: the deep teal pair
    /// (bright teal is a fill color, not a text color, on cream).
    static let accentItalicGradient = LinearGradient(
        colors: [
            dyn(0xEEF6FF, 0x0A7D73),
            dyn(0x7EF5ED, 0x077E76),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // ── Premium card system ──────────────────────────────────────
    //
    // Dashboard cards float on the background: 1px top-edge
    // highlight, soft drop shadow, subtle top-down gradient in the
    // fill. Dark keeps the navy float; light reads as white paper on
    // cream with an ink shadow.
    static let cardTop           = dyn(0x162033, 0xFFFFFF)
    static let cardBottom        = dyn(0x0C1424, 0xFAF8F3)
    static let cardEdgeHighlight = dyn(0xCFE6FF, 0.07, 0xFFFFFF, 0.70)
    static let cardBorder        = dyn(0x64B4FF, 0.12, 0x18222C, 0.14)
    static let cardShadow        = dyn(0x00D4C8, 0.10, 0x18222C, 0.08)

    // MARK: - Time-of-day accent

    /// Subtly shifted accent based on the user's local clock — a
    /// nearly-imperceptible warmth in the morning, the standard brand
    /// teal during work hours, a cooler turquoise in the evening +
    /// late night. Light mode shifts the same way through the deep
    /// readable teals.
    ///
    /// Used on personal-feel surfaces (greeting accent line, FBA hero
    /// ring) — NOT on system elements like CTAs or status pills.
    static func accentForTime(_ date: Date = .now) -> Color {
        let hour = Calendar.current.component(.hour, from: date)
        switch hour {
        case 5..<9:    return dyn(0x14E0CC, 0x0E8A7E)  // dawn
        case 9..<17:   return dyn(0x00D4C8, 0x0A7D73)  // work hours
        case 17..<21:  return dyn(0x00BFB8, 0x08706A)  // dusk
        default:       return dyn(0x09A8A0, 0x06615C)  // night
        }
    }

    // MARK: - Dynamic pair builders

    private static func dyn(_ dark: UInt32, _ light: UInt32) -> Color {
        Color(UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(hex: dark)
                : UIColor(hex: light)
        })
    }

    private static func dyn(
        _ dark: UInt32, _ darkAlpha: CGFloat,
        _ light: UInt32, _ lightAlpha: CGFloat
    ) -> Color {
        Color(UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(hex: dark, alpha: darkAlpha)
                : UIColor(hex: light, alpha: lightAlpha)
        })
    }
}

// MARK: - Hex initializers

extension Color {
    /// `Color(hex: 0x00D4C8)` — the convenience missing from SwiftUI.
    /// Splits the integer into RGB components in sRGB color space.
    /// Static (non-adaptive) — used by art surfaces that own their
    /// own per-mode palettes.
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8)  & 0xFF) / 255.0
        let b = Double(hex         & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}

extension UIColor {
    /// UIKit twin of `Color(hex:)` for the dynamic-provider closures.
    convenience init(hex: UInt32, alpha: CGFloat = 1.0) {
        let r = CGFloat((hex >> 16) & 0xFF) / 255.0
        let g = CGFloat((hex >> 8)  & 0xFF) / 255.0
        let b = CGFloat(hex         & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b, alpha: alpha)
    }
}
