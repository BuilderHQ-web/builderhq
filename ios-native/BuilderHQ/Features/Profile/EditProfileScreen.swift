/// EditProfileScreen — role-aware profile editing with inline save.
///
/// Builders edit their business card (company is locked once the ABN is
/// verified), bio, socials, years, and phone via the partial-patch
/// endpoint. Owners edit entity type, company, default location, contact
/// preference, and phone via the (idempotent) owner upsert.
///
/// Every field has a sensible placeholder + optional/required marking;
/// server field-errors surface inline; the save bar reflects progress.

import SwiftUI

@Observable
@MainActor
final class EditProfileViewModel {
    let role: AuthSession.Role

    // Builder
    var companyName = ""
    var companyLocked = false   // ABN-verified → name is fixed
    var abn = ""                // read-only display (verified → locked)
    var acn = ""
    var tradingName = ""
    var bio = ""
    var website = ""
    var linkedin = ""
    var instagram = ""
    var yearsText = ""
    // Business address
    var bizLine1 = ""
    var bizSuburb = ""
    var bizState: String? = nil
    var bizPostcode = ""
    var hasDifferentPostal = false
    var postalLine1 = ""
    var postalSuburb = ""
    var postalState: String? = nil
    var postalPostcode = ""

    // Owner
    var entityType: String? = nil
    var ownerCompany = ""
    var suburb = ""
    var state: String? = nil
    var postcode = ""
    var contactPref = "email"

    // Shared
    var phone = ""

    var isSaving = false
    var bannerError: String? = nil
    var fieldErrors: [String: String] = [:]
    var didSave = false

    init(role: AuthSession.Role, builder: BuilderAPI.Bundle?, owner: ProfileAPI.OwnerResponse?) {
        self.role = role
        if let b = builder?.profile {
            companyName = b.companyName
            companyLocked = builder?.lockState.abn ?? false
            abn = b.abn ?? ""
            acn = b.acn ?? ""
            tradingName = b.tradingName ?? ""
            bio = b.bio ?? ""
            website = b.website ?? ""
            linkedin = b.linkedinUrl ?? ""
            instagram = b.instagramUrl ?? ""
            yearsText = b.yearsInOperation.map(String.init) ?? ""
            bizLine1 = b.businessAddressLine1 ?? ""
            bizSuburb = b.businessSuburb ?? ""
            bizState = b.businessState
            bizPostcode = b.businessPostcode ?? ""
            hasDifferentPostal = b.hasDifferentPostal
            postalLine1 = b.postalAddressLine1 ?? ""
            postalSuburb = b.postalSuburb ?? ""
            postalState = b.postalState
            postalPostcode = b.postalPostcode ?? ""
        }
        phone = builder?.phone ?? owner?.phone ?? ""
        if let o = owner {
            entityType = o.profile?.entityType
            ownerCompany = o.profile?.companyName ?? ""
            suburb = o.profile?.defaultSuburb ?? ""
            state = o.profile?.defaultState
            postcode = o.profile?.defaultPostcode ?? ""
            contactPref = o.profile?.contactPref ?? "email"
        }
    }

    var isBuilder: Bool { role == .builder || role == .admin }

    var years: Int? {
        let d = yearsText.filter(\.isNumber)
        guard !d.isEmpty, let n = Int(d), (0...150).contains(n) else { return nil }
        return n
    }

    func save() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        isSaving = true
        defer { isSaving = false }
        do {
            if isBuilder {
                var patch: [String: Any?] = [
                    "tradingName": tradingName.trimmedNil,
                    "acn": acn.trimmedNil,
                    "bio": bio.trimmedNil,
                    "website": website.trimmedNil,
                    "linkedinUrl": linkedin.trimmedNil,
                    "instagramUrl": instagram.trimmedNil,
                    "yearsInOperation": years,
                    "phone": phone.trimmingCharacters(in: .whitespaces),
                    "businessAddressLine1": bizLine1.trimmedNil,
                    "businessSuburb": bizSuburb.trimmedNil,
                    "businessState": bizState,
                    "businessPostcode": bizPostcode.trimmedNil,
                    "hasDifferentPostal": hasDifferentPostal,
                ]
                if !companyLocked { patch["companyName"] = companyName.trimmingCharacters(in: .whitespaces) }
                if hasDifferentPostal {
                    patch["postalAddressLine1"] = postalLine1.trimmedNil
                    patch["postalSuburb"] = postalSuburb.trimmedNil
                    patch["postalState"] = postalState
                    patch["postalPostcode"] = postalPostcode.trimmedNil
                }
                _ = try await BuilderAPI.patchProfile(patch)
            } else {
                guard let entityType else {
                    fieldErrors["entityType"] = "Pick what describes you."
                    bannerError = "Choose an entity type."
                    return false
                }
                _ = try await AuthAPI.completeOwnerOnboarding(
                    entityType: entityType,
                    companyName: ownerCompany.trimmedNil,
                    defaultPostcode: postcode.trimmedNil,
                    defaultSuburb: suburb.trimmedNil,
                    defaultState: state,
                    contactPref: contactPref,
                    phone: phone.trimmingCharacters(in: .whitespaces)
                )
            }
            didSave = true
            return true
        } catch let error as APIError {
            if case let .validation(message, fields) = error {
                bannerError = message
                for (k, v) in fields { fieldErrors[k] = v }
            } else {
                bannerError = error.errorDescription ?? "Couldn't save your changes."
            }
            return false
        } catch {
            bannerError = "Couldn't save your changes."
            return false
        }
    }
}

struct EditProfileScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var vm: EditProfileViewModel
    let onSaved: () -> Void

    init(
        role: AuthSession.Role,
        builder: BuilderAPI.Bundle?,
        owner: ProfileAPI.OwnerResponse?,
        onSaved: @escaping () -> Void
    ) {
        _vm = State(initialValue: EditProfileViewModel(role: role, builder: builder, owner: owner))
        self.onSaved = onSaved
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        if vm.isBuilder { builderFields } else { ownerFields }
                        if let banner = vm.bannerError { WizardBanner(message: banner) }
                        Spacer(minLength: 30)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                }
                .scrollDismissesKeyboard(.interactively)
                saveBar
            }
        }
        .navigationTitle("Edit profile")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: vm.didSave) { _, saved in if saved { onSaved(); dismiss() } }
    }

    // MARK: - Builder

    private var builderFields: some View {
        VStack(alignment: .leading, spacing: 18) {
            group("Business") {
                if vm.companyLocked {
                    lockedField("Company name", vm.companyName, note: "Verified — locked")
                } else {
                    field("Company name", text: $vm.companyName, key: "companyName")
                }
                lockedField("ABN", vm.abn.isEmpty ? "Not added" : vm.abn,
                            note: vm.companyLocked ? "Verified" : nil)
                field("ACN (optional)", text: $vm.acn, key: "acn", keyboard: .numberPad)
                field("Trading name (optional)", text: $vm.tradingName, key: "tradingName")
                field("Years in operation (optional)", text: $vm.yearsText, key: "yearsInOperation", keyboard: .numberPad)
            }
            group("Business address") {
                field("Street address", text: $vm.bizLine1, key: "businessAddressLine1")
                field("Suburb", text: $vm.bizSuburb, key: "businessSuburb")
                HStack(alignment: .bottom, spacing: 10) {
                    stateMenu("State", $vm.bizState)
                    field("Postcode", text: $vm.bizPostcode, key: "businessPostcode", keyboard: .numberPad)
                }
            }
            group("Postal address") {
                Toggle(isOn: $vm.hasDifferentPostal) {
                    Text("Different postal address").font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text)
                }
                .tint(Palette.accent)
                if vm.hasDifferentPostal {
                    field("Postal street address", text: $vm.postalLine1, key: "postalAddressLine1")
                    field("Suburb", text: $vm.postalSuburb, key: "postalSuburb")
                    HStack(alignment: .bottom, spacing: 10) {
                        stateMenu("State", $vm.postalState)
                        field("Postcode", text: $vm.postalPostcode, key: "postalPostcode", keyboard: .numberPad)
                    }
                }
            }
            group("Contact") {
                field("Phone", text: $vm.phone, key: "phone", keyboard: .phonePad)
            }
            group("About") {
                multiline("Bio — tell owners about your work", text: $vm.bio)
                field("Website (optional)", text: $vm.website, key: "website", keyboard: .URL)
                field("LinkedIn URL (optional)", text: $vm.linkedin, key: "linkedinUrl", keyboard: .URL)
                field("Instagram URL (optional)", text: $vm.instagram, key: "instagramUrl", keyboard: .URL)
            }
        }
    }

    /// Reusable state menu bound to an optional selection.
    private func stateMenu(_ label: String, _ selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel(label)
            Menu {
                ForEach(ProfileLabels.auStates, id: \.self) { s in
                    Button(s) { selection.wrappedValue = s }
                }
            } label: {
                pickerLabel(selection.wrappedValue ?? "—")
            }
        }
    }

    // MARK: - Owner

    private var ownerFields: some View {
        VStack(alignment: .leading, spacing: 18) {
            group("About you") {
                entityPicker
                field("Company (optional)", text: $vm.ownerCompany, key: "companyName")
            }
            group("Default location (optional)") {
                field("Suburb", text: $vm.suburb, key: "defaultSuburb")
                HStack(alignment: .bottom, spacing: 10) {
                    stateMenu("State", $vm.state)
                    field("Postcode", text: $vm.postcode, key: "defaultPostcode", keyboard: .numberPad)
                }
            }
            group("Contact") {
                field("Phone", text: $vm.phone, key: "phone", keyboard: .phonePad)
                contactPrefPicker
            }
        }
    }

    private var entityPicker: some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel("I am a…")
            Menu {
                ForEach(entityOptions, id: \.0) { opt in
                    Button(opt.1) { vm.entityType = opt.0 }
                }
            } label: {
                pickerLabel(ProfileLabels.entityType(vm.entityType) ?? "Choose one")
            }
            fieldError("entityType")
        }
    }

    private var contactPrefPicker: some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel("Preferred contact")
            Picker("", selection: $vm.contactPref) {
                Text("Email").tag("email")
                Text("Phone").tag("phone")
                Text("Both").tag("both")
            }
            .pickerStyle(.segmented)
        }
    }

    private let entityOptions: [(String, String)] = [
        ("homeowner", "Homeowner"), ("owner_builder", "Owner-builder"),
        ("developer", "Developer"), ("investor", "Investor"),
        ("architect", "Architect"), ("drafter", "Drafter"),
        ("project_manager", "Project manager"), ("other", "Other"),
    ]

    // MARK: - Save bar

    private var saveBar: some View {
        Button { Task { await vm.save() } } label: {
            ZStack {
                Capsule().fill(Palette.accent)
                    .shadow(color: Palette.accentGlow, radius: 18, y: 8)
                if vm.isSaving {
                    ProgressView().tint(Palette.accentContrast)
                } else {
                    Text("Save changes").font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                }
            }
            .frame(height: 52)
            .frame(maxWidth: .infinity)
        }
        .disabled(vm.isSaving)
        .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 16)
        .background(Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .bottom))
    }

    // MARK: - Field building blocks

    @ViewBuilder
    private func group<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            WizardSectionLabel(text: title)
            content()
        }
    }

    private func field(_ label: String, text: Binding<String>, key: String, keyboard: UIKeyboardType = .default) -> some View {
        PremiumTextField(label: label, text: text, keyboardType: keyboard, error: vm.fieldErrors[key])
    }

    private func lockedField(_ label: String, _ value: String, note: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel(label)
            HStack(spacing: 8) {
                Text(value.isEmpty ? "—" : value)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                Spacer()
                if let note {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.seal.fill").font(.system(size: 10, weight: .bold))
                        Text(note).font(.system(size: 10, weight: .bold))
                    }
                    .foregroundStyle(Palette.success)
                }
                Image(systemName: "lock.fill").font(.system(size: 10, weight: .semibold)).foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 14).padding(.vertical, 14)
            .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface.opacity(0.5)))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairline, lineWidth: 1))
        }
    }

    private func multiline(_ placeholder: String, text: Binding<String>) -> some View {
        ZStack(alignment: .topLeading) {
            if text.wrappedValue.isEmpty {
                Text(placeholder).font(.system(size: 15)).foregroundStyle(Palette.textDim)
                    .padding(.horizontal, 16).padding(.vertical, 14)
            }
            TextEditor(text: text)
                .font(.system(size: 15)).foregroundStyle(Palette.text).tint(Palette.accent)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .frame(minHeight: 110)
        }
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineStrong, lineWidth: 1))
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text).font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.textMuted)
    }

    @ViewBuilder
    private func fieldError(_ key: String) -> some View {
        if let e = vm.fieldErrors[key] {
            Text(e).font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.danger)
        }
    }

    private func pickerLabel(_ value: String) -> some View {
        HStack {
            Text(value).font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.text)
            Spacer()
            Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
        }
        .padding(.horizontal, 14).padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineStrong, lineWidth: 1))
    }
}

private extension String {
    /// Trimmed, or nil if empty — for optional patch fields.
    var trimmedNil: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}
