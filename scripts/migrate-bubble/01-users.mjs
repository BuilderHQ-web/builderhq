#!/usr/bin/env node
/**
 * Migration phase 1 — users + profiles + claim tokens.
 *
 * Reads:
 *   - All-Users CSV          (one row per Bubble user)
 *   - All-Builder-Profiles CSV (joined to enrich builder users)
 *
 * Writes (when --apply):
 *   - users row per migrated user
 *       claim_token = generated uuid
 *       claim_token_expires_at = now + 90 days
 *       password_hash = NULL  (claim flow sets it)
 *       legacy_bubble_id = Bubble user.unique_id
 *       legacy_source = 'bubble'
 *   - project_owner_profiles row for role=Project Owner
 *       entityType = 'homeowner' (default; user can change post-claim)
 *       onboardingCompletedAt = now (we trust Bubble's onboarding gate)
 *   - builder_profiles row for role=Builder
 *       Full profile fields from the Builder_Profiles CSV
 *       approval_status = 'pending_review' for completed_steps=3, else
 *         'incomplete'. Admin re-verifies via the new admin UI.
 *       onboardingCompletedAt = now for completed_steps=3
 *
 * Idempotent — skipped (with log) if a row with this legacy_bubble_id
 * already exists. Re-runs are safe.
 *
 * Filtering: applies userSkipList + emailIsTestPattern. Logs every
 * skip with a reason so you can spot-check.
 *
 * Run:
 *   node --env-file=.env.local scripts/migrate-bubble/01-users.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-bubble/01-users.mjs --apply
 *
 * Optional flags:
 *   --users=/path/to/users.csv      (override default Downloads path)
 *   --builders=/path/to/builders.csv
 */

import { randomUUID } from "node:crypto";

import {
  parseCsv,
  normalizeAbn,
  normalizePhone,
  parseAuAddress,
  mapState,
  openNeon,
  userSkipList,
  emailIsTestPattern,
  log,
  readonlyMode,
  flagValue,
  DEFAULT_CSV,
} from "./_lib.mjs";

const DRY = readonlyMode();
log("info", "migrate.phase_start", { phase: "01-users", dry: DRY });

// ── Load CSVs ────────────────────────────────────────────────────────────

const usersPath = flagValue("users") ?? DEFAULT_CSV.users;
const buildersPath = flagValue("builders") ?? DEFAULT_CSV.builders;

const users = parseCsv(usersPath);
const builders = parseCsv(buildersPath);

log("info", "csv.loaded", {
  users: users.length,
  builders: builders.length,
});

// Index builders by their Bubble unique_id so we can join per user.
const builderById = new Map();
for (const b of builders) {
  if (b["unique id"]) builderById.set(b["unique id"], b);
}

// ── DB ───────────────────────────────────────────────────────────────────

const pool = openNeon();
const client = await pool.connect();

// 90-day expiry on every claim token. We can sweep stale ones via a
// scheduled cleanup later.
const CLAIM_TTL_MS = 90 * 86_400_000;

let created = 0;
let skippedExisting = 0;
let filteredJunk = 0;
let errors = 0;

try {
  for (const row of users) {
    const email = String(row.email ?? "").trim().toLowerCase();
    const role = String(row.Role ?? "").trim();
    const legacyId = String(row["unique id"] ?? "").trim();
    const firstName = String(row["First Name"] ?? "").trim() || null;
    const lastName = String(row["Last Name"] ?? "").trim() || null;
    const fullName =
      firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;
    const phone = normalizePhone(row.Phone);
    const isEmailVerified =
      String(row.is_email_verified_custom ?? "").trim().toLowerCase() === "yes" ||
      String(row.signup_completed ?? "").trim().toLowerCase() === "yes";
    const bio = String(row.Bio ?? "").trim() || null;
    const createdAt = row["Creation Date"]
      ? new Date(row["Creation Date"])
      : new Date();

    // Filter gates.
    if (!email) {
      filteredJunk++;
      log("warn", "user.skip", { reason: "empty_email", legacyId });
      continue;
    }
    if (userSkipList.has(email)) {
      filteredJunk++;
      log("info", "user.skip", { reason: "skiplist", email });
      continue;
    }
    if (emailIsTestPattern(email)) {
      filteredJunk++;
      log("info", "user.skip", { reason: "test_pattern", email });
      continue;
    }
    if (role !== "Builder" && role !== "Project Owner") {
      filteredJunk++;
      log("warn", "user.skip", { reason: "unknown_role", email, role });
      continue;
    }

    // Map role.
    const neonRole = role === "Builder" ? "builder" : "project_owner";

    // For builders, sanity-check we have a profile row in the second CSV
    // and that it isn't a stub (no company_name).
    let builderRow = null;
    if (neonRole === "builder") {
      const builderProfileId = String(row.builder_profile ?? "").trim();
      builderRow = builderProfileId ? builderById.get(builderProfileId) : null;
      if (!builderRow || !String(builderRow.company_name ?? "").trim()) {
        filteredJunk++;
        log("info", "user.skip", {
          reason: "builder_profile_empty",
          email,
          builderProfileId,
        });
        continue;
      }
      // Drop test ABNs / placeholder company names.
      const abn = normalizeAbn(builderRow.abn);
      const companyName = String(builderRow.company_name).trim();
      if (
        !abn &&
        (/^Test\b/i.test(companyName) || /^Aryan/i.test(companyName) || /^Om$/i.test(companyName) || /^abc$/i.test(companyName))
      ) {
        filteredJunk++;
        log("info", "user.skip", {
          reason: "test_builder_profile",
          email,
          companyName,
        });
        continue;
      }
    }

    // ── Idempotency check ────────────────────────────────────────────────
    const existing = await client.query(
      `SELECT id, email FROM users
        WHERE legacy_bubble_id = $1 OR lower(email) = $2 LIMIT 1`,
      [legacyId, email],
    );
    if (existing.rows.length > 0) {
      skippedExisting++;
      log("info", "user.skip", {
        reason: "already_exists",
        email,
        existingId: existing.rows[0].id,
      });
      continue;
    }

    // ── Plan the write ──────────────────────────────────────────────────
    const claimToken = randomUUID();
    const claimExpiresAt = new Date(Date.now() + CLAIM_TTL_MS);

    if (DRY) {
      created++;
      log("info", "user.would_create", {
        email,
        name: fullName,
        role: neonRole,
        emailVerified: isEmailVerified,
        legacyId,
        builderCompany: builderRow ? String(builderRow.company_name).trim() : null,
      });
      continue;
    }

    // ── Apply ────────────────────────────────────────────────────────────
    try {
      // 1. Insert user row.
      const ins = await client.query(
        `INSERT INTO users
          (email, name, first_name, last_name, phone, role, status,
           email_verified, created_at, updated_at, deleted_at,
           claim_token, claim_token_expires_at,
           legacy_bubble_id, legacy_source)
         VALUES
          ($1, $2, $3, $4, $5, $6::user_role, $7::user_status,
           $8, $9, now(), NULL,
           $10, $11,
           $12, 'bubble')
         RETURNING id`,
        [
          email,
          fullName,
          firstName,
          lastName,
          phone,
          neonRole,
          isEmailVerified ? "active" : "pending_verification",
          isEmailVerified ? createdAt : null,
          createdAt,
          claimToken,
          claimExpiresAt,
          legacyId,
        ],
      );
      const userId = ins.rows[0].id;

      // 2. Insert profile row.
      if (neonRole === "project_owner") {
        await client.query(
          `INSERT INTO project_owner_profiles
            (user_id, entity_type, contact_pref, onboarding_completed_at,
             created_at, updated_at)
           VALUES ($1, 'homeowner', 'email', $2, $3, now())`,
          [userId, createdAt, createdAt],
        );
      } else {
        // builder — pull from builderRow.
        const companyName = String(builderRow.company_name).trim();
        const abn = normalizeAbn(builderRow.abn);
        const acn = String(builderRow.acn ?? "").replace(/\s/g, "").trim() || null;
        const completedSteps = Number(builderRow.completed_steps ?? 0);

        const addr = parseAuAddress(builderRow.business_address);
        const yearsRaw = Number(builderRow.years_in_operation ?? 0);
        const years = Number.isFinite(yearsRaw) && yearsRaw > 0 ? Math.floor(yearsRaw) : null;

        const website =
          String(builderRow.website ?? "").trim() || null;
        const linkedin =
          String(builderRow.linkedin ?? "").trim() || null;
        const instagram =
          String(builderRow.instagram ?? "").trim() || null;

        // ABN conflict guard. The Bubble export contains multiple
        // staff emails for the same company (e.g. moe@ and
        // accounts.vic@ at Synergy Group), but Neon enforces a unique
        // ABN per builder_profile. If another row already claims
        // this ABN, insert THIS profile with abn=null and admin
        // reconciles later. We still migrate the user so unlocks /
        // tenders bound to their email survive.
        let effectiveAbn = abn;
        if (abn) {
          const abnClash = await client.query(
            `SELECT user_id FROM builder_profiles WHERE abn = $1 LIMIT 1`,
            [abn],
          );
          if (abnClash.rows.length > 0) {
            effectiveAbn = null;
            log("warn", "builder.abn_conflict", {
              email,
              abn,
              existingUserId: abnClash.rows[0].user_id,
              note: "inserted with abn=null; admin should reconcile",
            });
          }
        }

        // Approval status:
        //   - completed_steps = 3 + valid ABN (not nulled out by
        //     conflict) → pending_review (admin re-verifies)
        //   - otherwise → incomplete (user finishes onboarding after claim)
        const approvalStatus =
          completedSteps >= 3 && effectiveAbn ? "pending_review" : "incomplete";

        await client.query(
          `INSERT INTO builder_profiles
            (user_id, company_name, trading_name, abn, acn,
             business_address_line1, business_suburb, business_state,
             business_postcode, bio, website, linkedin_url,
             instagram_url, years_in_operation,
             approval_status, score_total, score_breakdown,
             onboarding_completed_at,
             created_at, updated_at)
           VALUES
            ($1, $2, NULL, $3, $4,
             $5, $6, $7::australian_state,
             $8, $9, $10, $11,
             $12, $13,
             $14::builder_approval_status, 0, '{}'::jsonb,
             $15,
             $16, now())`,
          [
            userId,
            companyName,
            effectiveAbn,
            acn,
            addr.addressLine1,
            addr.suburb,
            addr.state,
            addr.postcode,
            bio,
            website,
            linkedin,
            instagram,
            years,
            approvalStatus,
            completedSteps >= 3 ? createdAt : null,
            createdAt,
          ],
        );
      }

      created++;
      log("info", "user.created", {
        email,
        userId,
        role: neonRole,
        legacyId,
      });
    } catch (err) {
      errors++;
      log("error", "user.insert_failed", {
        email,
        legacyId,
        msg: err.message,
      });
    }
  }
} finally {
  client.release();
  await pool.end();
}

log("info", "migrate.phase_end", {
  phase: "01-users",
  dry: DRY,
  created,
  skippedExisting,
  filteredJunk,
  errors,
});

if (DRY) {
  console.log(
    `\nDry run complete. Would create ${created} users (${filteredJunk} junk + ${skippedExisting} already-exist filtered).` +
      `\nRun again with --apply to write to Neon.`,
  );
} else {
  console.log(
    `\nMigrated ${created} users · skipped ${skippedExisting} (already exist) · filtered ${filteredJunk} (junk) · errors ${errors}.`,
  );
}
