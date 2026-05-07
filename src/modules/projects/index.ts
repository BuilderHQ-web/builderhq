/**
 * @module projects
 *
 * Public surface for the projects module. Anything outside this folder
 * MUST import from `@/modules/projects` — never reach into `./service`,
 * `./schema`, or `./policies` directly. ESLint enforces it.
 *
 * Schema tables are re-exported here so db.ts can import them at
 * startup. The rule that no callsite outside this module may write a
 * Drizzle query against `projects` still applies — call services.
 */

// Schema (DB consumers only).
export {
  projects,
  projectTypeEnum,
  projectStatusEnum,
  australianStateEnum,
  projectBudgetBandEnum,
  renovationScopeEnum,
  extensionTypeEnum,
  landSizeBandEnum,
  buildSizeBandEnum,
  extensionSizeBandEnum,
  existingAgeBandEnum,
} from "./schema";
export type { ProjectRow, ProjectInsert } from "./schema";

// Public types.
export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  PublishabilityReport,
  MarketplacePreview,
  MarketplaceFilters,
} from "./types";

// Service.
export {
  create,
  update,
  publish,
  checkPublishability,
  listMine,
  getBySlugForOwner,
  getByIdForOwner,
  softDelete,
  // Marketplace
  listForMarketplace,
  getMarketplacePreview,
  getFullForUnlockedBuilder,
  listByIds,
} from "./service";

// Policies.
export {
  canCreate,
  canEdit,
  canPublish,
  canDelete,
  canRead,
} from "./policies";
export type { ActorContext } from "./policies";
