/**
 * notifications · public types.
 *
 * Types used by both the service layer and any consumer (UI, jobs,
 * other modules). DB row types live in schema.ts; this file is for
 * derived / domain types.
 */

import type { NotificationRow } from "./schema";

export type NotificationKind = NotificationRow["kind"];
export type Notification = NotificationRow;

/** Input shape for creating a single notification. */
export interface CreateNotificationInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  projectId?: string | null;
  tenderId?: string | null;
}
