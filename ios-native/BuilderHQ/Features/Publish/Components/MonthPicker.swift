/// MonthPicker — fast month-of-year selector for timeline questions.
///
/// Two-row UI:
///   · Year selector — pill toggle "2026 / 2027 / 2028" — only shown
///     when the user needs to pick a year other than the current one
///   · Month grid — 3×4 grid of month abbreviations, current year's
///     past months disabled
///
/// Selected month gets the accent treatment (filled cap, accent glow).
/// Output format is "YYYY-MM" — matches the server's text column.
///
/// Way more thumb-friendly than iOS's `.datePicker(.compact)` which
/// requires three taps + a modal sheet.

import SwiftUI

struct MonthPicker: View {
    /// Output "YYYY-MM" string, e.g. "2026-08". Nil = nothing picked.
    @Binding var selection: String?

    /// Earliest year selectable. Defaults to current year.
    let earliestYear: Int
    /// Number of years to offer. Defaults to 3 (current + 2 ahead).
    let yearCount: Int

    @State private var year: Int

    private static let monthLabels = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ]

    private static let currentYear: Int = Calendar.current.component(
        .year,
        from: Date()
    )
    private static let currentMonth: Int = Calendar.current.component(
        .month,
        from: Date()
    )

    init(
        selection: Binding<String?>,
        earliestYear: Int = MonthPicker.currentYear,
        yearCount: Int = 3
    ) {
        self._selection = selection
        self.earliestYear = earliestYear
        self.yearCount = yearCount
        // Default to the year embedded in the selection, else the
        // earliest year.
        let initial = MonthPicker.parseYear(from: selection.wrappedValue) ?? earliestYear
        _year = State(initialValue: initial)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if yearCount > 1 {
                yearRow
            }
            monthGrid
        }
    }

    private var yearRow: some View {
        HStack(spacing: 8) {
            ForEach(0..<yearCount, id: \.self) { offset in
                let y = earliestYear + offset
                let isActive = y == year
                Press(haptic: .select) {
                    year = y
                } content: {
                    Text(String(y))
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(isActive ? Palette.accentContrast : Palette.text)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            Capsule().fill(isActive ? Palette.accent : Palette.surface)
                        )
                        .overlay(
                            Capsule().stroke(
                                isActive ? .clear : Palette.hairline,
                                lineWidth: 1
                            )
                        )
                        .shadow(
                            color: isActive ? Palette.accentGlow : .clear,
                            radius: 10
                        )
                }
            }
            Spacer()
        }
    }

    private var monthGrid: some View {
        let columns = Array(
            repeating: GridItem(.flexible(), spacing: 8),
            count: 4
        )
        return LazyVGrid(columns: columns, spacing: 8) {
            ForEach(0..<12, id: \.self) { i in
                cell(monthIndex: i + 1)
            }
        }
    }

    private func cell(monthIndex: Int) -> some View {
        let key = "\(year)-\(String(format: "%02d", monthIndex))"
        let isSelected = selection == key
        // Disable months already past for the current year — owners
        // can't start construction in February when it's already July.
        let isPast = year == Self.currentYear && monthIndex < Self.currentMonth

        return Button {
            guard !isPast else { return }
            selection = key
        } label: {
            Text(Self.monthLabels[monthIndex - 1])
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .tracking(0.4)
                .foregroundStyle(
                    isPast
                        ? Palette.textDim.opacity(0.5)
                        : (isSelected ? Palette.accentContrast : Palette.text)
                )
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(isSelected ? Palette.accent : Palette.surface)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(
                            isSelected ? .clear : Palette.hairline,
                            lineWidth: 1
                        )
                )
                .shadow(
                    color: isSelected ? Palette.accentGlow : .clear,
                    radius: 10
                )
                .opacity(isPast ? 0.5 : 1)
                .scaleEffect(isSelected ? 1.05 : 1)
                .animation(
                    .spring(response: 0.32, dampingFraction: 0.6),
                    value: isSelected
                )
        }
        .disabled(isPast)
        .sensoryFeedback(.selection, trigger: isSelected)
    }

    // MARK: - Helpers

    static func parseYear(from key: String?) -> Int? {
        guard let key = key else { return nil }
        let parts = key.split(separator: "-")
        guard parts.count == 2, let y = Int(parts[0]) else { return nil }
        return y
    }
}
