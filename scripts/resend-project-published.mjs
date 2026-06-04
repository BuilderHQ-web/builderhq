#!/usr/bin/env node
/**
 * resend-project-published.mjs
 *
 * Backfill the "project published" builder email for a project whose
 * fan-out got cut off by the Vercel serverless cutoff (the throttled
 * batch loop only sends batch 1 of 8 before the function is killed).
 *
 * It re-derives the eligible builder list from the DB (same criteria as
 * src/modules/projects/dispatch.ts → fanOutToBuilders), DE-DUPES against
 * Resend (so builders who already received it are skipped), and emails
 * only the rest. Safe to re-run.
 *
 * Eligible = role=builder, marketing_emails_enabled, not deleted, has a
 * builder_profile that isn't 'incomplete', and existed at publish time.
 *
 * Email body is identical to the live ProjectPublishedBuilderEmail
 * (hand-rolled to match, same as replay-brunswick) so backfilled mail
 * looks like the original blast. Standalone — needs only a DB url
 * (DATABASE_URL_PROD or DATABASE_URL) + RESEND_API_KEY.
 *
 * Run (point the DB url at PROD):
 *   node --env-file=.env.local scripts/resend-project-published.mjs --project=<slug> --dry-run
 *   node --env-file=.env.local scripts/resend-project-published.mjs --project=<slug> --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

// ─── CLI ──────────────────────────────────────────────────────────────
const ARGS = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const APPLY = !!ARGS.apply;
const DRY = !APPLY;
const PROJECT_SLUG = ARGS.project;
if (!PROJECT_SLUG) {
  console.error("Usage: --project=<slug> [--apply]");
  process.exit(1);
}
console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}  project=${PROJECT_SLUG}\n`);

// ─── Config ───────────────────────────────────────────────────────────
const DB_URL = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "BuilderHQ <info@builderhq.com.au>";
const BASE_URL = "https://builderhq.com.au";
const LOGO_URL = `${BASE_URL}/brand/BuilderHQ_email_logo.png`;
const THROTTLE_MS = 1200;
if (!DB_URL) { console.error("ERROR: no DATABASE_URL_PROD / DATABASE_URL."); process.exit(1); }
if (!RESEND_API_KEY) { console.error("ERROR: RESEND_API_KEY not set."); process.exit(1); }
try {
  console.log(`DB host: ${new URL(DB_URL.replace(/^postgres(ql)?:/, "http:")).host}${process.env.DATABASE_URL_PROD ? "  (via DATABASE_URL_PROD)" : ""}\n`);
} catch { /* ignore */ }

// ─── Brand tokens + email body (verbatim from replay-brunswick) ───────
const C = { bg: "#03090f", surface: "#0a1622", border: "#1a2632", text: "#eef6ff", muted: "#a8c2d8", dim: "#6a8294", faint: "#4a5e6e", accent: "#00d4c8", accentText: "#031118", accentMuted: "rgba(0,212,200,0.06)" };
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = "'Bebas Neue', Impact, Helvetica, Arial, sans-serif";
const TYPE_LABEL = { single_dwelling: "Single dwelling", multi_dwelling: "Multi-dwelling", renovation: "Renovation", extension: "Extension" };
const BUDGET_LABEL = { under_500k: "Under $500k", "500k_1m": "$500k–$1M", "1m_1_5m": "$1M–$1.5M", "1_5m_2m": "$1.5M–$2M", "2m_3m": "$2M–$3M", "3m_5m": "$3M–$5M", over_5m: "Over $5M" };

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function buildEmail({ firstName, project, isInServiceArea, unsubscribeUrl }) {
  const greet = firstName ? `Hi ${firstName},` : "Hi,";
  const location = [project.suburb, project.state].filter(Boolean).join(", ") || "—";
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const budgetLabel = project.budgetBand ? BUDGET_LABEL[project.budgetBand] ?? project.budgetBand : null;
  const projectUrl = `${BASE_URL}/builder/projects/${project.slug}`;
  const subject = isInServiceArea ? `New ${typeLabel} in your area — ${location}` : `New project on BuilderHQ — ${project.title}`;
  const kicker = isInServiceArea ? "IN YOUR SERVICE AREA" : "NEW PROJECT";
  const inServiceLine = isInServiceArea ? " — and it sits inside your service area" : "";
  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8" /><meta name="color-scheme" content="dark only" /><meta name="supported-color-schemes" content="dark only" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
<style>@media only screen and (max-width:480px){.bhq-container{padding-left:16px!important;padding-right:16px!important}.bhq-card{padding:28px 22px!important}.bhq-heading{font-size:32px!important}.bhq-cta{width:100%!important;box-sizing:border-box}.bhq-logo{width:120px!important;height:29px!important}}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}</style></head>
<body class="bhq-body" style="background-color:${C.bg};color:${C.text};font-family:${SANS};margin:0;padding:32px 0 48px 0;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;color:${C.bg};line-height:1px;">${escapeHtml(`New ${typeLabel.toLowerCase()} in ${location}`)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="560" class="bhq-container" style="max-width:560px;margin:0 auto;padding:0 24px;"><tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="padding:0 0 24px 0;"><tr><td><a href="${BASE_URL}" style="text-decoration:none;display:inline-block;"><img src="${LOGO_URL}" alt="BuilderHQ" class="bhq-logo" width="140" height="34" style="display:block;width:140px;height:34px;border:0;outline:none;text-decoration:none;" /></a></td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bhq-card" style="background-color:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:40px 36px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04),0 24px 48px -28px rgba(0,212,200,0.12);"><tr><td>
<p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${C.accent};margin:0 0 14px 0;font-weight:700;">${kicker}</p>
<h1 class="bhq-heading" style="font-family:${DISPLAY};font-size:38px;line-height:1.06;letter-spacing:-0.005em;color:${C.text};margin:0 0 16px 0;text-transform:uppercase;font-weight:400;">${escapeHtml(project.title)}</h1>
<p style="font-size:15px;line-height:26px;color:${C.muted};margin:0 0 18px 0;">${escapeHtml(greet)}</p>
<p style="font-size:15px;line-height:26px;color:${C.muted};margin:0 0 18px 0;">A new project just went live on the marketplace${escapeHtml(inServiceLine)}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.accentMuted};border:1px solid ${C.border};border-radius:8px;padding:18px 20px;margin:4px 0 24px 0;"><tr><td>
<p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">Type</span><span style="color:${C.text};font-weight:600;">${escapeHtml(typeLabel)}</span></p>
<p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">Location</span><span style="color:${C.text};font-weight:600;">${escapeHtml(location)}</span></p>
${budgetLabel ? `<p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">Budget</span><span style="color:${C.text};font-weight:600;">${escapeHtml(budgetLabel)}</span></p>` : ""}
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td><a href="${projectUrl}" class="bhq-cta" style="background-color:${C.accent};color:${C.accentText};font-size:14px;font-weight:700;letter-spacing:0.04em;padding:14px 28px;border-radius:4px;text-decoration:none;text-align:center;display:inline-block;box-shadow:0 4px 16px -6px rgba(0,212,200,0.45);">View project</a></td></tr></table>
<p style="font-size:12px;line-height:20px;color:${C.dim};margin:20px 0 0 0;">Address, owner contact, and downloadable documents are private until you unlock — free with your Founding Builder Access.</p>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:28px 4px 0 4px;"><tr><td>
<p style="font-size:11px;line-height:18px;letter-spacing:0.10em;color:${C.dim};margin:0 0 6px 0;text-transform:uppercase;font-weight:600;">BuilderHQ · Australia's residential tender platform</p>
<p style="font-size:11.5px;line-height:18px;color:${C.dim};margin:0 0 6px 0;">Melbourne, Victoria, Australia · <a href="mailto:info@builderhq.com.au" style="color:${C.muted};text-decoration:underline;">info@builderhq.com.au</a></p>
<p style="font-size:11px;line-height:17px;color:${C.faint};margin:10px 0 0 0;">You're receiving this because you're a builder on BuilderHQ. Tender outcome and account emails are operational and always come through. <a href="${unsubscribeUrl}" style="color:${C.accent};text-decoration:underline;">Unsubscribe from new-project alerts</a>.</p>
</td></tr></table>
</td></tr></table></body></html>`;
  const text = `${greet}\n\nA new project just went live on BuilderHQ${inServiceLine}.\n\n${project.title}\nType: ${typeLabel}\nLocation: ${location}\n${budgetLabel ? `Budget: ${budgetLabel}\n` : ""}\nView project: ${projectUrl}\n\nAddress, owner contact, and downloadable documents are private until you unlock — free with your Founding Builder Access.\n\n—\nBuilderHQ · Melbourne, Victoria · info@builderhq.com.au\nUnsubscribe from new-project alerts: ${unsubscribeUrl}\n`;
  return { subject, html, text };
}

// ─── Resend: who already received this project's builder email? ───────
async function alreadyEmailedSet(project, publishedAtMs) {
  const set = new Set();
  // Match a footscray builder email by subject: either the generic
  // "… — <title>" or the in-area "… — <suburb>, <state>".
  const titleNeedle = project.title;
  const areaNeedle = [project.suburb, project.state].filter(Boolean).join(", ");
  let url = "https://api.resend.com/emails?limit=100";
  for (let page = 0; page < 8; page++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
    const b = await r.json();
    const arr = b.data || [];
    if (arr.length === 0) break;
    let oldest = Infinity;
    for (const e of arr) {
      const t = new Date(e.created_at).getTime();
      oldest = Math.min(oldest, t);
      const subj = e.subject || "";
      const isPublish = subj.startsWith("New ") && (subj.includes(titleNeedle) || (areaNeedle && subj.includes(areaNeedle)));
      if (isPublish) for (const to of e.to || []) set.add(to.toLowerCase());
    }
    // Stop once we've paged past the publish moment (all relevant mail
    // is at/after published_at).
    if (!b.has_more || oldest < publishedAtMs - 60_000) break;
    url = `https://api.resend.com/emails?limit=100&after=${arr[arr.length - 1].id}`;
  }
  return set;
}

// ─── Main ─────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: DB_URL });
const c = await pool.connect();
try {
  const projRes = await c.query(
    `SELECT id, slug, title, type, suburb, state, budget_band, published_at
       FROM projects WHERE slug = $1`,
    [PROJECT_SLUG],
  );
  if (projRes.rows.length === 0) { console.error(`Project not found: ${PROJECT_SLUG}`); process.exit(1); }
  const p = projRes.rows[0];
  const project = { id: p.id, slug: p.slug, title: p.title, type: p.type, suburb: p.suburb, state: p.state, budgetBand: p.budget_band };
  const publishedAtMs = p.published_at ? new Date(p.published_at).getTime() : Date.now();
  console.log(`PROJECT: ${project.title}  | published_at ${p.published_at ? new Date(p.published_at).toISOString() : "NULL"}\n`);

  // Eligible builders — exact fanOutToBuilders criteria + existed at publish.
  const eligRes = await c.query(
    `SELECT u.id, u.email, u.name, u.unsubscribe_token,
            EXISTS (SELECT 1 FROM builder_service_areas sa
                     WHERE sa.builder_id = u.id AND sa.state = $1
                       AND (sa.suburb = $2 OR sa.radius_km >= 50)) AS is_in_service_area
       FROM users u
       JOIN builder_profiles bp ON bp.user_id = u.id
      WHERE u.role = 'builder'
        AND u.marketing_emails_enabled = true
        AND u.deleted_at IS NULL
        AND bp.approval_status <> 'incomplete'
        AND u.created_at <= $3
      ORDER BY u.email`,
    [project.state, project.suburb, p.published_at ?? new Date()],
  );
  const eligible = eligRes.rows;

  console.log(`Eligible builders (existed at publish): ${eligible.length}`);
  const sentSet = await alreadyEmailedSet(project, publishedAtMs);
  console.log(`Already emailed (per Resend): ${sentSet.size}`);

  const recipients = eligible.filter((b) => !sentSet.has(b.email.toLowerCase()));
  console.log(`\nTO SEND (eligible − already-emailed): ${recipients.length}`);
  for (const b of recipients) console.log(`   ${b.is_in_service_area ? "[in-area]" : "[       ]"} ${b.email.padEnd(40)} ${b.name ?? ""}`);
  console.log("");

  if (DRY) { console.log("Dry run — nothing sent. Re-run with --apply."); process.exit(0); }

  let sent = 0, failed = 0;
  for (const b of recipients) {
    let token = b.unsubscribe_token;
    if (!token) {
      token = randomUUID();
      await c.query(`UPDATE users SET unsubscribe_token = $1 WHERE id = $2 AND unsubscribe_token IS NULL`, [token, b.id]);
      const v = await c.query(`SELECT unsubscribe_token FROM users WHERE id = $1`, [b.id]);
      token = v.rows[0].unsubscribe_token;
    }
    const unsubscribeUrl = `${BASE_URL}/api/unsubscribe/${token}`;
    const firstName = b.name ? b.name.split(" ")[0] : null;
    const { subject, html, text } = buildEmail({ firstName, project, isInServiceArea: b.is_in_service_area, unsubscribeUrl });
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: EMAIL_FROM, to: [b.email], subject, html, text,
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          tags: [{ name: "category", value: "project_published_builder" }, { name: "replay", value: "publish_backfill" }],
        }),
      });
      if (!res.ok) { failed++; console.error(`  ✗ ${b.email}  ${res.status} — ${(await res.text()).slice(0, 140)}`); }
      else { sent++; console.log(`  ✓ ${b.email.padEnd(40)} resendId=${(await res.json()).id}`); }
    } catch (err) { failed++; console.error(`  ✗ ${b.email}  threw: ${err.message}`); }
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }
  console.log(`\nDone. sent=${sent} failed=${failed} of ${recipients.length}.`);
} finally {
  c.release();
  await pool.end();
}
