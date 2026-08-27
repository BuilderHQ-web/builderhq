#!/usr/bin/env node
/**
 * prod-grant-unlocks.mjs — SILENTLY pre-assign builders onto a project.
 *
 * Inserts unlock rows with source='admin' (the Sam precedent): a raw
 * insert, so NO dispatch runs, no emails fire, no bells ring. On a
 * draft project the builders can see nothing — every builder-facing
 * query gates on status IN (published, tendering) — so the grant is
 * invisible until go-live, when the publish dispatch sends their
 * unlock email and excludes them from the network blast.
 *
 * Idempotent: ON CONFLICT DO NOTHING on (builder, project).
 *
 *   node --env-file=.env.local scripts/prod-grant-unlocks.mjs \
 *     --slug=<project slug> --emails=a@x.com,b@y.com [--apply]
 */
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };
const APPLY = process.argv.includes("--apply");
const argOf = (f) => (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const SLUG = argOf("--slug").trim();
const EMAILS = argOf("--emails").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!SLUG) die("Pass --slug=<project slug>.");
if (EMAILS.length === 0) die("Pass --emails=a@x.com,b@y.com");

const conn = process.env.DATABASE_URL_PROD;
if (!conn) die("DATABASE_URL_PROD unset.");
if (!/tiny-resonance/.test(new URL(conn).host)) die("Expected the PROD host.");
const pool = new Pool({ connectionString: conn });

try {
  const [p] = (await pool.query(
    `select id, title, slug, status, tender_mode, deleted_at from projects where slug=$1`, [SLUG])).rows;
  if (!p) die(`No project with slug ${SLUG}.`);
  if (p.deleted_at) die("Project is soft-deleted.");
  console.log(`\n${APPLY ? "── APPLY ──" : "── DRY RUN ──"}  (prod)`);
  console.log(`project : ${p.title}  [${p.status} · ${p.tender_mode}]`);

  const grants = [];
  for (const email of EMAILS) {
    const [u] = (await pool.query(
      `select u.id, u.email, u.role, u.status, bp.company_name, bp.approval_status
         from users u left join builder_profiles bp on bp.user_id=u.id
        where lower(u.email)=lower($1)`, [email])).rows;
    if (!u) die(`No user: ${email}`);
    if (u.role !== "builder") die(`${email} is role=${u.role}, expected builder.`);
    if (u.status !== "active" && u.status !== "pending_verification")
      die(`${email} is status=${u.status} — refusing.`);
    const [existing] = (await pool.query(
      `select source, unlocked_at from unlocks where builder_id=$1 and project_id=$2`, [u.id, p.id])).rows;
    grants.push({ u, existing });
    const note = [
      u.status !== "active" ? `status=${u.status}` : null,
      u.approval_status !== "approved" ? `approval=${u.approval_status ?? "no profile"}` : null,
    ].filter(Boolean).join(", ");
    console.log(`  ${existing ? "HAS " : "GRANT"}  ${u.email.padEnd(36)} ${u.company_name ?? "(no company)"}${note ? `  [${note}]` : ""}`);
  }

  const before = (await pool.query(
    `select count(*)::int c from unlocks where project_id=$1`, [p.id])).rows[0].c;
  console.log(`\nunlocks on project before: ${before}`);

  if (!APPLY) { console.log("\nDRY RUN — nothing inserted. Re-run with --apply."); process.exit(0); }

  let inserted = 0;
  for (const { u } of grants) {
    const r = await pool.query(
      `insert into unlocks (builder_id, project_id, source)
       values ($1, $2, 'admin')
       on conflict (builder_id, project_id) do nothing`, [u.id, p.id]);
    inserted += r.rowCount;
  }
  const after = (await pool.query(
    `select count(*)::int c from unlocks where project_id=$1`, [p.id])).rows[0].c;
  console.log(`inserted: ${inserted}  |  unlocks now: ${after}`);
  // What happens next depends entirely on whether the round is still a
  // draft. On a draft the publish dispatch sends the deferred unlock
  // email at go-live. On a round that is ALREADY live there is no
  // remaining dispatch, so these builders are never told by the
  // platform at all — the concierge has to tell them.
  const live = p.status === "published" || p.status === "tendering";
  console.log(
    live
      ? "\nNo emails were sent, and none will be: this round is already live,\n" +
        "so the publish dispatch has already run. Tell these builders yourself,\n" +
        "or send the owner half with scripts/prod-send-unlock-owner.mts."
      : "\nNo emails were sent. They go out when the project publishes.",
  );
} finally {
  await pool.end();
}
