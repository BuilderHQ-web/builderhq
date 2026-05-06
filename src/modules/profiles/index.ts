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
