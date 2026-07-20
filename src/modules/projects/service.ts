/**
 * projects · service layer.
 *
 * Owns the lifecycle of a residential project from "owner clicks
 * Upload" through publish. Server-only.
 *
 * Lifecycle:
 *   create()        — owner picks a type → row in `draft`
 *   update()        — autosaved patches as the wizard fills out
 *   publish()       — gated check (architectural plan + required
 *                     fields) → flip to `published`
 *   listMine()      — owner's projects on their dashboard
 *   getBySlugForOwner() — wizard / detail page lookup
 *   softDelete()    — hide without losing audit trail
 *
 * Publish gate:
 *   1. title, type, address (line1 + suburb + state + postcode), and
 *      type-specific required fields all present
 *   2. at least one document with category="architectural" and
 *      status="active" attached to this project
 */

import "server-only";
import { after } from "next/server";
import { and, desc, eq, gt, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import { projects, type ProjectRow } from "./schema";
import type {
  CreateProjectInput,
  MarketplaceFilters,
  MarketplacePreview,
  Project,
  PublishabilityReport,
  UpdateProjectInput,
} from "./types";

import { documents } from "@/modules/documents/schema";
// Cross-module table reads — go through public barrel so we don't
// drag the unlocks service (and the lib/db chain) into a runtime cycle.
import { unlocks } from "@/modules/unlocks";

// Pricing intentionally not imported here — service.ts only needs it
// for non-existent monetary calculations right now. Pricing lives in
// ./pricing.ts (client-safe).

// ── public surface ───────────────────────────────────────────────────────

/**
 * Spin up a new draft project. Title gets a sensible default based on
 * the type — the wizard prompts the owner to refine it.
 */
export async function create(
  ownerId: string,
  input: CreateProjectInput,
): Promise<Result<Project>> {
  // Title (and therefore the slug/URL) is always derived from structured
  // fields — never the owner's free text — so a street address can't leak
  // in. No suburb at create yet, so it's just the type label for now; it
  // firms up as the wizard fills suburb/state, and again at publish.
  const title = deriveProjectTitle(input.type, null, null);
  const slug = await uniqueSlug(title);

  const [row] = await db
    .insert(projects)
    .values({
      ownerId,
      title,
      slug,
      type: input.type,
      status: "draft",
    })
    .returning();
  if (!row) return fail("internal", "Failed to create project.");

  return ok(row);
}

/**
 * Patch any subset of fields. Validates the patch against the project's
 * type — e.g. you can't set `dwellingCount` on a single dwelling.
 *
 * Title changes regenerate the slug *only* while the project is still a
 * draft — once published, the slug is part of its public URL and we
 * don't churn it.
 */
export async function update(
  ownerId: string,
  projectId: string,
  patch: UpdateProjectInput,
): Promise<Result<Project>> {
  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!existing) return fail("not_found", "Project not found.");
  if (existing.ownerId !== ownerId) {
    return fail("forbidden", "Not your project.");
  }

  const errors = validatePatch(existing, patch);
  if (errors.length > 0) {
    return fail("validation", errors.join(" "), { errors });
  }

  // Title is ALWAYS server-derived from structured fields (type + suburb +
  // state) — any client-sent `title` in the patch is ignored, so an owner
  // can't sneak the street address into the title/slug/URL.
  const mergedSuburb =
    patch.suburb !== undefined ? patch.suburb : existing.suburb;
  const mergedState = patch.state !== undefined ? patch.state : existing.state;
  const nextTitle = deriveProjectTitle(existing.type, mergedSuburb, mergedState);

  // A LIVE project's required fields must not be cleared — that would
  // break a published listing. Validate the merged result up-front and
  // reject (without persisting) so the client can show inline errors.
  // Drafts are exempt: they're allowed to be incomplete.
  if (existing.status !== "draft") {
    const merged = { ...existing, ...patch, title: nextTitle } as ProjectRow;
    const fieldErrors = validateSaveReadiness(merged);
    if (Object.keys(fieldErrors).length > 0) {
      return fail(
        "validation",
        "Required details can't be left empty on a live project.",
        { fieldErrors },
      );
    }
  }

  // Slug follows the derived title; regenerated only while drafting so
  // published URLs stay stable.
  let nextSlug = existing.slug;
  if (existing.status === "draft" && nextTitle !== existing.title) {
    nextSlug = await uniqueSlug(nextTitle, existing.id);
  }

  // When the patch updates renovationScopeTags (multi-select), also
  // derive the legacy single-value column from it so any callers
  // still reading `renovationScope` get a sensible value. Highest-
  // priority tag wins.
  const derivedSingleScope =
    patch.renovationScopeTags !== undefined
      ? deriveRenovationScopeFromTags(patch.renovationScopeTags)
      : undefined;

  const [updated] = await db
    .update(projects)
    .set({
      ...patch,
      title: nextTitle,
      ...(derivedSingleScope !== undefined
        ? { renovationScope: derivedSingleScope }
        : {}),
      slug: nextSlug,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  // Drafts are NOT auto-published on save. Publishing is always an explicit
  // action (the Publish button → publishProjectAction → publish()), so a
  // draft never goes live while the owner is still reviewing or editing it
  // — including when AI auto-fill has pre-populated everything.

  return ok(updated!);
}

const RENO_SCOPE_PRIORITY = [
  "kitchen",
  "bathroom",
  "kitchen_and_bathroom",
  "full_internal",
  "full_internal_and_external",
  "structural",
] as const;

function deriveRenovationScopeFromTags(
  tags: NonNullable<ProjectRow["renovationScope"]>[],
): ProjectRow["renovationScope"] {
  if (!tags || tags.length === 0) return null;
  let best: ProjectRow["renovationScope"] = null;
  let bestIdx = -1;
  for (const tag of tags) {
    const i = RENO_SCOPE_PRIORITY.indexOf(tag);
    if (i > bestIdx) {
      best = tag;
      bestIdx = i;
    }
  }
  return best;
}

/**
 * Decide whether a project is allowed to publish. Pure: doesn't
 * mutate. The wizard renders the report so the owner sees what's
 * still missing in real time.
 */
export async function checkPublishability(
  ownerId: string,
  projectId: string,
): Promise<Result<PublishabilityReport>> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!project) return fail("not_found", "Project not found.");
  if (project.ownerId !== ownerId) return fail("forbidden", "Not your project.");

  const missing: PublishabilityReport["missing"] = [];
  const reasons: string[] = [];

  if (!project.title?.trim()) {
    missing.push("title");
    reasons.push("Add a project title.");
  }
  if (!project.type) {
    missing.push("type");
    reasons.push("Pick a project type.");
  }
  if (!project.addressLine1 || !project.suburb || !project.state || !project.postcode) {
    missing.push("address");
    reasons.push("Complete the project address.");
  }

  // Type-specific required fields.
  const typeMissing = validateTypeRequired(project);
  if (typeMissing.length > 0) {
    missing.push("type_specific_fields");
    reasons.push(...typeMissing);
  }

  // Architectural-plan gate.
  const archCount = await db.$count(
    documents,
    and(
      eq(documents.projectId, projectId),
      eq(documents.category, "architectural"),
      eq(documents.status, "active"),
      isNull(documents.deletedAt),
    ),
  );
  if (archCount === 0) {
    missing.push("architectural_plan");
    reasons.push(
      "Upload at least one architectural plan to publish (other docs are optional).",
    );
  }

  return ok({ canPublish: missing.length === 0, missing, reasons });
}

/**
 * Flip a draft → published. Re-checks the publishability gate first, then
 * scopes the UPDATE to status='draft' so it's idempotent: a re-publish on
 * an already-live project (e.g. auto-publish + a manual click, or a retry)
 * is a no-op that returns the live row WITHOUT re-running the fan-out — so
 * builders aren't re-notified and publishedAt isn't reset.
 */
export async function publish(
  ownerId: string,
  projectId: string,
): Promise<Result<Project>> {
  const report = await checkPublishability(ownerId, projectId);
  if (!report.ok) return report;
  if (!report.value.canPublish) {
    return fail(
      "validation",
      "Project isn't ready to publish yet.",
      { missing: report.value.missing, reasons: report.value.reasons },
    );
  }

  // Finalise the address-safe public name + slug from the now-complete
  // structured fields, the moment before it becomes a public URL. This also
  // heals any older draft whose title/slug predate the derive-from-fields
  // rule (e.g. an owner-typed address title).
  const [proj] = await db
    .select({
      type: projects.type,
      suburb: projects.suburb,
      state: projects.state,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  if (!proj) return fail("internal", "Failed to publish project.");
  const finalTitle = deriveProjectTitle(proj.type, proj.suburb, proj.state);
  const finalSlug = await uniqueSlug(finalTitle, projectId);

  const [row] = await db
    .update(projects)
    .set({
      status: "published",
      publishedAt: new Date(),
      title: finalTitle,
      slug: finalSlug,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.ownerId, ownerId),
        eq(projects.status, "draft"),
      ),
    )
    .returning();

  // No row updated → it wasn't a draft (already published, or a concurrent
  // publish won the race). Return the current row idempotently and skip the
  // fan-out below so the project isn't re-dispatched.
  if (!row) {
    const [current] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .limit(1);
    if (current) return ok(current);
    return fail("internal", "Failed to publish project.");
  }

  // Fan-out: owner confirmation, ops heads-up, fan-out to every
  // eligible builder. Wrapped in `after()` from next/server so the
  // function runtime stays alive on Vercel until the bulk send
  // completes — without it, a naked `void (async ...)` IIFE gets the
  // function recycled mid-flight and the trailing batches silently
  // drop (we burned a publish on this exact pattern; see commit msg).
  //
  // Lazy import keeps the module graph clean and the publish-path
  // bundle small.
  after(async () => {
    try {
      const { dispatchProjectPublishedEvent } = await import("./dispatch");
      await dispatchProjectPublishedEvent(row.id);
    } catch {
      /* dispatch is internally try/catch'd; this is belt-and-braces */
    }
  });

  return ok(row);
}

/** Owner's project list, newest first. Hides soft-deleted. */
export async function listMine(ownerId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));
}

/** Lookup helper for the wizard / detail page (owner-scoped). */
export async function getBySlugForOwner(
  ownerId: string,
  slug: string,
): Promise<Result<Project>> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)));
  if (!row) return fail("not_found", "Project not found.");
  if (row.ownerId !== ownerId) return fail("forbidden", "Not your project.");
  return ok(row);
}

/** Lookup by id (owner-scoped). */
export async function getByIdForOwner(
  ownerId: string,
  id: string,
): Promise<Result<Project>> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)));
  if (!row) return fail("not_found", "Project not found.");
  if (row.ownerId !== ownerId) return fail("forbidden", "Not your project.");
  return ok(row);
}

// ── builder-side queries ─────────────────────────────────────────────────

/**
 * Marketplace listing for builders. Returns `MarketplacePreview` rows
 * (strips private fields). Filters apply at the SQL level.
 *
 * Always restricts to status IN (published, tendering) and not soft-
 * deleted — owners' drafts never leak.
 */
export async function listForMarketplace(
  filters: MarketplaceFilters = {},
): Promise<MarketplacePreview[]> {
  const conds = [
    inArray(projects.status, ["published", "tendering"]),
    isNull(projects.deletedAt),
    // Private rounds are invisible to the marketplace — only builders
    // the runner invited can reach them (via their invite, not browse).
    ne(projects.tenderMode, "private"),
  ];

  if (filters.q && filters.q.trim()) {
    conds.push(ilike(projects.title, `%${filters.q.trim()}%`));
  }
  if (filters.type) {
    conds.push(eq(projects.type, filters.type));
  }
  if (filters.state) {
    conds.push(eq(projects.state, filters.state));
  }
  if (filters.postcode) {
    conds.push(eq(projects.postcode, filters.postcode));
  }
  if (filters.budgets && filters.budgets.length > 0) {
    conds.push(inArray(projects.budgetBand, filters.budgets));
  }
  if (filters.suburbsIn && filters.suburbsIn.length > 0) {
    conds.push(inArray(projects.suburb, filters.suburbsIn));
  }

  // Service-area scoped feed (used by the builder dashboard's "Suggested"
  // row). Each entry is OR'd so a builder with multiple service areas
  // sees the union of matching projects.
  //
  //   - statewide=true  → eq(state, X)
  //   - statewide=false → and(eq(state, X), eq(suburb, Y))
  //
  // Entries with statewide=false but suburb=null are skipped (no signal
  // to match on).
  if (filters.serviceAreaMatch && filters.serviceAreaMatch.length > 0) {
    const ors = filters.serviceAreaMatch
      .map((m) => {
        if (m.statewide) return eq(projects.state, m.state);
        if (!m.suburb) return null;
        return and(eq(projects.state, m.state), eq(projects.suburb, m.suburb));
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
    if (ors.length > 0) {
      const combined = ors.length === 1 ? ors[0]! : or(...ors)!;
      conds.push(combined);
    }
  }

  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      type: projects.type,
      status: projects.status,
      suburb: projects.suburb,
      state: projects.state,
      postcode: projects.postcode,
      bedrooms: projects.bedrooms,
      bathrooms: projects.bathrooms,
      floors: projects.floors,
      landSizeBand: projects.landSizeBand,
      buildSizeBand: projects.buildSizeBand,
      dwellingCount: projects.dwellingCount,
      renovationScope: projects.renovationScope,
      existingAgeBand: projects.existingAgeBand,
      extensionType: projects.extensionType,
      extensionSizeBand: projects.extensionSizeBand,
      budgetBand: projects.budgetBand,
      targetStartMonth: projects.targetStartMonth,
      targetCompletionMonth: projects.targetCompletionMonth,
      description: projects.description,
      tenderMode: projects.tenderMode,
      tenderSpots: projects.tenderSpots,
      publishedAt: projects.publishedAt,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(...conds))
    .orderBy(desc(projects.publishedAt))
    .limit(filters.limit ?? 60)
    .offset(filters.offset ?? 0);

  return attachMarketplaceCounts(rows);
}

/** Fetch a single preview by slug (used by the builder detail page). */
export async function getMarketplacePreview(
  slug: string,
): Promise<Result<MarketplacePreview>> {
  const list = await listForMarketplace({ limit: 1 });
  // Cheap path: re-run the listForMarketplace query but scoped to slug.
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      type: projects.type,
      status: projects.status,
      suburb: projects.suburb,
      state: projects.state,
      postcode: projects.postcode,
      bedrooms: projects.bedrooms,
      bathrooms: projects.bathrooms,
      floors: projects.floors,
      landSizeBand: projects.landSizeBand,
      buildSizeBand: projects.buildSizeBand,
      dwellingCount: projects.dwellingCount,
      renovationScope: projects.renovationScope,
      existingAgeBand: projects.existingAgeBand,
      extensionType: projects.extensionType,
      extensionSizeBand: projects.extensionSizeBand,
      budgetBand: projects.budgetBand,
      targetStartMonth: projects.targetStartMonth,
      targetCompletionMonth: projects.targetCompletionMonth,
      description: projects.description,
      tenderMode: projects.tenderMode,
      tenderSpots: projects.tenderSpots,
      publishedAt: projects.publishedAt,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.slug, slug),
        inArray(projects.status, ["published", "tendering"]),
        isNull(projects.deletedAt),
        // Private rounds never resolve via the marketplace path.
        ne(projects.tenderMode, "private"),
      ),
    );
  // Touch `list` to satisfy lint without using it functionally.
  void list;
  if (!row) return fail("not_found", "Project not found.");
  const [withCounts] = await attachMarketplaceCounts([row]);
  return ok(withCounts!);
}

/**
 * Full project read for an unlocked builder — includes the private
 * fields the marketplace preview hides (currently nothing extra at the
 * row level; the lock applies to the *related* docs + owner contact).
 */
export async function getFullForUnlockedBuilder(
  slug: string,
): Promise<Result<Project>> {
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.slug, slug),
        inArray(projects.status, ["published", "tendering"]),
        isNull(projects.deletedAt),
      ),
    );
  if (!row) return fail("not_found", "Project not found.");
  return ok(row);
}

/** Bulk fetch by ids — used when listing the builder's saved/unlocked. */
export async function listByIds(ids: string[]): Promise<MarketplacePreview[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      type: projects.type,
      status: projects.status,
      suburb: projects.suburb,
      state: projects.state,
      postcode: projects.postcode,
      bedrooms: projects.bedrooms,
      bathrooms: projects.bathrooms,
      floors: projects.floors,
      landSizeBand: projects.landSizeBand,
      buildSizeBand: projects.buildSizeBand,
      dwellingCount: projects.dwellingCount,
      renovationScope: projects.renovationScope,
      existingAgeBand: projects.existingAgeBand,
      extensionType: projects.extensionType,
      extensionSizeBand: projects.extensionSizeBand,
      budgetBand: projects.budgetBand,
      targetStartMonth: projects.targetStartMonth,
      targetCompletionMonth: projects.targetCompletionMonth,
      description: projects.description,
      tenderMode: projects.tenderMode,
      tenderSpots: projects.tenderSpots,
      publishedAt: projects.publishedAt,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(inArray(projects.id, ids), isNull(projects.deletedAt)))
    .orderBy(desc(projects.publishedAt));
  return attachMarketplaceCounts(rows);
}

/**
 * Take a batch of preview rows and merge in the counts the marketplace
 * card depends on — `documentCount` and `unlockedCount` — in two
 * grouped-aggregate queries (one per join), run in parallel.
 *
 * Both queries are bounded by the input row count (≤ 60 typical) so
 * they stay sub-millisecond even at scale. Avoids correlated subqueries
 * which were measurably flaky on Neon.
 *
 * Counts default to 0 when no rows match — the maps don't include a
 * key for zero-count projects, so the spread reads "absence as zero".
 */
async function attachMarketplaceCounts<
  T extends { id: string },
>(rows: T[]): Promise<Array<T & { documentCount: number; unlockedCount: number }>> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [docCounts, unlockCounts] = await Promise.all([
    db
      .select({
        projectId: documents.projectId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(documents)
      .where(
        and(
          inArray(documents.projectId, ids),
          eq(documents.status, "active"),
          isNull(documents.deletedAt),
        ),
      )
      .groupBy(documents.projectId),
    db
      .select({
        projectId: unlocks.projectId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(unlocks)
      .where(inArray(unlocks.projectId, ids))
      .groupBy(unlocks.projectId),
  ]);

  const docMap = new Map<string, number>();
  for (const c of docCounts) {
    if (c.projectId) docMap.set(c.projectId, c.count);
  }
  const unlockMap = new Map<string, number>();
  for (const c of unlockCounts) {
    unlockMap.set(c.projectId, c.count);
  }
  return rows.map((r) => ({
    ...r,
    documentCount: docMap.get(r.id) ?? 0,
    unlockedCount: unlockMap.get(r.id) ?? 0,
  }));
}

/** Soft-delete. Cascade is handled at the doc layer (project_id → null). */
export async function softDelete(
  ownerId: string,
  projectId: string,
): Promise<Result<{ id: string }>> {
  const [existing] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!existing) return fail("not_found", "Project not found.");
  if (existing.ownerId !== ownerId) return fail("forbidden", "Not your project.");

  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  return ok({ id: projectId });
}

// ── helpers ──────────────────────────────────────────────────────────────

const PROJECT_TYPE_TITLE: Record<ProjectRow["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * Public, address-safe project name — derived ONLY from structured fields
 * (type + suburb + state), NEVER from owner free-text. This is the single
 * source of truth for the title AND (via slugify) the slug / URL / breadcrumb,
 * so a street address typed anywhere by the owner can never reach a
 * builder-visible surface. While a draft has no suburb yet it's just the
 * type label; it firms up as suburb/state are filled and again at publish.
 *
 *   ("multi_dwelling", "Doreen", "VIC") → "Multi-dwelling · Doreen, VIC"
 *                                        → slug "multi-dwelling-doreen-vic"
 */
function deriveProjectTitle(
  type: ProjectRow["type"],
  suburb: string | null | undefined,
  state: string | null | undefined,
): string {
  const base = PROJECT_TYPE_TITLE[type];
  const loc = [suburb?.trim() || null, state || null]
    .filter(Boolean)
    .join(", ");
  return loc ? `${base} · ${loc}` : base;
}

/** kebab-case + trim + 4-char uniqueness suffix. */
async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "project";

  // Try base, then base-suffix until unique. We loop because
  // collisions are exceptionally rare but we want determinism.
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix =
      attempt === 0
        ? ""
        : `-${randomSuffix()}`;
    const candidate = `${base}${suffix}`;
    const [hit] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, candidate));
    if (!hit || hit.id === excludeId) return candidate;
  }
  // Fallback — append a longer random suffix.
  return `${base}-${randomSuffix()}${randomSuffix()}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/** Validation for type-specific fields when *publishing*. */
function validateTypeRequired(p: ProjectRow): string[] {
  const out: string[] = [];
  switch (p.type) {
    case "single_dwelling":
      if (!p.bedrooms) out.push("Set the number of bedrooms.");
      if (!p.bathrooms) out.push("Set the number of bathrooms.");
      if (!p.floors) out.push("Set the number of floors.");
      break;
    case "multi_dwelling":
      if (!p.dwellingCount || p.dwellingCount < 2) {
        out.push("Multi-dwelling projects need a dwelling count of 2 or more.");
      }
      if (!p.bedrooms) out.push("Set total bedrooms.");
      if (!p.bathrooms) out.push("Set total bathrooms.");
      break;
    case "renovation":
      // Source of truth: the multi-select tags array. The legacy
      // single-value column is auto-derived from the array.
      if (!p.renovationScopeTags || p.renovationScopeTags.length === 0) {
        out.push("Pick at least one renovation scope.");
      }
      break;
    case "extension":
      if (!p.extensionType) out.push("Pick the extension type.");
      if (!p.extensionSizeBand) out.push("Pick the extension size.");
      break;
  }
  return out;
}

/**
 * Required-field readiness for SAVING an edit (no document check) — the
 * field-level subset of `checkPublishability`. Returns a field→message
 * map so the client can render inline errors. Used to (a) stop a LIVE
 * project's required fields being cleared, and (b) with the doc gate,
 * decide draft→live auto-publish.
 */
export function validateSaveReadiness(p: ProjectRow): Record<string, string> {
  const e: Record<string, string> = {};
  if (!p.title?.trim()) e.title = "Add a project title.";
  if (!p.addressLine1 || !p.suburb || !p.state || !p.postcode) {
    e.address = "Complete the project address.";
  }
  switch (p.type) {
    case "single_dwelling":
      if (!p.bedrooms) e.bedrooms = "Set the number of bedrooms.";
      if (!p.bathrooms) e.bathrooms = "Set the number of bathrooms.";
      if (!p.floors) e.floors = "Set the number of floors.";
      break;
    case "multi_dwelling":
      if (!p.dwellingCount || p.dwellingCount < 2) {
        e.dwellingCount = "Set a dwelling count of 2 or more.";
      }
      if (!p.bedrooms) e.bedrooms = "Set total bedrooms.";
      if (!p.bathrooms) e.bathrooms = "Set total bathrooms.";
      break;
    case "renovation":
      if (!p.renovationScopeTags || p.renovationScopeTags.length === 0) {
        e.renovationScope = "Pick at least one renovation scope.";
      }
      break;
    case "extension":
      if (!p.extensionType) e.extensionType = "Pick the extension type.";
      if (!p.extensionSizeBand) e.extensionSize = "Pick the extension size.";
      break;
  }
  return e;
}

/** Validate a patch against the project's type. Returns user-facing
 *  reasons; service maps them to a single validation error. */
function validatePatch(p: ProjectRow, patch: UpdateProjectInput): string[] {
  const out: string[] = [];

  if (patch.title !== undefined && !patch.title.trim()) {
    out.push("Title can't be empty.");
  }
  if (patch.postcode != null && !/^\d{4}$/.test(patch.postcode)) {
    out.push("Postcode must be 4 digits.");
  }
  if (
    patch.targetStartMonth != null &&
    patch.targetStartMonth.trim() !== "" &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(patch.targetStartMonth)
  ) {
    out.push("Start month must be in YYYY-MM format.");
  }
  if (
    patch.targetCompletionMonth != null &&
    patch.targetCompletionMonth.trim() !== "" &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(patch.targetCompletionMonth)
  ) {
    out.push("Completion month must be in YYYY-MM format.");
  }

  // Cross-type sanity: don't let a patch set a field that doesn't make
  // sense for the project's current type. (Type can also change in the
  // patch — re-evaluate against the *next* type if so.)
  const nextType = patch.type ?? p.type;
  if (nextType === "single_dwelling" || nextType === "renovation") {
    if (patch.dwellingCount != null) {
      out.push("Dwelling count only applies to multi-dwelling projects.");
    }
  }
  if (nextType !== "renovation" && patch.renovationScope != null) {
    out.push("Renovation scope only applies to renovations.");
  }
  if (
    nextType !== "renovation" &&
    patch.renovationScopeTags != null &&
    patch.renovationScopeTags.length > 0
  ) {
    out.push("Renovation scope tags only apply to renovations.");
  }
  if (nextType !== "extension" && patch.extensionType != null) {
    out.push("Extension type only applies to extensions.");
  }
  if (nextType !== "extension" && patch.extensionSizeBand != null) {
    out.push("Extension size only applies to extensions.");
  }

  return out;
}
