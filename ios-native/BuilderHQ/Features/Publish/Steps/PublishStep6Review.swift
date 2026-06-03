/// PublishStep6Review — last look + the publish moment.
///
/// Layout:
///   · A clean grouping of "here's what we'll publish" rows so the
///     owner can spot anything off
///   · Each row is tappable → jumps back to the relevant step to edit
///   · A big sticky "Publish project" CTA at the bottom
///
/// On submit, the wizard transitions to a celebration state — a
/// teal-glowing checkmark seal with confetti-style sparkle effect,
/// brief "Your project is live." italic, "Open dashboard" button. The
/// celebration is rendered by the container; this view just kicks it
/// off.

import SwiftUI

struct PublishStep6Review: View {
    @Bindable var vm: ProjectPublishViewModel
    let onPublishTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                stepLabel("Last look")
                Text("Tap any row to edit before you publish.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
            }
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    reviewCard(
                        title: "Type",
                        value: typeDisplay,
                        editStep: .type
                    )
                    reviewCard(
                        title: "Location",
                        value: locationDisplay,
                        editStep: .location
                    )
                    reviewCard(
                        title: "Specs",
                        value: specsDisplay,
                        editStep: .specs
                    )
                    reviewCard(
                        title: "Budget + start",
                        value: budgetTimelineDisplay,
                        editStep: .budgetTimeline
                    )
                    reviewCard(
                        title: "Title",
                        value: vm.draft.title.isEmpty
                            ? "Default will be used"
                            : vm.draft.title,
                        editStep: .titleDescription
                    )
                    reviewCard(
                        title: "Documents",
                        value: documentsDisplay,
                        editStep: .documents
                    )

                    if !vm.hasArchitecturalPlan {
                        draftWarningRow
                            .padding(.top, 4)
                    }

                    if let banner = vm.bannerError {
                        BannerErrorRow(message: banner)
                            .padding(.top, 4)
                    }
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // MARK: - Review row

    private func reviewCard(
        title: String,
        value: String,
        editStep: ProjectPublishViewModel.Step
    ) -> some View {
        Press(haptic: .tap) {
            vm.jump(to: editStep)
        } content: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1.4)
                        .foregroundStyle(Palette.textDim)
                    Text(value)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Palette.text)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardSurface(.flat, radius: 16)
        }
    }

    // MARK: - Display strings

    private var typeDisplay: String {
        switch vm.draft.type {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return "Not set"
        }
    }

    private var locationDisplay: String {
        guard let loc = vm.draft.location else { return "Not set" }
        if !loc.addressLine1.isEmpty {
            return "\(loc.addressLine1), \(loc.suburb) \(loc.state) \(loc.postcode)"
        }
        return "\(loc.suburb), \(loc.state) \(loc.postcode)"
    }

    private var specsDisplay: String {
        var bits: [String] = []
        if let beds = vm.draft.bedrooms {
            bits.append("\(beds) bed\(beds == 1 ? "" : "s")")
        }
        if let baths = vm.draft.bathrooms {
            bits.append("\(baths) bath\(baths == 1 ? "" : "s")")
        }
        if let floors = vm.draft.floors {
            bits.append("\(floors) floor\(floors == 1 ? "" : "s")")
        }
        if let dwellings = vm.draft.dwellingCount {
            bits.append("\(dwellings) dwellings")
        }
        if !vm.draft.renovationScopeTags.isEmpty {
            bits.append("\(vm.draft.renovationScopeTags.count) scope tag\(vm.draft.renovationScopeTags.count == 1 ? "" : "s")")
        }
        if let ext = vm.draft.extensionType {
            bits.append(ext.replacingOccurrences(of: "_", with: " "))
        }
        return bits.isEmpty ? "Not set" : bits.joined(separator: " · ")
    }

    /// Documents summary — count of uploaded files, with the
    /// architectural badge when the gate is satisfied. Drives the
    /// review's "Documents" row.
    private var documentsDisplay: String {
        let total = vm.uploads.filter { $0.isCompleted }.count
        if total == 0 {
            return "No files yet · will save as draft"
        }
        let archCount = vm.uploads
            .filter { $0.category == .architectural && $0.isCompleted }
            .count
        if archCount == 0 {
            return "\(total) file\(total == 1 ? "" : "s") · architectural plans missing"
        }
        return "\(total) file\(total == 1 ? "" : "s") · ready to publish"
    }

    /// Non-blocking informational row that appears under the review
    /// summary when no architectural plan is attached. Tells the
    /// owner exactly what'll happen if they continue without one.
    private var draftWarningRow: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "tray.full.fill")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Palette.warning)
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 3) {
                Text("This will save as a draft")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.text)
                Text("Add architectural plans to publish — builders see drafts only after they go live.")
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
                .stroke(Palette.warning.opacity(0.32), lineWidth: 1)
        )
    }

    private var budgetTimelineDisplay: String {
        var bits: [String] = []
        if let band = vm.draft.budgetBand {
            bits.append(prettyBudget(band))
        }
        if let month = vm.draft.targetStartMonth {
            bits.append("Start \(prettyMonth(month))")
        }
        return bits.isEmpty ? "Not set" : bits.joined(separator: " · ")
    }

    private func prettyBudget(_ band: String) -> String {
        switch band {
        case "under_500k": return "Under $500k"
        case "500k_1m":    return "$500k–$1M"
        case "1m_1_5m":    return "$1M–1.5M"
        case "1_5m_2m":    return "$1.5M–2M"
        case "2m_3m":      return "$2M–3M"
        case "3m_5m":      return "$3M–5M"
        case "over_5m":    return "$5M+"
        default:           return band
        }
    }

    private func prettyMonth(_ key: String) -> String {
        let parts = key.split(separator: "-")
        guard parts.count == 2,
              let y = Int(parts[0]),
              let m = Int(parts[1]),
              (1...12).contains(m)
        else { return key }
        let names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]
        return "\(names[m - 1]) \(y)"
    }

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }
}

// MARK: - Banner error row

struct BannerErrorRow: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .foregroundStyle(Palette.danger)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Palette.dangerMuted)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Palette.danger.opacity(0.35), lineWidth: 1)
        )
    }
}
