/**
 * POST /api/mobile/profile/owner
 *
 * Project-owner onboarding submit — one-shot endpoint that upserts the
 * profile AND marks onboarding complete in a single request. Mirrors
 * the web's `/onboarding/owner` server action.
 *
 * Auth required: caller must be signed in (bearer JWT). Role gate is
 * server-side — a builder calling this endpoint gets a 403 even if the
 * payload validates.
 *
 * Request:
 *   {
 *     entityType:      "homeowner" | "owner_builder" | "developer" |
 *                      "investor" | "architect" | "drafter" |
 *                      "project_manager" | "other"
 *     companyName?:    string | null  (only required for entity types
 *                                       that .hasCompany — server tolerates
 *                                       it on others, just ignored)
 *     defaultPostcode?: string | null (4 digits)
 *     defaultSuburb?:   string | null
 *     defaultState?:    AU state code  | null
 *     contactPref:     "email" | "phone" | "both"
 *   }
 *
 * Success (200):
 *   {
 *     ok: true,
 *     user: { id, email, name, role, needsOnboarding: false }
 *   }
 *
 *   We echo the fresh user object so the mobile client can flip its
 *   AuthSession.AuthUser in one round-trip without a follow-up /me call.
 *
 * Failures:
 *   400  validation (zod issues — surfaced as fieldErrors)
 *   401  bad / missing bearer token
 *   403  role isn't `project_owner`
 *   500  unexpected
 *
 * Side-effects mirror the web path:
 *   · upsertOwnerProfile(userId, payload)
 *   · completeOwnerOnboarding(userId)
 *   · sendOwnerSignupOpsEmail (fire-and-forget — non-blocking)
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normaliseAuPhone } from "@/lib/au-phone";
import { users } from "@/modules/users/schema";
import {
  completeOwnerOnboarding,
  getOwnerProfile,
  upsertOwnerProfile,
} from "@/modules/profiles";
import { sendOwnerSignupOpsEmail } from "@/modules/email";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

/**
 * GET /api/mobile/profile/owner
 *
 * Read the owner's profile + identity to populate the "You" tab and the
 * edit-profile form. Owner-only (403 otherwise).
 *
 * Response (200):
 *   {
 *     profile: { entityType, companyName, defaultSuburb, defaultState,
 *                defaultPostcode, contactPref } | null,
 *     name, email, phone
 *   }
 */
export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Project owner account required." } },
      { status: 403 },
    );
  }

  const userId = auth.value.userId;
  const [profile, userRow] = await Promise.all([
    getOwnerProfile(userId),
    db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return NextResponse.json({
    profile: profile
      ? {
          entityType: profile.entityType,
          companyName: profile.companyName,
          defaultSuburb: profile.defaultSuburb,
          defaultState: profile.defaultState,
          defaultPostcode: profile.defaultPostcode,
          contactPref: profile.contactPref,
        }
      : null,
    name: userRow?.name ?? null,
    email: userRow?.email ?? null,
    phone: userRow?.phone ?? null,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Only project owners can submit the owner onboarding form.",
        },
      },
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

  const userId = auth.value.userId;

  // Service-level validation. Treat empty strings the same as nulls so
  // the iOS client can send "" without thinking about which nullable
  // field is which.
  const nullable = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };
  const payload =
    raw && typeof raw === "object"
      ? {
          entityType: (raw as Record<string, unknown>).entityType,
          companyName: nullable((raw as Record<string, unknown>).companyName),
          defaultSuburb: nullable((raw as Record<string, unknown>).defaultSuburb),
          defaultState: nullable((raw as Record<string, unknown>).defaultState),
          defaultPostcode: nullable(
            (raw as Record<string, unknown>).defaultPostcode,
          ),
          contactPref:
            (raw as Record<string, unknown>).contactPref ?? "email",
        }
      : {};

  // Phone — required for owners (builders may need to call). Validate
  // as an AU mobile/landline and store E.164. Surfaced as a field
  // error keyed `phone` so the iOS form highlights the field.
  const rawPhone =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>).phone
      : undefined;
  const phoneInput = typeof rawPhone === "string" ? rawPhone.trim() : "";
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
            phone: "Enter a valid AU mobile or landline (e.g. 0412 345 678).",
          },
        },
      },
      { status: 400 },
    );
  }

  const upsert = await upsertOwnerProfile(userId, payload);
  if (!upsert.ok) {
    const status =
      upsert.error.code === "validation"
        ? 400
        : upsert.error.code === "conflict"
          ? 409
          : 500;
    const fieldErrors: Record<string, string> = {};
    const details = upsert.error.details as
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
          code: upsert.error.code,
          message: upsert.error.message,
          details: fieldErrors,
        },
      },
      { status },
    );
  }

  // Persist the validated phone on the user row.
  await db
    .update(users)
    .set({ phone: phoneE164, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const complete = await completeOwnerOnboarding(userId);
  if (!complete.ok) {
    return NextResponse.json(
      { error: { code: complete.error.code, message: complete.error.message } },
      { status: 500 },
    );
  }

  // Fetch fresh user for the response. The role / name don't change in
  // owner onboarding, but the client expects a parallel `user` shape
  // to /login + /verify so we always echo it.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Ops heads-up — same fire-and-forget pattern the web uses so the
  // response isn't blocked on Resend latency. Failure is swallowed +
  // logged downstream.
  if (user) {
    void (async () => {
      try {
        await sendOwnerSignupOpsEmail({
          ownerName: user.name,
          ownerEmail: user.email,
          ownerPhone: user.phone ?? null,
          entityType: upsert.value.entityType ?? null,
          companyName: upsert.value.companyName ?? null,
          state: upsert.value.defaultState ?? null,
          signedUpAt: new Date(),
        });
      } catch (err) {
        logger.error(
          { event: "mobile.owner_onboarding.ops_email_failed", err: String(err) },
          "owner signup ops email failed",
        );
      }
    })();
  }

  logger.info(
    { event: "mobile.owner_onboarding.ok", userId },
    "mobile owner onboarding complete",
  );

  return NextResponse.json({
    ok: true,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          needsOnboarding: false,
        }
      : null,
  });
}
