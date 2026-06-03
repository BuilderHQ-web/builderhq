/**
 * Builder profile endpoints — fetch the bundle + patch profile-level
 * fields (company, address, about). Step-specific resources (categories,
 * service areas, licences) live in subfolders.
 *
 *
 * GET /api/mobile/profile/builder
 * ───────────────────────────────
 * Returns the builder's full bundle (profile + arrays + lockState +
 * verification chips). Mobile reads this on wizard mount to drive the
 * "resume from lowest incomplete step" behaviour.
 *
 * Response (200):
 *   {
 *     profile: BuilderProfile | null,
 *     licences: BuilderLicence[],
 *     serviceAreas: BuilderServiceArea[],
 *     categories: BuilderProjectCategory[],
 *     lockState: { abnLocked, companyNameLocked }
 *   }
 *
 *
 * POST /api/mobile/profile/builder
 * ────────────────────────────────
 * Partial patch of profile fields. Body is a SUBSET of the schema; the
 * server fetches the existing row, merges, and calls upsertBuilderProfile.
 *
 * Why partial: each wizard step touches a different slice (step 1 =
 * company + ABN; step 2 = address; step 6 = bio/social URLs). Sending
 * the full state from the client would mean the iOS view model has to
 * track every field across every step. Server-side merge keeps the
 * client lean.
 *
 * Failures:
 *   400  validation
 *   401  unauth
 *   403  role isn't builder
 *   409  ABN locked (server-side enforcement of the lock UX)
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normaliseAuPhone } from "@/lib/au-phone";
import {
  getBuilderProfile,
  upsertBuilderProfile,
} from "@/modules/profiles";
import { users } from "@/modules/users/schema";
import { getLockState } from "@/modules/verification";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

function ensureBuilder(role: string | null) {
  if (role !== "builder") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Builder account required.",
        },
      },
      { status: 403 },
    );
  }
  return null;
}

// MARK: - GET

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  const denied = ensureBuilder(auth.value.role);
  if (denied) return denied;

  const userId = auth.value.userId;
  const [bundle, lockState, userRow] = await Promise.all([
    getBuilderProfile(userId),
    getLockState(userId),
    db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return NextResponse.json({
    profile: bundle?.profile ?? null,
    licences: bundle?.licences ?? [],
    serviceAreas: bundle?.serviceAreas ?? [],
    categories: bundle?.categories ?? [],
    lockState,
    // Top-level — phone lives on the user row, not the builder profile.
    // The wizard seeds its phone field from this on resume.
    phone: userRow?.phone ?? null,
  });
}

// MARK: - POST (partial patch)

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  const denied = ensureBuilder(auth.value.role);
  if (denied) return denied;

  const userId = auth.value.userId;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: { code: "validation", message: "Body must be an object." } },
      { status: 400 },
    );
  }

  const patch = raw as Record<string, unknown>;

  // Phone lives on the user row, not the builder profile. When the
  // patch carries it (step 1 of the wizard), validate as an AU
  // number and persist to `users.phone`. Absent key → untouched, so
  // later wizard steps that don't send phone leave it alone.
  if (patch.phone !== undefined) {
    const phoneInput =
      typeof patch.phone === "string" ? patch.phone.trim() : "";
    if (phoneInput === "") {
      return NextResponse.json(
        {
          error: {
            code: "validation",
            message: "A contact phone number is required.",
            details: { phone: "Enter a contact phone number." },
          },
        },
        { status: 400 },
      );
    }
    const phoneE164 = normaliseAuPhone(phoneInput);
    if (!phoneE164) {
      return NextResponse.json(
        {
          error: {
            code: "validation",
            message: "That doesn't look like a valid Australian number.",
            details: {
              phone:
                "Enter a valid AU mobile or landline (e.g. 0412 345 678).",
            },
          },
        },
        { status: 400 },
      );
    }
    await db
      .update(users)
      .set({ phone: phoneE164, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Pull the existing profile so we can merge — the upstream schema
  // requires `companyName` so a partial without it would fail.
  const existing = await getBuilderProfile(userId);
  const e = existing?.profile;
  const merged = {
    // Defaults — first save will receive companyName from the
    // ABN-verify autofill OR from the user typing it. If both the
    // request AND the existing row lack it, the service will throw a
    // validation error which we surface as 400.
    companyName: patch.companyName ?? e?.companyName ?? "",
    tradingName: patch.tradingName ?? e?.tradingName ?? null,
    abn: patch.abn ?? e?.abn ?? null,
    acn: patch.acn ?? e?.acn ?? null,
    businessAddressLine1:
      patch.businessAddressLine1 ?? e?.businessAddressLine1 ?? null,
    businessSuburb: patch.businessSuburb ?? e?.businessSuburb ?? null,
    businessState: patch.businessState ?? e?.businessState ?? null,
    businessPostcode: patch.businessPostcode ?? e?.businessPostcode ?? null,
    hasDifferentPostal:
      patch.hasDifferentPostal ?? e?.hasDifferentPostal ?? false,
    postalAddressLine1: patch.postalAddressLine1 ?? e?.postalAddressLine1 ?? null,
    postalSuburb: patch.postalSuburb ?? e?.postalSuburb ?? null,
    postalState: patch.postalState ?? e?.postalState ?? null,
    postalPostcode: patch.postalPostcode ?? e?.postalPostcode ?? null,
    bio: patch.bio ?? e?.bio ?? null,
    website: patch.website ?? e?.website ?? null,
    linkedinUrl: patch.linkedinUrl ?? e?.linkedinUrl ?? null,
    instagramUrl: patch.instagramUrl ?? e?.instagramUrl ?? null,
    yearsInOperation: patch.yearsInOperation ?? e?.yearsInOperation ?? null,
  };

  const result = await upsertBuilderProfile(userId, merged);
  if (!result.ok) {
    const status =
      result.error.code === "validation"
        ? 400
        : result.error.code === "conflict"
          ? 409
          : result.error.code === "forbidden"
            ? 403
            : 500;
    const fieldErrors: Record<string, string> = {};
    const details = result.error.details as
      | { issues?: Array<{ path: (string | number)[]; message: string }> }
      | undefined;
    if (details?.issues) {
      for (const issue of details.issues) {
        const key = issue.path.map(String).join(".");
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
    }
    return NextResponse.json(
      {
        error: {
          code: result.error.code,
          message: result.error.message,
          details: fieldErrors,
        },
      },
      { status },
    );
  }

  logger.info(
    { event: "mobile.builder_profile.patch", userId },
    "builder profile patched",
  );

  return NextResponse.json({ profile: result.value });
}
