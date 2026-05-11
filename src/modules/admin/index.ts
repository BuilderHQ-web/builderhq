/**
 * @module admin
 *
 * Public surface for the admin module. Anything outside this folder
 * MUST import from `@/modules/admin` (this file) — never reach into
 * `./service` or `./policies` directly. ESLint enforces it.
 *
 * The admin module owns the platform-operator surface: dashboards,
 * builder approval workflow, and account-status overrides. Every
 * write goes through the audit module so we have an append-only
 * trail of who-did-what-to-whom.
 */

export {
  // reads
  getAdminDashboardData,
  listBuilders,
  listUsers,
  getBuilderForAdmin,
  // writes — builder approval
  approveBuilder,
  rejectBuilder,
  suspendBuilder,
  unsuspendBuilder,
  // writes — user account status
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  // writes — account deletion (soft delete + PII scrub)
  deleteUser,
  // types
  type AdminDashboardData,
  type AdminBuilderListItem,
  type AdminUserListItem,
  type AdminBuilderDetail,
  type BuilderListFilters,
  type UserListFilters,
} from "./service";

export { canAccessAdmin } from "./policies";
