#!/usr/bin/env node
// Backfill Founding Builder Access for builders who finished onboarding
// before this script existed. Idempotent — skips anyone who already has
// an active grant. Respects the 100-grant cap.
//
//   node --env-file=.env.local scripts/backfill-fba.mjs

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();

try {
  // Eligible builders: those who finished onboarding AND don't already
  // have an active (non-revoked, end_at in the future) grant.
  const eligible = await client.query(`
    SELECT bp.user_id
    FROM builder_profiles bp
    WHERE bp.onboarding_completed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fba_grants g
        WHERE g.builder_id = bp.user_id
          AND g.revoked_at IS NULL
          AND g.end_at > now()
      )
    ORDER BY bp.onboarding_completed_at ASC
  `);

  if (eligible.rows.length === 0) {
    console.log("No backfill needed — every onboarded builder already has FBA.");
    process.exit(0);
  }

  // Check cap.
  const taken = await client.query(`
    SELECT COUNT(*)::int AS n FROM fba_grants WHERE source = 'founding'
  `);
  const cap = 100;
  const remainingSeats = cap - taken.rows[0].n;
  if (remainingSeats <= 0) {
    console.log(`Cap reached (${taken.rows[0].n}/${cap}). Nothing to backfill.`);
    process.exit(0);
  }

  const batch = eligible.rows.slice(0, remainingSeats);
  console.log(
    `Backfilling FBA for ${batch.length} of ${eligible.rows.length} eligible builder(s) (${remainingSeats} seats left of ${cap}).`,
  );

  for (const r of batch) {
    const ins = await client.query(
      `INSERT INTO fba_grants (builder_id, start_at, end_at, monthly_quota, source)
       VALUES ($1, now(), now() + interval '3 months', 5, 'founding')
       RETURNING id`,
      [r.user_id],
    );
    console.log(`  ✓ ${r.user_id} → grant ${ins.rows[0].id}`);
  }

  console.log(`\n✓ Done. ${batch.length} grant(s) created.`);
} catch (err) {
  console.error("Backfill failed:", err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
