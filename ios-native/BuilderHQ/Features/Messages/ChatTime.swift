/// ChatTime — the date/time formatting the messaging surfaces share.
///
/// Two needs:
///   · inbox cells   → a compact "last activity" stamp (WhatsApp-style:
///                     time today, "Yesterday", weekday this week, else
///                     a short date)
///   · chat thread   → a bubble time ("2:34 pm") + day separators
///                     ("Today" / "Yesterday" / "12 March")
///
/// All parsing tolerates ISO-8601 with or without fractional seconds.

import Foundation

enum ChatTime {
    // MARK: - Parsing

    static func parse(_ iso: String?) -> Date? {
        guard let iso else { return nil }
        if let d = fractional.date(from: iso) { return d }
        return plain.date(from: iso)
    }

    /// ISO-8601 for a date — used to stamp optimistic (not-yet-sent)
    /// messages so they sort + format like real ones.
    static func iso(_ date: Date) -> String { fractional.string(from: date) }

    private static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    // MARK: - Inbox stamp

    /// Compact last-activity stamp for an inbox row.
    static func inboxStamp(_ iso: String?) -> String {
        guard let date = parse(iso) else { return "" }
        let cal = Calendar.current
        if cal.isDateInToday(date) { return timeOnly.string(from: date) }
        if cal.isDateInYesterday(date) { return "Yesterday" }
        // Within the last week → weekday name.
        if let days = cal.dateComponents([.day], from: date, to: Date()).day, days < 7 {
            return weekday.string(from: date)
        }
        return shortDate.string(from: date)
    }

    // MARK: - Chat bubble + separators

    /// "2:34 pm" — the per-bubble time.
    static func bubbleTime(_ date: Date) -> String { timeOnly.string(from: date) }

    /// "Today" / "Yesterday" / "Wed 12 March" — the day-separator label.
    static func daySeparator(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date) { return "Today" }
        if cal.isDateInYesterday(date) { return "Yesterday" }
        return longDay.string(from: date)
    }

    // MARK: - Formatters

    private static let timeOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        f.amSymbol = "am"; f.pmSymbol = "pm"
        return f
    }()
    private static let weekday: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "EEE"; return f
    }()
    private static let shortDate: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "d MMM"; return f
    }()
    private static let longDay: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "EEE d MMMM"; return f
    }()
}
