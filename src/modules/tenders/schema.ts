/**
 * tenders · drizzle schema.
 *
 * Two tables:
 *
 *   tenders             — one row per (builder × project) tender.
 *                          Builders create a draft, autosave, and
 *                          submit. After submit, locked for edits;
 *                          builder can withdraw and start a new
 *                          tender. Owner-side state machine drives
 *                          shortlist / award / reject.
 *
 *   tender_cost_lines   — optional per-trade price breakdown. Each
 *                          row is one trade's amount in AUD whole
 *                          dollars. The 28-line standard AU/HIA-style
 *                          BoQ structure plus one "other" slot.
 *
 * Documents attached to a tender (BoQ PDF, insurance certs, past
 * projects, etc.) live in the existing `documents` table — we extend
 * it with an optional `tender_id` FK so the same upload + presign +
 * stat flow handles both project docs and tender docs.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";

// ── enums ────────────────────────────────────────────────────────────────

/**
 * Lifecycle of a tender. Strict transitions enforced by the service:
 *
 *   draft       — builder is filling it out (visible to builder only)
 *   submitted   — builder has finalised; visible to project owner
 *   withdrawn   — builder pulled it back (terminal, tender row stays
 *                 for audit but is hidden from owner)
 *   shortlisted — owner has marked it as a contender
 *   awarded     — owner has picked this tender to move forward with
 *   rejected    — owner has declined (terminal for this row)
 */
export const tenderStatusEnum = pgEnum("tender_status", [
  "draft",
  "submitted",
  "withdrawn",
  "shortlisted",
  "awarded",
  "rejected",
]);

/**
 * 28 standard trade categories used for residential BoQ + "other" for
 * builder-named extras (e.g. "Builder's margin", "Contingency").
 * Order here is the order the form renders trades in.
 */
export const tradeEnum = pgEnum("trade_category", [
  "preliminaries",
  "demolition",
  "ground_works",
  "concrete_work",
  "precast_concrete",
  "brickwork_and_blockwork",
  "stonework",
  "structural_steelwork",
  "metalwork",
  "carpentry",
  "joinery",
  "windows_and_curtain_wall",
  "doors",
  "roofing",
  "partitions_and_ceilings",
  "tiling",
  "internal_finishes",
  "external_finishes",
  "glazing",
  "painting",
  "special_provisions",
  "fixtures_and_fittings",
  "hydraulic_services",
  "mechanical_services",
  "electrical_services",
  "fire_protection_services",
  "external_works",
  "other",
]);

// ── tenders ──────────────────────────────────────────────────────────────

export const tenders = pgTable(
  "tenders",
  {
    id: uuid().primaryKey().defaultRandom(),

    builderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    status: tenderStatusEnum().notNull().default("draft"),

    // ── headline numbers ─────────────────────────────────────────────
    /** Total tender price in whole AUD (GST inclusive). */
    totalPriceAud: integer(),
    /** Construction duration in weeks. */
    durationWeeks: integer(),
    /** Tender validity period from submitted_at, in days. */
    validityDays: integer(),
    /** Proposed construction start month, e.g. "2026-08". */
    proposedStartMonth: text(),

    // ── scope ────────────────────────────────────────────────────────
    /** What the owner has to handle separately. JSON string array. */
    exclusions: text().array(),
    /** Caveats / contractual conditions, freeform. */
    conditions: text(),

    // ── pitch ────────────────────────────────────────────────────────
    /** Builder's pitch to the owner — markdown freeform. */
    pitch: text(),

    // ── lifecycle timestamps ─────────────────────────────────────────
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp({ mode: "date", withTimezone: true }),
    withdrawnAt: timestamp({ mode: "date", withTimezone: true }),
    decidedAt: timestamp({ mode: "date", withTimezone: true }),
    deletedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [
    // A builder may have at most one *active* (non-withdrawn, non-
    // deleted) tender per project. Enforced in the service layer
    // because Postgres unique indexes can't filter on enum values.
    index("tenders_builder_project_idx").on(t.builderId, t.projectId),
    // Owner-side: list submitted tenders for a project, newest first.
    index("tenders_project_status_idx").on(t.projectId, t.status),
    // Builder-side: list my tenders.
    index("tenders_builder_status_idx").on(t.builderId, t.status),
  ],
);

// ── tender_cost_lines ────────────────────────────────────────────────────

export const tenderCostLines = pgTable(
  "tender_cost_lines",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenderId: uuid()
      .notNull()
      .references(() => tenders.id, { onDelete: "cascade" }),

    trade: tradeEnum().notNull(),
    /** Custom label — only set when trade = "other". */
    label: text(),
    /** Whole AUD dollars. */
    amountAud: integer().notNull(),

    /** Stable sort order so the form renders predictably. */
    sortOrder: integer().notNull().default(0),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One row per (tender, trade) for the 28 fixed trades. "other"
    // can have multiple rows (each with its own label), so we don't
    // unique-constrain the pair — the service enforces "single row
    // per fixed trade, multiple allowed for 'other'".
    index("tender_cost_lines_tender_idx").on(t.tenderId, t.sortOrder),
  ],
);

export type TenderRow = typeof tenders.$inferSelect;
export type TenderInsert = typeof tenders.$inferInsert;
export type TenderCostLineRow = typeof tenderCostLines.$inferSelect;
export type TenderCostLineInsert = typeof tenderCostLines.$inferInsert;
