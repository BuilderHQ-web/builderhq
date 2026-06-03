/// GreetingHeader — the moment of arrival.
///
/// Three stacked elements:
///
///   1. Kicker row — a small accent dot + the current weekday in
///      small caps. Anchors the page to "today" and gives the
///      headline visual breathing room from the top of the screen.
///   2. Two-line headline — "Good evening,\n<name>." with the name
///      in Instrument Serif italic in a time-of-day-shifted accent.
///      Bigger than the auth screens (44pt vs 40pt) — this is the
///      first thing the user sees every time they open the app.
///   3. Subtitle — short, factual ("3 new matches today" / "Hang
///      tight while we review"). Sits below an accent dividing line.
///
/// Reveal animation is owned by the parent (`hasRevealed`). When that
/// flips from false→true the three elements stagger-fade-up:
///     · Kicker  at t = 0ms     (160ms)
///     · Title   at t = 80ms    (220ms)
///     · Divider at t = 200ms   (160ms, scaleX 0→1)
///     · Subtitle at t = 260ms  (180ms)
///
/// Tying the stagger to `hasRevealed` (driven by the parent view
/// model) means it plays exactly once on the first paint of fresh
/// data — refetches don't re-trigger it.

import SwiftUI

struct GreetingHeader: View {
    let plain: String
    let italic: String
    /// Looping, self-typing status lines (most-relevant first). Empty = no subline.
    var tickerLines: [String] = []
    var hasRevealed: Bool

    /// Drives the "small accent dot" pulse — tied to its own onAppear
    /// so it doesn't depend on hasRevealed.
    @State private var dotPulse: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            kickerRow
                .opacity(hasRevealed ? 1 : 0)
                .offset(y: hasRevealed ? 0 : 6)
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.86),
                    value: hasRevealed
                )

            // Headline — single concatenated Text so the italic
            // accent kisses the line above (one line-height for
            // both fragments) and tracking applies to the whole.
            (
                Text(plain + "\n")
                    .font(Typography.ui(size: 44, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text(italic)
                    .font(Typography.serifItalic(size: 44))
                    .foregroundStyle(Palette.accentForTime())
            )
            .tracking(-0.6)
            .lineSpacing(-6)
            .padding(.top, 14)
            .opacity(hasRevealed ? 1 : 0)
            .offset(y: hasRevealed ? 0 : 12)
            .animation(
                .spring(response: 0.55, dampingFraction: 0.86).delay(0.08),
                value: hasRevealed
            )

            if !tickerLines.isEmpty {
                accentDivider
                    .padding(.top, 18)
                    .scaleEffect(x: hasRevealed ? 1 : 0, y: 1, anchor: .leading)
                    .animation(
                        .spring(response: 0.55, dampingFraction: 0.86).delay(0.20),
                        value: hasRevealed
                    )

                CinematicTicker(lines: tickerLines)
                    .padding(.top, 12)
                    .opacity(hasRevealed ? 1 : 0)
                    .offset(y: hasRevealed ? 0 : 8)
                    .animation(
                        .spring(response: 0.55, dampingFraction: 0.86).delay(0.26),
                        value: hasRevealed
                    )
            }
        }
        .onAppear { dotPulse = true }
    }

    // MARK: - Kicker

    private var kickerRow: some View {
        HStack(spacing: 10) {
            // Slightly larger pulsing accent dot.
            Circle()
                .fill(Palette.accentForTime())
                .frame(width: 7, height: 7)
                .shadow(color: Palette.accentForTime().opacity(0.7), radius: 6)
                .scaleEffect(dotPulse ? 1.0 : 0.78)
                .animation(
                    .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                    value: dotPulse
                )

            Text(kickerText)
                .font(.system(size: 11, weight: .bold))
                .tracking(2.6)
                .foregroundStyle(Palette.accentForTime())
        }
    }

    /// Weekday + month/day, e.g. "TUESDAY · MAY 27"
    private var kickerText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE · MMMM d"
        return formatter.string(from: Date()).uppercased()
    }

    // MARK: - Accent divider

    private var accentDivider: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [
                            Palette.accentForTime().opacity(0.7),
                            Palette.accentForTime().opacity(0),
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: 42, height: 1.5)
            Spacer()
        }
    }
}
