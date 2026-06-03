/// FBAHeroCard — the premium centrepiece of an approved builder's home.
///
/// Visual: a large dark-glass card with a circular progress ring on
/// the right, big remaining-count numeral inside the ring, and a stack
/// of contextual stats on the left (savings to date, cycle countdown,
/// monthly quota). On first reveal the ring animates clockwise from 0
/// to the current fraction over ~700ms, and the numeric counter ticks
/// up from 0 → remaining in the same window — the two motions
/// reinforce each other.
///
/// The "founding builder access" framing matters — this is the FBA
/// brand on the screen, not just a credit counter. Kicker labels read
/// "FOUNDING ACCESS" so the user is reminded what they got into.
///
/// Inactive state (grant expired / revoked / never granted) is
/// handled separately by the caller — this view only renders the
/// `.active` discriminant.

import SwiftUI

struct FBAHeroCard: View {
    let active: DashboardAPI.FbaStatus.Active
    var hasRevealed: Bool

    /// Drives the ring + counter from 0 (on first render) to the real
    /// value once `hasRevealed` flips. SwiftUI's `.animation(_, value:)`
    /// interpolates Animatable types — Double works directly with both
    /// ProgressRing and AnimatedCounter.
    private var ringProgress: Double {
        guard hasRevealed, active.monthlyQuota > 0 else { return 0 }
        let used = Double(active.monthlyQuota - active.remainingThisCycle)
        return used / Double(active.monthlyQuota)
    }

    private var displayedRemaining: Double {
        hasRevealed ? Double(active.remainingThisCycle) : 0
    }

    private var displayedSaved: Double {
        hasRevealed ? Double(active.totalSavedAud) : 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            // Kicker
            HStack(spacing: 8) {
                Circle()
                    .fill(Palette.accent)
                    .frame(width: 5, height: 5)
                    .shadow(color: Palette.accentGlow, radius: 5)
                Text("FOUNDING ACCESS")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.accent)
                Spacer()
                Text(cycleLabel)
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
            }

            // Main row — counter on left, ring on right
            HStack(alignment: .center, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    AnimatedCounter(
                        value: displayedRemaining,
                        formatter: { v in "\(Int(v.rounded()))" },
                        font: Typography.numericHero,
                        color: Palette.text
                    )

                    Text("of \(active.monthlyQuota) unlocks left")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.textMuted)

                    // Soft separator
                    Rectangle()
                        .fill(Palette.hairline)
                        .frame(width: 32, height: 1)
                        .padding(.vertical, 6)

                    // Cycle refresh + savings stack
                    VStack(alignment: .leading, spacing: 6) {
                        statRow(
                            icon: "arrow.triangle.2.circlepath",
                            label: "Refreshes in \(active.daysToRefresh) day\(active.daysToRefresh == 1 ? "" : "s")"
                        )
                        statRow(
                            icon: "sparkles",
                            label: nil,
                            inline: AnyView(
                                HStack(spacing: 4) {
                                    AnimatedCounter(
                                        dollarsCompact: Int(displayedSaved.rounded()),
                                        font: .system(size: 13, weight: .semibold),
                                        color: Palette.accentLight
                                    )
                                    Text("saved so far")
                                        .font(.system(size: 12, weight: .regular))
                                        .foregroundStyle(Palette.textMuted)
                                }
                            )
                        )
                    }
                }

                Spacer(minLength: 0)

                // Ring — fills clockwise as you USE credits, so a
                // brand-new cycle has an empty ring (visually "full
                // and ready"). Used count drives the arc.
                ringView
                    .frame(width: 96, height: 96)
            }
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            // Hero gets twin radial blooms behind the ring BEFORE the
            // CardSurface treatment so they compose inside the rounded
            // shape: a teal bloom on the ring + a deeper brand-blue
            // bloom diagonally opposite. Together they give the
            // flagship card the signature teal→blue depth axis.
            ZStack {
                RadialGradient(
                    colors: [Palette.accent.opacity(0.20), Palette.accent.opacity(0)],
                    center: .init(x: 0.88, y: 0.5),
                    startRadius: 10,
                    endRadius: 220
                )
                RadialGradient(
                    colors: [Palette.blue.opacity(0.22), Palette.blue.opacity(0)],
                    center: .init(x: 0.08, y: 0.95),
                    startRadius: 0,
                    endRadius: 240
                )
            }
            .blendMode(.plusLighter)
        )
        .cardSurface(.hero, radius: 26)
    }

    // MARK: - Cycle label

    private var cycleLabel: String {
        active.totalCycles > 1
            ? "CYCLE \(active.cycleIndex + 1) OF \(active.totalCycles)"
            : "CURRENT CYCLE"
    }

    // MARK: - Ring + centred number

    private var ringView: some View {
        ZStack {
            ProgressRing(progress: ringProgress, thickness: 0.10)

            VStack(spacing: -1) {
                AnimatedCounter(
                    value: displayedRemaining,
                    formatter: { v in "\(Int(v.rounded()))" },
                    font: .system(size: 30, weight: .bold, design: .rounded),
                    color: Palette.text
                )
                Text("LEFT")
                    .font(.system(size: 8.5, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(Palette.textDim)
            }
        }
    }

    // MARK: - Inline stat row

    private func statRow(icon: String, label: String?, inline: AnyView? = nil) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.textDim)
                .frame(width: 14)
            if let inline {
                inline
            } else if let label {
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
            }
        }
    }
}
