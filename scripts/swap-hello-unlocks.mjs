#!/usr/bin/env node
/**
 * hello@builderhq.com.au is now an admin, so leaving them in the
 * builder-side unlock rows is noise. For every project where hello
 * currently holds an unlock, delete that unlock and insert a new one
 * for one of the three filler builders that isn't already on that
 * project.
 *
 * Filler priority (in order): aryan, vaderaaryan, moe. The first one
 * not already unlocked on that project wins.
 *
 * Replacement source = 'admin' so we don't consume the new builder's
 * FBA quota. Deleting hello's existing 'founding'-source unlocks
 * also frees hello's old FBA credits — harmless since admins don't
 * need them.
 *
 * Atomic per project (DELETE + INSERT inside one transaction). Cap
 * stays at exactly 3.
 *
 * Run:
 *   node --env-file=.env.local scripts/swap-hello-unlocks.mjs --dry-run
 *   node --env-file=.env.local scripts/swap-hello-unlocks.mjs --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;
console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}\n`);

const HELLO_EMAIL = "hello@builderhq.com.au";
const FILLER_EMAILS = [
  "aryan@synergybuilding.net.au",
  "vaderaaryan1505@gmail.com",
  "moe@synergybuilding.net.au",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  // Resolve user ids
  const helloRes = await c.query(
    `SELECT id FROM users WHERE lower(email) = $1`,
    [HELLO_EMAIL],
  );
  const helloId = helloRes.rows[0]?.id;
  if (!helloId) throw new Error(`No user ${HELLO_EMAIL}`);

  const fillerIds = {};
  for (const e of FILLER_EMAILS) {
    const r = await c.query(`SELECT id FROM users WHERE lower(email) = $1`, [e]);
    if (r.rows.length === 0) throw new Error(`No user ${e}`);
    fillerIds[e] = r.rows[0].id;
  }

  // List every project hello currently has an unlock on
  const helloUnlocks = await c.query(
    `SELECT ul.project_id, ul.source, p.title
       FROM unlocks ul
       JOIN projects p ON p.id = ul.project_id
      WHERE ul.builder_id = $1
      ORDER BY ul.unlocked_at`,
    [helloId],
  );
  console.log(`hello has ${helloUnlocks.rows.length} unlock(s):`);
  for (const u of helloUnlocks.rows) {
    console.log(`  · ${u.title}  (source=${u.source})`);
  }
  console.log();

  if (helloUnlocks.rows.length === 0) {
    console.log("Nothing to swap.");
    process.exit(0);
  }

  let swapsPlanned = 0;
  let swapsApplied = 0;
  for (const { project_id, title } of helloUnlocks.rows) {
    // Who's currently on this project (besides hello)?
    const others = await c.query(
      `SELECT builder_id FROM unlocks WHERE project_id = $1 AND builder_id <> $2`,
      [project_id, helloId],
    );
    const otherIds = new Set(others.rows.map((r) => r.builder_id));

    // Pick the first filler that isn't already there.
    const pick = FILLER_EMAILS.map((email) => ({ email, id: fillerIds[email] }))
      .find(({ id }) => !otherIds.has(id));

    if (!pick) {
      console.log(`  [skip] ${title}: all 3 fillers already on the project`);
      continue;
    }

    swapsPlanned++;
    console.log(`  [swap] ${title}: hello → ${pick.email}`);

    if (DRY) continue;

    await c.query("BEGIN");
    try {
      await c.query(
        `DELETE FROM unlocks WHERE project_id = $1 AND builder_id = $2`,
        [project_id, helloId],
      );
      await c.query(
        `INSERT INTO unlocks (builder_id, project_id, source, unlocked_at)
         VALUES ($1, $2, 'admin'::unlock_source, now())
         ON CONFLICT (builder_id, project_id) DO NOTHING`,
        [pick.id, project_id],
      );
      await c.query("COMMIT");
      swapsApplied++;
    } catch (err) {
      await c.query("ROLLBACK");
      console.error(`    ✗ rollback on ${title}: ${err.message}`);
      throw err;
    }
  }

  console.log(
    `\n${DRY ? "Would swap" : "Swapped"} ${DRY ? swapsPlanned : swapsApplied} project(s).`,
  );
  if (DRY) console.log("(dry run — re-run with --apply)");
} finally {
  c.release();
  await pool.end();
}
