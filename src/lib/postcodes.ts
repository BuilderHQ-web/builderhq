/**
 * Australian postcode lookup.
 *
 * Loads `src/data/au-postcodes.json` (built once via
 * `scripts/build-postcodes.mjs`) and provides O(1) lookups:
 *
 *   lookupPostcode("3042")
 *     → [{ suburb: "Airport West", state: "VIC" },
 *        { suburb: "Niddrie", state: "VIC" }]
 *
 *   isValidPostcode("3042") → true
 *
 * Server-only. Importing this on the client would ship 700 KB of JSON
 * and break the Edge runtime; the postcodes service action below is the
 * intended client entry point.
 */

import "server-only";
import data from "@/data/au-postcodes.json" with { type: "json" };

export type Suburb = { suburb: string; state: AustralianState };
export type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

const POSTCODES = data as unknown as Record<string, Suburb[]>;

/** Look up suburbs for an AU postcode. Returns [] if not found. */
export function lookupPostcode(postcode: string): Suburb[] {
  if (!/^\d{4}$/.test(postcode)) return [];
  return POSTCODES[postcode] ?? [];
}

/** Whether the postcode is a known AU postcode. */
export function isValidPostcode(postcode: string): boolean {
  return lookupPostcode(postcode).length > 0;
}

/**
 * Resolve the (suburb, state) pair if a single match exists; null when
 * the postcode is unknown or maps to multiple suburbs (caller picks).
 */
export function resolveSinglePostcode(postcode: string): Suburb | null {
  const list = lookupPostcode(postcode);
  return list.length === 1 ? (list[0] ?? null) : null;
}
