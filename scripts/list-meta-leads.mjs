/**
 * list-meta-leads.mjs — read the leads that arrived from Meta Lead Ads.
 *
 * STRICTLY READ-ONLY. One SELECT, nothing else, which is why it is safe
 * to point at production. There is no admin screen for leads yet, so
 * this is how the campaign gets checked.
 *
 *   node --env-file=.env.local scripts/list-meta-leads.mjs          # dev
 *   node --env-file=.env.local scripts/list-meta-leads.mjs --prod   # production
 *   ... --json     full rows including every stored answer
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const PROD = process.argv.includes("--prod");
const AS_JSON = process.argv.includes("--json");
const conn = PROD ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;

if (!conn) {
  console.error(PROD ? "DATABASE_URL_PROD is not set" : "DATABASE_URL is not set");
  process.exit(1);
}
const host = new URL(conn).host;
const isProdHost = /tiny-resonance/.test(host);
if (PROD !== isProdHost) {
  console.error(`Refusing: --prod=${PROD} but the host is ${host}`);
  process.exit(1);
}

const pool = new Pool({ connectionString: conn });
const { rows } = await pool.query(`
  SELECT id, first_name, last_name, email, phone, source, meta,
         ops_notified_at, created_at
    FROM leads
   WHERE external_source = 'meta_lead_ads'
     AND deleted_at IS NULL
   ORDER BY created_at DESC
`);

if (AS_JSON) {
  console.log(JSON.stringify({ target: isProdHost ? "PRODUCTION" : "dev", host, rows }, null, 2));
} else {
  const bar = "─".repeat(78);
  console.log(`\n${bar}`);
  console.log(`  META LEAD ADS — ${isProdHost ? "PRODUCTION" : "dev"} · ${host}`);
  console.log(bar);
  if (rows.length === 0) {
    console.log("\n  No leads yet.\n");
  }
  for (const r of rows) {
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ");
    const when = new Date(r.created_at).toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
    });
    console.log(`\n  ${name}   ${when} AEST`);
    console.log(`    ${r.email || "(no email)"}   ${r.phone || "(no phone)"}`);
    console.log(`    campaign: ${r.meta?.campaign_name ?? "—"}   ad: ${r.meta?.ad_name ?? "—"}`);
    const answers = r.meta?.answers ?? {};
    for (const [k, v] of Object.entries(answers)) console.log(`    ${k}: ${v}`);
    if (!r.ops_notified_at) console.log(`    (ops was never notified about this one)`);
  }
  console.log(`\n${bar}`);
  console.log(`  ${rows.length} lead(s). Read-only. Nothing was written.`);
  console.log(`${bar}\n`);
}

await pool.end();
