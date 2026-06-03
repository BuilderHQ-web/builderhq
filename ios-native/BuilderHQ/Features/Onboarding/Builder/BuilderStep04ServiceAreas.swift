/// BuilderStep04ServiceAreas — repeatable list of where you'll work.
///
/// Each row is a (state, optional suburb, optional postcode, radiusKm)
/// tuple. The radius semantics mirror the web:
///   · <50 km  → match by suburb (close-radius pickup)
///   · ≥50 km  → statewide match (you'll see every project in that state)
///
/// UX:
///   1. Top section shows the areas already added as chips/rows
///   2. Below it: a single "Add an area" card with the postcode picker
///      + radius slider, and an "Add" button
///   3. Min 1 to continue
///
/// Slider step is 5km (matches web). Default 25km — a reasonable urban
/// catchment for most metro builders.

import SwiftUI

struct BuilderStep04ServiceAreas: View {
    @Bindable var vm: BuilderWizardViewModel

    private var canAddCurrentDraft: Bool {
        vm.areaDraftPostcode != nil
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "Service areas",
                        title: "Where will you",
                        titleAccent: "work?",
                        caption: "Add the suburbs you cover. ≥50 km gives you statewide reach in that state."
                    )

                    if !vm.draftServiceAreas.isEmpty {
                        addedAreasList
                    }

                    addAreaCard

                    if let banner = vm.bannerError {
                        WizardBanner(message: banner)
                            .transition(.opacity)
                    }

                    Spacer(minLength: 80)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .animation(Motion.easeOutSoft, value: vm.draftServiceAreas.count)
            }
            .scrollDismissesKeyboard(.interactively)

            WizardFooter(
                canContinue: !vm.draftServiceAreas.isEmpty,
                isSaving: vm.isSaving,
                onBack: { vm.goBack() }
            ) {
                Task {
                    let ok = await vm.saveServiceAreasStep()
                    if ok { vm.goForward() }
                }
            }
        }
    }

    // MARK: - Added areas list

    private var addedAreasList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                WizardSectionLabel(text: "Your areas")
                Spacer()
                Text("\(vm.draftServiceAreas.count) added")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(1.2)
                    .foregroundStyle(Palette.textDim)
            }

            VStack(spacing: 8) {
                ForEach(Array(vm.draftServiceAreas.enumerated()), id: \.offset) { idx, area in
                    AreaRow(area: area) {
                        vm.draftServiceAreas.remove(at: idx)
                    }
                }
            }
        }
    }

    // MARK: - Add area card

    private var addAreaCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            WizardSectionLabel(text: vm.draftServiceAreas.isEmpty ? "Add your first area" : "Add another")

            PostcodeSuburbField(selection: $vm.areaDraftPostcode)

            // Radius slider only makes sense once a postcode is picked.
            if vm.areaDraftPostcode != nil {
                radiusSlider
                    .transition(.opacity.combined(with: .move(edge: .top)))

                Press(haptic: .tap) {
                    vm.addDraftServiceArea()
                } content: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Add area")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 18)
                    .frame(height: 44)
                    .frame(maxWidth: .infinity)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 14, x: 0, y: 6)
                }
            }
        }
        .animation(Motion.easeOutSoft, value: vm.areaDraftPostcode)
    }

    // MARK: - Radius slider

    private var radiusSlider: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(Int(vm.areaDraftRadiusKm))")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.text)
                    .monospacedDigit()
                Text("km radius")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                Spacer()
                Text(coverageHint)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(1)
                    .foregroundStyle(coverageColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        Capsule().fill(coverageColor.opacity(0.12))
                    )
                    .overlay(
                        Capsule().stroke(coverageColor.opacity(0.35), lineWidth: 1)
                    )
            }

            Slider(value: $vm.areaDraftRadiusKm, in: 5...100, step: 5)
                .tint(Palette.accent)

            HStack {
                Text("5 km")
                Spacer()
                Text("100 km")
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(Palette.textDim)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    private var coverageHint: String {
        vm.areaDraftRadiusKm >= 50 ? "STATEWIDE" : "SUBURB MATCH"
    }

    private var coverageColor: Color {
        vm.areaDraftRadiusKm >= 50 ? Palette.accent : Palette.textMuted
    }
}

// MARK: - Area row

private struct AreaRow: View {
    let area: BuilderAPI.ServiceAreaPayload
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // State pill
            Text(area.state)
                .font(.system(size: 11, weight: .bold))
                .tracking(1)
                .foregroundStyle(Palette.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(Palette.accentMuted))
                .overlay(Capsule().stroke(Palette.accent.opacity(0.35), lineWidth: 1))

            VStack(alignment: .leading, spacing: 2) {
                Text(area.suburb ?? "Statewide")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                Text("\(area.radiusKm) km\(area.suburb == nil ? "" : " radius")")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Palette.textDim)
            }

            Spacer()

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .padding(8)
                    .background(Circle().fill(Palette.surfaceElev))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }
}
