/**
 * @module audit
 *
 * Public surface for the audit module. Anything outside this folder
 * MUST import from `@/modules/audit` (this file) — never reach into
 * `./service`, `./schema`, or `./policies` directly.
 */

export {
  adminActions,
  adminActionKindEnum,
  type AdminActionRow,
  type AdminActionInsert,
  type AdminActionKind,
} from "./schema";

export {
  logAdminAction,
  listRecentAdminActions,
  listAdminActionsForSubject,
  type LogAdminActionInput,
} from "./service";
