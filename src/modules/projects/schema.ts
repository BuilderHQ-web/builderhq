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
  boolean,
  integer,
  jsonb,
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

/** Extension-size bands (m²). 50 m² intervals to 300, then a 300+ catch-all
 *  — wide enough for major additions (basement + extension + studio). */
export const extensionSizeBandEnum = pgEnum("extension_size_band", [
  "under_50",
  "50_100",
  "100_150",
  "150_200",
  "200_250",
  "250_300",
  "over_300",
]);

/** Age bands for renovation projects (years since built). */
export const existingAgeBandEnum = pgEnum("existing_age_band", [
  "under_10",
  "10_25",
  "25_50",
  "50_75",
  "over_75",
]);

/**
 * How the tender round is run. Invitations exist on EVERY round — the
 * mode only decides marketplace visibility.
 *   open    — discoverable in the marketplace (2-5 network spots), and
 *             the runner can still invite builders they trust.
 *   private — the marketplace shows only an anonymous stub (type +
 *             locality); the invite list IS the round, and one invited
 *             builder is a valid round.
 *   hybrid  — RETIRED (2026-07). Kept in the enum for legacy rows,
 *             which read and behave as open everywhere.
 */
export const tenderModeEnum = pgEnum("tender_mode", [
  "open",
  "private",
  "hybrid",
]);

/**
 * Homeowner (client) participation on an architect-run project. The
 * architect is the project's runner (ownerId); the client joins by
 * invite, at whatever stage the architect chooses, and sees the full
 * project from the moment they accept.
 */
export const participantStatusEnum = pgEnum("participant_status", [
  "invited",
  "joined",
  "revoked",
]);

/**
 * What a participant's seat lets them do. Two roles, deliberately few:
 *   viewer  — sees the project and the evaluation (worn as "Following")
 *   decider — a viewer who can also shortlist, decline and award
 *             (worn as "Deciding")
 * Neither role edits the project or manages the round — that stays
 * with the runner (ownerId). Code keeps the cold names; the UI wears
 * the warm labels.
 */
export const participantRoleEnum = pgEnum("participant_role", [
  "viewer",
  "decider",
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
    /**
     * Legacy single-value scope. Kept for backwards compatibility
     * with reports + the marketplace filter; new writes also
     * populate `renovationScopeTags` (the source of truth for
     * multi-select). Derived from the highest-priority tag in the
     * array on every write.
     */
    renovationScope: renovationScopeEnum(),
    /**
     * Multi-select renovation scope. Owners commonly want more than
     * one scope (e.g. kitchen + bathroom + structural). Array of
     * the same enum-string values used by `renovationScope`.
     * Default `{}` (empty array) on non-renovation projects.
     *
     * Typed via the renovation_scope enum so Drizzle infers
     * `("kitchen" | "bathroom" | …)[]` rather than `string[]`.
     */
    renovationScopeTags: renovationScopeEnum("renovation_scope_tags")
      .array()
      .notNull()
      .default([]),
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
    /** Set when the runner submits for preparation under the scope
     *  publish gate. Status stays 'draft' until the owner completes
     *  their review and the real publish flips it. */
    publishRequestedAt: timestamp({ mode: "date", withTimezone: true }),
    publishedAt: timestamp({ mode: "date", withTimezone: true }),
    tenderClosesAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp({ mode: "date", withTimezone: true }),

    /**
     * Audit trail back to Bubble for migrated projects. NULL for
     * projects created natively via /owner/projects/new. Used by the
     * 2026 migration scripts as the idempotency key (re-running phase 3
     * skips projects already imported).
     */
    legacyBubbleId: text("legacy_bubble_id"),
    legacySource: text("legacy_source"),

    /**
     * Ads-funnel projects: the owner started the project before
     * verifying their email. The wizard runs to completion but the
     * project is held back from the marketplace until the magic link
     * in their inbox is clicked. Flips to FALSE on /auth/magic
     * redemption, which is the same transaction that sets
     * `publishedAt`. Default FALSE — projects created via the regular
     * authenticated `/owner/projects/new` path skip this gate entirely.
     */
    awaitingOwnerVerification: boolean("awaiting_owner_verification")
      .notNull()
      .default(false),

    /**
     * Acquisition source for the project. NULL = legacy / created
     * before tracking. New values: "ads_funnel" (came through the
     * /start landing), "owner_app" (dashboard), "migration" (Bubble
     * import). Drives campaign attribution + GC behaviour (only
     * ads_funnel drafts get the 30-day prune).
     */
    acquisitionSource: text("acquisition_source"),

    // ── tender round settings ──────────────────────────────────────────
    /** How this tender round is run. Existing projects stay "open". */
    tenderMode: tenderModeEnum("tender_mode").notNull().default("open"),
    /**
     * Builder spots for this round (2–5, validated at the service
     * layer). NULL = platform default (UNLOCK_CAP, 3) — the pattern
     * unlocks/constants.ts documents. The unlock cap transaction reads
     * this per project.
     */
    tenderSpots: integer("tender_spots"),
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

// ── project_participants ─────────────────────────────────────────────────

/**
 * The homeowner's seat at an architect-run project. One row per invited
 * client. The architect can invite before upload, mid-tender, or after
 * quotes land; on acceptance the client's userId is attached (existing
 * account or one created on redemption) and they see the whole file.
 */
export const projectParticipants = pgTable(
  "project_participants",
  {
    id: uuid().primaryKey().defaultRandom(),

    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    /** Who sent the invite (the project runner). */
    invitedBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Invitee identity as entered by the architect. */
    email: text().notNull(),
    name: text(),

    /** Set when the invite is redeemed by a signed-in account. */
    userId: uuid().references(() => users.id, { onDelete: "set null" }),

    status: participantStatusEnum().notNull().default("invited"),

    /** What the seat lets them do — see `participantRoleEnum`. */
    role: participantRoleEnum().notNull().default("viewer"),

    /** Single-use redemption token carried by the invite link. */
    inviteToken: text("invite_token").notNull(),

    invitedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    joinedAt: timestamp({ mode: "date", withTimezone: true }),
    revokedAt: timestamp({ mode: "date", withTimezone: true }),
    /** When the one nudge for a pending invitation went out — the
     *  daily cron sends exactly one per invitation. Reset on resend
     *  (a fresh link earns a fresh nudge window). */
    remindedAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("project_participants_token_idx").on(t.inviteToken),
    index("project_participants_project_idx").on(t.projectId, t.status),
    index("project_participants_user_idx").on(t.userId),
  ],
);

export type ProjectParticipantRow = typeof projectParticipants.$inferSelect;

// ── project_audit_events ─────────────────────────────────────────────────

/**
 * The round's durable record: who did what, written at the service
 * layer the moment it happens. Exists because seats act — when a
 * decider awards a tender, "who awarded this?" must have an answer
 * that outlives sessions and notifications.
 *
 * `kind` is a dotted verb ('tender.awarded', 'seat.invited',
 * 'invite.joined') kept as TEXT — audit vocabularies grow too fast to
 * migrate an enum for every new verb. `summary` is the human line,
 * composed at write time so the feed never needs joins to read.
 * `actorId` NULL means the platform itself (cron, system transition).
 */
export const projectAuditEvents = pgTable(
  "project_audit_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    kind: text().notNull(),
    subjectId: uuid(),
    summary: text().notNull(),
    meta: jsonb().notNull().default({}),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("project_audit_events_project_idx").on(t.projectId, t.createdAt)],
);

export type ProjectAuditEventRow = typeof projectAuditEvents.$inferSelect;
