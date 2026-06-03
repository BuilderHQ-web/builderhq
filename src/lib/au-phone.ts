/**
 * Australian phone number validation + normalization.
 *
 * Single source of truth for AU phone handling across the codebase.
 * Accepts the formats real people type and normalizes them to E.164
 * (`+61…`) for storage. The marketing-funnel routes had an inline
 * `normalisePhone` that only handled mobiles (04xx); this generalizes
 * it to mobiles AND landlines so onboarding can require a reachable
 * number of any kind.
 *
 * Accepted input shapes (whitespace / dashes / parens tolerated):
 *   · Mobile:   04XX XXX XXX            → +614XXXXXXXX
 *   · Landline: 0[2378] XXXX XXXX       → +61[2378]XXXXXXXX
 *   · E.164:    +61 4XX XXX XXX / +61 [2378]…  (kept, validated)
 *   · 61-prefixed without +:  614…/612… → +61…
 *
 * Valid AU geographic/mobile leading digits after the trunk `0`
 * (or after `+61`): 2 (NSW/ACT), 3 (VIC/TAS), 4 (mobile),
 * 7 (QLD), 8 (SA/WA/NT). All are 9 significant digits after the
 * leading 0 / country code.
 */

const VALID_LEADING = new Set(["2", "3", "4", "7", "8"]);

/** Strip everything except digits and a single leading `+`. */
function clean(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize an AU phone number to E.164 (`+61XXXXXXXXX`).
 * Returns `null` when the input isn't a valid AU number.
 */
export function normaliseAuPhone(input: string): string | null {
  const c = clean(input);

  // 0XXXXXXXXX — domestic trunk form (10 digits, leading 0).
  if (/^0\d{9}$/.test(c)) {
    const significant = c.slice(1); // drop trunk 0 → 9 digits
    if (!VALID_LEADING.has(significant[0]!)) return null;
    return `+61${significant}`;
  }

  // +61XXXXXXXXX — already E.164 (9 significant digits).
  if (/^\+61\d{9}$/.test(c)) {
    const significant = c.slice(3);
    if (!VALID_LEADING.has(significant[0]!)) return null;
    return c;
  }

  // 61XXXXXXXXX — E.164 without the plus.
  if (/^61\d{9}$/.test(c)) {
    const significant = c.slice(2);
    if (!VALID_LEADING.has(significant[0]!)) return null;
    return `+${c}`;
  }

  return null;
}

/** True when `input` is a valid AU mobile or landline number. */
export function isValidAuPhone(input: string): boolean {
  return normaliseAuPhone(input) !== null;
}

/**
 * Count of significant digits typed so far (trunk `0` / country code
 * stripped). Lets a form decide when it's fair to show an inline error
 * ("you've typed enough that this is clearly wrong") vs. staying quiet
 * while the user is mid-entry.
 */
export function significantAuDigitCount(input: string): number {
  const c = clean(input);
  if (c.startsWith("+61")) return Math.max(0, c.length - 3);
  if (c.startsWith("61") && c.length > 2) return c.length - 2;
  if (c.startsWith("0")) return Math.max(0, c.length - 1);
  return c.replace(/\D/g, "").length;
}

/** True specifically for AU mobile numbers (significant digits start 4). */
export function isAuMobile(input: string): boolean {
  const e164 = normaliseAuPhone(input);
  return e164 !== null && e164.startsWith("+614");
}

/**
 * Convert a stored E.164 number (`+61XXXXXXXXX`) back to friendly
 * domestic form (`0XXXXXXXXX`) for seeding an input on resume. Returns
 * the input unchanged when it isn't a recognizable AU E.164 string.
 */
export function displayAuPhoneFromE164(stored: string | null | undefined): string {
  if (!stored) return "";
  const trimmed = stored.trim();
  if (/^\+61\d{9}$/.test(trimmed)) {
    return `0${trimmed.slice(3)}`;
  }
  return trimmed;
}
