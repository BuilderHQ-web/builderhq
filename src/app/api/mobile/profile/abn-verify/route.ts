/**
 * POST /api/mobile/profile/abn-verify
 *
 * ABN → ABR lookup. Wraps the existing `verifyAbn` service. On a
 * `verified` result, also auto-applies the autofill payload (legal
 * entity name, ACN, business state + postcode) to the builder's
 * profile — saves a separate "apply autofill" round-trip from the
 * client. Mirrors the web's `verifyAbnAction` + `applyAbrAutofillAction`
 * collapsed into one call because mobile users are tapping through a
 * wizard, not reviewing a desktop form.
 *
 * Body:
 *   { abn: string }  // 11 digits, spaces tolerated
 *
 * Success (200):
 *   {
 *     status: "verified",
 *     matchedName: string,
 *     autofill: AbrAutofill,
 *     applied: boolean    // true if we wrote the autofill to the profile
 *   }
 *   OR
 *   {
 *     status: "inactive" | "not_found" | "error",
 *     reason: string
 *   }
 *
 * Failures:
 *   400  validation (bad ABN format)
 *   401  unauth
 *   403  role isn't builder
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { upsertBuilderProfile, getBuilderProfile } from "@/modules/profiles";
import { verifyAbn } from "@/modules/verification";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Builder account required." } },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const abn =
    raw && typeof raw === "object"
      ? String((raw as Record<string, unknown>).abn ?? "")
      : "";
  if (!abn) {
    return NextResponse.json(
      { error: { code: "validation", message: "Enter your 11-digit ABN." } },
      { status: 400 },
    );
  }

  const userId = auth.value.userId;
  const result = await verifyAbn(userId, abn);
  if (!result.ok) {
    const status = result.error.code === "validation" ? 400 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  // Non-verified result — return the failure shape so the UI can
  // render an inline status chip with the reason.
  if (result.value.status !== "verified") {
    logger.info(
      {
        event: "mobile.abn_verify.no_match",
        userId,
        status: result.value.status,
      },
      "ABN verify returned non-verified status",
    );
    return NextResponse.json({
      status: result.value.status,
      reason: result.value.reason,
    });
  }

  // Verified path — apply autofill so the wizard can advance with
  // the legal entity name + ACN + business state/postcode prefilled.
  // We merge with existing fields so the user's own typing isn't
  // overwritten when only a subset of autofill keys are present.
  const v = result.value;
  const existing = await getBuilderProfile(userId);
  const e = existing?.profile;

  const merged = {
    companyName: v.autofill.legalEntityName || e?.companyName || "",
    tradingName: e?.tradingName ?? null,
    abn: abn.replace(/\s+/g, ""),
    acn: v.autofill.acn ?? e?.acn ?? null,
    businessAddressLine1: e?.businessAddressLine1 ?? null,
    businessSuburb: e?.businessSuburb ?? null,
    businessState: v.autofill.state ?? e?.businessState ?? null,
    businessPostcode: v.autofill.postcode ?? e?.businessPostcode ?? null,
    hasDifferentPostal: e?.hasDifferentPostal ?? false,
    postalAddressLine1: e?.postalAddressLine1 ?? null,
    postalSuburb: e?.postalSuburb ?? null,
    postalState: e?.postalState ?? null,
    postalPostcode: e?.postalPostcode ?? null,
    bio: e?.bio ?? null,
    website: e?.website ?? null,
    linkedinUrl: e?.linkedinUrl ?? null,
    instagramUrl: e?.instagramUrl ?? null,
    yearsInOperation: e?.yearsInOperation ?? null,
  };

  const apply = await upsertBuilderProfile(userId, merged);
  const applied = apply.ok;
  if (!apply.ok) {
    logger.warn(
      {
        event: "mobile.abn_verify.autofill_apply_failed",
        userId,
        reason: apply.error.message,
      },
      "ABN verified but autofill write failed; client will need manual entry",
    );
  }

  logger.info(
    { event: "mobile.abn_verify.verified", userId, matchedName: v.matchedName },
    "ABN verified + autofill applied",
  );

  return NextResponse.json({
    status: "verified" as const,
    matchedName: v.matchedName,
    autofill: v.autofill,
    applied,
  });
}
