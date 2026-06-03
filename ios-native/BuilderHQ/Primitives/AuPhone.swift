/// AuPhone — Australian phone number validation, normalization, and
/// display formatting. Swift mirror of `src/lib/au-phone.ts` so the
/// client validates the same way the server does (no round-trip just
/// to learn a number is malformed).
///
/// Accepted input (whitespace / dashes / parens tolerated):
///   · Mobile:   04XX XXX XXX        → +614XXXXXXXX
///   · Landline: 0[2378] XXXX XXXX   → +61[2378]XXXXXXXX
///   · E.164:    +61… / 61…          → kept / +-prefixed
///
/// Valid leading significant digit (after the trunk 0 or +61): one of
/// 2, 3, 4, 7, 8.

import Foundation

enum AuPhone {
    private static let validLeading: Set<Character> = ["2", "3", "4", "7", "8"]

    /// Digits only, preserving a single leading `+`.
    private static func clean(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasPlus = trimmed.hasPrefix("+")
        let digits = trimmed.filter(\.isNumber)
        return hasPlus ? "+\(digits)" : digits
    }

    /// Normalize to E.164 (`+61XXXXXXXXX`) or return nil if invalid.
    static func normalise(_ input: String) -> String? {
        let c = clean(input)

        // 0XXXXXXXXX — domestic trunk form.
        if c.count == 10, c.hasPrefix("0"), c.allSatisfy(\.isNumber) {
            let significant = String(c.dropFirst())
            guard let first = significant.first, validLeading.contains(first) else {
                return nil
            }
            return "+61\(significant)"
        }

        // +61XXXXXXXXX — already E.164.
        if c.hasPrefix("+61"), c.count == 12 {
            let significant = String(c.dropFirst(3))
            guard significant.allSatisfy(\.isNumber),
                  let first = significant.first,
                  validLeading.contains(first)
            else { return nil }
            return c
        }

        // 61XXXXXXXXX — E.164 without the plus.
        if c.hasPrefix("61"), c.count == 11, c.allSatisfy(\.isNumber) {
            let significant = String(c.dropFirst(2))
            guard let first = significant.first, validLeading.contains(first) else {
                return nil
            }
            return "+\(c)"
        }

        return nil
    }

    /// True when `input` is a valid AU mobile or landline.
    static func isValid(_ input: String) -> Bool {
        normalise(input) != nil
    }

    /// Convert a stored E.164 number (`+61XXXXXXXXX`) back to a
    /// friendly domestic display form (`04XX XXX XXX` / `0X XXXX
    /// XXXX`). Used to seed input fields on resume so the user sees
    /// the number the way they typed it, not the international form.
    /// Falls back to the raw input when it isn't a recognizable AU
    /// E.164 string.
    static func displayFromE164(_ stored: String) -> String {
        let trimmed = stored.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("+61"), trimmed.count == 12 {
            let significant = trimmed.dropFirst(3)
            return formatAsTyping("0\(significant)")
        }
        return trimmed
    }

    /// Count of significant digits typed so far (trunk 0 / country code
    /// stripped). Used to decide when it's fair to show an error vs.
    /// "still typing".
    static func significantDigitCount(_ input: String) -> Int {
        let c = clean(input)
        if c.hasPrefix("+61") { return max(0, c.count - 3) }
        if c.hasPrefix("61"), c.count > 2 { return c.count - 2 }
        if c.hasPrefix("0") { return max(0, c.count - 1) }
        return c.filter(\.isNumber).count
    }

    /// Light display formatting as the user types. Groups a domestic
    /// number the way Australians read it:
    ///   · Mobile  04XX XXX XXX
    ///   · Landline 0X XXXX XXXX
    /// Leaves `+61…` and partial input largely untouched (just trims to
    /// digits + spaces) so we never fight the caret on edge cases.
    static func formatAsTyping(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        // Keep E.164 input as-is (digits + leading +) — formatting an
        // international form mid-type is more confusing than helpful.
        if trimmed.hasPrefix("+") {
            return "+" + trimmed.dropFirst().filter(\.isNumber)
        }

        let digits = String(trimmed.filter(\.isNumber).prefix(10))
        guard digits.hasPrefix("0"), digits.count > 1 else { return digits }

        let isMobile = digits.count >= 2 && digits[digits.index(digits.startIndex, offsetBy: 1)] == "4"
        let groups: [Int] = isMobile ? [4, 3, 3] : [2, 4, 4]

        var result = ""
        var idx = digits.startIndex
        for (gi, size) in groups.enumerated() {
            guard idx < digits.endIndex else { break }
            if gi > 0 { result += " " }
            let end = digits.index(idx, offsetBy: size, limitedBy: digits.endIndex) ?? digits.endIndex
            result += digits[idx..<end]
            idx = end
        }
        return result
    }
}
