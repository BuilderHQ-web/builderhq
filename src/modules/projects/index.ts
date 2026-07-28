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
  PrivateRoundStub,
} from "./types";

// Pricing — single source of truth for per-type unlock cost (AUD).
// Lives in ./pricing.ts (client-safe; no DB/server imports), re-
// exported here for convenience. Client components are still expected
// to import from `@/modules/projects/pricing` to avoid pulling the
// service module into client bundles.
export { UNLOCK_PRICE_AUD, unlockPriceFor, humanProjectTypeLabel } from "./pricing";

// Service.
export {
  create,
  update,
  publish,
  checkPublishability,
  validateSaveReadiness,
  listMine,
  getBySlugForOwner,
  getByIdForOwner,
  softDelete,
  // Marketplace
  listForMarketplace,
  listPrivateRoundStubs,
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
