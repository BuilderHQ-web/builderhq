/// PillStepper — wrapping pill row for selecting a small integer.
///
/// Used for bedrooms / bathrooms / floors / dwelling count — anywhere
/// the answer space is "a small count" (1-7 with an open-ended last
/// pill like "8+").
///
/// Pills wrap across multiple rows via a FlowLayout instead of a
/// horizontal ScrollView. Horizontal scroll nested in vertical scroll
/// is a hostile mobile pattern (gesture ambiguity) — wrapping shows
/// every option without forcing the user to discover the scroll.
///
/// Each pill:
///   · Selected   → accent fill + accent-contrast text + accent glow
///   · Unselected → surface fill + hairline border + muted text
///   · Spring-bounces + light haptic on selection

import SwiftUI

struct PillStepper: View {
    /// Currently selected value. Nil = nothing picked yet.
    @Binding var value: Int?

    /// Range of values to show. Last value is shown as "N+" so the
    /// stepper covers the open-ended tail without needing a number-pad.
    var range: ClosedRange<Int> = 1...7

    /// Label rendered on the "open-ended" pill (the last one).
    var lastPillSuffix: String = "+"

    /// Optional caption to render above the row.
    var caption: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: caption == nil ? 0 : 8) {
            if let caption = caption {
                Text(caption.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
            }

            PillFlow(spacing: 8, lineSpacing: 8) {
                ForEach(Array(range), id: \.self) { n in
                    pill(for: n)
                }
            }
        }
    }

    private func pill(for n: Int) -> some View {
        let isSelected = value == n
        let isLast = n == range.upperBound
        let label = isLast ? "\(n)\(lastPillSuffix)" : "\(n)"

        return Press(haptic: .select) {
            value = n
        } content: {
            Text(label)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(isSelected ? Palette.accentContrast : Palette.text)
                .frame(minWidth: 52, minHeight: 52)
                .padding(.horizontal, 12)
                .background(
                    Capsule().fill(isSelected ? Palette.accent : Palette.surface)
                )
                .overlay(
                    Capsule().stroke(
                        isSelected ? .clear : Palette.hairline,
                        lineWidth: 1
                    )
                )
                .shadow(
                    color: isSelected ? Palette.accentGlow : .clear,
                    radius: 12,
                    x: 0,
                    y: 4
                )
                .scaleEffect(isSelected ? 1.06 : 1)
                .animation(
                    .spring(response: 0.32, dampingFraction: 0.62),
                    value: isSelected
                )
        }
    }
}

// MARK: - Pill flow layout

/// Simple left-to-right + wrap layout for pills. Mirrors the FlowLayout
/// in LivePreviewCard.swift but kept local here so the stepper file
/// is self-contained.
private struct PillFlow<Content: View>: View {
    var spacing: CGFloat
    var lineSpacing: CGFloat
    let content: Content

    init(
        spacing: CGFloat = 8,
        lineSpacing: CGFloat = 8,
        @ViewBuilder content: () -> Content
    ) {
        self.spacing = spacing
        self.lineSpacing = lineSpacing
        self.content = content()
    }

    var body: some View {
        FlowLayout(spacing: spacing, lineSpacing: lineSpacing) {
            content
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat
    var lineSpacing: CGFloat

    func sizeThatFits(
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var currentX: CGFloat = 0
        var currentRowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        var widestRow: CGFloat = 0

        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                widestRow = max(widestRow, currentX - spacing)
                totalHeight += currentRowHeight + lineSpacing
                currentX = 0
                currentRowHeight = 0
            }
            currentX += size.width + spacing
            currentRowHeight = max(currentRowHeight, size.height)
        }
        widestRow = max(widestRow, currentX - spacing)
        totalHeight += currentRowHeight
        return CGSize(width: widestRow, height: totalHeight)
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let maxWidth = bounds.width
        var x: CGFloat = bounds.minX
        var y: CGFloat = bounds.minY
        var currentRowHeight: CGFloat = 0

        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if x + size.width > bounds.minX + maxWidth && x > bounds.minX {
                x = bounds.minX
                y += currentRowHeight + lineSpacing
                currentRowHeight = 0
            }
            sv.place(
                at: CGPoint(x: x, y: y),
                anchor: .topLeading,
                proposal: ProposedViewSize(size)
            )
            x += size.width + spacing
            currentRowHeight = max(currentRowHeight, size.height)
        }
    }
}
