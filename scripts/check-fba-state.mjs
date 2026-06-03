#!/usr/bin/env node
/**
 * One-shot read-only check: print the FBA grant state for every
 * migrated builder so we can confirm cycles + remaining unlocks.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-fba-state.mjs
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

const CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

try {
  const { rows: grants } = await client.query(`
    SELECT
      g.id           AS grant_id,
      g.builder_id,
      u.email,
      u.created_at   AS user_created_at,
      g.start_at,
      g.end_at,
      g.monthly_quota,
      g.source,
      g.revoked_at,
      g.created_at   AS grant_created_at
    FROM fba_grants g
    JOIN users u ON u.id = g.builder_id
    ORDER BY u.email
  `);

  const now = new Date();
  console.log(
    `\nFBA grants: ${grants.length} · today=${now.toISOString().slice(0, 10)}\n`,
  );

  for (const g of grants) {
    const start = new Date(g.start_at);
    const end = new Date(g.end_at);
    const ms = now.getTime() - start.getTime();
    const inWindow = now >= start && now < end && !g.revoked_at;
    const cycleIdx = inWindow ? Math.floor(ms / CYCLE_MS) : null;
    const cycleStart =
      cycleIdx !== null ? new Date(start.getTime() + cycleIdx * CYCLE_MS) : null;
    const cycleEnd =
      cycleIdx !== null
        ? new Date(
            Math.min(start.getTime() + (cycleIdx + 1) * CYCLE_MS, end.getTime()),
          )
        : null;

    let used = 0;
    if (cycleStart && cycleEnd) {
      const r = await client.query(
        `SELECT count(*)::int AS n
           FROM unlocks
          WHERE builder_id = $1
            AND source     = 'founding'
            AND unlocked_at >= $2
            AND unlocked_at <  $3`,
        [g.builder_id, cycleStart, cycleEnd],
      );
      used = r.rows[0].n;
    }

    const remaining = inWindow
      ? Math.max(0, g.monthly_quota - used)
      : null;

    console.log(
      `  ${g.email.padEnd(36)}  ` +
        `start=${start.toISOString().slice(0, 10)}  ` +
        `end=${end.toISOString().slice(0, 10)}  ` +
        (inWindow
          ? `cycle ${cycleIdx} (${cycleStart.toISOString().slice(0, 10)} → ${cycleEnd.toISOString().slice(0, 10)})  used=${used}  remain=${remaining}`
          : g.revoked_at
            ? "REVOKED"
            : now >= end
              ? "EXPIRED"
              : "FUTURE (start hasn't hit yet)"),
    );
  }
} finally {
  client.release();
  await pool.end();
}
