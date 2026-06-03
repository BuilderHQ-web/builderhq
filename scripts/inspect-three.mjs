#!/usr/bin/env node
/**
 * One-shot inspection of the 3 builder accounts involved in the
 * abn/licence rotation before we touch anything.
 *
 * Usage:
 *   node --env-file=.env.local scripts/inspect-three.mjs
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

const EMAILS = [
  "vaderaaryan1505@gmail.com",
  "accounts.vic@synergybuilding.net.au",
  "moe@synergybuilding.net.au",
];

try {
  for (const email of EMAILS) {
    console.log(`\n── ${email} ─────────────────────────────────`);
    const u = await c.query(
      `SELECT id, first_name, last_name, role, status FROM users WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );
    if (u.rows.length === 0) {
      console.log("  USER NOT FOUND");
      continue;
    }
    const user = u.rows[0];
    console.log(`  user.id = ${user.id}`);
    console.log(`  name    = ${user.first_name} ${user.last_name ?? ""}`);
    console.log(`  role    = ${user.role}  status=${user.status}`);

    const bp = await c.query(
      `SELECT
         company_name, trading_name, abn, acn,
         business_address_line1, business_suburb, business_state, business_postcode,
         bio, website, linkedin_url, instagram_url,
         years_in_operation,
         approval_status, score_total,
         onboarding_completed_at
       FROM builder_profiles WHERE user_id = $1`,
      [user.id],
    );
    if (bp.rows.length === 0) {
      console.log("  builder_profile = (none)");
    } else {
      const p = bp.rows[0];
      console.log(`  company   = ${p.company_name ?? "—"}`);
      console.log(`  trading   = ${p.trading_name ?? "—"}`);
      console.log(`  abn       = ${p.abn ?? "—"}`);
      console.log(`  acn       = ${p.acn ?? "—"}`);
      console.log(
        `  address   = ${p.business_address_line1 ?? "—"}, ${p.business_suburb ?? "—"} ${p.business_state ?? "—"} ${p.business_postcode ?? "—"}`,
      );
      console.log(`  years_op  = ${p.years_in_operation ?? "—"}`);
      console.log(`  approval  = ${p.approval_status}`);
      console.log(`  bio       = ${(p.bio ?? "—").slice(0, 60)}${(p.bio ?? "").length > 60 ? "…" : ""}`);
      console.log(`  website   = ${p.website ?? "—"}`);
    }

    const lic = await c.query(
      `SELECT id, state, licence_type, licence_number,
              issued_at::date as iss, expires_at::date as exp,
              verification_status
       FROM builder_licences WHERE builder_id = $1
       ORDER BY created_at`,
      [user.id],
    );
    console.log(`  licences  = ${lic.rows.length}`);
    for (const l of lic.rows) {
      console.log(
        `    · ${l.state} ${l.licence_type ?? ""}  num=${l.licence_number}  iss=${l.iss}  exp=${l.exp}  status=${l.verification_status}`,
      );
    }

    const sa = await c.query(
      `SELECT state, suburb, radius_km FROM builder_service_areas WHERE builder_id = $1`,
      [user.id],
    );
    console.log(`  service_areas = ${sa.rows.length}`);
    for (const s of sa.rows) {
      console.log(`    · ${s.state} ${s.suburb ?? "(statewide)"} r=${s.radius_km}km`);
    }

    const cats = await c.query(
      `SELECT category FROM builder_project_categories WHERE builder_id = $1`,
      [user.id],
    );
    console.log(`  categories = ${cats.rows.map(x => x.category).join(", ") || "(none)"}`);
  }
} finally {
  c.release();
  await pool.end();
}
