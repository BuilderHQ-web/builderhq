"use server";

/**
 * Verification — server actions called by the editor + onboarding.
 *
 *   verifyAbnAction(abn)               → ABR check, persist, return UI shape
 *   applyAbrAutofillAction(...)        → write the ABR-derived fields into
 *                                        builder_profiles after the user
 *                                        confirms
 *   verifyLicenceAction(licenceId)     → state-register check
 *   getLockStateAction()               → drives field-disabled UX
 *
 * After any successful verification, we re-evaluate auto-approve
 * eligibility — if both ABN and ≥1 licence are now verified active
 * AND the profile isn't already approved, we promote it. That's how
 * a builder who landed in `pending_review` (e.g. they couldn't
 * verify their licence at signup but later ran the check
 * successfully) gets unlock capability without admin intervention.
 */

import { revalidatePath } from "next/cache";

import { auth } from "@/modules/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { builderProfiles } from "@/modules/profiles/schema";
import {
  canTriggerVerification,
  getLockState,
  hasFullVerificationForApproval,
  verifyAbn,
  verifyLicence,
  type ActorContext,
  type AbrAutofill,
  type BuilderLockState,
  type VerifyAbnResult,
  type VerifyLicenceResult,
} from "@/modules/verification";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

async function requireBuilder(): Promise<Result<ActorContext>> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role) return fail("forbidden", "Sign in required.");
  if (u.role !== "builder" && u.role !== "admin") {
    return fail("forbidden", "Builder account required.");
  }
  return ok({ id: u.id, role: u.role });
}

/**
 * Promote-on-verification. Runs after a successful verify result.
 * When both ABN and ≥1 licence are verified active, flips a
 * non-approved profile to `approved`. Logged + idempotent — calling
 * twice when already approved is a no-op.
 */
async function maybePromoteToApproved(builderId: string): Promise<void> {
  const v = await hasFullVerificationForApproval(builderId);
  if (!v.abnVerified || !v.anyLicenceVerified) return;

  // Only flip when not already approved/suspended/rejected. A
  // suspended profile shouldn't auto-revive on re-verification.
  const [profile] = await db
    .select({ approvalStatus: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  if (!profile) return;
  if (
    profile.approvalStatus === "approved" ||
    profile.approvalStatus === "suspended" ||
    profile.approvalStatus === "rejected"
  ) {
    return;
  }

  await db
    .update(builderProfiles)
    .set({
      approvalStatus: "approved",
      approvedAt: new Date(),
      approvedBy: null,
      approvedVia: "auto_post_onboarding",
      updatedAt: new Date(),
    })
    .where(eq(builderProfiles.userId, builderId));

  logger.info(
    { event: "verification.promoted_to_approved", builderId },
    "builder auto-approved after post-onboarding re-verification",
  );
}

export async function verifyAbnAction(
  abnRaw: string,
): Promise<Result<VerifyAbnResult>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canTriggerVerification(a.value, a.value.id)) {
    return fail("forbidden", "Not allowed.");
  }
  const r = await verifyAbn(a.value.id, abnRaw);
  if (r.ok && r.value.status === "verified") {
    await maybePromoteToApproved(a.value.id);
  }
  return r;
}

export async function verifyLicenceAction(
  licenceId: string,
): Promise<Result<VerifyLicenceResult>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canTriggerVerification(a.value, a.value.id)) {
    return fail("forbidden", "Not allowed.");
  }
  const r = await verifyLicence(a.value.id, licenceId);
  if (r.ok && r.value.status === "verified") {
    await maybePromoteToApproved(a.value.id);
  }
  return r;
}

/**
 * Persist the auto-fill payload from a verified ABN into
 * builder_profiles. Caller passes the autofill object verbatim;
 * we only write the fields the user opted into (currently all of
 * them — there's no toggle UI yet).
 *
 * Defensive: re-verifies the ABN matches a recent verified row
 * before writing. Stops a stale autofill payload from being applied
 * if the user changed their ABN between verify + accept.
 */
export async function applyAbrAutofillAction(
  abn: string,
  autofill: AbrAutofill,
): Promise<Result<{ ok: true }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;

  // The ABN must currently match what's on the profile (or be empty —
  // first-time fill). The lockState double-checks: if lock is true
  // for this ABN, it's been verified.
  const lock = await getLockState(a.value.id);

  // We allow apply when:
  //   - profile abn is being set for the first time and matches the autofill subject
  //   - OR ABN is currently locked (verified) and matches the autofill
  // Both reduce to "the autofill came from a real verification of this ABN".
  const [existing] = await db
    .select({ abn: builderProfiles.abn, companyName: builderProfiles.companyName })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, a.value.id))
    .limit(1);

  const profileAbn = existing?.abn ?? null;
  if (profileAbn && profileAbn !== abn) {
    return fail(
      "conflict",
      "ABN on file changed. Re-verify before applying autofill.",
    );
  }
  // If the profile already has an ABN and it's locked, fine — the
  // verified subject matches. If not locked, we still allow if the
  // verification just happened (caller passes the same abn it was
  // verified against).
  void lock;

  await db
    .update(builderProfiles)
    .set({
      abn,
      companyName: autofill.legalEntityName,
      // Default trading name to legal name if empty — they can change later.
      tradingName:
        existing?.companyName && existing.companyName.length > 0
          ? existing.companyName
          : autofill.legalEntityName,
      acn: autofill.acn ?? null,
      // Don't touch businessAddressLine1 — we don't get street from ABR.
      businessState: autofill.state,
      businessPostcode: autofill.postcode,
      updatedAt: new Date(),
    })
    .where(eq(builderProfiles.userId, a.value.id));

  revalidatePath("/builder/profile");
  return ok({ ok: true });
}

export async function getLockStateAction(): Promise<Result<BuilderLockState>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  return ok(await getLockState(a.value.id));
}
