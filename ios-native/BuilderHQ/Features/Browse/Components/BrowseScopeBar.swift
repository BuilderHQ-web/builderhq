/// BrowseScopeBar — three premium pills below the search bar that
/// switch the marketplace feed between All / Saved / Unlocked.
///
/// Sits inside the sticky header so it stays visible while scrolling.
/// The active pill is filled with brand accent + glow; the inactive
/// ones sit on the glass plate with a hairline border. Icons are
/// loaded with the pills so the affordance reads at a glance, even
/// without the labels.
///
/// Saved → bookmark.fill (red-ish heart felt redundant with the card's
/// heart). Unlocked → lock.open.fill (matches the unlock CTA imagery).
/// All → square.grid.2x2 (general feed connotation).

import SwiftUI

struct BrowseScopeBar: View {
    @Binding var scope: ProjectsAPI.BrowseScope
    /// Called when the user picks a different scope so the parent can
    /// re-fire the fetch + log analytics.
    var onChange: (ProjectsAPI.BrowseScope) -> Void

    private struct ScopeOption {
        let value: ProjectsAPI.BrowseScope
        let label: String
        let icon: String
    }

    private let options: [ScopeOption] = [
        .init(value: .all,      label: "All",      icon: "square.grid.2x2.fill"),
        .init(value: .saved,    label: "Saved",    icon: "bookmark.fill"),
        .init(value: .unlocked, label: "Unlocked", icon: "lock.open.fill"),
    ]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(options, id: \.label) { opt in
                pill(for: opt)
            }
        }
    }

    private func pill(for opt: ScopeOption) -> some View {
        let isActive = scope == opt.value

        return Press(haptic: .select) {
            if scope != opt.value {
                scope = opt.value
                onChange(opt.value)
            }
        } content: {
            HStack(spacing: 5) {
                Image(systemName: opt.icon)
                    .font(.system(size: 11, weight: .bold))
                Text(opt.label)
                    .font(.system(size: 13, weight: .bold))
                    .tracking(0.3)
            }
            .foregroundStyle(isActive ? Palette.accentContrast : Palette.text)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity)
            .background(
                Capsule().fill(isActive ? Palette.accent : Palette.surface)
            )
            .overlay(
                Capsule().stroke(
                    isActive ? .clear : Palette.cardBorder,
                    lineWidth: 1
                )
            )
            .shadow(
                color: isActive ? Palette.accentGlow : .clear,
                radius: 14
            )
            .scaleEffect(isActive ? 1.0 : 0.98)
            .animation(
                .spring(response: 0.32, dampingFraction: 0.78),
                value: isActive
            )
        }
    }
}
