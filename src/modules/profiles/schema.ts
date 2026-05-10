/**
 * profiles · drizzle schema.
 *
 * Owns the per-role profile rows (project_owner_profiles, builder_profiles)
 * plus builder-only sub-tables (licences, service areas, project categories).
 *
 * Design notes:
 *
 *   - Profile rows are created lazily — on first onboarding-step save, not
 *     at signup. The presence of a row indicates "onboarded at least once".
 *     `onboarding_completed_at` is the gate for full app access.
 *
 *   - Several enums (project_type, australian_state) are owned by this
 *     module because they're consumed across more than one table inside
 *     here AND by the projects module later. Defining them once here keeps
 *     the type contract single-sourced; the projects module will import.
 *
 *   - Builder-licence verification, service-area matching, and the
 *     score-breakdown JSON shape are documented inline per table. We
 *     deliberately use jsonb for score_breakdown instead of 13 nullable
 *     int columns — querying individual sub-scores is rare and the
 *     breakdown changes as the scoring algorithm evolves.
 *
 *   - All FKs onto users.id cascade-delete: removing a user removes their
 *     entire profile graph. PII redaction at GDPR/Privacy-Act request time
 *     uses a `redact_user(id)` SQL helper landed with the audit module.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/users";

// ── shared enums ─────────────────────────────────────────────────────────

export const australianStateEnum = pgEnum("australian_state", [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

/**
 * Four canonical residential project types. Drives:
 *   - project upload form (which fields show)
 *   - builder.project_categories (which they take on)
 *   - browse filters
 */
export const projectTypeEnum = pgEnum("project_type", [
  "single_dwelling",
  "multi_dwelling",
  "renovation",
  "extension",
]);

// ── owner profile enums ──────────────────────────────────────────────────

export const ownerEntityTypeEnum = pgEnum("owner_entity_type", [
  "homeowner",
  "owner_builder",
  "developer",
  "investor",
  "architect",
  "drafter",
  "project_manager",
  "other",
]);

export const contactPrefEnum = pgEnum("contact_pref", [
  "email",
  "phone",
  "both",
]);

// ── builder enums ────────────────────────────────────────────────────────

export const builderApprovalStatusEnum = pgEnum("builder_approval_status", [
  "incomplete", // hasn't finished onboarding
  "pending_review", // submitted, admin hasn't decided
  "approved",
  "rejected",
  "suspended",
]);

export const licenceVerificationStatusEnum = pgEnum("licence_verification_status", [
  "pending", // submitted, awaiting verification (manual or VBA/state-register lookup)
  "verified",
  "rejected",
  "expired",
]);

// ── project_owner_profiles ──────────────────────────────────────────────

export const projectOwnerProfiles = pgTable(
  "project_owner_profiles",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),

    entityType: ownerEntityTypeEnum().notNull(),

    /** Optional — relevant only for developer / architect / drafter / pm. */
    companyName: text(),

    /**
     * Owner's general location — pre-fills project upload form, not the
     * project's address itself. Project location is captured per-project.
     */
    defaultSuburb: text(),
    defaultState: australianStateEnum(),
    defaultPostcode: text(),

    contactPref: contactPrefEnum().notNull().default("email"),

    /** Set when the owner completes the onboarding wizard. Null = in progress. */
    onboardingCompletedAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("owner_profiles_state_idx").on(t.defaultState),
    index("owner_profiles_entity_type_idx").on(t.entityType),
  ],
);

// ── builder_profiles ────────────────────────────────────────────────────

export const builderProfiles = pgTable(
  "builder_profiles",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),

    // Identity
    /**
     * Legal entity name — verified against ABR. Locked once the
     * builder's current ABN matches a `verified` row in
     * builder_verifications. Treat this as the source of truth for
     * identity claims. Owners see `tradingName` first if set, this
     * second.
     */
    companyName: text().notNull(),
    /**
     * Trading name — what the builder wants shown publicly. Defaults
     * to the legal entity name on auto-fill, editable thereafter.
     */
    tradingName: text("trading_name"),
    /** ABN — 11 digits as text (preserves leading zeros, validated app-side). */
    abn: text(),
    acn: text(),

    // Business address — required for serious project matching.
    businessAddressLine1: text(),
    businessSuburb: text(),
    businessState: australianStateEnum(),
    businessPostcode: text(),

    /** When false, postal address fields are ignored — business address used. */
    hasDifferentPostal: boolean().notNull().default(false),
    postalAddressLine1: text(),
    postalSuburb: text(),
    postalState: australianStateEnum(),
    postalPostcode: text(),

    // Public-facing
    bio: text(),
    logoR2Key: text("logo_r2_key"), // R2 object key — never expose; serve via /api/files
    website: text(),
    linkedinUrl: text(),
    instagramUrl: text(),

    // Trading
    yearsInOperation: integer(),

    // Public profile slug — generated from company_name on first save, editable.
    slug: text(),

    // Approval workflow (admin-driven). Builders start `incomplete`; flip to
    // `pending_review` when they finish onboarding; admin then approves /
    // rejects in /admin/builders.
    approvalStatus: builderApprovalStatusEnum()
      .notNull()
      .default("incomplete"),
    approvedAt: timestamp({ mode: "date", withTimezone: true }),
    approvedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    /**
     * How the approval happened — 'auto' (ABR + state register both
     * passed) / 'manual' (admin clicked approve) / null (still
     * pending). Operational signal, not user-visible.
     */
    approvedVia: text("approved_via"),
    rejectionReason: text(),

    /**
     * Quality score. `score_total` is what we sort by; `score_breakdown`
     * holds the per-component values (logo, bio, ABN-verified, licence,
     * years, social, etc.). JSON shape is owned by the scoring service —
     * see services/builder-score.ts when it lands.
     */
    scoreTotal: integer().notNull().default(0),
    scoreBreakdown: jsonb().notNull().default(sql`'{}'::jsonb`),
    scoreLastCalculatedAt: timestamp({ mode: "date", withTimezone: true }),

    /** Set when builder finishes onboarding. */
    onboardingCompletedAt: timestamp({ mode: "date", withTimezone: true }),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("builder_profiles_slug_unique").on(t.slug),
    uniqueIndex("builder_profiles_abn_unique").on(t.abn),
    index("builder_profiles_approval_status_idx").on(t.approvalStatus),
    index("builder_profiles_state_idx").on(t.businessState),
    index("builder_profiles_score_total_idx").on(t.scoreTotal),
  ],
);

// ── builder_licences ────────────────────────────────────────────────────

export const builderLicences = pgTable(
  "builder_licences",
  {
    id: uuid().primaryKey().defaultRandom(),
    builderId: uuid()
      .notNull()
      .references(() => builderProfiles.userId, { onDelete: "cascade" }),

    state: australianStateEnum().notNull(),

    /**
     * Licence-class label per state — varies wildly:
     * VIC: "Domestic Builder Limited" / "Domestic Builder Unlimited" etc.
     * NSW: "Building licence (residential)"
     * QLD: QBCC class names. Free-text by intent.
     */
    licenceType: text().notNull(),
    licenceNumber: text().notNull(),
    /** Name on the licence (often the user's legal name). */
    licenceHolderName: text(),

    issuedAt: timestamp({ mode: "date", withTimezone: true }),
    /** Null = no expiry on file (some perpetual licences). */
    expiresAt: timestamp({ mode: "date", withTimezone: true }),

    /** R2 key for the uploaded licence document. */
    evidenceR2Key: text("evidence_r2_key"),

    verificationStatus: licenceVerificationStatusEnum()
      .notNull()
      .default("pending"),
    verifiedAt: timestamp({ mode: "date", withTimezone: true }),
    verifiedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    verificationNotes: text(),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("builder_licences_builder_id_idx").on(t.builderId),
    index("builder_licences_state_idx").on(t.state),
    index("builder_licences_status_idx").on(t.verificationStatus),
    // Uniqueness: a builder shouldn't have two rows for the same number+state.
    uniqueIndex("builder_licences_unique").on(t.builderId, t.state, t.licenceNumber),
  ],
);

// ── builder_service_areas ───────────────────────────────────────────────

/**
 * Suburb-precision service area: each row is one suburb the builder covers.
 * Project-to-builder matching joins on (state, suburb) with a fallback to
 * (state) for builders that just want statewide coverage (one row with
 * suburb = NULL).
 */
export const builderServiceAreas = pgTable(
  "builder_service_areas",
  {
    id: uuid().primaryKey().defaultRandom(),
    builderId: uuid()
      .notNull()
      .references(() => builderProfiles.userId, { onDelete: "cascade" }),
    state: australianStateEnum().notNull(),
    /** Null suburb = entire state. */
    suburb: text(),
    postcode: text(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("service_areas_builder_id_idx").on(t.builderId),
    // Project matching scans on (state, suburb) — covered by this index.
    index("service_areas_state_suburb_idx").on(t.state, t.suburb),
    // Don't allow duplicate suburb rows per builder.
    uniqueIndex("service_areas_unique").on(t.builderId, t.state, t.suburb),
  ],
);

// ── builder_project_categories ──────────────────────────────────────────

/**
 * Many-to-many: which project types each builder takes on. Composite PK,
 * no surrogate id. Project-to-builder matching also joins here.
 */
export const builderProjectCategories = pgTable(
  "builder_project_categories",
  {
    builderId: uuid()
      .notNull()
      .references(() => builderProfiles.userId, { onDelete: "cascade" }),
    category: projectTypeEnum().notNull(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.builderId, t.category] }),
    index("builder_categories_category_idx").on(t.category),
  ],
);

// ── inferred types ──────────────────────────────────────────────────────

export type ProjectOwnerProfile = typeof projectOwnerProfiles.$inferSelect;
export type NewProjectOwnerProfile = typeof projectOwnerProfiles.$inferInsert;

export type BuilderProfile = typeof builderProfiles.$inferSelect;
export type NewBuilderProfile = typeof builderProfiles.$inferInsert;

export type BuilderLicence = typeof builderLicences.$inferSelect;
export type NewBuilderLicence = typeof builderLicences.$inferInsert;

export type BuilderServiceArea = typeof builderServiceAreas.$inferSelect;
export type NewBuilderServiceArea = typeof builderServiceAreas.$inferInsert;

export type BuilderProjectCategory = typeof builderProjectCategories.$inferSelect;
