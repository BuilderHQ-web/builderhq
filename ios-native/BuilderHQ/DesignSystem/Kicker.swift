/// Kicker — the brand-canonical section label.
///
/// A short uppercase label preceded by a 30pt glowing teal rule —
/// the exact "eyebrow" device from the landing page (`<Eyebrow />`).
/// Standardises the dozen hand-rolled uppercase section labels that
/// had each drifted on tracking / size / colour, so every section
/// header across the app speaks with one voice.
///
///   Kicker("Founding access")
///   Kicker("For you", trailing: "3 matches")

import SwiftUI

struct Kicker: View {
    let text: String
    var trailing: String? = nil
    var tint: Color = Palette.accent

    init(_ text: String, trailing: String? = nil, tint: Color = Palette.accent) {
        self.text = text
        self.trailing = trailing
        self.tint = tint
    }

    var body: some View {
        HStack(spacing: 9) {
            // 30pt glowing rule.
            RoundedRectangle(cornerRadius: 1, style: .continuous)
                .fill(tint)
                .frame(width: 26, height: 2)
                .shadow(color: tint.opacity(0.6), radius: 4)

            Text(text.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(2.2)
                .foregroundStyle(tint)

            if let trailing {
                Spacer(minLength: 8)
                Text(trailing.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
            }
        }
    }
}

/// Radius — the considered corner-radius scale.
///
/// The brand leans precise/engineered (the landing uses very tight
/// radii). On mobile we keep native-iOS warmth but systematise: one
/// scale, applied consistently, so nothing reads accidentally bubbly
/// or accidentally harsh. Reach for these instead of raw numbers.
enum Radius {
    /// Chips, small pills, tags.
    static let chip: CGFloat = 9
    /// Inputs, small tiles, inner rows.
    static let control: CGFloat = 13
    /// Standard content cards.
    static let card: CGFloat = 18
    /// Flagship hero cards + sheets.
    static let hero: CGFloat = 24
}
