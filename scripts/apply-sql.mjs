#!/usr/bin/env node
/**
 * apply-sql.mjs — run a hand-written migration .sql. Dev by default,
 * production only when asked.
 *
 * This repo hand-authors drizzle/*.sql (the drizzle-kit meta is stale), so
 * this is how a new migration gets applied. Uses the UNPOOLED connection
 * (DDL like CREATE TYPE needs a session, not pgbouncer).
 *
 * SAFETY. Two guards, and they point in opposite directions on purpose:
 * without --prod it REFUSES a host that looks like prod, and with --prod
 * it refuses a host that does not. Neither can be satisfied by accident.
 * Every statement runs in one transaction, split on the drizzle
 * `--> statement-breakpoint` markers, so a failure leaves nothing half
 * applied.
 *
 * The printed target is derived from the flag rather than hardcoded. It
 * read "(dev)" on every run for a while, including real production
 * migrations, which is a quiet way to teach an operator to trust the
 * wrong thing.
 *
 *   node --env-file=.env.local scripts/apply-sql.mjs --file=drizzle/0029_payments.sql
 *   node --env-file=.env.local scripts/apply-sql.mjs --file=drizzle/0050_x.sql --prod
 */
import { readFile } from "node:fs/promises";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [[m[1], m[2]]] : [];
  }),
);
const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };
const file = (args.file || "").trim();
if (!file) die("Pass --file=<path to .sql>.");

const PROD = process.argv.includes("--prod");
const conn = PROD
  ? process.env.DATABASE_URL_PROD
  : process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!conn) die(PROD ? "DATABASE_URL_PROD unset." : "DATABASE_URL_UNPOOLED / DATABASE_URL unset.");
const host = new URL(conn).host;
if (PROD) {
  if (!/tiny-resonance/.test(host)) die(`--prod expected the prod host, got ${host}. Aborting.`);
} else if (/tiny-resonance/.test(host)) {
  die(`Refusing: ${host} looks like PROD. Pass --prod to target prod intentionally.`);
}

const sqlText = await readFile(file, "utf8");
const statements = sqlText
  .split(/-->\s*statement-breakpoint/)
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter((s) => s.length > 0);

console.log(`\nApplying ${file}`);
// Derived, never hardcoded. This label is the only thing standing
// between an operator and the belief that they just migrated dev.
console.log(`  host       : ${host}`);
console.log(`  target     : ${PROD ? "PRODUCTION" : "dev"}`);
console.log(`  statements : ${statements.length}\n`);

const pool = new Pool({ connectionString: conn });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const [i, stmt] of statements.entries()) {
    const preview = stmt.split("\n")[0].slice(0, 70);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `);
    await client.query(stmt);
    console.log("ok");
  }
  await client.query("COMMIT");
  console.log("\n✓ Applied.\n");
} catch (e) {
  await client.query("ROLLBACK");
  die(`Failed (rolled back): ${e instanceof Error ? e.message : String(e)}`);
} finally {
  client.release();
  await pool.end();
}
