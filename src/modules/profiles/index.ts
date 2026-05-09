/**
 * @module profiles
 *
 * Public surface. Outsiders MUST import from `@/modules/profiles` —
 * never reach into `./schema`, `./service`, or `./policies` directly.
 *
 * Schema tables are re-exported because lib/db.ts and upcoming modules
 * (projects, admin) need them at startup. They're public for setup
 * purposes; you still should never write a Drizzle query against them
 * from outside this module — call service functions instead.
 */

export {
  // Tables
  projectOwnerProfiles,
  builderProfiles,
  builderLicences,
  builderServiceAreas,
  builderProjectCategories,
  // Enums (consumed by other modules — projects uses projectTypeEnum)
  australianStateEnum,
  projectTypeEnum,
  ownerEntityTypeEnum,
  contactPrefEnum,
  builderApprovalStatusEnum,
  licenceVerificationStatusEnum,
} from "./schema";

export type {
  ProjectOwnerProfile,
  NewProjectOwnerProfile,
  BuilderProfile,
  NewBuilderProfile,
  BuilderLicence,
  NewBuilderLicence,
  BuilderServiceArea,
  NewBuilderServiceArea,
  BuilderProjectCategory,
} from "./schema";

// Service functions
export {
  // Owner
  getOwnerProfile,
  getOwnerContactPublic,
  upsertOwnerProfile,
  completeOwnerOnboarding,
  // Builder
  getBuilderProfile,
  upsertBuilderProfile,
  addBuilderLicence,
  removeBuilderLicence,
  setBuilderServiceAreas,
  setBuilderProjectCategories,
  setBuilderLogo,
  clearBuilderLogo,
  submitBuilderForApproval,
  // Cross-cutting
  hasCompletedOnboarding,
  // Zod schemas (consumed by server actions)
  ownerProfileSchema,
  builderProfileSchema,
  builderLicenceSchema,
  setServiceAreasSchema,
  setProjectCategoriesSchema,
  type OwnerProfileInput,
  type BuilderProfileInput,
  type BuilderLicenceInput,
  type BuilderProfileBundle,
  type OwnerContact,
} from "./service";

// Policies
export { canEditProfile, canViewBuilderProfile } from "./policies";
