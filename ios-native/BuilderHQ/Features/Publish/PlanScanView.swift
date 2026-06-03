/// PlanScanView — the AI path's upload screen.
///
/// The owner picks their architectural plan PDF here; we send it to the
/// extractor and (on success) drop them into the pre-filled wizard. The
/// immersive scanner overlay is shown by the wizard while the round-trip
/// runs. A failed read keeps them here to retry or fall back to manual.

import SwiftUI
import UniformTypeIdentifiers

struct PlanScanView: View {
    let vm: ProjectPublishViewModel
    let onBack: () -> Void
    let onClose: () -> Void

    @State private var picking = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    if case .failed(let message) = vm.scanPhase {
                        errorBanner(message)
                    }
                    dropzone
                    reassurance
                    Spacer(minLength: 12)
                }
                .padding(.horizontal, 22)
                .padding(.top, 14)
            }
            .scrollIndicators(.hidden)

            skipFooter
        }
        .fileImporter(
            isPresented: $picking,
            allowedContentTypes: [.pdf],
            allowsMultipleSelection: false,
            onCompletion: handlePick
        )
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: 12) {
            Press(haptic: .tap, action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
            Spacer()
            Press(haptic: .tap, action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 6)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Kicker("Auto-fill", tint: Palette.accent)
            (
                Text("Upload your ")
                    .font(Typography.ui(size: 30, weight: .semibold))
                    .foregroundStyle(Palette.text)
                + Text("plans.")
                    .font(Typography.serifItalic(size: 34))
                    .foregroundStyle(Palette.accent)
            )
            .fixedSize(horizontal: false, vertical: true)
            Text("One PDF of your architectural set — site plan, floor plans, elevations. We'll read it and fill in your project for you to review.")
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Dropzone

    private var dropzone: some View {
        Press(haptic: .select) {
            picking = true
        } content: {
            VStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Palette.accentMuted)
                        .frame(width: 64, height: 64)
                    Image(systemName: "arrow.up.doc.fill")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }
                VStack(spacing: 4) {
                    Text(isFailed ? "Choose another PDF" : "Tap to choose a PDF")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Palette.text)
                    Text("Architectural plans · PDF · up to 28 MB")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: Radius.hero, style: .continuous)
                        .fill(Palette.accent.opacity(0.05))
                    BlueprintGrid(spacing: 20, tint: Palette.accentLight, minorOpacity: 0.05)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.hero, style: .continuous))
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radius.hero, style: .continuous)
                    .stroke(
                        Palette.accent.opacity(0.5),
                        style: StrokeStyle(lineWidth: 1.5, dash: [7, 6])
                    )
            )
        }
    }

    private var isFailed: Bool {
        if case .failed = vm.scanPhase { return true }
        return false
    }

    // MARK: - Reassurance

    private var reassurance: some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.accent)
                .padding(.top, 1)
            Text("Your plans are read securely to fill the form — you review and edit everything before anything is published.")
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Palette.textDim)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                .fill(Palette.surface.opacity(0.5))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Palette.warning)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(13)
        .background(
            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                .fill(Palette.warning.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                .stroke(Palette.warning.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Skip footer

    private var skipFooter: some View {
        Press(haptic: .tap) {
            vm.skipPlanScan()
        } content: {
            Text("I'll enter the details myself")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.textMuted)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Capsule().fill(Palette.surface))
                .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 16)
    }

    // MARK: - File pick

    private func handlePick(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { return }
        let filename = url.lastPathComponent
        Task {
            await vm.scanPlans(
                filename: filename,
                contentType: "application/pdf",
                data: data
            )
        }
    }
}
