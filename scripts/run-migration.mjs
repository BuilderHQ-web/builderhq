#!/usr/bin/env node
// One-shot migration runner. Reads a single SQL file passed as argv[2]
// and runs it against DATABASE_URL_UNPOOLED. Used when drizzle-kit's
// auto-detect can't tell a renamed column from a drop+replace and we
// hand-author the migration instead.
//
//   node --env-file=.env.local scripts/run-migration.mjs drizzle/0004_…sql

import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  // Split on the drizzle breakpoint marker so each statement runs alone.
  // (Multiple statements in one query() call are also fine for Neon, but
  // splitting gives clearer per-statement errors if anything fails.)
  const stmts = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of stmts) {
    process.stdout.write(`→ ${stmt.slice(0, 80).replace(/\n/g, " ")}…\n`);
    await client.query(stmt);
  }
  console.log(`\n✓ Applied ${stmts.length} statements from ${file}`);
} catch (err) {
  console.error("\n✗ Migration failed:");
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
