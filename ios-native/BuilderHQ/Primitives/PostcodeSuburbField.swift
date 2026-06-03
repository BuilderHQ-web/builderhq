/// PostcodeSuburbField — postcode-first AU suburb picker.
///
/// Behaviour mirrors the web's `PostcodeSuburb` component:
///
///   1. User types a 4-digit postcode.
///   2. On the 4th digit (or on blur), we call AuthAPI.lookupPostcode.
///   3. Single match → auto-select, suburb shown as a locked-in chip.
///   4. Multiple matches → inline list to pick from.
///   5. No match → soft "Postcode not recognised" hint.
///
/// The selected tuple `(postcode, suburb, state)` is exposed via a
/// `@Binding Selection?` so the parent form can submit it without
/// reaching into the picker's internals.
///
/// Used in onboarding today; reused by the builder wizard for business
/// address + service-area rows tomorrow.

import SwiftUI

struct PostcodeSuburbField: View {
    struct Selection: Equatable {
        let postcode: String
        let suburb: String
        let state: String
    }

    @Binding var selection: Selection?

    /// Whether to show an error border. Driven by the parent (e.g. if
    /// the field is required and the form was submitted empty).
    var error: String? = nil

    @State private var postcode: String = ""
    @State private var suburbs: [AuthAPI.Suburb] = []
    @State private var lookupState: LookupState = .idle
    @FocusState private var isFocused: Bool

    private enum LookupState: Equatable {
        case idle
        case loading
        case empty       // we looked, nothing matched
        case error
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            postcodeField

            // Resolved chip — single-match case.
            if let sel = selection, suburbs.count <= 1 {
                ResolvedChip(
                    suburb: sel.suburb,
                    state: sel.state,
                    onClear: clearSelection
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            // Multi-match picker — let the user pick.
            if suburbs.count > 1 && selection == nil {
                MultiMatchPicker(
                    options: suburbs,
                    onPick: { pick($0) }
                )
                .transition(.opacity)
            }

            // Status hints.
            switch lookupState {
            case .empty:
                hintRow(
                    "Postcode not recognised — double-check the 4 digits.",
                    tone: .warn
                )
            case .error:
                hintRow(
                    "Couldn't look that postcode up. Try again in a moment.",
                    tone: .warn
                )
            case .loading, .idle:
                EmptyView()
            }

            if let error = error {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.danger)
                    .padding(.leading, 4)
            }
        }
        .animation(Motion.easeOutSoft, value: selection)
        .animation(Motion.easeOutSoft, value: suburbs.count)
        .animation(Motion.easeOutSoft, value: lookupState)
        .onAppear { syncFromSelection() }
    }

    // MARK: - Postcode field

    @ViewBuilder
    private var postcodeField: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 12) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(borderTint)

                TextField("Postcode", text: $postcode)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .keyboardType(.numberPad)
                    .textContentType(.postalCode)
                    .focused($isFocused)
                    .onChange(of: postcode) { _, new in
                        handlePostcodeChange(new)
                    }

                if lookupState == .loading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(Palette.accentLight)
                        .scaleEffect(0.8)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(borderTint, lineWidth: 1)
            )
            .shadow(
                color: isFocused ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: isFocused ? 14 : 0
            )
            .animation(Motion.easeOutSoft, value: isFocused)
        }
    }

    private var borderTint: Color {
        if error != nil { return Palette.danger.opacity(0.6) }
        if isFocused { return Palette.accent.opacity(0.6) }
        if selection != nil { return Palette.accent.opacity(0.45) }
        return Palette.hairlineStrong
    }

    // MARK: - Lookup logic

    private func handlePostcodeChange(_ raw: String) {
        // Strip non-digits + clamp to 4.
        let cleaned = String(raw.filter { $0.isNumber }.prefix(4))
        if cleaned != raw {
            postcode = cleaned
            return
        }

        // Any edit invalidates the prior selection.
        if let sel = selection, sel.postcode != cleaned {
            selection = nil
            suburbs = []
        }

        if cleaned.count == 4 {
            Task { await lookup(cleaned) }
        } else {
            suburbs = []
            lookupState = .idle
        }
    }

    private func lookup(_ pc: String) async {
        lookupState = .loading
        do {
            let result = try await AuthAPI.lookupPostcode(pc)
            suburbs = result
            if result.isEmpty {
                lookupState = .empty
            } else if result.count == 1, let only = result.first {
                lookupState = .idle
                pick(only)
            } else {
                lookupState = .idle
            }
        } catch {
            lookupState = .error
            suburbs = []
        }
    }

    private func pick(_ s: AuthAPI.Suburb) {
        selection = Selection(
            postcode: postcode,
            suburb: s.suburb,
            state: s.state
        )
        // Collapse the multi-match list once one is picked.
        suburbs = [s]
        isFocused = false
    }

    private func clearSelection() {
        selection = nil
        suburbs = []
        lookupState = .idle
    }

    /// On first render, if the parent supplied a selection (resume +
    /// edit cases later), pull the postcode into the field so the user
    /// sees consistent state.
    private func syncFromSelection() {
        if let sel = selection, postcode.isEmpty {
            postcode = sel.postcode
            suburbs = [
                AuthAPI.Suburb(suburb: sel.suburb, state: sel.state)
            ]
        }
    }

    // MARK: - Hint row

    private enum HintTone { case warn }

    @ViewBuilder
    private func hintRow(_ text: String, tone: HintTone) -> some View {
        let color: Color = {
            switch tone {
            case .warn: return Palette.warning
            }
        }()
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 12))
                .foregroundStyle(color)
            Text(text)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Palette.textMuted)
        }
        .padding(.leading, 4)
    }
}

// MARK: - Resolved chip

private struct ResolvedChip: View {
    let suburb: String
    let state: String
    let onClear: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.accent)

            HStack(spacing: 4) {
                Text(suburb)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                Text("·")
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.textDim)
                Text(state)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .tracking(0.5)
            }

            Spacer()

            Button(action: onClear) {
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
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Palette.accentMuted)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Palette.accent.opacity(0.35), lineWidth: 1)
        )
    }
}

// MARK: - Multi-match picker

private struct MultiMatchPicker: View {
    let options: [AuthAPI.Suburb]
    let onPick: (AuthAPI.Suburb) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("WHICH SUBURB?")
                .font(.system(size: 10, weight: .bold))
                .tracking(2)
                .foregroundStyle(Palette.textDim)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                ForEach(Array(options.enumerated()), id: \.element.id) { idx, opt in
                    Press(haptic: .select, action: { onPick(opt) }) {
                        HStack {
                            Text(opt.suburb)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Palette.text)
                            Spacer()
                            Text(opt.state)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Palette.textDim)
                                .tracking(0.5)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(Palette.textDim)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .contentShape(Rectangle())
                    }
                    if idx < options.count - 1 {
                        Divider()
                            .background(Palette.hairline)
                            .padding(.horizontal, 14)
                    }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Palette.hairline, lineWidth: 1)
            )
        }
    }
}
