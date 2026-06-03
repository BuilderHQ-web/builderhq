#!/usr/bin/env node
/**
 * One-shot read-only check: builder approval-status breakdown.
 * Counts how many migrated (legacy_source='bubble') builders sit in
 * each state, and prints the per-builder list so we can see who
 * needs admin action vs who needs to finish onboarding.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-builder-approval.mjs
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  const { rows: summary } = await client.query(`
    SELECT
      bp.approval_status,
      count(*)::int AS n
    FROM builder_profiles bp
    JOIN users u ON u.id = bp.user_id
    WHERE u.legacy_source = 'bubble'
    GROUP BY bp.approval_status
    ORDER BY n DESC
  `);

  console.log("\n── Migrated builders, by approval_status ──");
  let total = 0;
  for (const r of summary) {
    console.log(`  ${r.approval_status.padEnd(18)} ${r.n}`);
    total += r.n;
  }
  console.log(`  ${"total".padEnd(18)} ${total}\n`);

  const { rows: details } = await client.query(`
    SELECT
      u.email,
      bp.company_name,
      bp.approval_status,
      bp.abn,
      (SELECT count(*) FROM builder_licences bl
        WHERE bl.builder_id = u.id
          AND bl.verification_status = 'verified')::int AS verified_licences,
      (SELECT count(*) FROM builder_licences bl
        WHERE bl.builder_id = u.id)::int AS total_licences
    FROM builder_profiles bp
    JOIN users u ON u.id = bp.user_id
    WHERE u.legacy_source = 'bubble'
    ORDER BY bp.approval_status, u.email
  `);

  console.log("── Per builder ──");
  let lastStatus = "";
  for (const r of details) {
    if (r.approval_status !== lastStatus) {
      console.log(`\n  [${r.approval_status}]`);
      lastStatus = r.approval_status;
    }
    const abnFlag = r.abn ? "abn" : "—abn";
    const licFlag = `${r.verified_licences}/${r.total_licences}lic`;
    console.log(
      `    ${r.email.padEnd(36)} ${abnFlag.padEnd(6)} ${licFlag.padEnd(8)} ${r.company_name ?? ""}`,
    );
  }
} finally {
  client.release();
  await pool.end();
}
