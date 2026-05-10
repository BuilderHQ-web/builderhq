/**
 * Client-safe ABN helpers — no network, no server-only imports. Used
 * by both the server-side ABR adapter (lib/external/abr.ts) and
 * client-side onboarding/profile UI to validate format before burning
 * an ABR call.
 */

/**
 * Validate ABN format + checksum. The checksum algorithm is public
 * and deterministic — we run it client-side to catch typos and
 * server-side as defence-in-depth.
 *
 * Steps:
 *   1. Subtract 1 from the first digit
 *   2. Multiply each digit by its position weight [10,1,3,5,7,9,11,13,15,17,19]
 *   3. Sum, mod 89 → 0 means valid
 */
export function isValidAbnFormat(input: string): boolean {
  const digits = input.replace(/\s+/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const adjusted = (parseInt(digits[0]!, 10) - 1).toString() + digits.slice(1);
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(adjusted[i]!, 10) * weights[i]!;
  }
  return sum % 89 === 0;
}

/** Format an 11-digit ABN as the canonical "00 000 000 000". */
export function formatAbn(abn: string): string {
  const d = abn.replace(/\D/g, "");
  if (d.length !== 11) return abn;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`;
}
