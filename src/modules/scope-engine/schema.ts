/**
 * scope-engine · drizzle schema (migration 0039).
 *
 * The extraction run and its artefacts. See the migration header for
 * the table-by-table story. Statuses are TEXT, service-enforced.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects";
import { documents } from "@/modules/documents";

export const scopeRuns = pgTable(
  "scope_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text().notNull().default("pending"),
    scopeVersion: text().notNull(),
    error: text(),
    cursor: jsonb().notNull().default({}),
    usage: jsonb().notNull().default({}),
    startedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp({ mode: "date", withTimezone: true }),
    /**
     * When this approved run BECAME the round's schedule — at publish
     * acceptance, or when its addendum issued. A re-read approved by
     * ops stays invisible to builders until the runner issues it.
     */
    effectiveAt: timestamp({ mode: "date", withTimezone: true }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scope_runs_project_idx").on(t.projectId, t.createdAt)],
);

export const scopeRunDocuments = pgTable(
  "scope_run_documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid()
      .notNull()
      .references(() => scopeRuns.id, { onDelete: "cascade" }),
    documentId: uuid()
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    status: text().notNull().default("pending"),
    kind: text(),
    revision: text(),
    docTitle: text("doc_title"),
    pageCount: integer(),
    findings: jsonb(),
    error: text(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("scope_run_documents_run_doc_idx").on(t.runId, t.documentId),
  ],
);

export const scopeRunItems = pgTable(
  "scope_run_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid()
      .notNull()
      .references(() => scopeRuns.id, { onDelete: "cascade" }),
    itemId: text().notNull(),
    status: text().notNull(),
    citations: jsonb().notNull().default([]),
    note: text(),
    figures: jsonb().notNull().default([]),
    confidence: real(),
    opsStatus: text().notNull().default("pending"),
    opsNote: text(),
    editedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    editedAt: timestamp({ mode: "date", withTimezone: true }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("scope_run_items_run_item_idx").on(t.runId, t.itemId)],
);

export const scopeRunConflicts = pgTable("scope_run_conflicts", {
  id: uuid().primaryKey().defaultRandom(),
  runId: uuid()
    .notNull()
    .references(() => scopeRuns.id, { onDelete: "cascade" }),
  summary: text().notNull(),
  citations: jsonb().notNull().default([]),
  severity: text().notNull().default("attention"),
  opsStatus: text().notNull().default("pending"),
  opsNote: text(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scopeReviewEvents = pgTable(
  "scope_review_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid()
      .notNull()
      .references(() => scopeRuns.id, { onDelete: "cascade" }),
    subject: text().notNull(),
    action: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scope_review_events_run_idx").on(t.runId, t.createdAt)],
);

export const scopeGapResolutions = pgTable(
  "scope_gap_resolutions",
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid()
      .notNull()
      .references(() => scopeRuns.id, { onDelete: "cascade" }),
    itemId: text().notNull(),
    resolution: text().notNull(),
    amountAud: integer(),
    note: text(),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("scope_gap_resolutions_run_item_idx").on(t.runId, t.itemId),
  ],
);

export type ScopeGapResolutionRow = typeof scopeGapResolutions.$inferSelect;

export type ScopeRunRow = typeof scopeRuns.$inferSelect;
export type ScopeRunDocumentRow = typeof scopeRunDocuments.$inferSelect;
export type ScopeRunItemRow = typeof scopeRunItems.$inferSelect;
export type ScopeRunConflictRow = typeof scopeRunConflicts.$inferSelect;
export type ScopeReviewEventRow = typeof scopeReviewEvents.$inferSelect;

/**
 * The addendum register — every formal re-issue of a live round's
 * pack, numbered per project. The diff is denormalised at issue time
 * so the record reads forever, independent of later runs.
 */
export const scopeAddenda = pgTable(
  "scope_addenda",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    runId: uuid()
      .notNull()
      .unique()
      .references(() => scopeRuns.id, { onDelete: "cascade" }),
    prevRunId: uuid().references(() => scopeRuns.id, {
      onDelete: "set null",
    }),
    number: integer().notNull(),
    diff: jsonb().notNull().default({}),
    note: text(),
    issuedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    issuedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scope_addenda_project_idx").on(t.projectId, t.number),
    uniqueIndex("scope_addenda_project_number_idx").on(t.projectId, t.number),
  ],
);

export type ScopeAddendumRow = typeof scopeAddenda.$inferSelect;
