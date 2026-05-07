/**
 * projects · drizzle schema.
 *
 * The `projects` table is the canonical record of every residential
 * build uploaded by a project owner. It carries:
 *
 *   - identity (title, slug, type, status)
 *   - location (address + postcode/suburb/state — Australian-only)
 *   - common build details (bed/bath/floors/sizes)
 *   - per-type details (multi-dwelling count, renovation scope,
 *     extension type/size). Type-specific columns are nullable; the
 *     service layer enforces which ones are required for which type.
 *   - budget + timeline (band + month strings, since owners don't
 *     know exact dates yet)
 *   - lifecycle timestamps (publishedAt, tenderClosesAt)
 *
 * Architectural-plan rule:
 *   To go from draft → published, the project must have at least one
 *   active document with category="architectural". Enforced in the
 *   service layer (modules/projects/service.ts → publish()).
 *
 * Slug:
 *   Auto-built from the title plus a 4-char id suffix to dodge
 *   collisions ("niddrie-townhouse-a3f4"). Stored unique.
 *
 * Soft delete via deletedAt.
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

// ── enums ────────────────────────────────────────────────────────────────

/** What the owner is building. Drives the smart-field set in the form. */
export const projectTypeEnum = pgEnum("project_type", [
  "single_dwelling",
  "multi_dwelling",
  "renovation",
  "extension",
]);

/** Lifecycle: draft → published → tendering (builders unlock) →
 *  awarded (owner picked a builder) → archived. */
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "published",
  "tendering",
  "awarded",
  "archived",
]);

/** AU states — duplicated from postcodes.ts so the DB has a real enum. */
export const australianStateEnum = pgEnum("australian_state", [
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
]);

/**
 * Budget bands for typical AU residential build costs. Banded (not
 * exact) so owners aren't forced to commit to a number before tenders
 * come back.
 */
export const projectBudgetBandEnum = pgEnum("project_budget_band", [
  "under_500k",
  "500k_1m",
  "1m_1_5m",
  "1_5m_2m",
  "2m_3m",
  "3m_5m",
  "over_5m",
]);

/** Renovation scope — only relevant when type = "renovation". */
export const renovationScopeEnum = pgEnum("renovation_scope", [
  "kitchen",
  "bathroom",
  "kitchen_and_bathroom",
  "full_internal",
  "full_internal_and_external",
  "structural",
]);

/** Extension type — only relevant when type = "extension". */
export const extensionTypeEnum = pgEnum("extension_type", [
  "ground_floor",
  "first_floor",
  "ground_and_first",
  "rear",
  "side",
]);

/** Land-size bands (m²). Bands instead of exact figures so the form
 *  stays a couple of clicks. */
export const landSizeBandEnum = pgEnum("land_size_band", [
  "under_200",
  "200_400",
  "400_600",
  "600_800",
  "800_1000",
  "over_1000",
]);

/** Build-size bands (m²). */
export const buildSizeBandEnum = pgEnum("build_size_band", [
  "under_100",
  "100_150",
  "150_200",
  "200_250",
  "250_300",
  "300_400",
  "over_400",
]);

/** Extension-size bands (m²). */
export const extensionSizeBandEnum = pgEnum("extension_size_band", [
  "under_20",
  "20_40",
  "40_60",
  "60_80",
  "80_100",
  "over_100",
]);

/** Age bands for renovation projects (years since built). */
export const existingAgeBandEnum = pgEnum("existing_age_band", [
  "under_10",
  "10_25",
  "25_50",
  "50_75",
  "over_75",
]);

// ── table ────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),

    // Ownership.
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Identity.
    title: text().notNull(),
    slug: text().notNull(),
    type: projectTypeEnum().notNull(),
    status: projectStatusEnum().notNull().default("draft"),

    // Address — kept in fragments so we can map/filter cleanly.
    addressLine1: text(),
    suburb: text(),
    state: australianStateEnum(),
    postcode: text(),

    // Common build details (single + multi + extension).
    bedrooms: integer(),
    bathrooms: integer(),
    floors: integer(),
    landSizeBand: landSizeBandEnum(),
    buildSizeBand: buildSizeBandEnum(),

    // Multi-dwelling specific.
    dwellingCount: integer(),

    // Renovation specific.
    renovationScope: renovationScopeEnum(),
    existingAgeBand: existingAgeBandEnum(),

    // Extension specific.
    extensionType: extensionTypeEnum(),
    extensionSizeBand: extensionSizeBandEnum(),

    // Budget + timeline.
    budgetBand: projectBudgetBandEnum(),
    /** ISO month strings, e.g. "2026-08". Owners pick a month, not a date. */
    targetStartMonth: text(),
    targetCompletionMonth: text(),

    // Free-form scope description.
    description: text(),

    // Lifecycle.
    publishedAt: timestamp({ mode: "date", withTimezone: true }),
    tenderClosesAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("projects_slug_idx").on(t.slug),
    index("projects_owner_idx").on(t.ownerId, t.createdAt),
    index("projects_suburb_status_idx").on(t.suburb, t.status),
    index("projects_state_status_idx").on(t.state, t.status),
    index("projects_type_status_idx").on(t.type, t.status),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
