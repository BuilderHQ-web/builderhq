"use server";

/**
 * Server action wrapper around lib/postcodes.
 *
 * Client components (the onboarding wizards, the project upload form)
 * call this instead of importing the dataset directly — that keeps the
 * 700 KB JSON server-side. Round trip is fast: postcode → DB-free lookup
 * in a Map → JSON response, well under 100ms.
 */

import { lookupPostcode } from "@/lib/postcodes";

export interface PostcodeLookupResult {
  postcode: string;
  suburbs: Array<{ suburb: string; state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" }>;
}

export async function lookupPostcodeAction(postcode: string): Promise<PostcodeLookupResult> {
  const trimmed = postcode.trim();
  if (!/^\d{4}$/.test(trimmed)) {
    return { postcode: trimmed, suburbs: [] };
  }
  return { postcode: trimmed, suburbs: lookupPostcode(trimmed) };
}
