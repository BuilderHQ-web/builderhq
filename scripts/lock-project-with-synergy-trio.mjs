#!/usr/bin/env node
/**
 * lock-project-with-synergy-trio.mjs
 *
 * One-shot: lock a freshly-published project by filling all 3 unlock
 * slots with the Synergy filler trio — atomically, before any organic
 * builder can claim a slot.
 *
 * The Synergy trio:
 *   1. aryan@synergybuilding.net.au
 *   2. vaderaaryan1505@gmail.com
 *   3. moe@synergybuilding.net.au
 *
 * Insert uses source='admin' so the unlocks bypass FBA-credit math and
 * Stripe — matches the pattern in scripts/fill-project-unlocks.mjs.
 *
 * The lookup accepts:
 *   --slug=<slug>        Project slug (preferred — unambiguous).
 *   --address=<like>     Address ILIKE match (e.g. '%kelvin%').
 *   --id=<uuid>          Project id.
 *
 * Idempotent: if a slot is already filled by one of the trio, that
 * insert is skipped (unique constraint on (builder_id, project_id)).
 * If all 3 are already filled, the script no-ops.
 *
 * Runs the entire insert as a single transaction so an aborted run
 * doesn't leave the project half-locked.
 *
 * Run:
 *   node --env-file=.env.local scripts/lock-project-with-synergy-trio.mjs --slug=<slug> --dry-run
 *   node --env-file=.env.local scripts/lock-project-with-synergy-trio.mjs --slug=<slug> --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

// ─── CLI args ─────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    if (a === "--apply" || a === "--dry-run") return [[a.replace(/^--/, ""), true]];
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [[m[1], m[2]]] : [];
  }),
);
const APPLY = !!args.apply;
const DRY = !APPLY;

if (!args.slug && !args.address && !args.id) {
  console.error(
    "ERROR: Provide one of --slug=<slug>, --address=<like>, or --id=<uuid>.",
  );
  process.exit(1);
}

console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}\n`);

const TRIO_EMAILS = [
  "aryan@synergybuilding.net.au",
  "vaderaaryan1505@gmail.com",
  "moe@synergybuilding.net.au",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  // ─── 1. Resolve project ────────────────────────────────────────────
  let where, params;
  if (args.id) {
    where = "p.id = $1";
    params = [args.id];
  } else if (args.slug) {
    where = "lower(p.slug) = lower($1)";
    params = [args.slug];
  } else {
    where = "lower(p.address_line1) ILIKE lower($1)";
    params = [args.address];
  }

  const projRes = await c.query(
    `SELECT p.id, p.slug, p.title, p.status, p.suburb, p.state,
            p.address_line1, p.postcode, p.published_at
     FROM projects p
     WHERE ${where}
     LIMIT 5`,
    params,
  );

  if (projRes.rows.length === 0) {
    console.error(`ERROR: No project matched.`);
    process.exit(1);
  }
  if (projRes.rows.length > 1) {
    console.error(
      `ERROR: ${projRes.rows.length} projects matched. Be more specific.`,
    );
    for (const r of projRes.rows) {
      console.error(`  ${r.id}  ${r.slug}  ${r.address_line1}, ${r.suburb}`);
    }
    process.exit(1);
  }

  const project = projRes.rows[0];
  console.log("Project resolved:");
  console.log(`  id        ${project.id}`);
  console.log(`  slug      ${project.slug}`);
  console.log(`  title     ${project.title}`);
  console.log(`  status    ${project.status}`);
  console.log(`  location  ${project.address_line1}, ${project.suburb} ${project.state} ${project.postcode}`);
  console.log(`  published ${project.published_at ?? "—"}`);
  console.log("");

  if (project.status === "draft") {
    console.error(
      `ERROR: Project status is 'draft'. Publish from the owner UI first.`,
    );
    process.exit(1);
  }
  // Anything other than draft (published, tendering, awarded, etc.)
  // means the project is live — the slot-availability check below
  // is the real gate. Status warnings only.
  if (project.status !== "published") {
    console.log(
      `NOTE: status='${project.status}' (not 'published') — someone may already be unlocking. Slot-availability check will catch it.\n`,
    );
  }

  // ─── 2. Resolve trio user ids + existing unlock state ─────────────
  const trio = [];
  for (const email of TRIO_EMAILS) {
    const r = await c.query(
      `SELECT u.id, u.email
       FROM users u
       WHERE lower(u.email) = lower($1)
       LIMIT 1`,
      [email],
    );
    if (r.rows.length === 0) {
      console.error(`ERROR: Trio builder not found in users: ${email}`);
      process.exit(1);
    }
    trio.push(r.rows[0]);
  }

  const existing = await c.query(
    `SELECT builder_id, source, unlocked_at
     FROM unlocks
     WHERE project_id = $1
     ORDER BY unlocked_at ASC`,
    [project.id],
  );
  const alreadyUnlockedIds = new Set(existing.rows.map((r) => r.builder_id));

  console.log("Current unlock state:");
  if (existing.rows.length === 0) {
    console.log("  (none — project is open)");
  } else {
    for (const r of existing.rows) {
      const email = trio.find((t) => t.id === r.builder_id)?.email ?? "(other)";
      console.log(
        `  ${r.builder_id}  ${email.padEnd(38)}  ${r.source}  ${new Date(r.unlocked_at).toISOString()}`,
      );
    }
  }
  console.log("");

  // ─── 3. Determine what to insert ──────────────────────────────────
  const toInsert = trio.filter((t) => !alreadyUnlockedIds.has(t.id));
  if (toInsert.length === 0) {
    console.log("All 3 trio members already unlocked. Nothing to do.");
    process.exit(0);
  }

  const slotsAvailable = 3 - existing.rows.length;
  if (toInsert.length > slotsAvailable) {
    console.error(
      `ERROR: Need ${toInsert.length} slots but only ${slotsAvailable} free. Someone else got there first.`,
    );
    console.error(`       Existing unlocks above. Trio members missing:`);
    for (const t of toInsert) console.error(`         ${t.email}`);
    process.exit(1);
  }

  console.log(`Planned inserts (${toInsert.length}):`);
  for (const t of toInsert) {
    console.log(`  ${t.email.padEnd(38)}  source=admin`);
  }
  console.log("");

  // ─── 4. Apply (or dry-run exit) ───────────────────────────────────
  if (DRY) {
    console.log("Dry run complete. Re-run with --apply to lock.");
    process.exit(0);
  }

  await c.query("BEGIN");
  try {
    for (const t of toInsert) {
      await c.query(
        `INSERT INTO unlocks (builder_id, project_id, source, unlocked_at)
         VALUES ($1, $2, 'admin', now())
         ON CONFLICT (builder_id, project_id) DO NOTHING`,
        [t.id, project.id],
      );
    }
    await c.query("COMMIT");
    console.log(`✓ Locked. ${toInsert.length} insert(s) applied.`);
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Rolled back:", e);
    process.exit(1);
  }

  // ─── 5. Verify ────────────────────────────────────────────────────
  const verify = await c.query(
    `SELECT u.email, un.source, un.unlocked_at
     FROM unlocks un
     JOIN users u ON u.id = un.builder_id
     WHERE un.project_id = $1
     ORDER BY un.unlocked_at ASC`,
    [project.id],
  );
  console.log("\nFinal unlock state:");
  for (const r of verify.rows) {
    console.log(
      `  ${r.email.padEnd(38)}  ${r.source}  ${new Date(r.unlocked_at).toISOString()}`,
    );
  }
  console.log(`\n${verify.rows.length} / 3 slots filled.`);
} finally {
  c.release();
  await pool.end();
}
