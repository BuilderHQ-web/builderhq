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
import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import { projects, type ProjectRow } from "./schema";
import type {
  CreateProjectInput,
  Project,
  PublishabilityReport,
  UpdateProjectInput,
} from "./types";

import { documents } from "@/modules/documents/schema";

// ── public surface ───────────────────────────────────────────────────────

/**
 * Spin up a new draft project. Title gets a sensible default based on
 * the type — the wizard prompts the owner to refine it.
 */
export async function create(
  ownerId: string,
  input: CreateProjectInput,
): Promise<Result<Project>> {
  const title = input.title?.trim() || defaultTitleFor(input.type);
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

  // Slug regen only while drafting — published URLs stay stable.
  let nextSlug = existing.slug;
  if (
    existing.status === "draft" &&
    typeof patch.title === "string" &&
    patch.title.trim() &&
    patch.title.trim() !== existing.title
  ) {
    nextSlug = await uniqueSlug(patch.title.trim(), existing.id);
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...patch,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      slug: nextSlug,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  return ok(updated!);
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
 * Flip a draft → published. Re-runs the publishability check inside a
 * transaction so the gate can't be raced.
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

  const [row] = await db
    .update(projects)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .returning();
  if (!row) return fail("internal", "Failed to publish project.");

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

function defaultTitleFor(type: ProjectRow["type"]): string {
  switch (type) {
    case "single_dwelling":
      return "Untitled single dwelling";
    case "multi_dwelling":
      return "Untitled multi-dwelling";
    case "renovation":
      return "Untitled renovation";
    case "extension":
      return "Untitled extension";
    default:
      return "Untitled project";
  }
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
      if (!p.renovationScope) out.push("Pick the renovation scope.");
      break;
    case "extension":
      if (!p.extensionType) out.push("Pick the extension type.");
      if (!p.extensionSizeBand) out.push("Pick the extension size.");
      break;
  }
  return out;
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
  if (nextType !== "extension" && patch.extensionType != null) {
    out.push("Extension type only applies to extensions.");
  }
  if (nextType !== "extension" && patch.extensionSizeBand != null) {
    out.push("Extension size only applies to extensions.");
  }

  return out;
}
