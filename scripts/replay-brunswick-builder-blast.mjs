#!/usr/bin/env node
/**
 * replay-brunswick-builder-blast.mjs
 *
 * One-shot: re-send the "project published" notification to the 14
 * builders the Vercel serverless dispatch dropped on Brunswick Dwelling.
 *
 * Why this is needed:
 *   The publish action in src/modules/projects/service.ts wraps the
 *   builder fan-out in a `void (async ...)` IIFE — fire-and-forget. On
 *   Vercel serverless, the function runtime is terminated shortly after
 *   the response is returned to the user, killing any in-flight
 *   background work. The fan-out is paced at 8 emails / 1.1s = ~3.5s
 *   minimum for the full 26-builder list. Vercel's runtime cut the
 *   function before batches 3-4 could fire.
 *
 * The proper fix is to wrap the dispatch in `after()` from `next/server`
 * (Next 16) or Vercel's `waitUntil()`. Filed as a follow-up. For now,
 * this script does the work the runtime didn't.
 *
 * What it does:
 *   1. Pulls Brunswick Dwelling project + the 14 missed builder records.
 *   2. For each missed builder:
 *      a. Computes isInServiceArea by joining builder_service_areas
 *         against project state/suburb (same logic as dispatch.ts).
 *      b. Ensures the user has an unsubscribe_token (lazy generates).
 *      c. Posts a publish-notification email to Resend with a
 *         hand-rolled HTML body that matches the template visually.
 *   3. Throttles 1.2s/send (well under Resend's free-tier rate limit).
 *
 * Idempotency: re-running will send duplicates. Run once. Dry-run first.
 *
 * Run:
 *   node --env-file=.env.local scripts/replay-brunswick-builder-blast.mjs --dry-run
 *   node --env-file=.env.local scripts/replay-brunswick-builder-blast.mjs --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

// ─── CLI ──────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;
console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}\n`);

// ─── Config ───────────────────────────────────────────────────────────
const PROJECT_ID = "ef83e15c-8da9-4244-a59b-fba1cef71572"; // Brunswick Dwelling
const BASE_URL = "https://builderhq.com.au";
const PROJECT_URL = `${BASE_URL}/builder/projects/brunswick-dwelling`;
const LOGO_URL = `${BASE_URL}/brand/BuilderHQ_email_logo.png`;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "BuilderHQ <info@builderhq.com.au>";
const THROTTLE_MS = 1200; // ~50 sends/min — safely under Resend free tier

if (!RESEND_API_KEY) {
  console.error("ERROR: RESEND_API_KEY not set in env.");
  process.exit(1);
}

// The 14 builders the Vercel cutoff missed — cross-referenced from the
// Resend dashboard against the 26 qualified at publish time.
const MISSED_EMAILS = [
  "1stavenueconstructions@gmail.com",
  "a.rj.m@outlook.com",
  "admin@cozylivingcanberra.com.au",
  "adrian@urbacon.com.au",
  "andrewspanos@outlook.com",
  "anna@thebuildersproject.melbourne",
  "bailey@rivercresthomes.com.au",
  "dennis@planthenbuild.com",
  "info@homesbydesigngroup.com.au",
  "info@inverlochbuilders.com.au",
  "matthew@pachebuilt.com",
  "phillip@innovacorp.com.au",
  "tristan@taren.net.au",
  "vaderaaryan1505@gmail.com",
];

// ─── Brand tokens ─────────────────────────────────────────────────────
const C = {
  bg: "#03090f",
  surface: "#0a1622",
  border: "#1a2632",
  text: "#eef6ff",
  muted: "#a8c2d8",
  dim: "#6a8294",
  faint: "#4a5e6e",
  accent: "#00d4c8",
  accentText: "#031118",
  accentMuted: "rgba(0,212,200,0.06)",
};
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = "'Bebas Neue', Impact, Helvetica, Arial, sans-serif";

const TYPE_LABEL = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};
const BUDGET_LABEL = {
  under_500k: "Under $500k",
  "500k_1m": "$500k–$1M",
  "1m_1_5m": "$1M–$1.5M",
  "1_5m_2m": "$1.5M–$2M",
  "2m_3m": "$2M–$3M",
  "3m_5m": "$3M–$5M",
  over_5m: "Over $5M",
};

// ─── Email body builder ──────────────────────────────────────────────
function buildEmail({ firstName, project, isInServiceArea, unsubscribeUrl }) {
  const greet = firstName ? `Hi ${firstName},` : "Hi,";
  const location =
    [project.suburb, project.state].filter(Boolean).join(", ") || "—";
  const typeLabel = TYPE_LABEL[project.type] ?? project.type;
  const budgetLabel = project.budgetBand
    ? BUDGET_LABEL[project.budgetBand] ?? project.budgetBand
    : null;
  const subject = isInServiceArea
    ? `New ${typeLabel} in your area — ${location}`
    : `New project on BuilderHQ — ${project.title}`;
  const kicker = isInServiceArea ? "IN YOUR SERVICE AREA" : "NEW PROJECT";
  const inServiceLine = isInServiceArea
    ? " — and it sits inside your service area"
    : "";

  // Hand-rolled HTML matching the EmailShell visual structure. Tables
  // for layout (email-safe). Inline styles only (clients strip <style>
  // from <body>). dark-only color-scheme so Outlook/Apple Mail don't
  // auto-invert.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width: 480px) {
    .bhq-container { padding-left: 16px !important; padding-right: 16px !important; }
    .bhq-card { padding: 28px 22px !important; }
    .bhq-heading { font-size: 32px !important; }
    .bhq-cta { width: 100% !important; box-sizing: border-box; }
    .bhq-logo { width: 120px !important; height: 29px !important; }
  }
  [data-ogsc] .bhq-body { background-color: ${C.bg} !important; }
  [data-ogsc] .bhq-card { background-color: ${C.surface} !important; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
</style>
</head>
<body class="bhq-body" style="background-color:${C.bg};color:${C.text};font-family:${SANS};margin:0;padding:32px 0 48px 0;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;color:${C.bg};line-height:1px;">${escapeHtml(`New ${typeLabel.toLowerCase()} in ${location}`)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="560" class="bhq-container" style="max-width:560px;margin:0 auto;padding:0 24px;">
    <tr><td>
      <!-- Logo -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="padding:0 0 24px 0;">
        <tr><td>
          <a href="${BASE_URL}" style="text-decoration:none;display:inline-block;">
            <img src="${LOGO_URL}" alt="BuilderHQ" class="bhq-logo" width="140" height="34" style="display:block;width:140px;height:34px;border:0;outline:none;text-decoration:none;" />
          </a>
        </td></tr>
      </table>
      <!-- Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bhq-card" style="background-color:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:40px 36px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04),0 24px 48px -28px rgba(0,212,200,0.12);">
        <tr><td>
          <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${C.accent};margin:0 0 14px 0;font-weight:700;">${kicker}</p>
          <h1 class="bhq-heading" style="font-family:${DISPLAY};font-size:38px;line-height:1.06;letter-spacing:-0.005em;color:${C.text};margin:0 0 16px 0;text-transform:uppercase;font-weight:400;">${escapeHtml(project.title)}</h1>
          <p style="font-size:15px;line-height:26px;color:${C.muted};margin:0 0 18px 0;">${escapeHtml(greet)}</p>
          <p style="font-size:15px;line-height:26px;color:${C.muted};margin:0 0 18px 0;">A new project just went live on the marketplace${escapeHtml(inServiceLine)}.</p>
          <!-- MetaCard -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.accentMuted};border:1px solid ${C.border};border-radius:8px;padding:18px 20px;margin:4px 0 24px 0;">
            <tr><td>
              <p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">Type</span><span style="color:${C.text};font-weight:600;">${escapeHtml(typeLabel)}</span></p>
              <p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">Location</span><span style="color:${C.text};font-weight:600;">${escapeHtml(location)}</span></p>
              ${budgetLabel ? `<p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">Budget</span><span style="color:${C.text};font-weight:600;">${escapeHtml(budgetLabel)}</span></p>` : ""}
            </td></tr>
          </table>
          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td>
              <a href="${PROJECT_URL}" class="bhq-cta" style="background-color:${C.accent};color:${C.accentText};font-size:14px;font-weight:700;letter-spacing:0.04em;padding:14px 28px;border-radius:4px;text-decoration:none;text-align:center;display:inline-block;box-shadow:0 4px 16px -6px rgba(0,212,200,0.45);">View project</a>
            </td></tr>
          </table>
          <p style="font-size:12px;line-height:20px;color:${C.dim};margin:20px 0 0 0;">Address, owner contact, and downloadable documents are private until you unlock — free with your Founding Builder Access.</p>
        </td></tr>
      </table>
      <!-- Footer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:28px 4px 0 4px;">
        <tr><td>
          <p style="font-size:11px;line-height:18px;letter-spacing:0.10em;color:${C.dim};margin:0 0 6px 0;text-transform:uppercase;font-weight:600;">BuilderHQ · Australia's residential tender platform</p>
          <p style="font-size:11.5px;line-height:18px;color:${C.dim};margin:0 0 6px 0;">Melbourne, Victoria, Australia · <a href="mailto:info@builderhq.com.au" style="color:${C.muted};text-decoration:underline;">info@builderhq.com.au</a></p>
          <p style="font-size:11px;line-height:17px;color:${C.faint};margin:10px 0 0 0;">You're receiving this because you're a builder on BuilderHQ. Tender outcome and account emails are operational and always come through. <a href="${unsubscribeUrl}" style="color:${C.accent};text-decoration:underline;">Unsubscribe from new-project alerts</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `${greet}\n\n` +
    `A new project just went live on BuilderHQ${inServiceLine}.\n\n` +
    `${project.title}\n` +
    `Type: ${typeLabel}\n` +
    `Location: ${location}\n` +
    (budgetLabel ? `Budget: ${budgetLabel}\n` : "") +
    `\nView project: ${PROJECT_URL}\n\n` +
    `Address, owner contact, and downloadable documents are private until you unlock — free with your Founding Builder Access.\n\n` +
    `—\nBuilderHQ · Melbourne, Victoria · info@builderhq.com.au\n` +
    `Unsubscribe from new-project alerts: ${unsubscribeUrl}\n`;

  return { subject, html, text };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ─── DB queries ──────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  // 1. Project metadata
  const projRes = await c.query(
    `SELECT id, slug, title, type, suburb, state, budget_band
     FROM projects WHERE id = $1`,
    [PROJECT_ID],
  );
  if (projRes.rows.length === 0) {
    console.error("Project not found:", PROJECT_ID);
    process.exit(1);
  }
  const p = projRes.rows[0];
  const project = {
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type,
    suburb: p.suburb,
    state: p.state,
    budgetBand: p.budget_band,
  };
  console.log("Project:", project);
  console.log("");

  // 2. Resolve all 14 missed builders + their service-area match
  const buildersRes = await c.query(
    `SELECT u.id, u.email, u.name, u.unsubscribe_token,
            EXISTS (
              SELECT 1 FROM builder_service_areas sa
              WHERE sa.builder_id = u.id
                AND sa.state = $2
                AND (sa.suburb = $3 OR sa.radius_km >= 50)
            ) AS is_in_service_area
     FROM users u
     WHERE lower(u.email) = ANY($1::text[])
     ORDER BY u.email`,
    [MISSED_EMAILS.map((e) => e.toLowerCase()), project.state, project.suburb],
  );

  const foundEmails = new Set(buildersRes.rows.map((r) => r.email.toLowerCase()));
  const notFound = MISSED_EMAILS.filter((e) => !foundEmails.has(e.toLowerCase()));
  if (notFound.length > 0) {
    console.error("Missing user rows for:", notFound);
  }

  // 3. Plan
  console.log(`Plan: send to ${buildersRes.rows.length} builders.`);
  for (const r of buildersRes.rows) {
    const tag = r.is_in_service_area ? "[in-area]" : "[          ]";
    console.log(`  ${tag} ${r.email.padEnd(40)} ${r.name ?? ""}`);
  }
  console.log("");

  if (DRY) {
    console.log("Dry run — no sends. Re-run with --apply.");
    process.exit(0);
  }

  // 4. Send loop. Lazy-generate unsubscribe_token if missing.
  let sent = 0;
  let failed = 0;
  for (const r of buildersRes.rows) {
    let token = r.unsubscribe_token;
    if (!token) {
      token = randomUUID();
      await c.query(
        `UPDATE users SET unsubscribe_token = $1 WHERE id = $2 AND unsubscribe_token IS NULL`,
        [token, r.id],
      );
      const verify = await c.query(
        `SELECT unsubscribe_token FROM users WHERE id = $1`,
        [r.id],
      );
      token = verify.rows[0].unsubscribe_token;
    }
    const unsubscribeUrl = `${BASE_URL}/api/unsubscribe/${token}`;

    const firstName = r.name ? r.name.split(" ")[0] : null;
    const { subject, html, text } = buildEmail({
      firstName,
      project,
      isInServiceArea: r.is_in_service_area,
      unsubscribeUrl,
    });

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [r.email],
          subject,
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "category", value: "project_published_builder" },
            { name: "replay", value: "brunswick_dwelling" },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        failed++;
        console.error(`  ✗ ${r.email}  ${res.status} — ${err.slice(0, 160)}`);
      } else {
        const data = await res.json();
        sent++;
        console.log(`  ✓ ${r.email.padEnd(40)} resendId=${data.id}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${r.email}  threw: ${err.message}`);
    }

    await new Promise((res) => setTimeout(res, THROTTLE_MS));
  }

  console.log(`\nDone. sent=${sent} failed=${failed} of ${buildersRes.rows.length}.`);
} finally {
  c.release();
  await pool.end();
}
