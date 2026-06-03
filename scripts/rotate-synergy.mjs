#!/usr/bin/env node
/**
 * Internal data rotation — fixes a Bubble-era data-entry mistake.
 *
 * Revised plan (per user, 2026-05-12):
 *
 *   vaderaaryan1505@gmail.com         — UNCHANGED. Keeps "SYNERGY
 *                                       BUILDING GROUP - VIC PTY. LTD."
 *                                       and the VIC CDB #65831 licence.
 *
 *   accounts.vic@synergybuilding.net.au — EMPTIED. Business credentials
 *                                       cleared; row stays so the human
 *                                       can still log in but lands in an
 *                                       incomplete-onboarding state.
 *
 *   moe@synergybuilding.net.au         — INHERITS accounts.vic's data
 *                                       (Synergy Group, abn 38631326022,
 *                                       VIC DBU #65831 + VIC DB #123,
 *                                       service areas, categories).
 *
 * What gets moved (business identity):
 *   - builder_profiles columns:
 *       company_name, trading_name, abn, acn,
 *       business_address_*, bio, website, linkedin_url, instagram_url,
 *       years_in_operation,
 *       approval_status, score_total, score_breakdown,
 *       onboarding_completed_at
 *   - builder_licences (re-parented via builder_id)
 *   - builder_service_areas (re-parented via builder_id)
 *   - builder_project_categories (re-parented via builder_id)
 *
 * What stays with the human (untouched):
 *   - first_name, last_name, email, phone
 *   - password, claim_token, email_verified, status, role
 *   - fba_grants, unlocks
 *
 * Run:
 *   node --env-file=.env.local scripts/rotate-synergy.mjs --dry-run
 *   node --env-file=.env.local scripts/rotate-synergy.mjs --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;
console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}\n`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

const EMAIL_ACCOUNTS_VIC = "accounts.vic@synergybuilding.net.au";
const EMAIL_MOE = "moe@synergybuilding.net.au";

const BUSINESS_COLS = [
  "company_name",
  "trading_name",
  "abn",
  "acn",
  "business_address_line1",
  "business_suburb",
  "business_state",
  "business_postcode",
  "bio",
  "website",
  "linkedin_url",
  "instagram_url",
  "years_in_operation",
  "approval_status",
  "score_total",
  "score_breakdown",
  "onboarding_completed_at",
];

async function getUserId(email) {
  const r = await c.query(
    `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
    [email],
  );
  if (r.rows.length === 0) throw new Error(`No user ${email}`);
  return r.rows[0].id;
}

async function snapshotBuilderProfile(userId) {
  const r = await c.query(
    `SELECT ${BUSINESS_COLS.join(", ")} FROM builder_profiles WHERE user_id = $1`,
    [userId],
  );
  return r.rows[0] ?? null;
}

try {
  const accountsId = await getUserId(EMAIL_ACCOUNTS_VIC);
  const moeId = await getUserId(EMAIL_MOE);
  console.log("user ids:");
  console.log(`  accounts.vic = ${accountsId}`);
  console.log(`  moe          = ${moeId}`);

  const accountsProfile = await snapshotBuilderProfile(accountsId);
  const moeProfile = await snapshotBuilderProfile(moeId);
  if (!accountsProfile || !moeProfile) {
    throw new Error("Expected both accounts.vic and moe to have builder_profiles rows");
  }

  console.log("\nsnapshots:");
  console.log(`  accounts: company="${accountsProfile.company_name}"  abn=${accountsProfile.abn}  approval=${accountsProfile.approval_status}`);
  console.log(`  moe:      company="${moeProfile.company_name}"  abn=${moeProfile.abn ?? "—"}  approval=${moeProfile.approval_status}`);

  console.log("\nplan:");
  console.log(`  builder_profiles[moe]            ← copy from accounts.vic`);
  console.log(`  builder_profiles[accounts.vic]   ← clear business cols, approval='incomplete'`);
  console.log(`  builder_licences[accounts.vic]   → re-parent to moe`);
  console.log(`  builder_service_areas[accounts.vic] → re-parent to moe`);
  console.log(`  builder_project_categories[moe]            → DELETE (overlap with accounts.vic)`);
  console.log(`  builder_project_categories[accounts.vic]   → re-parent to moe`);
  console.log(`  (vaderaaryan1505@gmail.com — UNTOUCHED)`);

  if (DRY) {
    console.log("\n(dry run — no writes. Re-run with --apply.)");
    process.exit(0);
  }

  await c.query("BEGIN");
  try {
    // (1) Free the unique slot on builder_profiles.abn — null
    //     accounts.vic so moe can take its value without conflicting.
    await c.query(
      `UPDATE builder_profiles SET abn = NULL, acn = NULL, updated_at = now()
        WHERE user_id = $1`,
      [accountsId],
    );

    // (2) Re-parent accounts.vic's licences → moe
    const lA = await c.query(
      `UPDATE builder_licences SET builder_id = $1, updated_at = now()
        WHERE builder_id = $2 RETURNING id`,
      [moeId, accountsId],
    );
    console.log(`  · re-parented ${lA.rowCount} licence(s) accounts.vic → moe`);

    // (3) Re-parent service_areas (unique on (builder_id, state, suburb)
    //     — moe has 0 rows so no conflict)
    const sA = await c.query(
      `UPDATE builder_service_areas SET builder_id = $1
        WHERE builder_id = $2 RETURNING id`,
      [moeId, accountsId],
    );
    console.log(`  · re-parented ${sA.rowCount} service area(s) accounts.vic → moe`);

    // (4) Project categories — PK (builder_id, category). moe already
    //     has single_dwelling + multi_dwelling that overlap. Drop them
    //     first, then re-parent.
    const delMoe = await c.query(
      `DELETE FROM builder_project_categories WHERE builder_id = $1`,
      [moeId],
    );
    console.log(`  · deleted ${delMoe.rowCount} pre-existing category row(s) on moe`);
    const cA = await c.query(
      `UPDATE builder_project_categories SET builder_id = $1
        WHERE builder_id = $2 RETURNING category`,
      [moeId, accountsId],
    );
    console.log(`  · re-parented ${cA.rowCount} category row(s) accounts.vic → moe`);

    // (5) builder_profiles: write moe ← accounts.vic snapshot.
    const setClause = BUSINESS_COLS.map((col, i) => `${col} = $${i + 2}`).join(", ");
    await c.query(
      `UPDATE builder_profiles SET ${setClause}, updated_at = now()
        WHERE user_id = $1`,
      [moeId, ...BUSINESS_COLS.map((col) => accountsProfile[col])],
    );
    console.log(`  · wrote builder_profiles[moe] from accounts.vic snapshot`);

    // (6) Clear accounts.vic's business fields. Approval goes to
    //     'incomplete' since no credentials remain.
    // company_name is NOT NULL — use a clear placeholder so the row
    // is visibly empty without violating the constraint. Everything
    // else is nullable / has a default.
    const cleared = {
      company_name: "(unclaimed)",
      trading_name: null,
      abn: null,
      acn: null,
      business_address_line1: null,
      business_suburb: null,
      business_state: null,
      business_postcode: null,
      bio: null,
      website: null,
      linkedin_url: null,
      instagram_url: null,
      years_in_operation: null,
      approval_status: "incomplete",
      score_total: 0,
      score_breakdown: {},
      onboarding_completed_at: null,
    };
    await c.query(
      `UPDATE builder_profiles SET ${setClause}, updated_at = now()
        WHERE user_id = $1`,
      [accountsId, ...BUSINESS_COLS.map((col) => cleared[col])],
    );
    console.log(`  · cleared builder_profiles[accounts.vic]`);

    await c.query("COMMIT");
    console.log("\n✓ Rotation committed.");
  } catch (err) {
    await c.query("ROLLBACK");
    console.error("\n✗ Rotation rolled back:", err.message);
    throw err;
  }
} finally {
  c.release();
  await pool.end();
}
