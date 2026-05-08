/**
 * documents · drizzle schema.
 *
 * Owned by this module. The `documents` table records every file
 * uploaded to a project workspace — drawings, specs, scope, etc.
 *
 * Storage model:
 *   - The bytes live in R2 at a key built by buildObjectKey() in
 *     ./storage.ts (`projects/{projectId}/{documentId}/v{version}/{filename}`).
 *   - This table records *metadata* + the storage key. We never store
 *     the URL itself; URLs are signed on demand and short-lived.
 *
 * Versioning:
 *   - Each upload creates a new row. `parent_id` points to the
 *     previous version of the same logical doc. The most recent row
 *     for a chain is the "latest" version.
 *   - Old versions stay in R2 until an admin chooses to prune.
 *
 * Project FK:
 *   - `project_id` is an unconstrained uuid for now. A real foreign
 *     key to projects.id will be added when modules/projects ships
 *     its schema (Phase 2 step 3, project upload wizard).
 *
 * Soft delete:
 *   - `deleted_at` set to a timestamp marks a row as removed without
 *     destroying the audit trail. Service-layer queries filter on it.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { tenders } from "@/modules/tenders/schema";

// ── enums ────────────────────────────────────────────────────────────────

/**
 * Lifecycle of a single document upload.
 *
 *   pending  — DB row created, R2 PUT not yet observed
 *   active   — R2 stat confirmed, byte size matches
 *   failed   — upload abandoned or rejected (cleanup pending)
 */
export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "active",
  "failed",
]);

/**
 * Category tags for documents. Aligned to the doc set Australian
 * residential builds typically generate. Used by the publish-gate on
 * projects: a project can't go from draft → published unless it has
 * at least one active "architectural" document.
 *
 * Order here is the order the wizard renders the tiles in.
 */
export const documentCategoryEnum = pgEnum("document_category", [
  "architectural",          // mandatory
  "structural_engineering",
  "civil_engineering",
  "specifications",
  "land_report",
  "soil_report",
  "energy_rating",
  "town_planning",
  "other",
]);

// ── table ────────────────────────────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),

    // Ownership.
    ownerId: uuid()
      .references(() => users.id, { onDelete: "set null" }),

    // The project this document belongs to. FK to projects.id, set
    // null on project deletion so audit trail isn't destroyed (the
    // doc row stays around for moderation).
    projectId: uuid()
      .references(() => projects.id, { onDelete: "set null" }),

    // The tender this document is attached to (optional). Tender docs
    // (BoQ PDFs, insurance certs, past projects, etc.) reuse the same
    // upload pipeline but are scoped to a single tender. When set,
    // project_id should also be set (the project this tender belongs
    // to) for owner-side visibility queries.
    tenderId: uuid()
      .references(() => tenders.id, { onDelete: "set null" }),

    // What kind of document this is. Drives the architectural-plan
    // publish-gate on projects (see projects.service → publish()).
    category: documentCategoryEnum().notNull().default("other"),

    // R2 storage key (immutable once written).
    objectKey: text().notNull(),

    // File metadata captured at upload-complete time. `sizeBytes` is
    // checked against R2's actual report to defend against lying
    // clients (see service.ts → completeUpload).
    filename: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    sha256: text(),

    // Versioning. v1 is the first upload of a logical document;
    // subsequent uploads bump version and set parentId to the prior
    // row's id. parentId is null for v1.
    version: integer().notNull().default(1),
    parentId: uuid(),

    status: documentStatusEnum().notNull().default("pending"),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [
    // Hot-path: list all docs for a project, newest first.
    index("documents_project_idx").on(t.projectId, t.createdAt),
    // Per-owner browse, used by /owner dashboard.
    index("documents_owner_idx").on(t.ownerId, t.createdAt),
    // Walking a version chain.
    index("documents_parent_idx").on(t.parentId),
    // Looking up a row by storage key during stat-confirm.
    index("documents_object_key_idx").on(t.objectKey),
    // Listing tender-attached docs.
    index("documents_tender_idx").on(t.tenderId, t.createdAt),
  ],
);

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
