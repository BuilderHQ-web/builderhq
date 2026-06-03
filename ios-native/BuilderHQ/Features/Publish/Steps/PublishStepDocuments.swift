/// PublishStepDocuments — the project's document drop zone.
///
/// One card per document category from the canonical web list:
/// architectural, structural, civil, specs, land, soil, energy,
/// planning, other. The architectural card is "required to publish"
/// — projects without at least one architectural plan are saved as
/// drafts at the end of the wizard.
///
/// Visual language:
///   · Required card sits at the top with a soft accent glow, an
///     animated "REQUIRED" pill, and a hairline-accent border.
///   · Optional cards are quieter — collapsed by default with a
///     chevron, expanding to reveal file lists + the upload button.
///   · Tapping "Add files" opens the system file importer with
///     multi-select and a permissive UTType allowlist (PDFs,
///     images, Office docs, CADs, archives — same set the server
///     accepts).
///   · Per-file rows show a progress ring during upload that flips
///     to a checkmark on completion. Failures get a retry pill.
///
/// State + uploads are entirely owned by `ProjectPublishViewModel`.
/// This view is presentation + I/O for the file picker; the VM
/// handles init → R2 → complete.

import SwiftUI
import UniformTypeIdentifiers

struct PublishStepDocuments: View {
    @Bindable var vm: ProjectPublishViewModel

    /// Which category the user is currently picking files for. Drives
    /// the single `.fileImporter` modifier shared by all cards.
    @State private var pickingFor: DocumentsAPI.Category? = nil
    /// Category cards in expanded state. Architectural starts open
    /// (it's the required one); others start collapsed.
    @State private var expanded: Set<DocumentsAPI.Category> = [.architectural]

    private let allowedTypes: [UTType] = [
        .pdf,
        .image,
        .png,
        .jpeg,
        .webP,
        .heic,
        .heif,
        .zip,
        .plainText,
        .commaSeparatedText,
        // Office formats use string identifiers — fall back to data
        // for anything unknown so DWG / CAD files still pick.
        UTType("com.microsoft.word.doc") ?? .data,
        UTType("org.openxmlformats.wordprocessingml.document") ?? .data,
        UTType("com.microsoft.excel.xls") ?? .data,
        UTType("org.openxmlformats.spreadsheetml.sheet") ?? .data,
        UTType("com.autodesk.dwg") ?? .data,
        .data,
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header
            ScrollView {
                VStack(spacing: 16) {
                    if vm.isCreatingDraft {
                        savingDraftBanner
                    }
                    requiredCard
                    Divider()
                        .overlay(Palette.hairline)
                        .padding(.vertical, 4)
                    optionalSectionLabel
                    optionalCards
                    draftHintBanner
                }
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
        }
        .padding(.horizontal, 22)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .task {
            // Make sure the server has a draft we can attach uploads
            // to. Idempotent — VM short-circuits if a draftId already
            // exists from a previous visit to this step.
            await vm.ensureDraftExists()
        }
        .fileImporter(
            isPresented: Binding(
                get: { pickingFor != nil },
                set: { if !$0 { pickingFor = nil } }
            ),
            allowedContentTypes: allowedTypes,
            allowsMultipleSelection: true,
            onCompletion: handleFiles
        )
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            stepLabel("Drop in the documents")
            Text("Architectural plans publish the project. Everything else is optional — but more docs = better tenders.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Saving-draft banner (only briefly visible on entry)

    private var savingDraftBanner: some View {
        HStack(spacing: 10) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(Palette.accent)
                .scaleEffect(0.7)
            Text("Saving your project so files can be attached…")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Palette.textMuted)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    // MARK: - Required card (architectural)

    private var requiredCard: some View {
        DocCategoryCard(
            category: .architectural,
            files: filesIn(.architectural),
            isExpanded: expanded.contains(.architectural),
            isRequired: true,
            onToggle: { toggle(.architectural) },
            onPick: { pickingFor = .architectural },
            onRemove: { id in vm.removeUpload(id: id) },
            onRetry: { id in retryUpload(id: id) }
        )
    }

    // MARK: - Optional category cards

    private var optionalSectionLabel: some View {
        HStack(spacing: 6) {
            Text("ADDITIONAL DOCUMENTS")
                .font(.system(size: 10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(Palette.textDim)
            Spacer()
            Text("Optional")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.textDim)
        }
        .padding(.horizontal, 4)
    }

    @ViewBuilder
    private var optionalCards: some View {
        let optionalCategories: [DocumentsAPI.Category] = [
            .structuralEngineering,
            .civilEngineering,
            .specifications,
            .landReport,
            .soilReport,
            .energyRating,
            .townPlanning,
            .other,
        ]
        VStack(spacing: 10) {
            ForEach(optionalCategories, id: \.self) { cat in
                DocCategoryCard(
                    category: cat,
                    files: filesIn(cat),
                    isExpanded: expanded.contains(cat),
                    isRequired: false,
                    onToggle: { toggle(cat) },
                    onPick: { pickingFor = cat },
                    onRemove: { id in vm.removeUpload(id: id) },
                    onRetry: { id in retryUpload(id: id) }
                )
            }
        }
    }

    // MARK: - Bottom hint

    private var draftHintBanner: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: vm.hasArchitecturalPlan
                ? "checkmark.seal.fill"
                : "doc.text.magnifyingglass")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(
                    vm.hasArchitecturalPlan
                        ? Palette.accent
                        : Palette.warning
                )
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 4) {
                Text(vm.hasArchitecturalPlan
                     ? "Ready to publish."
                     : "Will save as draft until you add architectural plans.")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.text)
                Text(vm.hasArchitecturalPlan
                     ? "Builders see your project the moment you finish the wizard."
                     : "Drafts stay in your dashboard. Add architectural plans here or later to go live.")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(
                    vm.hasArchitecturalPlan
                        ? Palette.accent.opacity(0.32)
                        : Palette.warning.opacity(0.32),
                    lineWidth: 1
                )
        )
        .animation(Motion.easeOutSoft, value: vm.hasArchitecturalPlan)
    }

    // MARK: - Helpers

    private func filesIn(
        _ category: DocumentsAPI.Category
    ) -> [ProjectPublishViewModel.UploadFile] {
        vm.uploads.filter { $0.category == category }
    }

    private func toggle(_ category: DocumentsAPI.Category) {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
            if expanded.contains(category) {
                expanded.remove(category)
            } else {
                expanded.insert(category)
            }
        }
    }

    private func handleFiles(_ result: Result<[URL], Error>) {
        let category = pickingFor ?? .other
        pickingFor = nil
        guard case .success(let urls) = result else { return }
        for url in urls {
            // SecurityScoped resource — required for files outside the
            // app's sandbox (anything the user picked from the Files
            // app or external providers).
            let needsScope = url.startAccessingSecurityScopedResource()
            defer { if needsScope { url.stopAccessingSecurityScopedResource() } }

            guard let data = try? Data(contentsOf: url) else { continue }
            let filename = url.lastPathComponent
            let contentType = mimeType(for: url)

            Task {
                await vm.uploadFile(
                    category: category,
                    filename: filename,
                    contentType: contentType,
                    data: data
                )
            }
        }
    }

    private func retryUpload(id: UUID) {
        // We can't re-upload without the original file bytes, which
        // weren't retained after the first attempt. Drop the failed
        // row so the owner can re-pick.
        vm.removeUpload(id: id)
    }

    /// Map a URL's extension to a server-accepted mime. Falls back to
    /// `application/octet-stream` which the server accepts as a
    /// catch-all (and re-derives via R2 metadata on download).
    private func mimeType(for url: URL) -> String {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "pdf":  return "application/pdf"
        case "png":  return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "heic": return "image/heic"
        case "zip":  return "application/zip"
        case "doc":  return "application/msword"
        case "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case "xls":  return "application/vnd.ms-excel"
        case "xlsx":
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        case "csv":  return "text/csv"
        case "txt":  return "text/plain"
        case "dwg":  return "application/dwg"
        default:     return "application/octet-stream"
        }
    }

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }
}
