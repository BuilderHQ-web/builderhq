/// EditProjectScreen — owner edits an existing project.
///
/// A single premium scroll (not a wizard). Type is fixed; the specs
/// section adapts to type. Three things happen here:
///   • Documents — add/remove project plans (drafts need an architectural
///     plan before they can go live).
///   • Validation — a LIVE project's required fields can't be cleared
///     (save is gated + inline errors); drafts may stay partial.
///   • Draft → live — saving a draft that's now complete (required fields
///     + an architectural plan) auto-promotes it to published.

import SwiftUI
import UniformTypeIdentifiers

@Observable
@MainActor
final class EditProjectViewModel {
    let slug: String
    let projectId: String
    let type: String
    let entryStatus: String
    var isDraft: Bool { entryStatus == "draft" }

    var title = ""
    var description = ""
    var addressLine1 = ""
    var suburb = ""
    var state: String? = nil
    var postcode = ""

    var bedrooms: Int? = nil
    var bathrooms: Int? = nil
    var floors: Int? = nil
    var landSizeBand: String? = nil
    var buildSizeBand: String? = nil
    var dwellingCount: Int? = nil
    var renovationScopeTags: Set<String> = []
    var existingAgeBand: String? = nil
    var extensionType: String? = nil
    var extensionSizeBand: String? = nil

    var budgetBand: String? = nil
    var startMonth: String? = nil
    var completionMonth: String? = nil

    // Documents
    var documents: [ProjectsAPI.DocumentRow]
    var uploads: [UploadingDoc] = []

    var isSaving = false
    var bannerError: String? = nil
    var fieldErrors: [String: String] = [:]   // from the server on a blocked save
    var didSave = false
    var didPublish = false

    struct UploadingDoc: Identifiable, Equatable {
        let id = UUID()
        let filename: String
        let category: String
        var failed = false
    }

    init(_ p: ProjectsAPI.DetailProjectFields, documents: [ProjectsAPI.DocumentRow]) {
        slug = p.slug
        projectId = p.id
        type = p.type
        entryStatus = p.status
        self.documents = documents
        title = p.title
        description = p.description ?? ""
        addressLine1 = p.addressLine1 ?? ""
        suburb = p.suburb ?? ""
        state = p.state
        postcode = p.postcode ?? ""
        bedrooms = p.bedrooms
        bathrooms = p.bathrooms
        floors = p.floors
        landSizeBand = p.landSizeBand
        buildSizeBand = p.buildSizeBand
        dwellingCount = p.dwellingCount
        if let s = p.renovationScope, !s.isEmpty { renovationScopeTags = [s] }
        existingAgeBand = p.existingAgeBand
        extensionType = p.extensionType
        extensionSizeBand = p.extensionSizeBand
        budgetBand = p.budgetBand
        startMonth = p.targetStartMonth
        completionMonth = p.targetCompletionMonth
    }

    var hasArchitectural: Bool {
        documents.contains { $0.category == "architectural" }
    }

    /// Required fields that can be CLEARED through the UI (text fields,
    /// scope chips, extension menus) — mirrors the server's
    /// `validateSaveReadiness` for the realistically-clearable subset.
    /// Steppers always carry a value, so they're never "missing".
    func blockingErrors() -> [String: String] {
        var e: [String: String] = [:]
        if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            e["title"] = "Add a project title."
        }
        let addressComplete =
            !addressLine1.trimmingCharacters(in: .whitespaces).isEmpty &&
            !suburb.trimmingCharacters(in: .whitespaces).isEmpty &&
            !(state ?? "").isEmpty &&
            !postcode.trimmingCharacters(in: .whitespaces).isEmpty
        if !addressComplete { e["address"] = "Complete the project address." }
        switch type {
        case "renovation":
            if renovationScopeTags.isEmpty { e["renovationScope"] = "Pick at least one renovation scope." }
        case "extension":
            if extensionType == nil { e["extensionType"] = "Pick the extension type." }
            if extensionSizeBand == nil { e["extensionSize"] = "Pick the extension size." }
        default:
            break
        }
        return e
    }

    /// What a draft still needs before it can go live.
    func publishChecklist() -> [String] {
        var out = Array(blockingErrors().values)
        if !hasArchitectural { out.append("Upload an architectural plan.") }
        return out
    }

    func save() async {
        bannerError = nil
        fieldErrors = [:]
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)

        // Live projects: block a save that would clear a required field.
        if !isDraft {
            let blocking = blockingErrors()
            if !blocking.isEmpty {
                fieldErrors = blocking
                bannerError = "Required details can't be left empty on a live project."
                return
            }
        } else if t.isEmpty {
            fieldErrors = ["title": "Add a project title."]
            bannerError = "Give your project a title."
            return
        }

        isSaving = true
        defer { isSaving = false }

        let payload = ProjectsAPI.PublishRequest(
            type: type,
            title: t,
            description: description.trimmedNilProj,
            addressLine1: addressLine1.trimmedNilProj,
            suburb: suburb.trimmingCharacters(in: .whitespaces),
            state: state ?? "",
            postcode: postcode.trimmingCharacters(in: .whitespaces),
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            floors: floors,
            landSizeBand: landSizeBand,
            buildSizeBand: buildSizeBand,
            dwellingCount: dwellingCount,
            renovationScopeTags: renovationScopeTags.isEmpty ? nil : Array(renovationScopeTags),
            existingAgeBand: existingAgeBand,
            extensionType: extensionType,
            extensionSizeBand: extensionSizeBand,
            budgetBand: budgetBand,
            targetStartMonth: startMonth,
            targetCompletionMonth: completionMonth
        )
        do {
            let proj = try await ProjectsAPI.updateProject(slug: slug, payload)
            if isDraft && proj.status == "published" { didPublish = true }
            didSave = true
        } catch let APIError.validation(message, errors) {
            fieldErrors = errors
            bannerError = message
        } catch let error as APIError {
            bannerError = error.errorDescription ?? "Couldn't save your changes."
        } catch {
            bannerError = "Couldn't save your changes."
        }
    }

    // MARK: - Documents

    func addDocument(url: URL, category: DocumentsAPI.Category) async {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }

        let filename = url.lastPathComponent
        let contentType = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
            ?? "application/octet-stream"
        let item = UploadingDoc(filename: filename, category: category.rawValue)
        uploads.append(item)

        do {
            let data = try Data(contentsOf: url)
            let initRes = try await DocumentsAPI.initUpload(
                projectId: projectId,
                category: category,
                filename: filename,
                contentType: contentType,
                sizeBytes: data.count
            )
            try await DocumentsAPI.putToR2(
                uploadUrl: initRes.uploadUrl,
                uploadHeaders: initRes.uploadHeaders,
                fileData: data
            )
            let doc = try await DocumentsAPI.complete(projectId: projectId, documentId: initRes.documentId)
            uploads.removeAll { $0.id == item.id }
            documents.append(ProjectsAPI.DocumentRow(
                id: doc.id, category: doc.category, filename: doc.filename,
                contentType: doc.contentType, sizeBytes: doc.sizeBytes,
                version: 1, status: doc.status, createdAt: doc.createdAt
            ))
        } catch {
            if let idx = uploads.firstIndex(where: { $0.id == item.id }) {
                uploads[idx].failed = true
            }
        }
    }

    func removeUpload(_ id: UUID) { uploads.removeAll { $0.id == id } }

    func removeDocument(_ doc: ProjectsAPI.DocumentRow) async {
        do {
            try await DocumentsAPI.delete(projectId: projectId, documentId: doc.id)
            documents.removeAll { $0.id == doc.id }
        } catch {
            bannerError = "Couldn't remove that document. Try again."
        }
    }
}

struct EditProjectScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var vm: EditProjectViewModel
    @State private var showSaved = false
    @State private var showImporter = false
    @State private var pendingCategory: DocumentsAPI.Category = .architectural
    let onSaved: () -> Void

    init(
        project: ProjectsAPI.DetailProjectFields,
        documents: [ProjectsAPI.DocumentRow] = [],
        onSaved: @escaping () -> Void
    ) {
        _vm = State(initialValue: EditProjectViewModel(project, documents: documents))
        self.onSaved = onSaved
    }

    private var canSave: Bool {
        guard !vm.isSaving else { return false }
        return vm.isDraft || vm.blockingErrors().isEmpty
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        basics
                        location
                        specs
                        budgetTimeline
                        documentsSection
                        if let banner = vm.bannerError { WizardBanner(message: banner) }
                        Spacer(minLength: 30)
                    }
                    .padding(.horizontal, 20).padding(.top, 12)
                }
                .scrollDismissesKeyboard(.interactively)
                saveBar
            }
        }
        .navigationTitle("Edit project")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(showSaved ? .hidden : .visible, for: .navigationBar)
        .fileImporter(isPresented: $showImporter, allowedContentTypes: docTypes, allowsMultipleSelection: false) { result in
            if case .success(let urls) = result, let url = urls.first {
                let cat = pendingCategory
                Task { await vm.addDocument(url: url, category: cat) }
            }
        }
        .overlay {
            if showSaved {
                SavedOverlay(
                    title: vm.didPublish ? "You're live!" : "Changes saved",
                    subtitle: vm.didPublish ? "Builders in your area are being matched now." : "Your updates are live.",
                    autoDismissAfter: vm.didPublish ? 3.0 : 2.4
                ) { onSaved(); dismiss() }
                .transition(.opacity)
            }
        }
        .onChange(of: vm.didSave) { _, saved in
            if saved { withAnimation(.easeOut(duration: 0.2)) { showSaved = true } }
        }
    }

    private let docTypes: [UTType] = [
        .pdf, .image, .png, .jpeg, .plainText, .commaSeparatedText, .zip,
        UTType("com.microsoft.word.doc") ?? .data,
        UTType("org.openxmlformats.wordprocessingml.document") ?? .data,
        UTType("com.microsoft.excel.xls") ?? .data,
        UTType("org.openxmlformats.spreadsheetml.sheet") ?? .data,
        .data,
    ]

    // MARK: - Sections

    private var basics: some View {
        group("Basics") {
            PremiumTextField(label: "Project title", text: $vm.title, error: vm.fieldErrors["title"])
            multiline("Description — scope, must-haves, anything builders should know", text: $vm.description)
        }
    }

    private var location: some View {
        group("Location") {
            PremiumTextField(label: "Street address", text: $vm.addressLine1, error: vm.fieldErrors["address"])
            PremiumTextField(label: "Suburb", text: $vm.suburb)
            HStack(alignment: .bottom, spacing: 10) {
                stateMenu
                PremiumTextField(label: "Postcode", text: $vm.postcode, keyboardType: .numberPad)
            }
        }
    }

    @ViewBuilder
    private var specs: some View {
        group("Specs") {
            switch vm.type {
            case "multi_dwelling":
                stepperRow("Dwellings", $vm.dwellingCount, range: 1...50, fallback: 2)
                bedBathFloors
                bandMenu("Land size", ProjectBands.land, $vm.landSizeBand)
                bandMenu("Build size", ProjectBands.build, $vm.buildSizeBand)
            case "renovation":
                multiChips("Scope", ProjectBands.renovationScope, $vm.renovationScopeTags)
                bandMenu("Age of home", ProjectBands.existingAge, $vm.existingAgeBand)
                bedBathFloors
            case "extension":
                bandMenu("Extension type", ProjectBands.extensionType, $vm.extensionType)
                bandMenu("Extension size", ProjectBands.extensionSize, $vm.extensionSizeBand)
                bandMenu("Age of home", ProjectBands.existingAge, $vm.existingAgeBand)
            default:
                bedBathFloors
                bandMenu("Land size", ProjectBands.land, $vm.landSizeBand)
                bandMenu("Build size", ProjectBands.build, $vm.buildSizeBand)
            }
        }
    }

    private var bedBathFloors: some View {
        VStack(spacing: 12) {
            stepperRow("Bedrooms", $vm.bedrooms, range: 0...20, fallback: 3)
            stepperRow("Bathrooms", $vm.bathrooms, range: 0...20, fallback: 2)
            stepperRow("Floors", $vm.floors, range: 1...10, fallback: 1)
        }
    }

    private var budgetTimeline: some View {
        group("Budget & timeline") {
            bandMenu("Budget", ProjectBands.budget, $vm.budgetBand)
            VStack(alignment: .leading, spacing: 6) {
                fieldLabel("Target start")
                MonthPicker(selection: $vm.startMonth)
            }
            VStack(alignment: .leading, spacing: 6) {
                fieldLabel("Target completion")
                MonthPicker(selection: $vm.completionMonth)
            }
        }
    }

    // MARK: - Documents

    private var documentsSection: some View {
        group("Documents") {
            if vm.isDraft && !vm.publishChecklist().isEmpty {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.accent)
                        Text("To go live, add:").font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.text)
                    }
                    ForEach(vm.publishChecklist(), id: \.self) { item in
                        Text("•  \(item)").font(.system(size: 12, weight: .medium)).foregroundStyle(Palette.textMuted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 12).fill(Palette.accentMuted))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.accent.opacity(0.25), lineWidth: 1))
            }

            VStack(spacing: 8) {
                ForEach(vm.documents) { doc in docRow(doc) }
                ForEach(vm.uploads) { up in uploadRow(up) }
            }

            Menu {
                ForEach(DocumentsAPI.Category.allCases, id: \.self) { cat in
                    Button(categoryLabel(cat)) {
                        pendingCategory = cat
                        showImporter = true
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill").font(.system(size: 14, weight: .bold))
                    Text("Add document").font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(Palette.accent)
                .frame(maxWidth: .infinity).frame(height: 46)
                .background(Capsule().fill(Palette.accentMuted))
                .overlay(Capsule().stroke(Palette.accent.opacity(0.3), lineWidth: 1))
            }
        }
    }

    private func docRow(_ doc: ProjectsAPI.DocumentRow) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "doc.fill").font(.system(size: 14)).foregroundStyle(Palette.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text(doc.filename).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text)
                    .lineLimit(1).truncationMode(.middle)
                Text("\(categoryLabel(doc.category)) · \(prettySize(doc.sizeBytes))")
                    .font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim)
            }
            Spacer(minLength: 0)
            Press(haptic: .tap) { Task { await vm.removeDocument(doc) } } content: {
                Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
                    .frame(width: 28, height: 28).background(Circle().fill(Palette.surfaceElev))
                    .contentShape(Circle())
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 9)
        .background(RoundedRectangle(cornerRadius: 12).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.hairline, lineWidth: 1))
    }

    private func uploadRow(_ up: EditProjectViewModel.UploadingDoc) -> some View {
        HStack(spacing: 10) {
            if up.failed {
                Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 13)).foregroundStyle(Palette.danger)
            } else {
                ProgressView().controlSize(.small).tint(Palette.accent)
            }
            Text(up.filename).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.textMuted)
                .lineLimit(1).truncationMode(.middle)
            Spacer(minLength: 0)
            if up.failed {
                Press(haptic: .tap) { vm.removeUpload(up.id) } content: {
                    Text("Dismiss").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
                }
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 9)
        .background(RoundedRectangle(cornerRadius: 12).fill(Palette.surface.opacity(0.6)))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.hairline, lineWidth: 1))
    }

    private func categoryLabel(_ raw: String) -> String {
        if let c = DocumentsAPI.Category(rawValue: raw) { return categoryLabel(c) }
        return raw.replacingOccurrences(of: "_", with: " ").capitalized
    }
    private func categoryLabel(_ c: DocumentsAPI.Category) -> String {
        switch c {
        case .architectural: return "Architectural plans"
        case .structuralEngineering: return "Structural engineering"
        case .civilEngineering: return "Civil engineering"
        case .specifications: return "Specifications"
        case .landReport: return "Land report"
        case .soilReport: return "Soil report"
        case .energyRating: return "Energy rating"
        case .townPlanning: return "Town planning"
        case .other: return "Other"
        }
    }

    private func prettySize(_ bytes: Int) -> String {
        let kb = Double(bytes) / 1024
        return kb < 1024 ? String(format: "%.0f KB", kb) : String(format: "%.1f MB", kb / 1024)
    }

    // MARK: - Save

    private var saveBar: some View {
        Button { Task { await vm.save() } } label: {
            ZStack {
                Capsule().fill(canSave ? Palette.accent : Palette.surfaceElev)
                    .shadow(color: canSave ? Palette.accentGlow : .clear, radius: 18, y: 8)
                if vm.isSaving {
                    ProgressView().tint(Palette.accentContrast)
                } else {
                    Text(saveLabel)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(canSave ? Palette.accentContrast : Palette.textDim)
                }
            }
            .frame(height: 52).frame(maxWidth: .infinity)
            .overlay(canSave ? nil : Capsule().stroke(Palette.hairlineStrong, lineWidth: 1))
        }
        .disabled(!canSave)
        .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 16)
        .background(Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .bottom))
    }

    private var saveLabel: String {
        if !vm.isDraft && !vm.blockingErrors().isEmpty { return "Complete required fields" }
        if vm.isDraft && vm.publishChecklist().isEmpty { return "Save & publish" }
        return "Save changes"
    }

    // MARK: - Building blocks

    @ViewBuilder
    private func group<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            WizardSectionLabel(text: title)
            content()
        }
    }

    private var stateMenu: some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel("State")
            Menu {
                ForEach(ProfileLabels.auStates, id: \.self) { s in Button(s) { vm.state = s } }
            } label: {
                pickerLabel(vm.state ?? "—")
            }
        }
    }

    private func bandMenu(_ label: String, _ options: [ProjectBands.Option], _ selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldLabel(label)
            Menu {
                ForEach(options, id: \.value) { opt in Button(opt.label) { selection.wrappedValue = opt.value } }
            } label: {
                pickerLabel(ProjectBands.label(selection.wrappedValue, in: options))
            }
        }
    }

    private func stepperRow(_ label: String, _ value: Binding<Int?>, range: ClosedRange<Int>, fallback: Int) -> some View {
        HStack {
            Text(label).font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text)
            Spacer()
            Stepper(
                "\(value.wrappedValue ?? fallback)",
                value: Binding(get: { value.wrappedValue ?? fallback }, set: { value.wrappedValue = $0 }),
                in: range
            )
            .fixedSize()
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineStrong, lineWidth: 1))
    }

    private func multiChips(_ label: String, _ options: [ProjectBands.Option], _ selection: Binding<Set<String>>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldLabel(label)
            FlexibleWrapCompare(spacing: 8, lineSpacing: 8) {
                ForEach(options, id: \.value) { opt in
                    let on = selection.wrappedValue.contains(opt.value)
                    Press(haptic: .select) {
                        if on { selection.wrappedValue.remove(opt.value) } else { selection.wrappedValue.insert(opt.value) }
                    } content: {
                        Text(opt.label).font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(on ? Palette.accentContrast : Palette.text)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Capsule().fill(on ? Palette.accent : Palette.surface))
                            .overlay(Capsule().stroke(on ? .clear : Palette.hairline, lineWidth: 1))
                    }
                }
            }
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
                .scrollContentBackground(.hidden).padding(.horizontal, 12).padding(.vertical, 8)
                .frame(minHeight: 110)
        }
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineStrong, lineWidth: 1))
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text).font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.textMuted)
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
    var trimmedNilProj: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}
