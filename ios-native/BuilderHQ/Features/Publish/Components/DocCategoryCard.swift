/// DocCategoryCard — one premium category card on the publish
/// wizard's Documents step.
///
/// Two visual variants driven by `isRequired`:
///
///   · Required (architectural plans only):
///       - Always expanded — no chevron
///       - Subtle radial accent halo behind the card
///       - "REQUIRED" pulse pill at the top-right
///       - Hairline accent border that "breathes" at low intensity
///
///   · Optional (everything else):
///       - Collapsed by default with a chevron + file count
///       - Tap header to expand, revealing the upload zone
///       - Hairline border, no accent treatment, deferential
///
/// Expanded state always shows: a one-line hint, the list of uploaded
/// files (each with progress ring + remove button + status), and an
/// "Add files" CTA that calls back to the parent which fires the
/// `.fileImporter` modifier.

import SwiftUI

struct DocCategoryCard: View {
    let category: DocumentsAPI.Category
    let files: [ProjectPublishViewModel.UploadFile]
    let isExpanded: Bool
    let isRequired: Bool
    let onToggle: () -> Void
    let onPick: () -> Void
    let onRemove: (UUID) -> Void
    let onRetry: (UUID) -> Void

    @State private var requiredPulse: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            header

            if effectiveExpanded {
                expandedBody
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(backgroundFill)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(borderFill, lineWidth: isRequired ? 1.2 : 1)
        )
        .shadow(
            color: isRequired
                ? Palette.accentGlow.opacity(requiredPulse ? 0.42 : 0.22)
                : .clear,
            radius: isRequired ? 18 : 0,
            y: 6
        )
        .animation(
            .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
            value: requiredPulse
        )
        .onAppear { if isRequired { requiredPulse = true } }
    }

    // Required cards are always expanded; we ignore the prop in that
    // mode so the parent's `expanded` set doesn't accidentally
    // collapse the architectural card.
    private var effectiveExpanded: Bool {
        isRequired ? true : isExpanded
    }

    // MARK: - Header

    private var header: some View {
        Group {
            if isRequired {
                headerContent
            } else {
                Press(haptic: .tap, action: onToggle) {
                    headerContent
                }
            }
        }
    }

    private var headerContent: some View {
        HStack(spacing: 12) {
            categoryIcon
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 7) {
                    Text(category.titleLabel)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    if isRequired {
                        requiredPill
                    }
                }
                Text(subtitleText)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.textDim)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            if !isRequired {
                Image(systemName: "chevron.down")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
                    .animation(
                        .spring(response: 0.32, dampingFraction: 0.78),
                        value: isExpanded
                    )
            } else {
                // Required cards skip the chevron — use the file-count
                // chip instead so the user still sees state at a glance.
                fileCountChip
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    private var categoryIcon: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: isRequired
                            ? [
                                Palette.accent.opacity(0.4),
                                Palette.accent.opacity(0.12),
                              ]
                            : [
                                Palette.surfaceElev,
                                Palette.surface,
                              ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .stroke(
                            isRequired
                                ? Palette.accent.opacity(0.5)
                                : Palette.hairline,
                            lineWidth: 1
                        )
                )

            Image(systemName: category.iconName)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(
                    isRequired ? Palette.accent : Palette.accentLight
                )
        }
        .frame(width: 40, height: 40)
    }

    private var requiredPill: some View {
        HStack(spacing: 3) {
            Circle()
                .fill(Palette.accent)
                .frame(width: 4, height: 4)
                .shadow(color: Palette.accentGlow, radius: 4)
                .scaleEffect(requiredPulse ? 1.2 : 0.85)
            Text("REQUIRED")
                .font(.system(size: 9, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.accent)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(Capsule().fill(Palette.accentMuted))
        .overlay(Capsule().stroke(Palette.accent.opacity(0.4), lineWidth: 1))
    }

    private var fileCountChip: some View {
        Group {
            if files.isEmpty {
                Text("0")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .frame(width: 22, height: 22)
                    .background(Circle().fill(Palette.surface))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            } else {
                Text("\(files.count)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .frame(width: 22, height: 22)
                    .background(Circle().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 6)
            }
        }
    }

    private var subtitleText: String {
        if files.isEmpty {
            return category.hintLabel
        }
        let completed = files.filter { $0.isCompleted }.count
        let total = files.count
        if completed == total {
            return "\(total) file\(total == 1 ? "" : "s") · ready"
        }
        return "\(completed) of \(total) uploaded"
    }

    // MARK: - Expanded body

    private var expandedBody: some View {
        VStack(alignment: .leading, spacing: 12) {
            Rectangle()
                .fill(Palette.hairline)
                .frame(height: 0.5)
                .padding(.horizontal, 16)

            // Hint text — only when the card is empty so completed
            // cards don't shout filler at the user.
            if files.isEmpty {
                Text(category.hintLabel)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 16)
                    .padding(.top, 6)
            }

            if !files.isEmpty {
                VStack(spacing: 8) {
                    ForEach(files) { file in
                        UploadFileRow(
                            file: file,
                            onRemove: { onRemove(file.id) },
                            onRetry: { onRetry(file.id) }
                        )
                    }
                }
                .padding(.horizontal, 16)
            }

            addFilesButton
                .padding(.horizontal, 16)
                .padding(.bottom, 14)
                .padding(.top, files.isEmpty ? 6 : 4)
        }
        .transition(
            .opacity.combined(
                with: .move(edge: .top)
            )
        )
    }

    private var addFilesButton: some View {
        Press(haptic: .tap, action: onPick) {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 13, weight: .bold))
                Text(files.isEmpty ? "Upload files" : "Add more")
                    .font(.system(size: 13, weight: .bold))
                Spacer()
                Text(allowedHint)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.textDim)
            }
            .foregroundStyle(isRequired ? Palette.accent : Palette.accentLight)
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(
                        isRequired
                            ? Palette.accentMuted
                            : Palette.surfaceElev
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(
                        isRequired
                            ? Palette.accent.opacity(0.4)
                            : Palette.hairlineStrong,
                        lineWidth: 1
                    )
            )
        }
    }

    private var allowedHint: String {
        "PDF · DWG · IMG"
    }

    // MARK: - Visual styling

    private var backgroundFill: AnyShapeStyle {
        if isRequired {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [
                        Palette.surface,
                        Palette.surface.opacity(0.7),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
        return AnyShapeStyle(Palette.surface)
    }

    private var borderFill: AnyShapeStyle {
        if isRequired {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [
                        Palette.accent.opacity(0.6),
                        Palette.accent.opacity(0.2),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
        return AnyShapeStyle(Palette.hairlineStrong)
    }
}

// MARK: - Per-file row

private struct UploadFileRow: View {
    let file: ProjectPublishViewModel.UploadFile
    let onRemove: () -> Void
    let onRetry: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            statusGlyph

            VStack(alignment: .leading, spacing: 2) {
                Text(file.filename)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                    .truncationMode(.middle)
                HStack(spacing: 6) {
                    Text(prettyBytes(file.sizeBytes))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                    Circle().fill(Palette.textDim).frame(width: 2, height: 2)
                    Text(statusLabel)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(statusColor)
                }
            }

            Spacer(minLength: 8)

            trailingControl
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Palette.surfaceElev.opacity(0.6))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    private var statusGlyph: some View {
        ZStack {
            Circle()
                .fill(glyphBg)
                .frame(width: 32, height: 32)

            switch file.state {
            case .completed:
                Image(systemName: "checkmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.accent)
            case .failed:
                Image(systemName: "exclamationmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.danger)
            case .pending, .uploading:
                // Progress ring — uses the .uploading progress when
                // available, falls through to indeterminate for
                // .pending.
                let p = progressValue
                ZStack {
                    Circle()
                        .stroke(Palette.hairline, lineWidth: 2)
                        .frame(width: 18, height: 18)
                    Circle()
                        .trim(from: 0, to: max(0.05, p))
                        .stroke(
                            Palette.accent,
                            style: StrokeStyle(lineWidth: 2, lineCap: .round)
                        )
                        .frame(width: 18, height: 18)
                        .rotationEffect(.degrees(-90))
                        .animation(Motion.easeOut, value: p)
                }
            }
        }
    }

    private var glyphBg: Color {
        switch file.state {
        case .completed: return Palette.accentMuted
        case .failed:    return Palette.dangerMuted
        case .pending, .uploading: return Palette.surface
        }
    }

    private var progressValue: Double {
        if case .uploading(let p) = file.state { return p }
        return 0
    }

    private var statusLabel: String {
        switch file.state {
        case .pending:   return "Queued"
        case .uploading(let p):
            return "Uploading · \(Int(p * 100))%"
        case .completed: return "Uploaded"
        case .failed:    return "Failed"
        }
    }

    private var statusColor: Color {
        switch file.state {
        case .completed: return Palette.accent
        case .failed:    return Palette.danger
        case .pending, .uploading: return Palette.textMuted
        }
    }

    @ViewBuilder
    private var trailingControl: some View {
        switch file.state {
        case .failed:
            Press(haptic: .tap, action: onRetry) {
                Text("Retry")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.danger)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Palette.dangerMuted))
            }
        default:
            Press(haptic: .tap, action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .frame(width: 24, height: 24)
                    .background(Circle().fill(Palette.surface))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
    }

    private func prettyBytes(_ n: Int) -> String {
        let kb = Double(n) / 1024
        if kb < 1 { return "\(n) B" }
        if kb < 1024 { return String(format: "%.0f KB", kb) }
        return String(format: "%.1f MB", kb / 1024)
    }
}

// MARK: - Category metadata

extension DocumentsAPI.Category {
    var titleLabel: String {
        switch self {
        case .architectural:        return "Architectural plans"
        case .structuralEngineering: return "Structural engineering"
        case .civilEngineering:     return "Civil engineering"
        case .specifications:       return "Specifications"
        case .landReport:           return "Land report"
        case .soilReport:           return "Soil report"
        case .energyRating:         return "Energy efficiency"
        case .townPlanning:         return "Town planning"
        case .other:                return "Other documents"
        }
    }

    var iconName: String {
        switch self {
        case .architectural:        return "scroll"
        case .structuralEngineering: return "square.3.layers.3d"
        case .civilEngineering:     return "drop.fill"
        case .specifications:       return "list.bullet.rectangle.portrait"
        case .landReport:           return "map"
        case .soilReport:           return "leaf"
        case .energyRating:         return "bolt.batteryblock.fill"
        case .townPlanning:         return "building.columns"
        case .other:                return "folder.fill"
        }
    }

    var hintLabel: String {
        switch self {
        case .architectural:
            return "Floor plans, elevations, sections. Builders need these to tender."
        case .structuralEngineering:
            return "Beams, footings, slab, framing details."
        case .civilEngineering:
            return "Stormwater, sewerage, retaining walls."
        case .specifications:
            return "Materials, finishes, inclusions schedule."
        case .landReport:
            return "Title docs, boundary lines, easements."
        case .soilReport:
            return "Geotechnical, classification, bore logs."
        case .energyRating:
            return "NatHERS, BASIX, thermal compliance."
        case .townPlanning:
            return "Permits, DA, planning council reports."
        case .other:
            return "Anything else that helps builders quote accurately."
        }
    }
}
