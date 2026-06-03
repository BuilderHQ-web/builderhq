#!/usr/bin/env node
/**
 * One-shot: list emails of builders who have unlocked projects in
 * Niddrie or Black Rock. Suburb match is case-insensitive on
 * projects.suburb (a separate first-class column on projects).
 */
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  // One join through unlocks → users (builder) + projects. The detail
  // rows give us per-project / per-builder timestamps so the user can
  // see who unlocked what, when. The summary at the bottom dedupes
  // unique builders per suburb in case the same builder hit both.
  const detail = await c.query(`
    SELECT
      lower(p.suburb)                                AS suburb,
      p.id                                           AS project_id,
      p.address_line1,
      p.postcode,
      u.email                                        AS builder_email,
      u.id                                           AS builder_id,
      un.source,
      un.unlocked_at
    FROM unlocks un
    JOIN projects p ON p.id = un.project_id
    JOIN users    u ON u.id = un.builder_id
    WHERE lower(p.suburb) IN ('niddrie', 'black rock')
    ORDER BY lower(p.suburb), un.unlocked_at ASC
  `);

  if (detail.rows.length === 0) {
    console.log("No unlocks found for projects in Niddrie or Black Rock.");
  } else {
    console.log(`Found ${detail.rows.length} unlock(s):\n`);
    let currentSuburb = "";
    for (const r of detail.rows) {
      if (r.suburb !== currentSuburb) {
        currentSuburb = r.suburb;
        console.log(`\n── ${currentSuburb.toUpperCase()} ──`);
      }
      const when = new Date(r.unlocked_at).toISOString().slice(0, 16).replace("T", " ");
      console.log(
        `  ${when}  ${r.builder_email.padEnd(38)}  ${r.source.padEnd(8)}  ${r.address_line1 ?? ""}  ${r.postcode ?? ""}`,
      );
    }

    // Dedup summary — unique builder emails per suburb.
    const bySuburb = {};
    for (const r of detail.rows) {
      (bySuburb[r.suburb] ||= new Set()).add(r.builder_email);
    }
    console.log("\n\n── UNIQUE BUILDERS PER SUBURB ──");
    for (const [suburb, set] of Object.entries(bySuburb)) {
      console.log(`\n${suburb.toUpperCase()} (${set.size}):`);
      for (const e of [...set].sort()) console.log(`  ${e}`);
    }
  }
} finally {
  c.release();
  await pool.end();
}
