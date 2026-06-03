/// PickupLane — the builder's "pick up where you left off" lane.
///
/// Horizontally-scrolling row of compact cards for projects the
/// builder has already unlocked. Each card is a mini version of the
/// marketplace card: type gradient + title + location + a status dot
/// indicating tender progress. Tapping any card pushes to detail
/// (NavigationLink, slug-based routing through MainTabs).
///
/// Sits between the stats strip and the suggested feed on the
/// BuilderHomeScreen. Rendered only when `unlocked` is non-empty so
/// new builders don't see a confusing empty lane.

import SwiftUI

struct PickupLane: View {
    let unlocked: [DashboardAPI.ProjectRow]
    let hasRevealed: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(unlocked.enumerated()), id: \.element.id) { idx, project in
                        NavigationLink(value: project.slug) {
                            PickupCard(project: project)
                                .frame(width: 232)
                        }
                        .buttonStyle(PressButtonStyle(haptic: .tap, scaleTo: 0.97))
                        // Stagger the reveal so the lane "deals" in
                        // from left to right when the dashboard loads.
                        .opacity(hasRevealed ? 1 : 0)
                        .offset(x: hasRevealed ? 0 : 20)
                        .animation(
                            .spring(response: 0.55, dampingFraction: 0.86)
                                .delay(0.25 + Double(idx) * 0.06),
                            value: hasRevealed
                        )
                    }
                }
                .padding(.horizontal, 20)
            }
            .scrollIndicators(.hidden)
            // Negative horizontal padding lets the cards bleed to the
            // screen edges while the surrounding gutter stays at 20pt.
            .padding(.horizontal, -20)
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text("PICK UP WHERE YOU LEFT OFF")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.textDim)
                Text("Your unlocked projects")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
            }
            Spacer()
            HStack(spacing: 3) {
                Image(systemName: "lock.open.fill")
                    .font(.system(size: 10, weight: .bold))
                Text("\(unlocked.count)")
                    .font(.system(size: 12, weight: .bold))
                    .monospacedDigit()
            }
            .foregroundStyle(Palette.accent)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(Palette.accentMuted))
        }
    }
}

private struct PickupCard: View {
    let project: DashboardAPI.ProjectRow

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            cover
            details
        }
        .cardSurface(.lifted, radius: 18)
    }

    private var cover: some View {
        ZStack {
            ProjectCoverArt(type: project.type)

            // Unlocked seal — top-left
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 10, weight: .bold))
                    Text("UNLOCKED")
                        .font(.system(size: 9, weight: .bold))
                        .tracking(1.4)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(Palette.accent.opacity(0.85)))

                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
        }
        .frame(height: 88)
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(project.title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)

            if let location = locationLabel {
                HStack(spacing: 4) {
                    Image(systemName: "mappin")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Palette.textDim)
                    Text(location)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                        .lineLimit(1)
                }
            }

            HStack(spacing: 5) {
                Image(systemName: "arrow.right.circle.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.accentLight)
                Text("Resume")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.accentLight)
                    .tracking(0.4)
            }
            .padding(.top, 2)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var locationLabel: String? {
        let suburb = project.suburb?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let state = project.state?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if let suburb, !suburb.isEmpty, let state, !state.isEmpty {
            return "\(suburb), \(state)"
        }
        if let state, !state.isEmpty { return state }
        if let suburb, !suburb.isEmpty { return suburb }
        return nil
    }
}
