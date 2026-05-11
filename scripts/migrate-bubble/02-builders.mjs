#!/usr/bin/env node
/**
 * Migration phase 2 — builder sub-tables.
 *
 * Runs after 01-users (depends on builder_profiles existing for every
 * migrated builder). For each builder we walk the Bubble row again
 * and write into:
 *
 *   builder_licences          — one row per licence captured on Bubble
 *                                (CSV had a single licence per builder)
 *                                verification_status = 'pending' so the
 *                                admin re-verifies in the new admin UI
 *   builder_service_areas     — one row per state code in `service_area`
 *                                statewide (radius >= 50) — Bubble didn't
 *                                store sub-state granularity
 *   builder_project_categories — one row per item in `project_preference`
 *   fba_grants                — single grant per builder with founding
 *                                window + 5 unlocks/month quota
 *
 * Idempotent — every insert checks for an existing row keyed on the
 * natural unique tuple before writing.
 *
 * Run:
 *   node --env-file=.env.local scripts/migrate-bubble/02-builders.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-bubble/02-builders.mjs --apply
 */

import {
  parseCsv,
  mapState,
  mapProjectCategory,
  openNeon,
  log,
  readonlyMode,
  flagValue,
  DEFAULT_CSV,
} from "./_lib.mjs";

const DRY = readonlyMode();
log("info", "migrate.phase_start", { phase: "02-builders", dry: DRY });

const buildersPath = flagValue("builders") ?? DEFAULT_CSV.builders;
const builderRows = parseCsv(buildersPath);
log("info", "csv.loaded", { builders: builderRows.length });

const pool = openNeon();
const client = await pool.connect();

let licencesCreated = 0;
let licencesSkipped = 0;
let areasCreated = 0;
let areasSkipped = 0;
let categoriesCreated = 0;
let categoriesSkipped = 0;
let grantsCreated = 0;
let grantsSkipped = 0;
let buildersNotFound = 0;

try {
  for (const row of builderRows) {
    const bubbleProfileId = String(row["unique id"] ?? "").trim();
    const ownerEmail = String(row.owner ?? "").trim().toLowerCase();

    // Find the Neon user. Try by legacy_bubble_id (set by phase 1
    // against the User row, not the Builder_Profile — so we resolve
    // builder profile → its owner email → user). Fallback to email
    // lookup if Bubble's owner field is set.
    let userId = null;
    if (ownerEmail) {
      const r = await client.query(
        `SELECT u.id
           FROM users u
          WHERE lower(u.email) = $1
            AND u.role = 'builder'
          LIMIT 1`,
        [ownerEmail],
      );
      userId = r.rows[0]?.id ?? null;
    }
    if (!userId) {
      buildersNotFound++;
      log("warn", "builder.user_not_found", {
        bubbleProfileId,
        ownerEmail,
      });
      continue;
    }

    // ── builder_licences ────────────────────────────────────────────────
    const licNumber = String(row.licence_number ?? "").trim();
    const licType = String(row.licence_name ?? "").trim();
    const licState = mapState(row.state_of_issue ?? "");
    const licIssue = row.licence_issue_date
      ? new Date(row.licence_issue_date)
      : null;
    const licExpiry = row.licence_expiry
      ? new Date(row.licence_expiry)
      : null;

    if (licNumber && licType && licState) {
      const existing = await client.query(
        `SELECT id FROM builder_licences
          WHERE builder_id = $1 AND state = $2::australian_state
            AND licence_number = $3
          LIMIT 1`,
        [userId, licState, licNumber],
      );
      if (existing.rows.length > 0) {
        licencesSkipped++;
        log("info", "licence.skip", { userId, reason: "already_exists" });
      } else if (DRY) {
        licencesCreated++;
        log("info", "licence.would_create", {
          userId,
          licNumber,
          licType,
          licState,
        });
      } else {
        try {
          await client.query(
            `INSERT INTO builder_licences
              (builder_id, state, licence_type, licence_number,
               issued_at, expires_at,
               verification_status, created_at, updated_at)
             VALUES
              ($1, $2::australian_state, $3, $4,
               $5, $6,
               'pending'::licence_verification_status, now(), now())`,
            [userId, licState, licType, licNumber, licIssue, licExpiry],
          );
          licencesCreated++;
          log("info", "licence.created", { userId, licNumber, licState });
        } catch (err) {
          log("error", "licence.insert_failed", {
            userId,
            msg: err.message,
          });
        }
      }
    }

    // ── builder_service_areas ───────────────────────────────────────────
    // Bubble's service_area column is empty for most builders — the
    // state actually lives on `state_of_issue` (the licence column,
    // which doubles as the builder's home state). Try service_area
    // first, then fall back to state_of_issue.
    // We write one statewide row (no specific suburb, radius=50 →
    // matches anything in that state via the matcher).
    const areaState =
      mapState(row.service_area ?? "") || mapState(row.state_of_issue ?? "");
    if (areaState) {
      const existing = await client.query(
        `SELECT id FROM builder_service_areas
          WHERE builder_id = $1 AND state = $2::australian_state
            AND suburb IS NULL
          LIMIT 1`,
        [userId, areaState],
      );
      if (existing.rows.length > 0) {
        areasSkipped++;
      } else if (DRY) {
        areasCreated++;
        log("info", "area.would_create", { userId, areaState });
      } else {
        try {
          await client.query(
            `INSERT INTO builder_service_areas
              (builder_id, state, suburb, radius_km, created_at)
             VALUES ($1, $2::australian_state, NULL, 50, now())`,
            [userId, areaState],
          );
          areasCreated++;
          log("info", "area.created", { userId, areaState });
        } catch (err) {
          log("error", "area.insert_failed", { userId, msg: err.message });
        }
      }
    }

    // ── builder_project_categories ──────────────────────────────────────
    // Bubble has TWO project-preference columns (project_preference +
    // project_preference2). The "2" variant is the actually-populated
    // one in the export; the unsuffixed one is an older Bubble field
    // they migrated away from. Try both, prefer the populated one.
    const prefRaw =
      String(row.project_preference2 ?? "").trim() ||
      String(row.project_preference ?? "").trim();
    const categories = prefRaw
      .split(/\s*,\s*/)
      .map((p) => mapProjectCategory(String(p).trim()))
      .filter((c) => !!c);
    for (const cat of new Set(categories)) {
      const existing = await client.query(
        `SELECT category FROM builder_project_categories
          WHERE builder_id = $1 AND category = $2::project_type
          LIMIT 1`,
        [userId, cat],
      );
      if (existing.rows.length > 0) {
        categoriesSkipped++;
        continue;
      }
      if (DRY) {
        categoriesCreated++;
        log("info", "category.would_create", { userId, cat });
        continue;
      }
      try {
        await client.query(
          `INSERT INTO builder_project_categories
            (builder_id, category) VALUES ($1, $2::project_type)`,
          [userId, cat],
        );
        categoriesCreated++;
      } catch (err) {
        log("error", "category.insert_failed", {
          userId,
          cat,
          msg: err.message,
        });
      }
    }

    // ── fba_grants ──────────────────────────────────────────────────────
    const eligible =
      String(row.founding_builder_eligible ?? "").trim().toLowerCase() === "yes";
    if (eligible) {
      const startAt = row.founding_builder_start_date
        ? new Date(row.founding_builder_start_date)
        : new Date();
      const endAt = row.founding_builder_end_date
        ? new Date(row.founding_builder_end_date)
        : new Date(Date.now() + 90 * 86_400_000);

      // Note on legacy usage stats: Bubble tracked
      // total_money_saved_aud + total_free_unlocks_used as
      // standalone counters. Neon reconstructs usage from the
      // actual `unlocks` rows (source='founding'), so we don't
      // need to preserve those numbers — phase 3 re-creates the
      // unlocks and the cycle math comes out the same.
      const existing = await client.query(
        `SELECT id FROM fba_grants
          WHERE builder_id = $1 AND source = 'founding'
          LIMIT 1`,
        [userId],
      );
      if (existing.rows.length > 0) {
        grantsSkipped++;
      } else if (DRY) {
        grantsCreated++;
        log("info", "grant.would_create", {
          userId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
      } else {
        try {
          await client.query(
            `INSERT INTO fba_grants
              (builder_id, source, start_at, end_at, monthly_quota,
               created_at)
             VALUES ($1, 'founding', $2, $3, 5, now())`,
            [userId, startAt, endAt],
          );
          grantsCreated++;
          log("info", "grant.created", { userId });
        } catch (err) {
          log("error", "grant.insert_failed", {
            userId,
            msg: err.message,
          });
        }
      }
    }
  }
} finally {
  client.release();
  await pool.end();
}

log("info", "migrate.phase_end", {
  phase: "02-builders",
  dry: DRY,
  licencesCreated,
  licencesSkipped,
  areasCreated,
  areasSkipped,
  categoriesCreated,
  categoriesSkipped,
  grantsCreated,
  grantsSkipped,
  buildersNotFound,
});

console.log(
  `\nPhase 2 ${DRY ? "DRY-RUN" : "APPLY"}: ` +
    `${licencesCreated} licences · ${areasCreated} service areas · ` +
    `${categoriesCreated} project categories · ${grantsCreated} FBA grants` +
    (buildersNotFound > 0
      ? `\n⚠️  ${buildersNotFound} builder rows had no matching Neon user — run 01 first.`
      : ""),
);
