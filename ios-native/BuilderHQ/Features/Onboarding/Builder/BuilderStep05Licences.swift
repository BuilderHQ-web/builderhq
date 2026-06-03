/// BuilderStep05Licences — add builder licences with auto-verification.
///
/// On Add, the server inserts the row AND immediately runs the state
/// register check (VIC live via VBA; other states return manual_review).
/// The response includes the verify status which we render as an
/// inline chip on the row.
///
/// Min 1 to advance. Auto-approval after submit needs ≥1 licence
/// verified — but a builder with zero verified licences can still
/// finish onboarding; their account just lands in `pending_review`.

import SwiftUI

struct BuilderStep05Licences: View {
    @Bindable var vm: BuilderWizardViewModel
    @FocusState private var focusedField: Field?
    @State private var showingAddForm = false

    private enum Field: Hashable { case type, number, holder }

    private let auStates = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "Licences",
                        title: "Show us your",
                        titleAccent: "credentials.",
                        caption: "Add your builder licences. VIC verifies instantly; other states go to manual review."
                    )

                    if !vm.licences.isEmpty {
                        licencesList
                    }

                    if showingAddForm || vm.licences.isEmpty {
                        addForm
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    } else {
                        addAnotherButton
                    }

                    if let banner = vm.bannerError {
                        WizardBanner(message: banner)
                            .transition(.opacity)
                    }

                    Spacer(minLength: 80)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .animation(Motion.easeOutSoft, value: showingAddForm)
                .animation(Motion.easeOutSoft, value: vm.licences.count)
            }
            .scrollDismissesKeyboard(.interactively)
            .contentShape(Rectangle())
            .onTapGesture { focusedField = nil }

            WizardFooter(
                canContinue: !vm.licences.isEmpty,
                isSaving: vm.isSaving,
                onBack: { vm.goBack() }
            ) {
                vm.goForward()
            }
        }
    }

    // MARK: - Existing licences list

    private var licencesList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                WizardSectionLabel(text: "Your licences")
                Spacer()
                Text("\(vm.licences.count) added")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(1.2)
                    .foregroundStyle(Palette.textDim)
            }

            VStack(spacing: 10) {
                ForEach(vm.licences) { licence in
                    LicenceRow(licence: licence) {
                        Task { await vm.removeLicence(licence) }
                    }
                }
            }
        }
    }

    private var addAnotherButton: some View {
        Press(haptic: .tap) {
            showingAddForm = true
        } content: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 14, weight: .semibold))
                Text("Add another licence")
                    .font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(Palette.accentLight)
            .padding(.horizontal, 18)
            .frame(height: 48)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Palette.accentMuted)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Palette.accent.opacity(0.35), lineWidth: 1)
            )
        }
    }

    // MARK: - Add form

    private var addForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            WizardSectionLabel(text: vm.licences.isEmpty ? "Add your first licence" : "New licence")

            // State picker — segmented chips so the user sees all 8 at a glance.
            statePicker

            PremiumTextField(
                label: "Licence type (e.g. Domestic Builder Unlimited)",
                text: $vm.licenceDraftType,
                submitLabel: .next,
                error: nil
            ) { focusedField = .number }
            .focused($focusedField, equals: .type)

            PremiumTextField(
                label: "Licence number",
                text: $vm.licenceDraftNumber,
                submitLabel: .next,
                error: nil
            ) { focusedField = .holder }
            .focused($focusedField, equals: .number)

            PremiumTextField(
                label: "Licence holder name (optional)",
                text: $vm.licenceDraftHolderName,
                textContentType: .name,
                submitLabel: .done,
                error: nil
            ) { focusedField = nil }
            .focused($focusedField, equals: .holder)

            HStack(spacing: 12) {
                OptionalDateField(
                    label: "Issued",
                    date: $vm.licenceDraftIssuedAt
                )
                OptionalDateField(
                    label: "Expires",
                    date: $vm.licenceDraftExpiresAt
                )
            }

            Press(haptic: .tap) {
                Task {
                    let ok = await vm.addLicence()
                    if ok {
                        showingAddForm = vm.licences.isEmpty
                    }
                }
            } content: {
                HStack(spacing: 8) {
                    if vm.isAddingLicence {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(Palette.accentContrast)
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Add licence")
                            .font(.system(size: 14, weight: .bold))
                    }
                }
                .foregroundStyle(Palette.accentContrast)
                .padding(.horizontal, 18)
                .frame(height: 48)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Palette.accent))
                .shadow(color: Palette.accentGlow, radius: 14, x: 0, y: 6)
            }
            .disabled(vm.isAddingLicence)
        }
    }

    private var statePicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(auStates, id: \.self) { state in
                    let isSelected = vm.licenceDraftState == state
                    Press(haptic: .select) {
                        vm.licenceDraftState = state
                    } content: {
                        Text(state)
                            .font(.system(size: 13, weight: .bold))
                            .tracking(0.8)
                            .foregroundStyle(isSelected ? Palette.accentContrast : Palette.text)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(
                                Capsule().fill(isSelected ? Palette.accent : Palette.surface)
                            )
                            .overlay(
                                Capsule().stroke(
                                    isSelected ? Color.clear : Palette.hairline,
                                    lineWidth: 1
                                )
                            )
                            .shadow(
                                color: isSelected ? Palette.accentGlow : .clear,
                                radius: 10
                            )
                    }
                }
            }
        }
        .animation(Motion.easeOut, value: vm.licenceDraftState)
    }
}

// MARK: - Licence row

private struct LicenceRow: View {
    let licence: BuilderAPI.Licence
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text(licence.state)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(Palette.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Palette.accentMuted))
                    .overlay(Capsule().stroke(Palette.accent.opacity(0.35), lineWidth: 1))

                VerifyChip(status: licence.verificationStatus)

                Spacer()

                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Palette.textDim)
                        .padding(8)
                        .background(Circle().fill(Palette.surfaceElev))
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(licence.licenceType)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(2)
                Text("№ \(licence.licenceNumber)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textDim)
                    .monospaced()
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }
}

// MARK: - Verify chip

private struct VerifyChip: View {
    let status: String?

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .tracking(0.8)
        }
        .foregroundStyle(tone)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(tone.opacity(0.12)))
        .overlay(Capsule().stroke(tone.opacity(0.35), lineWidth: 1))
    }

    private var label: String {
        switch status {
        case "verified": return "VERIFIED"
        case "inactive": return "INACTIVE"
        case "mismatch": return "NAME MISMATCH"
        case "not_found": return "NOT FOUND"
        case "manual_review": return "MANUAL REVIEW"
        default: return "PENDING"
        }
    }

    private var icon: String {
        switch status {
        case "verified": return "checkmark.seal.fill"
        case "inactive", "not_found", "mismatch": return "exclamationmark.triangle.fill"
        case "manual_review": return "hourglass"
        default: return "hourglass"
        }
    }

    private var tone: Color {
        switch status {
        case "verified": return Palette.success
        case "inactive", "not_found", "mismatch": return Palette.warning
        default: return Palette.textMuted
        }
    }
}

// MARK: - Optional date field

private struct OptionalDateField: View {
    let label: String
    @Binding var date: Date?

    @State private var isShowingPicker = false
    @State private var tempDate: Date = .now

    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        return f
    }()

    var body: some View {
        Press(haptic: .tap) {
            tempDate = date ?? .now
            isShowingPicker = true
        } content: {
            VStack(alignment: .leading, spacing: 4) {
                Text(label.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
                Text(date.map(Self.formatter.string) ?? "—")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(date == nil ? Palette.textDim : Palette.text)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
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
        .sheet(isPresented: $isShowingPicker) {
            NavigationStack {
                VStack(spacing: 16) {
                    DatePicker(
                        label,
                        selection: $tempDate,
                        displayedComponents: .date
                    )
                    .datePickerStyle(.graphical)
                    .tint(Palette.accent)
                    .padding()

                    if date != nil {
                        Button("Clear date") {
                            date = nil
                            isShowingPicker = false
                        }
                        .foregroundStyle(Palette.danger)
                    }
                }
                .navigationTitle(label)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { isShowingPicker = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Set") {
                            date = tempDate
                            isShowingPicker = false
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
            .presentationDetents([.medium, .large])
        }
    }
}
