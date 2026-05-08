/**
 * notifications · drizzle schema.
 *
 * One table — `notifications`. A row is a single in-app notification
 * delivered to one user. Email delivery is parallel and stateless
 * (the email module logs sends to its own audit table later) — this
 * table is purely about the in-app feed (bell + dropdown).
 *
 * Subject FKs (`projectId`, `tenderId`) are nullable because not every
 * notification kind targets both. They cascade-delete with the
 * subject so we don't end up with dangling pointers if a project or
 * tender is removed.
 *
 * The `read_at` timestamp is null until the user marks it read; we
 * filter on this for the unread counter and the "unread first" sort
 * in the dropdown.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { tenders } from "@/modules/tenders/schema";

/**
 * The fixed set of in-app event kinds. Email subject lines / template
 * picks key off this. Add a new kind here, add a template + dispatch
 * branch in the service, and migrate the enum.
 */
export const notificationKindEnum = pgEnum("notification_kind", [
  // Tender state transitions (the comms loop's bread-and-butter)
  "tender_submitted", // → owner
  "tender_withdrawn", // → owner
  "tender_shortlisted", // → builder
  "tender_awarded", // → builder
  "tender_rejected", // → builder
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Recipient. */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    kind: notificationKindEnum().notNull(),

    /** Subject pointers. Both nullable — only set if the kind targets them. */
    projectId: uuid().references(() => projects.id, { onDelete: "cascade" }),
    tenderId: uuid().references(() => tenders.id, { onDelete: "cascade" }),

    /** Short headline shown in the bell dropdown. */
    title: text().notNull(),
    /** One-line description rendered under the title. Optional. */
    body: text(),
    /** Where clicking the notification should take the user. */
    actionUrl: text(),

    /** Null until the user marks it read. */
    readAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Feed: user's recent notifications, newest first.
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
    // Unread count: where userId = ? and read_at IS NULL.
    index("notifications_user_read_idx").on(t.userId, t.readAt),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;
