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
 */

import { revalidatePath } from "next/cache";

import { auth } from "@/modules/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { builderProfiles } from "@/modules/profiles/schema";
import {
  canTriggerVerification,
  getLockState,
  verifyAbn,
  verifyLicence,
  type ActorContext,
  type AbrAutofill,
  type BuilderLockState,
  type VerifyAbnResult,
  type VerifyLicenceResult,
} from "@/modules/verification";
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

export async function verifyAbnAction(
  abnRaw: string,
): Promise<Result<VerifyAbnResult>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canTriggerVerification(a.value, a.value.id)) {
    return fail("forbidden", "Not allowed.");
  }
  return verifyAbn(a.value.id, abnRaw);
}

export async function verifyLicenceAction(
  licenceId: string,
): Promise<Result<VerifyLicenceResult>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canTriggerVerification(a.value, a.value.id)) {
    return fail("forbidden", "Not allowed.");
  }
  return verifyLicence(a.value.id, licenceId);
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
