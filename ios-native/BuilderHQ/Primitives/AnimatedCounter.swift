/// AnimatedCounter — number text that tweens from one value to another.
///
/// Used everywhere a stat lands on the dashboard: FBA credits, tender
/// counts, dollar amounts, win rates. Animating the number on appear
/// (from 0 to the real value) makes the dashboard feel alive — static
/// digits make the screen feel printed.
///
/// Two construction modes:
///
///   · `Int` — for whole numbers. Renders as `42`.
///   · `Double` — for fractional values + dollars. Format with the
///     supplied `formatter` so callers can spell `$1,234` / `67%` / etc.
///
/// Animation is cubic ease-out — fast at the start, lazy at the end —
/// which feels more natural than linear for "counting up" UX.

import SwiftUI

struct AnimatedCounter: View, Animatable {
    /// Target final value. The view re-tweens any time this changes.
    var value: Double

    /// Formatter applied to every intermediate value during the tween.
    /// Defaults to `Int()`-style whole-number output.
    var formatter: (Double) -> String

    /// Font + colour + tracking are passed in so the counter inherits
    /// the surrounding type system rather than imposing its own.
    var font: Font = Typography.numericHero
    var color: Color = Palette.text

    /// SwiftUI's Animatable hook — interpolated by the view layer
    /// during animations. Returning the live tween value here means
    /// every frame re-renders with the in-progress number.
    var animatableData: Double {
        get { value }
        set { value = newValue }
    }

    var body: some View {
        Text(formatter(value))
            .font(font)
            .foregroundStyle(color)
            .monospacedDigit()
            .contentTransition(.numericText())
    }
}

// MARK: - Convenience initializers

extension AnimatedCounter {
    /// Whole-number counter — formats as `42`.
    init(
        intValue: Int,
        font: Font = Typography.numericHero,
        color: Color = Palette.text
    ) {
        self.init(
            value: Double(intValue),
            formatter: { v in String(Int(v.rounded())) },
            font: font,
            color: color
        )
    }

    /// Dollar counter — formats as `$1,234`. Handles thousand commas.
    init(
        dollars: Int,
        font: Font = Typography.numericHero,
        color: Color = Palette.text
    ) {
        self.init(
            value: Double(dollars),
            formatter: { v in
                let n = Int(v.rounded())
                let nf = NumberFormatter()
                nf.numberStyle = .currency
                nf.currencyCode = "AUD"
                nf.maximumFractionDigits = 0
                nf.locale = Locale(identifier: "en_AU")
                return nf.string(from: NSNumber(value: n)) ?? "$\(n)"
            },
            font: font,
            color: color
        )
    }

    /// Compact dollar counter for tile use ($1.2K, $48K, $1.2M).
    init(
        dollarsCompact: Int,
        font: Font = Typography.numericHero,
        color: Color = Palette.text
    ) {
        self.init(
            value: Double(dollarsCompact),
            formatter: { v in
                let n = Int(v.rounded())
                switch n {
                case 0..<1_000:
                    return "$\(n)"
                case 1_000..<1_000_000:
                    let k = Double(n) / 1_000
                    return String(format: k.truncatingRemainder(dividingBy: 1) == 0 ? "$%.0fK" : "$%.1fK", k)
                default:
                    let m = Double(n) / 1_000_000
                    return String(format: m.truncatingRemainder(dividingBy: 1) == 0 ? "$%.0fM" : "$%.1fM", m)
                }
            },
            font: font,
            color: color
        )
    }

    /// Percent counter — formats `67%` (assumes the input is already 0-100).
    init(
        percent: Double,
        font: Font = Typography.numericHero,
        color: Color = Palette.text
    ) {
        self.init(
            value: percent,
            formatter: { v in "\(Int(v.rounded()))%" },
            font: font,
            color: color
        )
    }
}

// MARK: - Animation timing helper

extension Animation {
    /// Cubic ease-out, ~700ms — the "count-up" feel. Fast off the line,
    /// gentle at the finish, never feels mechanical.
    static let counterReveal = Animation.timingCurve(0.22, 1, 0.36, 1, duration: 0.7)
}
