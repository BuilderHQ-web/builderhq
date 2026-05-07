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
  description: string | null;
  documentCount: number;
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
  existingAgeBand: ProjectRow["existingAgeBand"] | null;
  extensionType: ProjectRow["extensionType"] | null;
  extensionSizeBand: ProjectRow["extensionSizeBand"] | null;
  budgetBand: ProjectRow["budgetBand"] | null;
  targetStartMonth: string | null;
  targetCompletionMonth: string | null;
  description: string | null;
}>;
