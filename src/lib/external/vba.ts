/**
 * VBA (Victorian Building Authority) adapter.
 *
 * Endpoint (via the same Cloudflare Worker that fronts ABR):
 *   GET {VERIFICATION_PROXY_URL}/vic/bpc?licence=...
 *   GET {VERIFICATION_PROXY_URL}/vic/bpc?abn=...
 *   GET {VERIFICATION_PROXY_URL}/vic/bpc?name=...
 *
 * The worker abstracts VBA's actual practitioner search behind a JSON
 * shape we can rely on:
 *
 *   { error: "..." }                                      // validation
 *
 *   {
 *     query: { licence: "CDB-U 58834", ... },
 *     debug: { strategyUsed: "filter:licence", ... },
 *     total: 1,
 *     hasMatch: true,
 *     anyCurrent: true,
 *     records: [
 *       {
 *         id: 32737,
 *         accountName: "RBM Construction Group Pty Ltd",
 *         type: "Company",
 *         accreditationId: "CDB-U 58834",
 *         accreditationStatus: "Current",
 *         abn: "39624389715",
 *         acn: "624389715",
 *         limitation: "Domestic Builder - Unlimited",
 *         commenced: "01/07/2018",
 *         expires: "18/03/2027"
 *       }
 *     ]
 *   }
 *
 * "Active" status maps to `accreditationStatus === "Current"`.
 */

import "server-only";

import { env } from "@/lib/env";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";

export const VBA_PROVIDER = "vba" as const;

const TIMEOUT_MS = 8_000;

export interface VbaLookup {
  /** The licence number as the VBA returned it (canonical form). */
  accreditationId: string;
  accountName: string;
  /** "Current" / "Expired" / "Cancelled" / etc. — VBA's verbatim label. */
  accreditationStatus: string;
  /** True when accreditationStatus is exactly "Current". */
  isCurrent: boolean;
  /** Class label (e.g. "Domestic Builder - Unlimited"). */
  limitation: string;
  type: string;
  abn: string | null;
  acn: string | null;
  commencedAt: Date | null;
  expiresAt: Date | null;
  raw: Record<string, unknown>;
}

interface VbaErrorBody {
  error?: string;
}

interface VbaSuccessBody {
  query?: Record<string, unknown>;
  debug?: { strategyUsed?: string; ok?: boolean; error?: string | null; returnedRecords?: number };
  total?: number;
  hasMatch?: boolean;
  anyCurrent?: boolean;
  records?: VbaRecord[];
}

interface VbaRecord {
  id?: number;
  accountName?: string;
  type?: string;
  accreditationId?: string;
  accreditationStatus?: string;
  abn?: string;
  acn?: string;
  limitation?: string;
  commenced?: string; // dd/mm/yyyy
  expires?: string; // dd/mm/yyyy
}

/** Parse "dd/mm/yyyy" → Date, or null on failure. */
function parseAuDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Look up a Victorian builder by licence number.
 *
 * Returns a Result where:
 *   - "not_found"      — VBA has no record matching this licence number
 *   - "validation"     — input is missing
 *   - "external_error" — network / parse failure
 *
 * Note: callers handle "not active" by inspecting `value.isCurrent`
 * (a successful lookup of an expired licence still returns ok=true).
 */
export async function lookupVbaByLicence(
  licenceNumber: string,
): Promise<Result<VbaLookup>> {
  const licence = licenceNumber.trim();
  if (!licence) {
    return fail("validation", "Licence number required.");
  }

  const url = `${env.VERIFICATION_PROXY_URL.replace(/\/+$/, "")}/vic/bpc?licence=${encodeURIComponent(licence)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "vba.fetch_failed", licence, msg },
      "VBA proxy fetch failed",
    );
    return fail(
      "external_error",
      "Couldn't reach the VBA register right now — try again in a moment.",
    );
  }
  clearTimeout(timer);

  let body: VbaSuccessBody & VbaErrorBody;
  try {
    body = (await res.json()) as VbaSuccessBody & VbaErrorBody;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "vba.parse_failed", licence, status: res.status, msg },
      "VBA proxy returned non-JSON",
    );
    return fail("external_error", "VBA returned an unexpected response.");
  }

  if (body.error) {
    return fail("external_error", body.error);
  }

  if (!body.hasMatch || !body.records || body.records.length === 0) {
    return fail(
      "not_found",
      "No VBA record found for that licence number.",
    );
  }

  // Prefer the record whose accreditationId exactly matches the input
  // (case + whitespace insensitive), fall back to the first record.
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const match =
    body.records.find(
      (r) => r.accreditationId && norm(r.accreditationId) === norm(licence),
    ) ?? body.records[0]!;

  if (!match.accreditationId || !match.accountName) {
    return fail(
      "external_error",
      "VBA record was missing required fields.",
    );
  }

  return ok({
    accreditationId: match.accreditationId,
    accountName: match.accountName,
    accreditationStatus: match.accreditationStatus ?? "",
    isCurrent: match.accreditationStatus === "Current",
    limitation: match.limitation ?? "",
    type: match.type ?? "",
    abn: match.abn && match.abn.length > 0 ? match.abn : null,
    acn: match.acn && match.acn.length > 0 ? match.acn : null,
    commencedAt: parseAuDate(match.commenced),
    expiresAt: parseAuDate(match.expires),
    raw: match as unknown as Record<string, unknown>,
  });
}
