/// OwnerScopeBar — horizontal scope pills for the owner Projects tab.
///
/// Five pills: All / Drafts / Live / Tendering / Completed. Mirrors
/// `BrowseScopeBar`'s visual language so the two tabs feel like
/// siblings: active pill is accent-filled with glow + lift, inactive
/// sit on the glass plate with a hairline border. A tiny count badge
/// on each pill shows how many projects fall into that bucket so the
/// owner has at-a-glance pipeline visibility.

import SwiftUI

struct OwnerScopeBar: View {
    @Binding var scope: OwnerProjectsViewModel.Scope
    /// Count per scope, for the trailing badge on each pill.
    let counts: [OwnerProjectsViewModel.Scope: Int]
    var onChange: (OwnerProjectsViewModel.Scope) -> Void

    private struct ScopeOption {
        let value: OwnerProjectsViewModel.Scope
        let label: String
        let icon: String
    }

    private let options: [ScopeOption] = [
        .init(value: .all,        label: "All",       icon: "square.grid.2x2.fill"),
        .init(value: .draft,      label: "Drafts",    icon: "tray.fill"),
        .init(value: .published,  label: "Live",      icon: "checkmark.seal.fill"),
        .init(value: .tendering,  label: "Tendering", icon: "paperplane.fill"),
        .init(value: .completed,  label: "Done",      icon: "checkmark.circle.fill"),
    ]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(options, id: \.label) { opt in
                    pill(for: opt)
                }
            }
            .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
    }

    private func pill(for opt: ScopeOption) -> some View {
        let isActive = scope == opt.value
        let count = counts[opt.value] ?? 0

        return Press(haptic: .select) {
            if scope != opt.value {
                scope = opt.value
                onChange(opt.value)
            }
        } content: {
            HStack(spacing: 6) {
                Image(systemName: opt.icon)
                    .font(.system(size: 11, weight: .bold))
                Text(opt.label)
                    .font(.system(size: 13, weight: .bold))
                    .tracking(0.3)
                if isActive && count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.accent)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Palette.accentContrast))
                        .monospacedDigit()
                }
            }
            .foregroundStyle(isActive ? Palette.accentContrast : Palette.text)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
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
