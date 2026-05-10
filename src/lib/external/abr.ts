/**
 * ABR (Australian Business Register) adapter.
 *
 * We don't talk to abr.business.gov.au directly — a Cloudflare Worker
 * sits in front of it (handles GUID auth + rate limits + CORS). The
 * worker URL lives in env so it stays swappable.
 *
 * Endpoint: GET {ABR_PROXY_URL}/?abn=11digits
 *
 * Response shapes (worker normalised):
 *
 *   ── error
 *     { error: "Invalid ABN. Must be 11 digits.", inputAbn: "..." }
 *
 *   ── success
 *     {
 *       inputAbn: "51824753556",
 *       isActive: true,
 *       Abn: "51824753556",
 *       AbnStatus: "Active",
 *       AbnStatusEffectiveFrom: "1999-11-01",
 *       Acn: "",
 *       AddressDate: "2021-04-27",
 *       AddressPostcode: "2640",
 *       AddressState: "NSW",
 *       BusinessName: [],
 *       EntityName: "AUSTRALIAN TAXATION OFFICE",
 *       EntityTypeCode: "CGE",
 *       EntityTypeName: "Commonwealth Government Entity",
 *       Gst: "2000-07-01",
 *       Message: ""
 *     }
 *
 * Returns a `Result<AbrLookup>` so callers handle network + parse
 * failures explicitly. `provider: "abr"` is the canonical name we
 * write to builder_verifications.provider.
 */

import "server-only";

import { env } from "@/lib/env";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
// Re-exported below so existing call sites that pull `isValidAbnFormat`
// from this module keep working. New callers — especially client code —
// should import directly from `@/lib/abn`.
import { isValidAbnFormat as _isValidAbnFormat } from "@/lib/abn";

export const ABR_PROVIDER = "abr" as const;
export const isValidAbnFormat = _isValidAbnFormat;

const TIMEOUT_MS = 8_000;

export type AustralianStateCode =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

const VALID_STATES = new Set<AustralianStateCode>([
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

/**
 * The normalised, typed payload our service layer + UI consumes.
 * Anything raw from ABR is in `raw` — write that to
 * provider_response for audit, but never read from it elsewhere.
 */
export interface AbrLookup {
  abn: string;
  isActive: boolean;
  abnStatus: string;
  acn: string | null;
  entityName: string;
  entityTypeCode: string;
  entityTypeName: string;
  state: AustralianStateCode | null;
  postcode: string | null;
  /** True when the entity is GST-registered (ABR returns the registration date). */
  gstRegistered: boolean;
  raw: Record<string, unknown>;
}

interface AbrErrorBody {
  error?: string;
  inputAbn?: string;
}

interface AbrSuccessBody {
  inputAbn?: string;
  isActive?: boolean;
  Abn?: string;
  AbnStatus?: string;
  AbnStatusEffectiveFrom?: string;
  Acn?: string;
  AddressDate?: string;
  AddressPostcode?: string;
  AddressState?: string;
  BusinessName?: string[];
  EntityName?: string;
  EntityTypeCode?: string;
  EntityTypeName?: string;
  Gst?: string;
  Message?: string;
}

/**
 * Hit the ABR proxy. Returns a Result where:
 *   - error code "validation"     — 11-digit format / checksum failure
 *   - error code "not_found"      — proxy says we couldn't find the ABN
 *   - error code "external_error" — network / parse / unexpected shape
 */
export async function lookupAbn(abnRaw: string): Promise<Result<AbrLookup>> {
  const abn = abnRaw.replace(/\s+/g, "");

  if (!/^\d{11}$/.test(abn)) {
    return fail("validation", "ABN must be 11 digits.");
  }
  if (!isValidAbnFormat(abn)) {
    return fail(
      "validation",
      "ABN failed the standard checksum — looks like a typo.",
    );
  }

  const url = `${env.VERIFICATION_PROXY_URL.replace(/\/+$/, "")}/?abn=${encodeURIComponent(abn)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      // Don't cache — verification is point-in-time data.
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "abr.fetch_failed", abn, msg },
      "ABR proxy fetch failed",
    );
    return fail(
      "external_error",
      "Couldn't reach the ABR right now — try again in a moment.",
    );
  }
  clearTimeout(timer);

  let body: AbrSuccessBody & AbrErrorBody;
  try {
    body = (await res.json()) as AbrSuccessBody & AbrErrorBody;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "abr.parse_failed", abn, status: res.status, msg },
      "ABR proxy returned non-JSON",
    );
    return fail("external_error", "ABR returned an unexpected response.");
  }

  // Worker error path
  if (body.error) {
    if (/not\s*found/i.test(body.error)) {
      return fail("not_found", body.error);
    }
    return fail("external_error", body.error);
  }

  // Success path — but check we actually got the canonical fields
  if (!body.Abn || !body.EntityName) {
    return fail(
      "external_error",
      "ABR returned an incomplete record — try again.",
    );
  }

  const stateRaw = (body.AddressState ?? "").toUpperCase();
  const state = VALID_STATES.has(stateRaw as AustralianStateCode)
    ? (stateRaw as AustralianStateCode)
    : null;

  return ok({
    abn: body.Abn,
    isActive: body.isActive === true,
    abnStatus: body.AbnStatus ?? "",
    acn: body.Acn && body.Acn.trim().length > 0 ? body.Acn.trim() : null,
    entityName: body.EntityName,
    entityTypeCode: body.EntityTypeCode ?? "",
    entityTypeName: body.EntityTypeName ?? "",
    state,
    postcode:
      body.AddressPostcode && body.AddressPostcode.length > 0
        ? body.AddressPostcode
        : null,
    gstRegistered: !!(body.Gst && body.Gst.length > 0),
    raw: body as unknown as Record<string, unknown>,
  });
}
