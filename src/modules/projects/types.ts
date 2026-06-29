/**
 * projects · public types.
 *
 * Domain-level types exposed by the module. DB row types live in
 * schema.ts and are re-exported through index.ts.
 */

import type { ProjectRow } from "./schema";

/** Public-safe project shape — same as the row right now, but kept
 *  separate so we can strip private fields later without changing the
 *  consumer surface. */
export type Project = ProjectRow;

/**
 * Validation result for a project's draft state — used by the wizard to
 * tell the user what's still missing before publish is allowed.
 *
 * `canPublish` is true only when every blocker is resolved AND at least
 * one architectural document is attached.
 */
export type PublishabilityReport = {
  canPublish: boolean;
  missing: Array<
    | "title"
    | "type"
    | "address"
    | "type_specific_fields"
    | "architectural_plan"
  >;
  /** Friendly per-blocker messages for the UI. */
  reasons: string[];
};

/**
 * Inputs for create. Type is required to set up the right field set in
 * the wizard; everything else can be filled in later via update.
 */
export type CreateProjectInput = {
  type: ProjectRow["type"];
  title?: string;
};

/**
 * What the marketplace shows BEFORE a builder unlocks. Strips the
 * private bits (exact street address, owner contact, document
 * downloads). Suburb + state + postcode are visible in preview so
 * builders can make the unlock decision.
 */
export type MarketplacePreview = {
  id: string;
  slug: string;
  title: string;
  type: ProjectRow["type"];
  status: ProjectRow["status"];
  suburb: string | null;
  state: ProjectRow["state"];
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  landSizeBand: ProjectRow["landSizeBand"];
  buildSizeBand: ProjectRow["buildSizeBand"];
  dwellingCount: number | null;
  renovationScope: ProjectRow["renovationScope"];
  existingAgeBand: ProjectRow["existingAgeBand"];
  extensionType: ProjectRow["extensionType"];
  extensionSizeBand: ProjectRow["extensionSizeBand"];
  budgetBand: ProjectRow["budgetBand"];
  targetStartMonth: string | null;
  targetCompletionMonth: string | null;
  // NOTE: the brief/description is deliberately NOT in the pre-unlock
  // preview — it's free text that could contain the street address or
  // owner PII. Builders only see it AFTER unlocking (the full project row).
  documentCount: number;
  /**
   * Number of builders who have unlocked this project. Bounded
   * [0, UNLOCK_CAP] under normal operation. Drives the "X / 3 spots"
   * marketplace indicator + the "FULL" disabled state on the unlock
   * CTA. Imported from @/modules/unlocks for the actual cap.
   */
  unlockedCount: number;
  publishedAt: Date | null;
  createdAt: Date;
};

/** Filters applied to the marketplace browse query. */
export type MarketplaceFilters = {
  /** Free-text search over title. */
  q?: string;
  type?: ProjectRow["type"];
  state?: NonNullable<ProjectRow["state"]>;
  /** 4-digit AU postcode. */
  postcode?: string;
  /** Budget bands the project should fall within. Empty = any. */
  budgets?: Array<NonNullable<ProjectRow["budgetBand"]>>;
  /** Restrict to projects whose suburb is in this list (matched feed). */
  suburbsIn?: string[];
  /**
   * Builder service-area scoping. Each entry is one of the builder's
   * service areas, already collapsed by radius:
   *
   *   - `statewide: true`  → match any project in `state`
   *   - `statewide: false` → match only projects whose state+suburb
   *                          equal `state`+`suburb`
   *
   * Multiple entries OR together. Used by the dashboard's "suggested"
   * feed so a builder with one tight Essendon area + one statewide WA
   * area gets both kinds of project in the feed.
   */
  serviceAreaMatch?: Array<{
    state: NonNullable<ProjectRow["state"]>;
    suburb: string | null;
    statewide: boolean;
  }>;
  /** Pagination. */
  limit?: number;
  offset?: number;
};

/** Patch for a project — every field optional. Service validates the
 *  patch at runtime against the project's type. */
export type UpdateProjectInput = Partial<{
  title: string;
  type: ProjectRow["type"];
  addressLine1: string | null;
  suburb: string | null;
  state: ProjectRow["state"] | null;
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  landSizeBand: ProjectRow["landSizeBand"] | null;
  buildSizeBand: ProjectRow["buildSizeBand"] | null;
  dwellingCount: number | null;
  renovationScope: ProjectRow["renovationScope"] | null;
  /**
   * Multi-select renovation scope tags. Source of truth for new
   * writes; the legacy single-value `renovationScope` is derived
   * from this array on save (highest-priority tag wins). Empty
   * array clears the renovation scope entirely.
   */
  renovationScopeTags: NonNullable<ProjectRow["renovationScope"]>[];
  existingAgeBand: ProjectRow["existingAgeBand"] | null;
  extensionType: ProjectRow["extensionType"] | null;
  extensionSizeBand: ProjectRow["extensionSizeBand"] | null;
  budgetBand: ProjectRow["budgetBand"] | null;
  targetStartMonth: string | null;
  targetCompletionMonth: string | null;
  description: string | null;
}>;
