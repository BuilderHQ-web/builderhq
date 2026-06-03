/// DocumentPreviewView — a shared in-app document viewer.
///
/// Given a (presigned) remote URL, downloads the file to a temp location
/// and previews it with QuickLook (PDF, images, Office, CAD…). Used by
/// the owner's tender-document viewer and the unlocked-builder plan
/// viewer. Presented as a sheet via `DocumentPreviewLink`.

import SwiftUI
import QuickLook

/// Identifiable wrapper so any screen can present the previewer with
/// `.sheet(item:)`.
struct DocumentPreviewLink: Identifiable, Equatable {
    let id = UUID()
    let url: URL
    let filename: String
}

struct DocumentPreviewView: View {
    let link: DocumentPreviewLink
    @Environment(\.dismiss) private var dismiss

    @State private var localURL: URL?
    @State private var failed = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let localURL {
                QuickLookPreview(url: localURL).ignoresSafeArea(edges: .bottom)
            } else if failed {
                errorState
            } else {
                VStack(spacing: 12) {
                    ProgressView().tint(.white)
                    Text("Loading \(link.filename)…")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) { header }
        .task { await load() }
    }

    private var header: some View {
        HStack(spacing: 12) {
            Text(link.filename)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.text)
                .lineLimit(1).truncationMode(.middle)
            Spacer(minLength: 8)
            Press(haptic: .tap) { dismiss() } content: {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.text)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.8)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
                    .contentShape(Circle())
            }
        }
        .padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 10)
        .background(Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .top))
    }

    private var errorState: some View {
        VStack(spacing: 12) {
            Image(systemName: "doc.questionmark")
                .font(.system(size: 30, weight: .semibold)).foregroundStyle(Palette.warning)
            Text("Couldn't load this document")
                .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
            Text("The link may have expired. Close and try again.")
                .font(.system(size: 13)).foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 32)
    }

    private func load() async {
        do {
            let (data, _) = try await URLSession.shared.data(from: link.url)
            let safeName = link.filename.isEmpty ? "document" : link.filename
            let tmp = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString, isDirectory: true)
            try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
            let fileURL = tmp.appendingPathComponent(safeName)
            try data.write(to: fileURL, options: .atomic)
            localURL = fileURL
        } catch {
            failed = true
        }
    }
}

// MARK: - QuickLook bridge

private struct QuickLookPreview: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: QLPreviewController, context: Context) {
        context.coordinator.url = url
        controller.reloadData()
    }

    func makeCoordinator() -> Coordinator { Coordinator(url: url) }

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        var url: URL
        init(url: URL) { self.url = url }
        func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            url as NSURL
        }
    }
}
