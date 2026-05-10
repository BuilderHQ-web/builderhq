/**
 * verification · service.
 *
 * Orchestrates external register checks (ABR, VBA, …) and persists
 * audit-grade history into builder_verifications.
 *
 * The "lock" decision is computed at read time. A field is locked
 * when a `verified` row exists whose `subject_value` matches the
 * profile's CURRENT input. Changing the input invalidates the lock —
 * editable again, with the UI prompting re-verify.
 */

import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";

import { lookupAbn, ABR_PROVIDER, type AbrLookup } from "@/lib/external/abr";
import {
  lookupVbaByLicence,
  VBA_PROVIDER,
  type VbaLookup,
} from "@/lib/external/vba";

import {
  builderVerifications,
  type BuilderVerificationInsert,
  type BuilderVerificationRow,
} from "./schema";
import type {
  AbrAutofill,
  BuilderLockState,
  VerifyAbnResult,
  VerifyLicenceResult,
} from "./types";

import { builderProfiles, builderLicences } from "@/modules/profiles/schema";

const ABR_TTL_DAYS = 90;
const VBA_TTL_DAYS = 90;

function ttl(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ── Loose name match ──────────────────────────────────────────────────
//
// Used to decide if what the builder typed for company / holder name
// matches what the register returned. Strict-equal would force users
// to re-type "PTY LTD" capitalisation; we normalise instead.

const ENTITY_SUFFIX_RE =
  /\b(pty\s+ltd|pty|ltd|limited|inc|llc|gmbh|trust|trustee|the trustee for)\b/g;

function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .replace(ENTITY_SUFFIX_RE, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string): boolean {
  const aN = normaliseName(a);
  const bN = normaliseName(b);
  if (!aN || !bN) return false;
  if (aN === bN) return true;
  if (aN.length < 3 || bN.length < 3) return aN === bN;
  return aN.includes(bN) || bN.includes(aN);
}

// ── Lookups ──────────────────────────────────────────────────────────

async function getLatestVerification(
  builderId: string,
  kind: "abn" | "licence",
  targetId: string | null = null,
): Promise<BuilderVerificationRow | null> {
  const where =
    targetId === null
      ? and(
          eq(builderVerifications.builderId, builderId),
          eq(builderVerifications.kind, kind),
        )
      : and(
          eq(builderVerifications.builderId, builderId),
          eq(builderVerifications.kind, kind),
          eq(builderVerifications.targetId, targetId),
        );

  const rows = await db
    .select()
    .from(builderVerifications)
    .where(where)
    .orderBy(desc(builderVerifications.verifiedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestForBuilder(
  builderId: string,
  kind: "abn" | "licence",
): Promise<BuilderVerificationRow | null> {
  return getLatestVerification(builderId, kind, null);
}

export async function getLatestForLicence(
  builderId: string,
  licenceId: string,
): Promise<BuilderVerificationRow | null> {
  return getLatestVerification(builderId, "licence", licenceId);
}

async function insertVerification(
  row: BuilderVerificationInsert,
): Promise<BuilderVerificationRow> {
  const [out] = await db
    .insert(builderVerifications)
    .values(row)
    .returning();
  if (!out) throw new Error("Failed to insert verification");
  return out;
}

// ── verifyAbn ────────────────────────────────────────────────────────

export async function verifyAbn(
  builderId: string,
  abnRaw: string,
): Promise<Result<VerifyAbnResult>> {
  const abn = abnRaw.replace(/\s+/g, "");
  const probe = await lookupAbn(abn);

  if (!probe.ok) {
    if (probe.error.code === "validation") {
      return fail("validation", probe.error.message);
    }
    if (probe.error.code === "not_found") {
      const row = await insertVerification({
        builderId,
        kind: "abn",
        targetId: null,
        subjectValue: abn,
        status: "not_found",
        provider: ABR_PROVIDER,
        providerResponse: null,
        reason: probe.error.message,
      });
      return ok({
        status: "not_found",
        verificationId: row.id,
        reason: probe.error.message,
      });
    }
    const row = await insertVerification({
      builderId,
      kind: "abn",
      targetId: null,
      subjectValue: abn,
      status: "error",
      provider: ABR_PROVIDER,
      providerResponse: null,
      reason: probe.error.message,
    });
    return ok({
      status: "error",
      verificationId: row.id,
      reason: probe.error.message,
    });
  }

  const data: AbrLookup = probe.value;

  if (!data.isActive) {
    const row = await insertVerification({
      builderId,
      kind: "abn",
      targetId: null,
      subjectValue: abn,
      status: "inactive",
      provider: ABR_PROVIDER,
      providerResponse: data.raw,
      matchedName: data.entityName,
      reason: `ABR status is "${data.abnStatus}".`,
    });
    return ok({
      status: "inactive",
      verificationId: row.id,
      reason: `ABR shows this ABN as ${data.abnStatus.toLowerCase()}.`,
    });
  }

  const autofill: AbrAutofill = {
    legalEntityName: data.entityName,
    acn: data.acn,
    state: data.state,
    postcode: data.postcode,
    entityTypeLabel: data.entityTypeName,
    gstRegistered: data.gstRegistered,
  };

  const row = await insertVerification({
    builderId,
    kind: "abn",
    targetId: null,
    subjectValue: abn,
    status: "verified",
    provider: ABR_PROVIDER,
    providerResponse: data.raw,
    matchedName: data.entityName,
    ttlAt: ttl(ABR_TTL_DAYS),
  });

  logger.info(
    {
      event: "verification.abn.verified",
      builderId,
      abn,
      name: data.entityName,
    },
    "ABN verified",
  );

  return ok({
    status: "verified",
    verificationId: row.id,
    matchedName: data.entityName,
    autofill,
  });
}

// ── verifyLicence ────────────────────────────────────────────────────

export async function verifyLicence(
  builderId: string,
  licenceId: string,
): Promise<Result<VerifyLicenceResult>> {
  const [licence] = await db
    .select()
    .from(builderLicences)
    .where(
      and(
        eq(builderLicences.id, licenceId),
        eq(builderLicences.builderId, builderId),
      ),
    )
    .limit(1);
  if (!licence) {
    return fail("not_found", "Licence not found.");
  }

  // Only VBA wired today. Other states record a clear "manual review
  // needed" row — present in audit, falls through to manual approval.
  if (licence.state !== "VIC") {
    const row = await insertVerification({
      builderId,
      kind: "licence",
      targetId: licence.id,
      subjectValue: licence.licenceNumber,
      status: "error",
      provider: `state:${licence.state.toLowerCase()}`,
      providerResponse: null,
      reason:
        "Automatic verification for this state isn't wired yet — admin will review manually.",
    });
    return ok({
      status: "error",
      verificationId: row.id,
      reason:
        `Auto-verification for ${licence.state} isn't available yet. ` +
        "We'll flag this for manual review when you submit.",
      provider: `state:${licence.state.toLowerCase()}`,
    });
  }

  const probe = await lookupVbaByLicence(licence.licenceNumber);

  if (!probe.ok) {
    if (probe.error.code === "not_found") {
      const row = await insertVerification({
        builderId,
        kind: "licence",
        targetId: licence.id,
        subjectValue: licence.licenceNumber,
        status: "not_found",
        provider: VBA_PROVIDER,
        providerResponse: null,
        reason: probe.error.message,
      });
      return ok({
        status: "not_found",
        verificationId: row.id,
        reason: "VBA has no record of this licence number.",
        provider: VBA_PROVIDER,
      });
    }
    const row = await insertVerification({
      builderId,
      kind: "licence",
      targetId: licence.id,
      subjectValue: licence.licenceNumber,
      status: "error",
      provider: VBA_PROVIDER,
      providerResponse: null,
      reason: probe.error.message,
    });
    return ok({
      status: "error",
      verificationId: row.id,
      reason:
        "Couldn't reach the VBA register right now. Try again in a minute.",
      provider: VBA_PROVIDER,
    });
  }

  const data: VbaLookup = probe.value;

  if (
    licence.licenceHolderName &&
    !namesMatch(licence.licenceHolderName, data.accountName)
  ) {
    const row = await insertVerification({
      builderId,
      kind: "licence",
      targetId: licence.id,
      subjectValue: licence.licenceNumber,
      status: "mismatch",
      provider: VBA_PROVIDER,
      providerResponse: data.raw,
      matchedName: data.accountName,
      reason: `Licence holder mismatch — VBA shows "${data.accountName}".`,
    });
    return ok({
      status: "mismatch",
      verificationId: row.id,
      reason: `Holder mismatch — VBA shows "${data.accountName}".`,
      provider: VBA_PROVIDER,
    });
  }

  if (!data.isCurrent) {
    const row = await insertVerification({
      builderId,
      kind: "licence",
      targetId: licence.id,
      subjectValue: licence.licenceNumber,
      status: "inactive",
      provider: VBA_PROVIDER,
      providerResponse: data.raw,
      matchedName: data.accountName,
      expiresAt: data.expiresAt,
      reason: `VBA accreditation status is "${data.accreditationStatus}".`,
    });
    return ok({
      status: "inactive",
      verificationId: row.id,
      reason: `VBA shows this licence as ${data.accreditationStatus.toLowerCase()}.`,
      provider: VBA_PROVIDER,
    });
  }

  const row = await insertVerification({
    builderId,
    kind: "licence",
    targetId: licence.id,
    subjectValue: licence.licenceNumber,
    status: "verified",
    provider: VBA_PROVIDER,
    providerResponse: data.raw,
    matchedName: data.accountName,
    expiresAt: data.expiresAt,
    ttlAt: ttl(VBA_TTL_DAYS),
  });

  logger.info(
    {
      event: "verification.licence.verified",
      builderId,
      licenceId,
      accreditationId: data.accreditationId,
    },
    "licence verified",
  );

  return ok({
    status: "verified",
    verificationId: row.id,
    matchedName: data.accountName,
    expiresAt: data.expiresAt,
    classLabel: data.limitation,
    provider: VBA_PROVIDER,
  });
}

// ── Lock state (UI driver) ───────────────────────────────────────────

export async function getLockState(
  builderId: string,
): Promise<BuilderLockState> {
  const [profile] = await db
    .select({ abn: builderProfiles.abn })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);

  const licences = await db
    .select({
      id: builderLicences.id,
      licenceNumber: builderLicences.licenceNumber,
    })
    .from(builderLicences)
    .where(eq(builderLicences.builderId, builderId));

  const verified = await db
    .select({
      kind: builderVerifications.kind,
      targetId: builderVerifications.targetId,
      subjectValue: builderVerifications.subjectValue,
      verifiedAt: builderVerifications.verifiedAt,
    })
    .from(builderVerifications)
    .where(
      and(
        eq(builderVerifications.builderId, builderId),
        eq(builderVerifications.status, "verified"),
      ),
    )
    .orderBy(desc(builderVerifications.verifiedAt));

  const abnVerifiedSubject = verified.find((v) => v.kind === "abn")
    ?.subjectValue;

  const licenceVerifiedSubject = new Map<string, string>();
  for (const v of verified) {
    if (v.kind !== "licence" || !v.targetId) continue;
    if (!licenceVerifiedSubject.has(v.targetId)) {
      licenceVerifiedSubject.set(v.targetId, v.subjectValue);
    }
  }

  const abnLocked =
    !!profile?.abn &&
    !!abnVerifiedSubject &&
    profile.abn === abnVerifiedSubject;

  const licenceLocks: Record<string, boolean> = {};
  for (const l of licences) {
    const verifiedSubject = licenceVerifiedSubject.get(l.id);
    licenceLocks[l.id] =
      !!verifiedSubject && verifiedSubject === l.licenceNumber;
  }

  return { abn: abnLocked, licences: licenceLocks };
}

/**
 * Used by the submit-for-approval check. Returns whether each
 * verification axis is satisfied + a list of human-readable reasons
 * for the ones that aren't.
 */
export async function hasFullVerificationForApproval(
  builderId: string,
): Promise<{
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  reasons: string[];
}> {
  const [profile] = await db
    .select({ abn: builderProfiles.abn })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  const profileAbn = profile?.abn ?? null;

  const licences = await db
    .select({
      id: builderLicences.id,
      licenceNumber: builderLicences.licenceNumber,
    })
    .from(builderLicences)
    .where(eq(builderLicences.builderId, builderId));

  const verified = await db
    .select({
      kind: builderVerifications.kind,
      targetId: builderVerifications.targetId,
      subjectValue: builderVerifications.subjectValue,
      verifiedAt: builderVerifications.verifiedAt,
    })
    .from(builderVerifications)
    .where(
      and(
        eq(builderVerifications.builderId, builderId),
        eq(builderVerifications.status, "verified"),
      ),
    )
    .orderBy(desc(builderVerifications.verifiedAt));

  const abnVerified =
    !!profileAbn &&
    verified.some((v) => v.kind === "abn" && v.subjectValue === profileAbn);

  const verifiedLicenceIds = new Set<string>();
  for (const v of verified) {
    if (v.kind !== "licence" || !v.targetId) continue;
    const licence = licences.find((l) => l.id === v.targetId);
    if (licence && licence.licenceNumber === v.subjectValue) {
      verifiedLicenceIds.add(v.targetId);
    }
  }
  const anyLicenceVerified = verifiedLicenceIds.size > 0;

  const reasons: string[] = [];
  if (!abnVerified) {
    reasons.push("ABN hasn't been verified with ABR.");
  }
  if (!anyLicenceVerified) {
    reasons.push(
      "At least one builder licence needs to be verified with the relevant state register.",
    );
  }

  return { abnVerified, anyLicenceVerified, reasons };
}
