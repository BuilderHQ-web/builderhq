/// PulseStrip — at-a-glance stat tiles.
///
/// 2 × 2 grid of small "pulse" tiles. Each tile has:
///   · Small uppercase label
///   · Big animated counter
///   · Optional fine-print sublabel (e.g. "last 7 days")
///
/// On reveal, each tile's number ticks up from 0 to its value in
/// sequence (staggered ~60ms each) so the strip "wakes up" as you
/// land on the screen. Used together with the FBA card / verification
/// callout to give the home tab a feeling of motion at first paint
/// even when the user has no projects to look at yet.

import SwiftUI

struct PulseStrip: View {
    struct Tile {
        let label: String
        let valueText: (Double) -> String
        let target: Double
        let icon: String
    }

    var tiles: [Tile]
    var hasRevealed: Bool

    var body: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: 10),
                GridItem(.flexible(), spacing: 10),
            ],
            spacing: 10
        ) {
            ForEach(Array(tiles.enumerated()), id: \.offset) { idx, tile in
                PulseTile(
                    tile: tile,
                    progress: hasRevealed ? tile.target : 0,
                    revealDelay: 0.04 + Double(idx) * 0.06
                )
            }
        }
    }
}

// MARK: - Tile view

private struct PulseTile: View {
    let tile: PulseStrip.Tile
    let progress: Double
    let revealDelay: Double

    @State private var iconBump = false

    /// Tiles with activity light up; empty ones recede so the eye lands
    /// on what actually matters.
    private var active: Bool { tile.target > 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(active ? Palette.accentMuted : Palette.surfaceElev)
                Image(systemName: tile.icon)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(active ? Palette.accent : Palette.textDim)
                    .symbolEffect(.bounce, value: iconBump)
            }
            .frame(width: 30, height: 30)

            VStack(alignment: .leading, spacing: 2) {
                AnimatedCounter(
                    value: progress,
                    formatter: tile.valueText,
                    font: .system(size: 28, weight: .bold, design: .rounded),
                    color: active ? Palette.text : Palette.textMuted
                )
                Text(tile.label.uppercased())
                    .font(.system(size: 9.5, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 15)
        .padding(.vertical, 14)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Palette.surface)
                if active {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(LinearGradient(colors: [Palette.accent.opacity(0.08), .clear],
                                             startPoint: .topLeading, endPoint: .bottomTrailing))
                }
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(active ? Palette.accent.opacity(0.22) : Palette.cardBorder, lineWidth: 1)
        )
        .shadow(color: active ? Palette.accentGlow.opacity(0.12) : .clear, radius: 10, y: 4)
        .animation(.counterReveal.delay(revealDelay), value: progress)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + revealDelay + 0.2) {
                iconBump.toggle()
            }
        }
    }
}
