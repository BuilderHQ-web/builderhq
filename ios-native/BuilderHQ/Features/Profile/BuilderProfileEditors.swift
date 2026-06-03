/// Builder profile sub-editors — make the read-only hub sections
/// editable post-onboarding:
///   · CategoriesEditorScreen   — multi-select, batch save (setCategories)
///   · ServiceAreasEditorScreen — add/remove rows, batch save (setServiceAreas)
///   · LicencesEditorScreen      — live add (with verification) + delete
///
/// All reuse the existing `BuilderAPI` write surface. Each calls back
/// `onSaved` so the profile hub refreshes.

import SwiftUI

// MARK: - Work categories

struct CategoriesEditorScreen: View {
    let initial: [String]
    let onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selected: Set<String>
    @State private var isSaving = false
    @State private var error: String?

    init(initial: [String], onSaved: @escaping () -> Void) {
        self.initial = initial
        self.onSaved = onSaved
        _selected = State(initialValue: Set(initial))
    }

    private let options: [(value: String, label: String, desc: String)] = [
        ("single_dwelling", "Single dwelling", "New homes — knockdown-rebuild, custom builds."),
        ("multi_dwelling", "Multi-dwelling", "Townhouses, duplexes, unit developments."),
        ("renovation", "Renovation", "Reworking an existing home."),
        ("extension", "Extension", "Adding floor area to an existing home."),
    ]

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pick the work you take on. Owners filter by these.")
                            .font(.system(size: 13)).foregroundStyle(Palette.textMuted)
                            .padding(.bottom, 4)
                        ForEach(options, id: \.value) { opt in
                            selectCard(opt)
                        }
                        if let error { WizardBanner(message: error) }
                    }
                    .padding(.horizontal, 20).padding(.top, 12)
                }
                saveBar(enabled: !selected.isEmpty, isSaving: isSaving) { await save() }
            }
        }
        .navigationTitle("Work categories")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func selectCard(_ opt: (value: String, label: String, desc: String)) -> some View {
        let on = selected.contains(opt.value)
        return Press(haptic: .select) {
            if on { selected.remove(opt.value) } else { selected.insert(opt.value) }
        } content: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(opt.label).font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.text)
                    Text(opt.desc).font(.system(size: 12)).foregroundStyle(Palette.textDim)
                        .fixedSize(horizontal: false, vertical: true).multilineTextAlignment(.leading)
                }
                Spacer(minLength: 8)
                Image(systemName: on ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20)).foregroundStyle(on ? Palette.accent : Palette.hairlineStrong)
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(on ? Palette.accentMuted : Palette.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).stroke(on ? Palette.accent.opacity(0.4) : Palette.cardBorder, lineWidth: 1))
        }
    }

    private func save() async {
        error = nil; isSaving = true; defer { isSaving = false }
        do {
            try await BuilderAPI.setCategories(Array(selected))
            onSaved(); dismiss()
        } catch let e as APIError { error = e.errorDescription ?? "Couldn't save categories." }
        catch { self.error = "Couldn't save categories." }
    }
}

// MARK: - Service areas

struct ServiceAreasEditorScreen: View {
    let initial: [BuilderAPI.ServiceArea]
    let onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss

    struct Draft: Identifiable, Equatable {
        let id = UUID()
        var state: String
        var suburb: String
        var postcode: String
        var radiusKm: Int
    }

    @State private var areas: [Draft]
    @State private var newState: String? = nil
    @State private var newSuburb = ""
    @State private var newPostcode = ""
    @State private var newRadius = 25
    @State private var isSaving = false
    @State private var error: String?

    init(initial: [BuilderAPI.ServiceArea], onSaved: @escaping () -> Void) {
        self.initial = initial
        self.onSaved = onSaved
        _areas = State(initialValue: initial.map {
            Draft(state: $0.state, suburb: $0.suburb ?? "", postcode: $0.postcode ?? "", radiusKm: $0.radiusKm)
        })
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if !areas.isEmpty {
                            WizardSectionLabel(text: "Your areas")
                            VStack(spacing: 8) { ForEach(areas) { areaRow($0) } }
                        }
                        WizardSectionLabel(text: "Add an area")
                        addForm
                        if let error { WizardBanner(message: error) }
                    }
                    .padding(.horizontal, 20).padding(.top, 12)
                    .animation(Motion.easeOutSoft, value: areas)
                }
                saveBar(enabled: !areas.isEmpty, isSaving: isSaving) { await save() }
            }
        }
        .navigationTitle("Service areas")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func areaRow(_ a: Draft) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "mappin.circle.fill").font(.system(size: 16)).foregroundStyle(Palette.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text(a.suburb.isEmpty ? a.state : "\(a.suburb), \(a.state)")
                    .font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.text)
                Text("\(a.radiusKm) km radius").font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim)
            }
            Spacer()
            Press(haptic: .tap) { areas.removeAll { $0.id == a.id } } content: {
                Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
                    .frame(width: 26, height: 26).background(Circle().fill(Palette.surfaceElev))
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .cardSurface(.flat, radius: Radius.control)
    }

    private var addForm: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                stateMenu
                PremiumTextField(label: "Postcode (optional)", text: $newPostcode, keyboardType: .numberPad)
            }
            PremiumTextField(label: "Suburb (optional)", text: $newSuburb)
            HStack {
                Text("Radius").font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.textMuted)
                Spacer()
                Stepper("\(newRadius) km", value: $newRadius, in: 5...200, step: 5)
                    .fixedSize()
            }
            Press(haptic: .tap) {
                guard let s = newState else { return }
                areas.append(Draft(state: s, suburb: newSuburb.trimmingCharacters(in: .whitespaces),
                                    postcode: newPostcode.trimmingCharacters(in: .whitespaces), radiusKm: newRadius))
                newState = nil; newSuburb = ""; newPostcode = ""; newRadius = 25
            } content: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill").font(.system(size: 14, weight: .bold))
                    Text("Add area").font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(newState == nil ? Palette.textDim : Palette.accentContrast)
                .frame(maxWidth: .infinity).frame(height: 46)
                .background(Capsule().fill(newState == nil ? Palette.surfaceElev : Palette.accent))
            }
            .disabled(newState == nil)
        }
    }

    private var stateMenu: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("State").font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.textMuted)
            Menu {
                ForEach(ProfileLabels.auStates, id: \.self) { s in Button(s) { newState = s } }
            } label: {
                HStack {
                    Text(newState ?? "Choose").font(.system(size: 15, weight: .medium)).foregroundStyle(newState == nil ? Palette.textDim : Palette.text)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
                }
                .padding(.horizontal, 14).padding(.vertical, 14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineStrong, lineWidth: 1))
            }
        }
    }

    private func save() async {
        error = nil; isSaving = true; defer { isSaving = false }
        let payload = areas.map {
            BuilderAPI.ServiceAreaPayload(
                state: $0.state,
                suburb: $0.suburb.isEmpty ? nil : $0.suburb,
                postcode: $0.postcode.isEmpty ? nil : $0.postcode,
                radiusKm: $0.radiusKm
            )
        }
        do {
            try await BuilderAPI.setServiceAreas(payload)
            onSaved(); dismiss()
        } catch let e as APIError { error = e.errorDescription ?? "Couldn't save areas." }
        catch { self.error = "Couldn't save areas." }
    }
}

// MARK: - Licences

struct LicencesEditorScreen: View {
    let initial: [BuilderAPI.Licence]
    let onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var licences: [BuilderAPI.Licence]
    @State private var newState: String? = nil
    @State private var newType = ""
    @State private var newNumber = ""
    @State private var newHolder = ""
    @State private var isAdding = false
    @State private var error: String?

    init(initial: [BuilderAPI.Licence], onSaved: @escaping () -> Void) {
        self.initial = initial
        self.onSaved = onSaved
        _licences = State(initialValue: initial)
    }

    private var canAdd: Bool {
        newState != nil
            && !newType.trimmingCharacters(in: .whitespaces).isEmpty
            && !newNumber.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("VIC verifies instantly; other states go to manual review.")
                        .font(.system(size: 13)).foregroundStyle(Palette.textMuted)
                    if !licences.isEmpty {
                        WizardSectionLabel(text: "Your licences")
                        VStack(spacing: 8) { ForEach(licences) { licenceRow($0) } }
                    }
                    WizardSectionLabel(text: "Add a licence")
                    addForm
                    if let error { WizardBanner(message: error) }
                    Spacer(minLength: 30)
                }
                .padding(.horizontal, 20).padding(.top, 12)
                .animation(Motion.easeOutSoft, value: licences)
            }
        }
        .navigationTitle("Licences")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { onSaved() }
    }

    private func licenceRow(_ l: BuilderAPI.Licence) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(l.state).font(.system(size: 10, weight: .bold)).foregroundStyle(Palette.accent)
                        .padding(.horizontal, 7).padding(.vertical, 3).background(Capsule().fill(Palette.accentMuted))
                    verifyChip(l.verificationStatus)
                }
                Text(l.licenceType).font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.text).lineLimit(1)
                Text("№ \(l.licenceNumber)").font(.system(size: 12, weight: .medium)).foregroundStyle(Palette.textDim).monospaced()
            }
            Spacer()
            Press(haptic: .tap) { Task { await remove(l) } } content: {
                Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
                    .frame(width: 28, height: 28).background(Circle().fill(Palette.surfaceElev))
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 12)
        .cardSurface(.flat, radius: Radius.control)
    }

    private var addForm: some View {
        VStack(spacing: 12) {
            stateChips
            PremiumTextField(label: "Licence type (e.g. Domestic Builder Unlimited)", text: $newType)
            PremiumTextField(label: "Licence number", text: $newNumber)
            PremiumTextField(label: "Licence holder name (optional)", text: $newHolder, textContentType: .name)
            Press(haptic: .tap) { Task { await add() } } content: {
                HStack(spacing: 8) {
                    if isAdding {
                        ProgressView().tint(Palette.accentContrast).scaleEffect(0.8)
                    } else {
                        Image(systemName: "plus.circle.fill").font(.system(size: 14, weight: .bold))
                        Text("Add licence").font(.system(size: 14, weight: .bold))
                    }
                }
                .foregroundStyle(canAdd ? Palette.accentContrast : Palette.textDim)
                .frame(maxWidth: .infinity).frame(height: 46)
                .background(Capsule().fill(canAdd ? Palette.accent : Palette.surfaceElev))
            }
            .disabled(!canAdd || isAdding)
        }
    }

    private var stateChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ProfileLabels.auStates, id: \.self) { s in
                    let on = newState == s
                    Press(haptic: .select) { newState = s } content: {
                        Text(s).font(.system(size: 13, weight: .bold))
                            .foregroundStyle(on ? Palette.accentContrast : Palette.text)
                            .padding(.horizontal, 14).padding(.vertical, 9)
                            .background(Capsule().fill(on ? Palette.accent : Palette.surface))
                            .overlay(Capsule().stroke(on ? .clear : Palette.hairline, lineWidth: 1))
                    }
                }
            }
        }
    }

    private func verifyChip(_ status: String?) -> some View {
        let (label, tint): (String, Color) = {
            switch status {
            case "verified": return ("VERIFIED", Palette.success)
            case "inactive", "not_found", "mismatch": return ("CHECK", Palette.warning)
            case "manual_review": return ("IN REVIEW", Palette.textMuted)
            default: return ("PENDING", Palette.textMuted)
            }
        }()
        return Text(label).font(.system(size: 9, weight: .bold)).tracking(0.6)
            .foregroundStyle(tint)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(Capsule().fill(tint.opacity(0.14)))
    }

    private func add() async {
        guard let s = newState, canAdd else { return }
        error = nil; isAdding = true; defer { isAdding = false }
        do {
            let res = try await BuilderAPI.addLicence(
                state: s,
                licenceType: newType.trimmingCharacters(in: .whitespaces),
                licenceNumber: newNumber.trimmingCharacters(in: .whitespaces),
                licenceHolderName: newHolder.trimmedNilLic,
                issuedAt: nil,
                expiresAt: nil
            )
            licences.append(res.licence)
            newState = nil; newType = ""; newNumber = ""; newHolder = ""
        } catch let e as APIError { error = e.errorDescription ?? "Couldn't add that licence." }
        catch { self.error = "Couldn't add that licence." }
    }

    private func remove(_ l: BuilderAPI.Licence) async {
        do {
            try await BuilderAPI.removeLicence(id: l.id)
            licences.removeAll { $0.id == l.id }
        } catch { self.error = "Couldn't remove that licence." }
    }
}

// MARK: - Shared save bar

private func saveBar(enabled: Bool, isSaving: Bool, action: @escaping () async -> Void) -> some View {
    Button { Task { await action() } } label: {
        ZStack {
            Capsule().fill(enabled ? Palette.accent : Palette.surfaceElev)
                .shadow(color: enabled ? Palette.accentGlow : .clear, radius: 18, y: 8)
            if isSaving {
                ProgressView().tint(Palette.accentContrast)
            } else {
                Text("Save").font(.system(size: 16, weight: .bold))
                    .foregroundStyle(enabled ? Palette.accentContrast : Palette.textDim)
            }
        }
        .frame(height: 52).frame(maxWidth: .infinity)
    }
    .disabled(!enabled || isSaving)
    .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 16)
    .background(Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .bottom))
}

private extension String {
    var trimmedNilLic: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}
