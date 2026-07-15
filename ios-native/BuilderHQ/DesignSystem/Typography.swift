/// Typography — two faces, optical-size aware.
///
///   · Display: Instrument Serif (italic variant) — used SPARINGLY,
///     only for one accent word per screen. Loaded via expo-font on
///     RN; here we register it via CTFontManager at app launch.
///   · UI / body / numeric: Apple SF Pro (the iOS system font). No
///     loading needed — the OS provides it. We expose `.font(.body)`
///     style helpers that route through Dynamic Type for native
///     accessibility support.
///
/// Naming + sizes mirror the RN v4 token system so the brand reads
/// consistent during the cross-fade between platforms.

import SwiftUI

enum Typography {
    /// Instrument Serif italic — for display accents only.
    /// Falls back to system italic if the font asset is missing.
    static func serifItalic(size: CGFloat) -> Font {
        Font.custom("InstrumentSerif-Italic", size: size)
            .italic()
    }

    /// System SF Pro — the workhorse. `weight` defaults to .regular.
    static func ui(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        Font.system(size: size, weight: weight, design: .default)
    }

    /// System SF Pro Rounded — softer feel, used for numerics where
    /// the rounded glyphs feel more financial / modern.
    static func numeric(size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        Font.system(size: size, weight: weight, design: .rounded)
            .monospacedDigit()
    }

    // ── Optical scale — mirrors RN v4 `type` token ───────────────

    /// 36/40 — Instrument Serif italic, screen-leading hero.
    static let display: Font          = serifItalic(size: 36)
    /// 52/56 — large display moment (Strava-style celebration).
    static let displayLarge: Font     = serifItalic(size: 52)
    /// 80/80 — hero number (BigNumber).
    static let displayHero: Font      = serifItalic(size: 80)

    /// 24/30 — section header.
    static let titleLarge: Font       = ui(size: 24, weight: .semibold)
    /// 19/25 — card title.
    static let title: Font            = ui(size: 19, weight: .semibold)
    /// 16/22 — small title, row primary.
    static let titleSmall: Font       = ui(size: 16, weight: .semibold)

    /// 15/22 — primary body.
    static let body: Font             = ui(size: 15, weight: .regular)
    /// 13/19 — secondary body.
    static let bodySmall: Font        = ui(size: 13, weight: .regular)

    /// 11/14 — caption + kicker.
    static let caption: Font          = ui(size: 11, weight: .semibold)

    /// 17/20 — inline number (price, count).
    static let numericInline: Font    = numeric(size: 17)
    /// 32/36 — featured number.
    static let numericLarge: Font     = numeric(size: 32, weight: .bold)
    /// 56/56 — hero number.
    static let numericHero: Font      = numeric(size: 56, weight: .bold)
}

// MARK: - Font registration

/// Loads bundled custom fonts (Instrument Serif, OFL) at launch.
///
/// The TTFs live in `Resources/Fonts/` and are bundled wholesale by
/// xcodegen's `BuilderHQ/Resources` resource path. Runtime CoreText
/// registration (`.process` scope) is the ONLY registration path —
/// there is deliberately no `UIAppFonts` Info.plist array, which is
/// unnecessary when registering at launch like this. Once registered,
/// `Font.custom("InstrumentSerif-Italic", ...)` resolves everywhere.
/// If a file is missing the guard falls through silently and SwiftUI
/// falls back to the system serif.
enum FontRegistration {
    static func registerCustomFonts() {
        let fonts = [
            "InstrumentSerif-Italic",
            "InstrumentSerif-Regular",
        ]
        for name in fonts {
            guard
                let url = Bundle.main.url(forResource: name, withExtension: "ttf")
            else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}

// MARK: - Accent-italic display helper

/// Renders a two-word display heading where the second word gets the
/// Instrument Serif italic + accent-light treatment. Matches the RN
/// `<Hero />` device.
///
/// Example: `AccentItalic(plain: "Your", italic: "projects.")`
struct AccentItalic: View {
    let plain: String
    let italic: String
    var size: CGFloat = 44

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(plain)
                .font(Typography.ui(size: size, weight: .medium))
                .foregroundStyle(Palette.text)
                .tracking(-0.4)
            Text(italic)
                .font(Typography.serifItalic(size: size))
                .foregroundStyle(Palette.accentLight)
                .tracking(-0.4)
        }
    }
}
