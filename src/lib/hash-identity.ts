import "server-only";

/**
 * One normalisation, one hash, for every advertising network.
 *
 * Meta's Conversions API and Google's enhanced conversions both accept a
 * customer's email address as a SHA-256 hash, and both specify the same
 * preparation: trim the whitespace, lowercase it, hash the result, send
 * it hex encoded. The hashes therefore agree, which is what lets one
 * value serve both networks.
 *
 * That agreement is worth making structural rather than leaving it to
 * two functions that happen to match today. A hash prepared even
 * slightly differently is not rejected and does not error: it simply
 * matches nobody, and the platform reports a quietly poor match rate
 * that looks like an audience problem rather than a code one.
 *
 * THE PLAINTEXT NEVER LEAVES THE SERVER. This module exists so that the
 * address is hashed here, and only the hash is ever handed to a browser
 * or to a network.
 */

import { createHash } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * The shared preparation: trim, lowercase, hash. Used for email
 * addresses and for names, which both networks normalise identically.
 *
 * Returns null for an absent or empty value, because a hash of the
 * empty string is a real hash that matches every other empty string,
 * and sending it would be worse than sending nothing.
 */
export function hashNormalised(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalised = value.trim().toLowerCase();
  return normalised.length > 0 ? sha256Hex(normalised) : null;
}

/** The customer's email, prepared the way both networks ask for it. */
export const hashedEmail = hashNormalised;
