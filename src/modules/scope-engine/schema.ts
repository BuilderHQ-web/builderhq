/**
 * scope-engine · drizzle schema (migrations 0039–0043).
 *
 * The extraction run and its artefacts. See the migration headers for
 * the table-by-table story. Statuses are TEXT, service-enforced.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  jsonb,
  date,
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
    /**
     * Explicit work lease. A claimant sets it to now()+LEASE; a tick
     * that returns cleanly releases it (null), so its own next tick can
     * claim immediately. Distinct from updatedAt on purpose: staleness
     * of a display timestamp is not a lock, and treating it as one is
     * how "done" and "locked" became the same answer.
     */
    leaseUntil: timestamp("lease_until", { mode: "date", withTimezone: true }),
    /**
     * Pass one of synthesis, persisted the moment it returns. The
     * expensive call survives anything that kills the tick afterwards:
     * the next tick resumes from here instead of paying for it again.
     * Cleared when the run reaches review.
     */
    synthesisCheckpoint: jsonb("synthesis_checkpoint"),
    scopeVersion: text().notNull(),
    error: text(),
    cursor: jsonb().notNull().default({}),
    usage: jsonb().notNull().default({}),
    startedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp({ mode: "date", withTimezone: true }),
    /**
     * The synthesis's short project overview (summary prose plus the
     * countable facts it read). Shape belongs to the pipeline.
     */
    overview: jsonb(),
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
    /** The date printed in the title block — the baseline check's raw
     *  material. Read at classification; null when none is printed. */
    issueDate: date("issue_date"),
    /** The client/project name in the title block, for the
     *  cross-document entity consistency check. */
    clientName: text("client_name"),
    /** Soil reports only: the AS 2870 site classification printed in
     *  the report ("M", "H1", "P"). The tender deck shows it back to
     *  builders as a confirmation instead of a question. */
    siteClass: text("site_class"),
    /** Energy reports only: the NatHERS star rating printed on the
     *  certificate (6.2). Same confirmation treatment. */
    energyStars: real("energy_stars"),
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
    /** Display label for custom lines (itemId "custom.*") promoted
     *  from off-standard captures. NULL for Standard items. */
    label: text(),
    /** The Partial grade on evidenced lines: 'full' when a builder
     *  can price without assumption, 'partial' when the work is shown
     *  but incompletely specified. NULL on gaps and not_expected. */
    depth: text(),
    /** What is still needed, when depth is 'partial'. */
    remaining: text(),
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
  /** 'model' (synthesis judgement) or 'baseline' (the deterministic
   *  date/entity cross-examination). */
  source: text().notNull().default("model"),
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

/**
 * Off-standard captures — work the model saw that no Standard item
 * names. The end of the silent drop: each carries a proposed label,
 * suggested division, citations and note. Ops promotes a capture into
 * the selection as a project-scoped custom line, or dismisses it.
 * Recurring captures are the Standard's growth votes.
 */
export const scopeRunCaptures = pgTable(
  "scope_run_captures",
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid()
      .notNull()
      .references(() => scopeRuns.id, { onDelete: "cascade" }),
    label: text().notNull(),
    divisionId: text("division_id"),
    citations: jsonb().notNull().default([]),
    note: text(),
    confidence: real(),
    /** pending → promoted | dismissed */
    opsStatus: text().notNull().default("pending"),
    /** The custom item id this capture became, when promoted. */
    promotedItemId: text("promoted_item_id"),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scope_run_captures_run_idx").on(t.runId)],
);

export type ScopeRunCaptureRow = typeof scopeRunCaptures.$inferSelect;

/**
 * The living vocabulary — items the platform LEARNS from real
 * packages. status 'extension' = in the list, evidenced when shown,
 * never a gap. status 'core' = joins the expected pool for the types
 * in appliesTo. Keys ("ext.<division>.<slug>") are permanent.
 */
export const scopeVocabExtensions = pgTable(
  "scope_vocab_extensions",
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text().notNull().unique(),
    divisionId: text("division_id").notNull(),
    label: text().notNull(),
    plain: text(),
    aliases: jsonb().notNull().default([]),
    /** extension | core | retired */
    status: text().notNull().default("extension"),
    /** Project types a CORE extension is expected on. */
    appliesTo: jsonb("applies_to").notNull().default([]),
    sourceCaptureId: uuid("source_capture_id"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scope_vocab_extensions_status_idx").on(t.status)],
);

export type ScopeVocabExtensionRow = typeof scopeVocabExtensions.$inferSelect;

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
