/**
 * messaging · drizzle schema.
 *
 * Two tables:
 *
 *   conversations  — one per (project × builder) pair. Owner participant
 *                    is denormalised onto the row for cheap inbox queries
 *                    (we'd otherwise need a join through `projects` for
 *                    every list). Read-tracking columns are per-side so
 *                    each participant has their own unread state.
 *
 *   messages       — append-only, ordered by created_at. `kind` separates
 *                    user-typed text from auto-posted system events
 *                    ("Builder unlocked the project", "Tender submitted").
 *                    senderId is nullable because system messages aren't
 *                    authored by anyone.
 *
 * Conversations are auto-created the moment a builder unlocks a project —
 * see service.getOrCreateConversation. This is also why the unique index
 * covers (projectId, builderId): we can upsert idempotently from the
 * unlock service without a pre-check round-trip.
 *
 * Messages are NEVER hard-deleted from this schema; if user-side delete
 * lands later, it'll be a soft-delete column added via migration.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { tenders } from "@/modules/tenders/schema";

/**
 * Two flavours of message:
 *
 *   user   — typed by either participant
 *   system — auto-posted by the platform on a notable event (unlock,
 *            tender submit, etc.). Rendered differently by the UI —
 *            centered pill chips rather than bubbles.
 */
export const messageKindEnum = pgEnum("message_kind", ["user", "system"]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),

    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** The builder participant. */
    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Owner participant — denormalised from project.ownerId for cheap
     *  inbox queries (we'd otherwise join projects on every list). */
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Updated on every message append. Drives inbox sort. */
    lastMessageAt: timestamp({ mode: "date", withTimezone: true }),
    /** Last few words of the most recent message — for inbox preview
     *  without a per-row subquery. Trimmed at write time. */
    lastMessagePreview: text(),

    /** Per-side read pointers. Anything authored after these is unread
     *  for that side. Null = the side has never opened the conversation. */
    builderLastReadAt: timestamp({ mode: "date", withTimezone: true }),
    ownerLastReadAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Idempotent upsert key — at most one conversation per (project, builder).
    uniqueIndex("conversations_project_builder_unique").on(
      t.projectId,
      t.builderId,
    ),
    // Builder inbox: list builder's conversations, newest activity first.
    index("conversations_builder_last_idx").on(t.builderId, t.lastMessageAt),
    // Owner inbox: same, for the owner.
    index("conversations_owner_last_idx").on(t.ownerId, t.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),

    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    /** Null for system messages. */
    senderId: uuid().references(() => users.id, { onDelete: "set null" }),

    kind: messageKindEnum().notNull().default("user"),

    /** Plaintext for user messages; short labels for system events
     *  (the UI may key off `kind` to render differently). */
    body: text().notNull(),

    /** Optional pointer to a related tender — used when a system
     *  message references one ("Builder submitted a tender — open"). */
    tenderId: uuid().references(() => tenders.id, { onDelete: "set null" }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set when the user edits — reserved for a future "edited" affordance. */
    editedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [
    // Thread load: messages for a conversation, oldest first.
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
  ],
);

export type ConversationRow = typeof conversations.$inferSelect;
export type ConversationInsert = typeof conversations.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;
