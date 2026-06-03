#!/usr/bin/env node
/**
 * Backfill unlock slots on every project that isn't already at the
 * UNLOCK_CAP (3). The three filler builders, in priority order:
 *
 *   1. aryan@synergybuilding.net.au
 *   2. vaderaaryan1505@gmail.com
 *   3. moe@synergybuilding.net.au
 *
 * For each non-full project: iterate the filler list, skip any
 * builder already unlocked on the project, and insert until the
 * project reaches the cap. Doesn't touch existing unlocks (we never
 * "remove anyone" per your instruction).
 *
 * source='admin' is used — semantically "granted manually by admin
 * override". This bypasses FBA-credit consumption and Stripe; the
 * intent is to show projects as FILLED in the marketplace, not to
 * exercise the paid path.
 *
 * Drafts are skipped (they aren't in the marketplace anyway).
 *
 * Idempotent: re-running won't re-add anyone already unlocked.
 *
 * Run:
 *   node --env-file=.env.local scripts/fill-project-unlocks.mjs --dry-run
 *   node --env-file=.env.local scripts/fill-project-unlocks.mjs --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;
console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}\n`);

const UNLOCK_CAP = 3;
const FILLER_EMAILS = [
  "aryan@synergybuilding.net.au",
  "vaderaaryan1505@gmail.com",
  "moe@synergybuilding.net.au",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  // Resolve filler user_ids up front.
  const fillerIds = {};
  for (const email of FILLER_EMAILS) {
    const r = await c.query(
      `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );
    if (r.rows.length === 0) throw new Error(`Filler user not found: ${email}`);
    fillerIds[email] = r.rows[0].id;
  }
  console.log("Filler builders:");
  for (const e of FILLER_EMAILS) console.log(`  ${e}  ${fillerIds[e]}`);
  console.log();

  // Snapshot every live project + its current unlock set.
  const projects = await c.query(`
    SELECT p.id, p.title, p.status, p.suburb, p.state
      FROM projects p
     WHERE p.deleted_at IS NULL
     ORDER BY p.created_at
  `);

  let totalInserted = 0;
  for (const p of projects.rows) {
    if (p.status === "draft") {
      console.log(`  [skip · draft]    ${p.title}`);
      continue;
    }

    const existing = await c.query(
      `SELECT u.email, ul.builder_id
         FROM unlocks ul
         JOIN users u ON u.id = ul.builder_id
        WHERE ul.project_id = $1`,
      [p.id],
    );
    const currentCount = existing.rows.length;
    const existingIds = new Set(existing.rows.map((r) => r.builder_id));

    if (currentCount >= UNLOCK_CAP) {
      console.log(`  [skip · full]     ${p.title}  (${currentCount}/${UNLOCK_CAP})`);
      continue;
    }

    const need = UNLOCK_CAP - currentCount;
    const toAdd = [];
    for (const email of FILLER_EMAILS) {
      if (toAdd.length >= need) break;
      const id = fillerIds[email];
      if (existingIds.has(id)) continue; // already unlocked
      toAdd.push({ email, id });
    }

    if (toAdd.length === 0) {
      console.log(
        `  [skip · nothing]  ${p.title}  (all fillers already unlocked here)`,
      );
      continue;
    }

    console.log(
      `  [fill]            ${p.title}  (was ${currentCount}/${UNLOCK_CAP}, adding ${toAdd.length}: ${toAdd.map((x) => x.email).join(", ")})`,
    );

    if (DRY) continue;

    for (const { email, id } of toAdd) {
      await c.query(
        `INSERT INTO unlocks (builder_id, project_id, source, unlocked_at)
         VALUES ($1, $2, 'admin'::unlock_source, now())
         ON CONFLICT (builder_id, project_id) DO NOTHING`,
        [id, p.id],
      );
      totalInserted++;
    }
  }

  console.log(`\n${DRY ? "Would insert" : "Inserted"} ${totalInserted} unlock row(s).`);
  if (DRY) console.log("(dry run — re-run with --apply)");
} finally {
  c.release();
  await pool.end();
}
