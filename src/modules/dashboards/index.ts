/**
 * @module dashboards
 *
 * Public surface — server-only roll-ups for the owner / builder
 * dashboards. Pages call these directly to assemble everything they
 * need in one go.
 */

export {
  getOwnerDashboardData,
  type OwnerDashboardData,
  type ActivityEvent as OwnerActivityEvent,
  type PulseRecommendation,
} from "./owner";

export {
  getBuilderDashboardData,
  type BuilderDashboardData,
  type BuilderActionNeeded,
  type BuilderActivityEvent,
  type TenderStatus,
} from "./builder";

export {
  getArchitectDashboardData,
  type ArchitectDashboardData,
} from "./architect";
