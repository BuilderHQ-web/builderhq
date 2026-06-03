/**
 * POST /api/mobile/profile/builder/submit
 *
 * Finalize the builder wizard. Mirrors the web's `submitForApprovalAction`:
 *
 *   1. Validates the profile has ≥1 category, ≥1 service area, ≥1 licence
 *   2. Calls `hasFullVerificationForApproval(userId)` — auto-approval iff
 *      ABN verified AND ≥1 licence verified, otherwise → pending_review
 *   3. Sets `approvalStatus` + `approvedAt` + `approvedVia` + `onboardingCompletedAt`
 *   4. Fires `maybeAutoGrantFounding` — founding-builder access credit (non-fatal)
 *   5. Fires `sendBuilderSignupOpsEmail` — ops triage email (fire-and-forget)
 *
 * Success (200):
 *   {
 *     ok: true,
 *     approved: boolean,    // true = auto-approved, false = pending review
 *     reasons: string[],    // when not approved, what's missing (display in app)
 *     user: { id, email, name, role, needsOnboarding: false }
 *   }
 *
 * Failures:
 *   400  required step missing (no categories / no service areas / no licences)
 *   401  unauth
 *   403  role isn't builder
 *   404  no profile yet (skipped step 1)
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { users } from "@/modules/users/schema";
import {
  getBuilderProfile,
  submitBuilderForApproval,
} from "@/modules/profiles";
import { sendBuilderSignupOpsEmail } from "@/modules/email";
import { hasFullVerificationForApproval } from "@/modules/verification";

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

  const userId = auth.value.userId;

  // Phone gate — a reachable contact number is required before a
  // builder can submit for approval. The wizard collects it in step 1,
  // but guard here too so the requirement can't be bypassed by a
  // client that skips the field.
  const [phoneRow] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!phoneRow?.phone || phoneRow.phone.trim() === "") {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: "Add a contact phone number before submitting.",
          details: { phone: "A contact phone number is required." },
        },
      },
      { status: 400 },
    );
  }

  const submit = await submitBuilderForApproval(userId);
  if (!submit.ok) {
    const status =
      submit.error.code === "validation"
        ? 400
        : submit.error.code === "not_found"
          ? 404
          : 500;
    return NextResponse.json(
      { error: { code: submit.error.code, message: submit.error.message } },
      { status },
    );
  }

  // Ops email — fire-and-forget so the response isn't blocked on
  // Resend latency. Failure swallowed + logged downstream.
  void (async () => {
    try {
      const bundle = await getBuilderProfile(userId);
      if (!bundle) return;
      const [u] = await db
        .select({
          name: users.name,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!u) return;
      const v = await hasFullVerificationForApproval(userId);
      await sendBuilderSignupOpsEmail({
        builderName: u.name,
        builderEmail: u.email,
        builderPhone: u.phone ?? null,
        companyName: bundle.profile.companyName,
        abn: bundle.profile.abn,
        abnVerified: v.abnVerified,
        anyLicenceVerified: v.anyLicenceVerified,
        approvalStatus: bundle.profile.approvalStatus,
        state: bundle.profile.businessState,
        signedUpAt: new Date(),
      });
    } catch (err) {
      logger.error(
        {
          event: "mobile.builder_submit.ops_email_failed",
          err: String(err),
        },
        "builder ops email failed",
      );
    }
  })();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  logger.info(
    {
      event: "mobile.builder_submit.ok",
      userId,
      approved: submit.value.approved,
    },
    "builder submitted for approval",
  );

  return NextResponse.json({
    ok: true,
    approved: submit.value.approved,
    reasons: submit.value.reasons,
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
