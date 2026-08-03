/**
 * profiles · service.
 *
 * Public surface (covered by index.ts):
 *
 *   Owner side (single page wizard):
 *     getOwnerProfile, upsertOwnerProfile, completeOwnerOnboarding
 *
 *   Builder side (multi-step wizard):
 *     getBuilderProfile, upsertBuilderProfile,
 *     setBuilderProjectCategories, setBuilderServiceAreas,
 *     addBuilderLicence, removeBuilderLicence,
 *     submitBuilderForApproval
 *
 *   Cross-cutting:
 *     hasCompletedOnboarding(userId, role)  ← used by (app) layout gate
 *
 * Conventions: Zod-validate every input; transactional whenever > 1 row
 * is touched; Result<T, AppError> returns instead of throwing for
 * expected failures.
 */

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { users } from "@/modules/users";

import {
  architectProfiles,
  builderLicences,
  builderProfiles,
  builderProjectCategories,
  builderServiceAreas,
  projectOwnerProfiles,
  projectTypeEnum,
  australianStateEnum,
  ownerEntityTypeEnum,
  contactPrefEnum,
  type BuilderLicence,
  type BuilderProfile,
  type BuilderProjectCategory,
  type BuilderServiceArea,
  type ProjectOwnerProfile,
  type ArchitectProfile,
} from "./schema";

// ── Zod schemas ──────────────────────────────────────────────────────────

const postcode = z
  .string()
  .regex(/^\d{4}$/, "Australian postcodes are 4 digits");

// `.nullish()` (= optional + nullable) so explicit null inputs are
// accepted, not just empty-string / undefined. The web form always sends
// "" for blank URL fields so the previous `.optional()` was sufficient
// for that path, but the mobile route's merge-with-existing logic falls
// back to `null` when neither patch nor existing has a value — without
// nullable here, that path 400'd silently in step 1 of the builder
// wizard because the resulting field errors targeted step 6 fields the
// user couldn't see.
const optionalUrl = z
  .union([z.url("Enter a valid URL"), z.literal("")])
  .nullish()
  .transform((v) => (v ? v : null));

export const ownerProfileSchema = z.object({
  entityType: z.enum(ownerEntityTypeEnum.enumValues),
  companyName: z.string().max(120).trim().nullish(),
  defaultSuburb: z.string().max(120).trim().nullish(),
  defaultState: z.enum(australianStateEnum.enumValues).nullish(),
  defaultPostcode: postcode.nullish(),
  contactPref: z.enum(contactPrefEnum.enumValues).default("email"),
});
export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;

export const architectProfileSchema = z.object({
  practiceName: z.string().min(2, "Practice name is required").max(120).trim(),
  suburb: z.string().max(120).trim().nullish(),
  state: z.enum(australianStateEnum.enumValues).nullish(),
  contactPhone: z.string().max(30).trim().nullish(),
});
export type ArchitectProfileInput = z.infer<typeof architectProfileSchema>;

export const builderProfileSchema = z.object({
  companyName: z.string().min(2, "Company name is required").max(120).trim(),
  /** Trading name — what shows publicly. Defaults to companyName when blank. */
  tradingName: z.string().max(120).trim().nullish(),
  /** ABN: 11 digits, sometimes formatted with spaces — strip non-digits before storing. */
  abn: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{11}$/, "ABN must be 11 digits"))
    .nullish(),
  acn: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{9}$/, "ACN must be 9 digits"))
    .nullish(),
  businessAddressLine1: z.string().max(200).trim().nullish(),
  businessSuburb: z.string().max(120).trim().nullish(),
  businessState: z.enum(australianStateEnum.enumValues).nullish(),
  businessPostcode: postcode.nullish(),
  hasDifferentPostal: z.boolean().default(false),
  postalAddressLine1: z.string().max(200).trim().nullish(),
  postalSuburb: z.string().max(120).trim().nullish(),
  postalState: z.enum(australianStateEnum.enumValues).nullish(),
  postalPostcode: postcode.nullish(),
  bio: z.string().max(2000).trim().nullish(),
  website: optionalUrl,
  linkedinUrl: optionalUrl,
  instagramUrl: optionalUrl,
  yearsInOperation: z
    .number({ error: "Years in operation must be a number" })
    .int()
    .min(0)
    .max(150)
    .nullish(),
});
export type BuilderProfileInput = z.infer<typeof builderProfileSchema>;

export const builderLicenceSchema = z.object({
  state: z.enum(australianStateEnum.enumValues),
  licenceType: z.string().min(2).max(120).trim(),
  licenceNumber: z.string().min(2).max(60).trim(),
  licenceHolderName: z.string().max(120).trim().nullish(),
  issuedAt: z.date().nullish(),
  expiresAt: z.date().nullish(),
});
export type BuilderLicenceInput = z.infer<typeof builderLicenceSchema>;

const serviceAreaSchema = z.object({
  state: z.enum(australianStateEnum.enumValues),
  /** Null suburb = entire state coverage. */
  suburb: z.string().max(120).trim().nullish(),
  postcode: postcode.nullish(),
  /**
   * Willingness-to-travel from the named suburb in km. Bounded so the
   * slider can't be coerced into nonsense values via a hand-crafted
   * payload. Default 25 km matches the wizard slider's initial value.
   */
  radiusKm: z.number().int().min(5).max(150).default(25),
});
export const setServiceAreasSchema = z.object({
  areas: z
    .array(serviceAreaSchema)
    .min(1, "Add at least one service area")
    .max(200, "Too many service areas"),
});

export const setProjectCategoriesSchema = z.object({
  categories: z
    .array(z.enum(projectTypeEnum.enumValues))
    .min(1, "Pick at least one project type")
    .max(projectTypeEnum.enumValues.length),
});

// ── Owner profile ────────────────────────────────────────────────────────

export async function getOwnerProfile(
  userId: string,
): Promise<ProjectOwnerProfile | null> {
  const [row] = await db
    .select()
    .from(projectOwnerProfiles)
    .where(eq(projectOwnerProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Project-owner contact card returned to unlocked builders. Pulls
 * name, email, phone (from users) + entity type, company, contact
 * preference (from project_owner_profiles). Caller MUST gate on the
 * unlock check before invoking.
 */
export type OwnerContact = {
  ownerId: string;
  name: string | null;
  email: string;
  phone: string | null;
  entityType: ProjectOwnerProfile["entityType"] | null;
  companyName: string | null;
  contactPref: ProjectOwnerProfile["contactPref"];
};

export async function getOwnerContactPublic(
  ownerId: string,
): Promise<OwnerContact | null> {
  const [row] = await db
    .select({
      ownerId: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      entityType: projectOwnerProfiles.entityType,
      companyName: projectOwnerProfiles.companyName,
      contactPref: projectOwnerProfiles.contactPref,
    })
    .from(users)
    .leftJoin(projectOwnerProfiles, eq(projectOwnerProfiles.userId, users.id))
    .where(eq(users.id, ownerId))
    .limit(1);
  if (!row) return null;

  // Prefer first+last when both are set, else `name`, else null.
  const composedName =
    row.firstName && row.lastName
      ? `${row.firstName} ${row.lastName}`
      : row.firstName ?? row.name ?? null;

  return {
    ownerId: row.ownerId,
    name: composedName,
    email: row.email,
    phone: row.phone ?? null,
    entityType: row.entityType,
    companyName: row.companyName ?? null,
    contactPref: row.contactPref ?? "email",
  };
}

export async function upsertOwnerProfile(
  userId: string,
  raw: unknown,
): Promise<Result<ProjectOwnerProfile>> {
  const parsed = ownerProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", { issues: parsed.error.issues });
  }
  const v = parsed.data;

  const [row] = await db
    .insert(projectOwnerProfiles)
    .values({
      userId,
      entityType: v.entityType,
      companyName: v.companyName ?? null,
      defaultSuburb: v.defaultSuburb ?? null,
      defaultState: v.defaultState ?? null,
      defaultPostcode: v.defaultPostcode ?? null,
      contactPref: v.contactPref,
    })
    .onConflictDoUpdate({
      target: projectOwnerProfiles.userId,
      set: {
        entityType: v.entityType,
        companyName: v.companyName ?? null,
        defaultSuburb: v.defaultSuburb ?? null,
        defaultState: v.defaultState ?? null,
        defaultPostcode: v.defaultPostcode ?? null,
        contactPref: v.contactPref,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) return fail("internal", "Could not save your profile.");
  return ok(row);
}

export async function completeOwnerOnboarding(
  userId: string,
): Promise<Result<{ ok: true }>> {
  const [profile] = await db
    .select({ id: projectOwnerProfiles.userId })
    .from(projectOwnerProfiles)
    .where(eq(projectOwnerProfiles.userId, userId))
    .limit(1);
  if (!profile) {
    return fail("validation", "Save your profile before finishing onboarding.");
  }

  await db
    .update(projectOwnerProfiles)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projectOwnerProfiles.userId, userId));

  logger.info({ event: "profile.owner.onboarded", userId }, "owner onboarding completed");
  return ok({ ok: true });
}

// ── Architect profile ────────────────────────────────────────────────────

export async function getArchitectProfile(
  userId: string,
): Promise<ArchitectProfile | null> {
  const [row] = await db
    .select()
    .from(architectProfiles)
    .where(eq(architectProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function upsertArchitectProfile(
  userId: string,
  raw: unknown,
): Promise<Result<ArchitectProfile>> {
  const parsed = architectProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", { issues: parsed.error.issues });
  }
  const v = parsed.data;

  const [row] = await db
    .insert(architectProfiles)
    .values({
      userId,
      practiceName: v.practiceName,
      suburb: v.suburb ?? null,
      state: v.state ?? null,
      contactPhone: v.contactPhone ?? null,
    })
    .onConflictDoUpdate({
      target: architectProfiles.userId,
      set: {
        practiceName: v.practiceName,
        suburb: v.suburb ?? null,
        state: v.state ?? null,
        contactPhone: v.contactPhone ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) return fail("internal", "Could not save your studio profile.");
  return ok(row);
}

export async function completeArchitectOnboarding(
  userId: string,
): Promise<Result<{ ok: true }>> {
  const [profile] = await db
    .select({ id: architectProfiles.userId })
    .from(architectProfiles)
    .where(eq(architectProfiles.userId, userId))
    .limit(1);
  if (!profile) {
    return fail("validation", "Save your studio before finishing onboarding.");
  }

  await db
    .update(architectProfiles)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(architectProfiles.userId, userId));

  logger.info(
    { event: "profile.architect.onboarded", userId },
    "architect onboarding completed",
  );
  return ok({ ok: true });
}

// ── Builder directory (for tender round invitations) ─────────────────────

export interface DirectoryBuilder {
  userId: string;
  name: string;
  suburb: string | null;
  state: string | null;
  yearsInOperation: number | null;
}

/**
 * Approved builders, public identity only — powers the "invite from
 * the directory" picker on any round. No contact details.
 */
export async function listApprovedBuildersPublic(): Promise<DirectoryBuilder[]> {
  const rows = await db
    .select({
      userId: builderProfiles.userId,
      companyName: builderProfiles.companyName,
      tradingName: builderProfiles.tradingName,
      suburb: builderProfiles.businessSuburb,
      state: builderProfiles.businessState,
      yearsInOperation: builderProfiles.yearsInOperation,
    })
    .from(builderProfiles)
    .where(eq(builderProfiles.approvalStatus, "approved"))
    .orderBy(asc(builderProfiles.companyName));
  return rows.map((r) => ({
    userId: r.userId,
    name: r.tradingName ?? r.companyName,
    suburb: r.suburb,
    state: r.state,
    yearsInOperation: r.yearsInOperation,
  }));
}

// ── Builder profile ──────────────────────────────────────────────────────

export interface BuilderProfileBundle {
  profile: BuilderProfile;
  licences: BuilderLicence[];
  serviceAreas: BuilderServiceArea[];
  categories: BuilderProjectCategory[];
}

export async function getBuilderProfile(
  userId: string,
): Promise<BuilderProfileBundle | null> {
  const [profile] = await db
    .select()
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, userId))
    .limit(1);
  if (!profile) return null;

  const [licences, serviceAreas, categories] = await Promise.all([
    db
      .select()
      .from(builderLicences)
      .where(eq(builderLicences.builderId, userId))
      .orderBy(asc(builderLicences.state), asc(builderLicences.licenceNumber)),
    db
      .select()
      .from(builderServiceAreas)
      .where(eq(builderServiceAreas.builderId, userId))
      .orderBy(asc(builderServiceAreas.state), asc(builderServiceAreas.suburb)),
    db
      .select()
      .from(builderProjectCategories)
      .where(eq(builderProjectCategories.builderId, userId)),
  ]);

  return { profile, licences, serviceAreas, categories };
}

/**
 * Public lookup by slug. Used by `/b/[slug]` — anyone can hit it,
 * authenticated or not.
 *
 * Visibility rules:
 *
 *   - approved              → visible to everyone
 *   - any other status      → visible only to the owning user
 *                             (preview mode so they can chase the
 *                             review team / fix issues)
 *
 * The caller passes `viewerUserId` (or null when unauthenticated)
 * and we apply the rule here. Returns null if the lookup fails the
 * rule, NOT a thrown error — page wraps it in notFound().
 *
 * Note: this means the link from /owner/projects/.../tenders to a
 * builder's `/b/[slug]` will 404 until that builder is approved. That
 * is intentional — owners must not see unverified profiles. Once the
 * admin approval surface ships (Phase 4) the link becomes real.
 *
 * The shape returned is intentionally identical to BuilderProfileBundle
 * so the client component can reuse the same typings the editor uses.
 * Page-side code projects to a public-safe shape before sending to the
 * client (we strip postal address etc. there).
 */
export async function getBuilderBySlug(
  slug: string,
  viewerUserId: string | null,
): Promise<BuilderProfileBundle | null> {
  const [profile] = await db
    .select()
    .from(builderProfiles)
    .where(eq(builderProfiles.slug, slug))
    .limit(1);
  if (!profile) return null;

  // Approval gate. Owners always see their own — even if pending /
  // rejected — so they can preview and chase the team.
  const isOwner = !!viewerUserId && profile.userId === viewerUserId;
  if (profile.approvalStatus !== "approved" && !isOwner) {
    return null;
  }

  const [licences, serviceAreas, categories] = await Promise.all([
    db
      .select()
      .from(builderLicences)
      .where(eq(builderLicences.builderId, profile.userId))
      .orderBy(asc(builderLicences.state), asc(builderLicences.licenceNumber)),
    db
      .select()
      .from(builderServiceAreas)
      .where(eq(builderServiceAreas.builderId, profile.userId))
      .orderBy(asc(builderServiceAreas.state), asc(builderServiceAreas.suburb)),
    db
      .select()
      .from(builderProjectCategories)
      .where(eq(builderProjectCategories.builderId, profile.userId)),
  ]);

  return { profile, licences, serviceAreas, categories };
}

/**
 * Builder slug — generated from company name. Suffixed with the first 6
 * chars of the user uuid to guarantee uniqueness without a lookup loop.
 */
function buildSlug(companyName: string, userId: string): string {
  const base = companyName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = userId.replace(/-/g, "").slice(0, 6);
  return `${base || "builder"}-${suffix}`;
}

export async function upsertBuilderProfile(
  userId: string,
  raw: unknown,
): Promise<Result<BuilderProfile>> {
  const parsed = builderProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", { issues: parsed.error.issues });
  }
  const v = parsed.data;

  // Generate slug only on first insert. We don't auto-rotate slugs on rename
  // — public profile URLs would break. A separate "rename slug" tool ships
  // in admin (Phase 4).
  const [existing] = await db
    .select({
      slug: builderProfiles.slug,
      abn: builderProfiles.abn,
      companyName: builderProfiles.companyName,
    })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, userId))
    .limit(1);

  const slug = existing?.slug ?? buildSlug(v.companyName, userId);

  // Field-lock enforcement (defence in depth).
  // If the ABN currently on file is verified, reject changes to ABN
  // and to companyName (which is the legal entity name from ABR).
  // The client UI already disables these inputs — this server-side
  // check stops a malicious form post from bypassing the lock.
  if (existing?.abn) {
    // Lazy import to avoid a circular dep with the verification module.
    const { getLatestForBuilder } = await import("@/modules/verification");
    const latestAbn = await getLatestForBuilder(userId, "abn");
    const isAbnVerified =
      latestAbn?.status === "verified" &&
      latestAbn.subjectValue === existing.abn;
    if (isAbnVerified) {
      const incomingAbn = v.abn ?? null;
      if (incomingAbn !== null && incomingAbn !== existing.abn) {
        return fail(
          "conflict",
          "ABN is locked — verified against ABR. Contact support to change.",
        );
      }
      if (
        existing.companyName &&
        v.companyName.trim() !== existing.companyName.trim()
      ) {
        return fail(
          "conflict",
          "Legal entity name is locked — verified against ABR. Contact support to change.",
        );
      }
    }
  }

  try {
    const [row] = await db
      .insert(builderProfiles)
      .values({
        userId,
        companyName: v.companyName,
        tradingName: v.tradingName ?? null,
        abn: v.abn ?? null,
        acn: v.acn ?? null,
        businessAddressLine1: v.businessAddressLine1 ?? null,
        businessSuburb: v.businessSuburb ?? null,
        businessState: v.businessState ?? null,
        businessPostcode: v.businessPostcode ?? null,
        hasDifferentPostal: v.hasDifferentPostal,
        postalAddressLine1: v.hasDifferentPostal ? (v.postalAddressLine1 ?? null) : null,
        postalSuburb: v.hasDifferentPostal ? (v.postalSuburb ?? null) : null,
        postalState: v.hasDifferentPostal ? (v.postalState ?? null) : null,
        postalPostcode: v.hasDifferentPostal ? (v.postalPostcode ?? null) : null,
        bio: v.bio ?? null,
        website: v.website,
        linkedinUrl: v.linkedinUrl,
        instagramUrl: v.instagramUrl,
        yearsInOperation: v.yearsInOperation ?? null,
        slug,
      })
      .onConflictDoUpdate({
        target: builderProfiles.userId,
        set: {
          companyName: v.companyName,
          tradingName: v.tradingName ?? null,
          abn: v.abn ?? null,
          acn: v.acn ?? null,
          businessAddressLine1: v.businessAddressLine1 ?? null,
          businessSuburb: v.businessSuburb ?? null,
          businessState: v.businessState ?? null,
          businessPostcode: v.businessPostcode ?? null,
          hasDifferentPostal: v.hasDifferentPostal,
          postalAddressLine1: v.hasDifferentPostal ? (v.postalAddressLine1 ?? null) : null,
          postalSuburb: v.hasDifferentPostal ? (v.postalSuburb ?? null) : null,
          postalState: v.hasDifferentPostal ? (v.postalState ?? null) : null,
          postalPostcode: v.hasDifferentPostal ? (v.postalPostcode ?? null) : null,
          bio: v.bio ?? null,
          website: v.website,
          linkedinUrl: v.linkedinUrl,
          instagramUrl: v.instagramUrl,
          yearsInOperation: v.yearsInOperation ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) return fail("internal", "Could not save your builder profile.");
    return ok(row);
  } catch (err) {
    // Postgres surfaces unique violations with code 23505 + the constraint
    // name. Different drivers (neon-http vs node-postgres) expose them on
    // slightly different fields, so we check all the usual suspects + the
    // message text as a final fallback.
    const e = err as {
      code?: string;
      constraint?: string;
      constraint_name?: string;
      cause?: { code?: string; constraint?: string; constraint_name?: string };
    };
    const code = e.code ?? e.cause?.code;
    const constraint =
      e.constraint ?? e.constraint_name ?? e.cause?.constraint ?? e.cause?.constraint_name ?? "";
    const msg = err instanceof Error ? err.message : String(err);
    const blob = `${constraint} ${msg}`;

    if (code === "23505" || /duplicate key/i.test(msg)) {
      if (blob.includes("builder_profiles_abn_unique") || blob.includes("abn")) {
        return fail("conflict", "That ABN is already registered to another builder.");
      }
      if (blob.includes("builder_profiles_slug_unique") || blob.includes("slug")) {
        return fail(
          "conflict",
          "Another builder is using that handle. Try a different company name.",
        );
      }
      return fail(
        "conflict",
        "Looks like this profile already exists. Try refreshing the page.",
      );
    }

    logger.error(
      { event: "profile.builder.upsert_failed", userId, code, constraint, msg },
      "builder upsert failed",
    );
    return fail("internal", "Could not save your builder profile. Try again.");
  }
}

// ── Builder licences ────────────────────────────────────────────────────

export async function addBuilderLicence(
  builderId: string,
  raw: unknown,
): Promise<Result<BuilderLicence>> {
  const parsed = builderLicenceSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", { issues: parsed.error.issues });
  }
  const v = parsed.data;

  try {
    const [row] = await db
      .insert(builderLicences)
      .values({
        builderId,
        state: v.state,
        licenceType: v.licenceType,
        licenceNumber: v.licenceNumber,
        licenceHolderName: v.licenceHolderName ?? null,
        issuedAt: v.issuedAt ?? null,
        expiresAt: v.expiresAt ?? null,
      })
      .returning();
    if (!row) return fail("internal", "Could not add the licence.");
    return ok(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("builder_licences_unique")) {
      return fail("conflict", "You've already added that licence number for this state.");
    }
    return fail("internal", "Could not add the licence.");
  }
}

export async function removeBuilderLicence(
  builderId: string,
  licenceId: string,
): Promise<Result<{ ok: true }>> {
  const result = await db
    .delete(builderLicences)
    .where(and(eq(builderLicences.id, licenceId), eq(builderLicences.builderId, builderId)));
  if (result.rowCount === 0) {
    return fail("not_found", "Licence not found.");
  }
  return ok({ ok: true });
}

// ── Service areas + categories (replace-all semantics) ──────────────────

export async function setBuilderServiceAreas(
  builderId: string,
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = setServiceAreasSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "Invalid service areas.");
  }

  // Dedup at app level — DB unique index also enforces.
  const seen = new Set<string>();
  const cleaned = parsed.data.areas.filter((a) => {
    const key = `${a.state}|${a.suburb ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await db.transaction(async (tx) => {
    await tx.delete(builderServiceAreas).where(eq(builderServiceAreas.builderId, builderId));
    if (cleaned.length > 0) {
      await tx.insert(builderServiceAreas).values(
        cleaned.map((a) => ({
          builderId,
          state: a.state,
          suburb: a.suburb ?? null,
          postcode: a.postcode ?? null,
          radiusKm: a.radiusKm,
        })),
      );
    }
  });

  return ok({ ok: true });
}

export async function setBuilderProjectCategories(
  builderId: string,
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = setProjectCategoriesSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "Pick at least one project type.");
  }
  const cats = Array.from(new Set(parsed.data.categories));

  await db.transaction(async (tx) => {
    await tx
      .delete(builderProjectCategories)
      .where(eq(builderProjectCategories.builderId, builderId));
    await tx
      .insert(builderProjectCategories)
      .values(cats.map((category) => ({ builderId, category })));
  });

  return ok({ ok: true });
}

// ── Onboarding completion ───────────────────────────────────────────────

/**
 * Final builder onboarding step.
 *
 *   1. Validate the profile graph is "complete enough" — profile row,
 *      ≥1 category, ≥1 service area, ≥1 licence.
 *   2. Auto-approve when ABN is verified active in ABR AND ≥1 licence
 *      is verified active with the matching state register.
 *   3. Otherwise → pending_review for manual admin handling.
 *
 * Returns a flag indicating which path it took so the UI can route
 * (approved → "you're live", pending → "we'll review within 24h").
 */
export async function submitBuilderForApproval(
  userId: string,
): Promise<Result<{ ok: true; approved: boolean; reasons: string[] }>> {
  const bundle = await getBuilderProfile(userId);
  if (!bundle) return fail("not_found", "Save your builder profile first.");
  if (bundle.categories.length === 0) {
    return fail("validation", "Pick at least one project type.");
  }
  if (bundle.serviceAreas.length === 0) {
    return fail("validation", "Add at least one service area.");
  }
  if (bundle.licences.length === 0) {
    return fail("validation", "Add at least one builder licence.");
  }

  // Auto-approve gate.
  // Lazy-imported so the verification module's `import "server-only"`
  // doesn't fight when tests / scripts touch profile code without a
  // request context. The dynamic import only runs server-side so this
  // is purely a build-graph affordance.
  const { hasFullVerificationForApproval } = await import(
    "@/modules/verification"
  );
  const v = await hasFullVerificationForApproval(userId);
  const autoApprove = v.abnVerified && v.anyLicenceVerified;

  await db
    .update(builderProfiles)
    .set({
      approvalStatus: autoApprove ? "approved" : "pending_review",
      approvedAt: autoApprove ? new Date() : null,
      approvedBy: null,
      approvedVia: autoApprove ? "auto" : null,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(builderProfiles.userId, userId));

  // Founding Builder Access is being retired — new builders are NOT
  // auto-granted FBA. They go straight to paid unlocks. (Existing grants
  // keep working until they expire; admins can still grant manually.)

  logger.info(
    {
      event: autoApprove
        ? "profile.builder.auto_approved"
        : "profile.builder.pending_review",
      userId,
      reasons: v.reasons,
    },
    autoApprove
      ? "builder auto-approved via ABR + state register"
      : "builder submitted for manual review",
  );
  return ok({ ok: true, approved: autoApprove, reasons: v.reasons });
}

// ── Cross-cutting: onboarding gate helper ───────────────────────────────

// ── Logo (R2-backed) ─────────────────────────────────────────────────────

/**
 * Stash an R2 object key against the builder's profile. Caller (server
 * action) is responsible for verifying the upload landed in R2 first.
 *
 * The key alone is stored — never the URL — so we can rotate signed
 * URLs at read time. Reads go through `/api/files?key=...` (the same
 * gateway used for project documents).
 */
export async function setBuilderLogo(
  userId: string,
  key: string,
): Promise<Result<{ ok: true }>> {
  await db
    .update(builderProfiles)
    .set({ logoR2Key: key, updatedAt: new Date() })
    .where(eq(builderProfiles.userId, userId));
  logger.info(
    { event: "profile.builder.logo_set", userId, key },
    "builder logo set",
  );
  return ok({ ok: true });
}

export async function clearBuilderLogo(
  userId: string,
): Promise<Result<{ ok: true }>> {
  await db
    .update(builderProfiles)
    .set({ logoR2Key: null, updatedAt: new Date() })
    .where(eq(builderProfiles.userId, userId));
  logger.info(
    { event: "profile.builder.logo_cleared", userId },
    "builder logo cleared",
  );
  return ok({ ok: true });
}

/**
 * Used by (app)/layout.tsx to decide whether the user can see the
 * dashboard or must finish onboarding first.
 *
 * Admins skip onboarding. project_owners + builders need their respective
 * profile row's onboarding_completed_at to be non-null.
 */
export async function hasCompletedOnboarding(
  userId: string,
  role: string | null,
): Promise<boolean> {
  if (!role) return false;
  if (role === "admin") return true;

  if (role === "project_owner") {
    const [row] = await db
      .select({ at: projectOwnerProfiles.onboardingCompletedAt })
      .from(projectOwnerProfiles)
      .where(eq(projectOwnerProfiles.userId, userId))
      .limit(1);
    return !!row?.at;
  }

  if (role === "builder") {
    const [row] = await db
      .select({ at: builderProfiles.onboardingCompletedAt })
      .from(builderProfiles)
      .where(eq(builderProfiles.userId, userId))
      .limit(1);
    return !!row?.at;
  }

  if (role === "architect") {
    const [row] = await db
      .select({ at: architectProfiles.onboardingCompletedAt })
      .from(architectProfiles)
      .where(eq(architectProfiles.userId, userId))
      .limit(1);
    return !!row?.at;
  }

  return false;
}
