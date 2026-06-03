/**
 * POST /api/mobile/profile/builder/licences
 *
 * Add a single licence + auto-verify against the state register. Same
 * behaviour as the web's `addLicenceAction` (insert → automatically
 * fires `verifyLicence(id)`); the verification result is returned in
 * the same response so the client can render the status chip in one
 * round-trip.
 *
 * Body shape (matches builderLicenceSchema):
 *   {
 *     state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT",
 *     licenceType: string,        // 2-120 chars, varies per state
 *     licenceNumber: string,      // 2-60 chars, unique per (builder, state, number)
 *     licenceHolderName?: string, // optional
 *     issuedAt?: string,          // ISO date — optional
 *     expiresAt?: string          // ISO date — optional, null = no expiry
 *   }
 *
 * Success (201):
 *   {
 *     licence: BuilderLicence,
 *     verification: VerifyLicenceResult  // status: verified | inactive | not_found | mismatch | manual_review | error
 *   }
 *
 * Failures:
 *   400  validation (bad shape / missing required field)
 *   401  unauth
 *   403  role isn't builder
 *   409  duplicate (state + licenceNumber already on this builder)
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { addBuilderLicence } from "@/modules/profiles";
import { verifyLicence } from "@/modules/verification";

import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

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

  // Coerce issuedAt / expiresAt strings to Date so the Zod schema
  // accepts them. The mobile client sends ISO strings (JSON doesn't
  // have a native Date type).
  const coerced =
    raw && typeof raw === "object"
      ? {
          ...(raw as Record<string, unknown>),
          issuedAt:
            typeof (raw as Record<string, unknown>).issuedAt === "string"
              ? new Date(
                  (raw as Record<string, unknown>).issuedAt as string,
                )
              : (raw as Record<string, unknown>).issuedAt ?? null,
          expiresAt:
            typeof (raw as Record<string, unknown>).expiresAt === "string"
              ? new Date(
                  (raw as Record<string, unknown>).expiresAt as string,
                )
              : (raw as Record<string, unknown>).expiresAt ?? null,
        }
      : raw;

  const insert = await addBuilderLicence(auth.value.userId, coerced);
  if (!insert.ok) {
    const status =
      insert.error.code === "validation"
        ? 400
        : insert.error.code === "conflict"
          ? 409
          : 500;
    const fieldErrors: Record<string, string> = {};
    const details = insert.error.details as
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
          code: insert.error.code,
          message: insert.error.message,
          details: fieldErrors,
        },
      },
      { status },
    );
  }

  // Auto-verify against state register. Failure here is non-fatal —
  // the licence row exists, the chip just shows "manual review".
  const verification = await verifyLicence(
    auth.value.userId,
    insert.value.id,
  );

  logger.info(
    {
      event: "mobile.builder_licences.add",
      userId: auth.value.userId,
      licenceId: insert.value.id,
      verifyStatus: verification.ok ? verification.value.status : "error",
    },
    "builder licence added + verified",
  );

  return NextResponse.json(
    {
      licence: insert.value,
      verification: verification.ok ? verification.value : null,
    },
    { status: 201 },
  );
}
