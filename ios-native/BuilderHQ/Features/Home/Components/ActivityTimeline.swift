/// ActivityTimeline — the "what happened while you were gone" feed.
///
/// Both dashboards carry a server `activity[]` (notifications) that was
/// never surfaced. This renders it as a connected vertical rail: a tinted
/// kind-glyph per event, title + body + relative time, an unread accent,
/// and a tap-through to the related project when the notification carries
/// a `/projects/{slug}` action URL.
///
/// Role-agnostic: each dashboard maps its own activity rows into the
/// shared `ActivityItem` before handing them over.

import SwiftUI

struct ActivityItem: Identifiable, Equatable {
    let id: String
    let kind: String
    let title: String
    let body: String?
    let createdAtIso: String
    let actionSlug: String?
    let unread: Bool

    /// Pull a project slug out of an action URL like
    /// "/projects/deakin-townhouse" or "builderhq://projects/abc".
    static func slug(from actionUrl: String?) -> String? {
        guard let actionUrl, let range = actionUrl.range(of: "/projects/") else { return nil }
        let tail = actionUrl[range.upperBound...]
        let slug = tail.split(whereSeparator: { $0 == "/" || $0 == "?" || $0 == "#" }).first
        return slug.map(String.init).flatMap { $0.isEmpty ? nil : $0 }
    }
}

struct ActivityTimeline: View {
    let items: [ActivityItem]

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                rowOrLink(item, isLast: idx == items.count - 1)
            }
        }
    }

    @ViewBuilder
    private func rowOrLink(_ item: ActivityItem, isLast: Bool) -> some View {
        if let slug = item.actionSlug {
            NavigationLink(value: slug) { row(item, isLast: isLast) }
                .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.99))
        } else {
            row(item, isLast: isLast)
        }
    }

    private func row(_ item: ActivityItem, isLast: Bool) -> some View {
        let (icon, tint) = Self.style(for: item.kind)
        return HStack(alignment: .top, spacing: 13) {
            // Left rail: glyph medallion + connecting line.
            ZStack(alignment: .top) {
                if !isLast {
                    Rectangle()
                        .fill(Palette.hairlineStrong)
                        .frame(width: 1.5)
                        .padding(.top, 30)
                }
                ZStack {
                    Circle().fill(tint.opacity(0.15))
                    Circle().stroke(tint.opacity(0.35), lineWidth: 1)
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(tint)
                }
                .frame(width: 30, height: 30)
            }
            .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(item.title)
                        .font(.system(size: 14, weight: item.unread ? .bold : .semibold))
                        .foregroundStyle(Palette.text)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 4)
                    Text(Self.relative(item.createdAtIso))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(item.unread ? Palette.accent : Palette.textDim)
                        .monospacedDigit()
                    if item.unread {
                        Circle().fill(Palette.accent).frame(width: 6, height: 6)
                            .shadow(color: Palette.accentGlow, radius: 4)
                    }
                }
                if let body = item.body, !body.isEmpty {
                    Text(body)
                        .font(.system(size: 12.5, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if item.actionSlug != nil {
                    Color.clear.frame(height: 0)
                }
            }
            .padding(.bottom, isLast ? 0 : 18)
        }
        .contentShape(Rectangle())
    }

    // MARK: - Kind → glyph

    static func style(for kind: String) -> (String, Color) {
        let k = kind.lowercased()
        if k.contains("award") { return ("trophy.fill", Color(hex: 0xF5C24A)) }
        if k.contains("shortlist") { return ("star.fill", Palette.blue) }
        if k.contains("reject") || k.contains("declin") { return ("xmark.circle.fill", Palette.textDim) }
        if k.contains("tender") { return ("paperplane.fill", Palette.accent) }
        if k.contains("unlock") { return ("lock.open.fill", Palette.accent) }
        if k.contains("message") || k.contains("conversation") || k.contains("chat") {
            return ("bubble.left.fill", Palette.accentLight)
        }
        if k.contains("match") || k.contains("suggest") { return ("sparkles", Palette.accent) }
        if k.contains("publish") || k.contains("project") { return ("building.2.fill", Palette.accentLight) }
        return ("bell.fill", Palette.textMuted)
    }

    // MARK: - Relative time

    static func relative(_ iso: String) -> String {
        guard let date = ChatTime.parse(iso) else { return "" }
        let s = Date().timeIntervalSince(date)
        if s < 60 { return "now" }
        if s < 3600 { return "\(Int(s / 60))m" }
        if s < 86_400 { return "\(Int(s / 3600))h" }
        let days = Int(s / 86_400)
        if days < 7 { return "\(days)d" }
        if days < 30 { return "\(days / 7)w" }
        return "\(days / 30)mo"
    }
}
