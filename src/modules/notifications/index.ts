/**
 * @module notifications
 *
 * Public surface for the notifications module. Anything outside this folder
 * MUST import from `@/modules/notifications` (this file) — never reach into
 * `./service`, `./schema`, or `./policies` directly.
 *
 * Boundary:
 *   - Service callers: dispatch layer (`@/modules/comms`) creates rows;
 *     UI reads via list / count / mark-read.
 *   - Schema is exported for `lib/db.ts` only (Drizzle needs the table
 *     handles to register them in the schema spread).
 */

export {
  create,
  createMany,
  listForUser,
  countUnread,
  markRead,
  markAllRead,
  getOwn,
} from "./service";

export {
  notifications,
  notificationKindEnum,
} from "./schema";

export type { Notification, NotificationKind, CreateNotificationInput } from "./types";

// Re-exported for the rare module that needs the raw row shape (e.g. an
// admin tool listing recent notifications across users).
export type { NotificationRow } from "./schema";

export { canRead, canMarkRead } from "./policies";
