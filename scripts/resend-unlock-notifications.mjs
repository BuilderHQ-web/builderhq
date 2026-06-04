#!/usr/bin/env node
/**
 * resend-unlock-notifications.mjs
 *
 * One-shot: re-send the FULL unlock notification set for a single
 * (project, builder) unlock that got silently dropped by the
 * gatherContext bug in src/modules/unlocks/dispatch.ts — where the
 * context lookup filtered by builderId alone (+ limit 1), so for a
 * builder who'd unlocked more than one project it fetched the WRONG
 * unlock row, failed the projectId check, and sent NOTHING:
 *   - owner in-app bell      (notifications row)
 *   - owner email            ("<builder> unlocked your project")
 *   - builder receipt email  (address + owner contact)
 *   - ops email to info@     (heads-up)
 *
 * Emails are hand-rolled HTML matching the EmailShell templates — same
 * approach as replay-brunswick-builder-blast.mjs — so this stays
 * standalone with minimal env: DATABASE_URL + RESEND_API_KEY only.
 *
 * Idempotency: the bell insert is ON CONFLICT DO NOTHING. The EMAILS are
 * NOT idempotent — running with --apply twice re-sends them. Dry-run
 * first, apply once.
 *
 * Run (point --env-file at PROD to send to real recipients):
 *   node --env-file=.env.local scripts/resend-unlock-notifications.mjs \
 *     --project=footscray-3-multi-dwelling --builder=moe@example.com --dry-run
 *   node --env-file=.env.local scripts/resend-unlock-notifications.mjs \
 *     --project=footscray-3-multi-dwelling --builder=moe@example.com --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

// ─── CLI ──────────────────────────────────────────────────────────────
const ARGS = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
);
const APPLY = !!ARGS.apply;
const DRY = !APPLY;
const PROJECT_SLUG = ARGS.project;
const BUILDER_EMAIL = (ARGS.builder || "").toLowerCase();

if (!PROJECT_SLUG || !BUILDER_EMAIL) {
  console.error(
    "Usage: --project=<slug> --builder=<email> [--apply]\n" +
      "  (omit --apply for a dry run)",
  );
  process.exit(1);
}

console.log(
  `\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}  project=${PROJECT_SLUG}  builder=${BUILDER_EMAIL}\n`,
);

// ─── Config ───────────────────────────────────────────────────────────
const BASE_URL = "https://builderhq.com.au";
const LOGO_URL = `${BASE_URL}/brand/BuilderHQ_email_logo.png`;
const OPS_EMAIL = "info@builderhq.com.au";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "BuilderHQ <info@builderhq.com.au>";
const THROTTLE_MS = 1200;

// Prefer DATABASE_URL_PROD when present, so you can keep DATABASE_URL = dev
// in the same env-file and explicitly opt this backfill into production.
const DB_URL = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: no DATABASE_URL_PROD or DATABASE_URL set (use --env-file).");
  process.exit(1);
}
// Print the DB host (creds masked) so it's obvious which DB we're hitting.
try {
  const host = new URL(DB_URL.replace(/^postgres(ql)?:/, "http:")).host;
  console.log(
    `DB host: ${host}${process.env.DATABASE_URL_PROD ? "  (via DATABASE_URL_PROD)" : ""}\n`,
  );
} catch {
  /* ignore */
}
if (!RESEND_API_KEY) {
  console.error("ERROR: RESEND_API_KEY not set (use --env-file).");
  process.exit(1);
}

// ─── Brand tokens (match the email shell) ─────────────────────────────
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

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ─── HTML primitives (mirror EmailShell / MetaCard / PrimaryButton) ───
function metaCard(title, rows) {
  const body = rows
    .filter((r) => r && r[1] != null && r[1] !== "")
    .map(
      ([label, value]) =>
        `<p style="font-size:13px;line-height:22px;color:${C.dim};margin:0 0 4px 0;"><span style="color:${C.faint};letter-spacing:0.04em;margin-right:8px;">${escapeHtml(label)}</span><span style="color:${C.text};font-weight:600;">${escapeHtml(value)}</span></p>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.accentMuted};border:1px solid ${C.border};border-radius:8px;padding:18px 20px;margin:4px 0 22px 0;">
    <tr><td>${title ? `<p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.faint};margin:0 0 10px 0;font-weight:700;">${escapeHtml(title)}</p>` : ""}${body}</td></tr></table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px 0;"><tr><td>
    <a href="${href}" class="bhq-cta" style="background-color:${C.accent};color:${C.accentText};font-size:14px;font-weight:700;letter-spacing:0.04em;padding:14px 28px;border-radius:4px;text-decoration:none;text-align:center;display:inline-block;box-shadow:0 4px 16px -6px rgba(0,212,200,0.45);">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

function paragraph(html) {
  return `<p style="font-size:15px;line-height:26px;color:${C.muted};margin:0 0 18px 0;">${html}</p>`;
}

function caption(html) {
  return `<p style="font-size:12px;line-height:20px;color:${C.dim};margin:18px 0 0 0;">${html}</p>`;
}

function shell({ preview, kicker, heading, inner }) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(heading)}</title>
<style>
  @media only screen and (max-width:480px){.bhq-container{padding-left:16px!important;padding-right:16px!important}.bhq-card{padding:28px 22px!important}.bhq-heading{font-size:32px!important}.bhq-cta{width:100%!important;box-sizing:border-box}}
  a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
</style></head>
<body class="bhq-body" style="background-color:${C.bg};color:${C.text};font-family:${SANS};margin:0;padding:32px 0 48px 0;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;color:${C.bg};line-height:1px;">${escapeHtml(preview)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="560" class="bhq-container" style="max-width:560px;margin:0 auto;padding:0 24px;"><tr><td>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="padding:0 0 24px 0;"><tr><td>
      <a href="${BASE_URL}" style="text-decoration:none;display:inline-block;"><img src="${LOGO_URL}" alt="BuilderHQ" class="bhq-logo" width="140" height="34" style="display:block;width:140px;height:34px;border:0;outline:none;text-decoration:none;" /></a>
    </td></tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bhq-card" style="background-color:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:40px 36px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04),0 24px 48px -28px rgba(0,212,200,0.12);"><tr><td>
      <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${C.accent};margin:0 0 14px 0;font-weight:700;">${escapeHtml(kicker)}</p>
      <h1 class="bhq-heading" style="font-family:${DISPLAY};font-size:34px;line-height:1.08;letter-spacing:-0.005em;color:${C.text};margin:0 0 18px 0;text-transform:uppercase;font-weight:400;">${escapeHtml(heading)}</h1>
      ${inner}
    </td></tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:28px 4px 0 4px;"><tr><td>
      <p style="font-size:11px;line-height:18px;letter-spacing:0.10em;color:${C.dim};margin:0 0 6px 0;text-transform:uppercase;font-weight:600;">BuilderHQ · Australia's residential tender platform</p>
      <p style="font-size:11.5px;line-height:18px;color:${C.dim};margin:0;">Melbourne, Victoria, Australia · <a href="mailto:${OPS_EMAIL}" style="color:${C.muted};text-decoration:underline;">${OPS_EMAIL}</a></p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
}

// ─── The 3 emails (content from UnlockOwner/Builder/OpsEmail.tsx) ──────
function ownerEmail(ctx) {
  const greet = ctx.ownerFirstName ? `Hi ${ctx.ownerFirstName},` : "Hi,";
  const inner =
    paragraph(escapeHtml(greet)) +
    paragraph(
      `<strong style="color:${C.text}">${escapeHtml(ctx.builderCompany)}</strong> just unlocked <strong style="color:${C.text}">${escapeHtml(ctx.projectTitle)}</strong> — they now have your address, contact details, and the documents you uploaded. A tender may follow.`,
    ) +
    metaCard("Builder", [
      ["Company", ctx.builderCompany],
      ["State", ctx.builderState],
      ["ABN", ctx.abnVerified ? "Verified active · ABR" : "Pending verification"],
      ["Licence", ctx.anyLicenceVerified ? "Verified active · state register" : "Pending verification"],
    ]) +
    button(ctx.ownerProjectUrl, "View project") +
    (ctx.builderProfileUrl
      ? caption(`See their public profile — <a href="${ctx.builderProfileUrl}" style="color:${C.accent};text-decoration:underline;">${escapeHtml(ctx.builderCompany)}</a>`)
      : "");
  return {
    to: ctx.ownerEmail,
    subject: `${ctx.builderCompany} unlocked ${ctx.projectTitle}`,
    html: shell({
      preview: `${ctx.builderCompany} unlocked ${ctx.projectTitle}.`,
      kicker: "Project unlocked",
      heading: `${ctx.builderCompany} is reviewing your project`,
      inner,
    }),
    tag: "project_unlocked_owner",
  };
}

function builderEmail(ctx) {
  const greet = ctx.builderFirstName ? `Hi ${ctx.builderFirstName},` : "Hi,";
  const inner =
    paragraph(escapeHtml(greet)) +
    paragraph(
      `You&apos;ve unlocked <strong style="color:${C.text}">${escapeHtml(ctx.projectTitle)}</strong>. Here&apos;s a quick reference for your records — the same details are always live on the project page.`,
    ) +
    metaCard("Project", [
      ["Address", ctx.projectAddress],
      ["Owner", ctx.ownerName ?? "—"],
      ["Email", ctx.ownerEmail],
      ["Phone", ctx.ownerPhone],
    ]) +
    button(ctx.builderProjectUrl, "Open project") +
    caption(
      "Next step — open the project, review the documents, then submit a tender when you&apos;re ready. Owners see complete tenders first.",
    );
  return {
    to: ctx.builderEmail,
    subject: `Unlocked: ${ctx.projectTitle}`,
    html: shell({
      preview: `Unlocked: ${ctx.projectTitle}`,
      kicker: ctx.unlockedViaFba ? "Free with FBA · Unlocked" : "Unlocked",
      heading: ctx.projectTitle,
      inner,
    }),
    tag: "project_unlocked_builder",
  };
}

function opsEmail(ctx) {
  const inner =
    paragraph("A builder just unlocked a project on the marketplace.") +
    metaCard("Project", [
      ["Title", ctx.projectTitle],
      ["URL", ctx.builderProjectUrl],
    ]) +
    metaCard("Parties", [
      ["Builder", ctx.builderCompany],
      ["Builder email", ctx.builderEmail],
      ["Owner", ctx.ownerName ?? "—"],
      ["Owner email", ctx.ownerEmail],
    ]) +
    metaCard("Unlock", [
      ["Source", ctx.source],
      ["When", ctx.unlockedAtIso],
    ]);
  return {
    to: OPS_EMAIL,
    subject: `Unlock: ${ctx.builderCompany} → ${ctx.projectTitle}`,
    html: shell({
      preview: `Unlock: ${ctx.builderCompany} → ${ctx.projectTitle}`,
      kicker: "Project unlocked",
      heading: `${ctx.builderCompany} unlocked a project`,
      inner,
    }),
    tag: "project_unlocked_ops",
  };
}

async function sendEmail({ to, subject, html, tag }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      tags: [
        { name: "category", value: tag },
        { name: "replay", value: "unlock_backfill" },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} — ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()).id;
}

// ─── Main ─────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: DB_URL });
const db = await pool.connect();

try {
  // 1. Project + owner.
  const projRes = await db.query(
    `SELECT p.id, p.slug, p.title, p.address_line1, p.suburb, p.state, p.postcode,
            u.id AS owner_id, u.email AS owner_email, u.name AS owner_name, u.phone AS owner_phone
       FROM projects p
       JOIN users u ON u.id = p.owner_id
      WHERE p.slug = $1`,
    [PROJECT_SLUG],
  );
  if (projRes.rows.length === 0) {
    console.error(`Project not found for slug "${PROJECT_SLUG}".`);
    process.exit(1);
  }
  const p = projRes.rows[0];

  // 2. Builder (+ profile).
  const bRes = await db.query(
    `SELECT u.id, u.email, u.name,
            bp.company_name, bp.business_state, bp.slug AS builder_slug, bp.approval_status
       FROM users u
       LEFT JOIN builder_profiles bp ON bp.user_id = u.id
      WHERE lower(u.email) = $1`,
    [BUILDER_EMAIL],
  );
  if (bRes.rows.length === 0) {
    console.error(`Builder not found for email "${BUILDER_EMAIL}".`);
    process.exit(1);
  }
  const b = bRes.rows[0];

  // 3. The unlock row (must exist — proves the builder actually unlocked).
  const uRes = await db.query(
    `SELECT source, unlocked_at FROM unlocks WHERE project_id = $1 AND builder_id = $2`,
    [p.id, b.id],
  );
  if (uRes.rows.length === 0) {
    console.error(
      `No unlock row for builder ${BUILDER_EMAIL} on project ${PROJECT_SLUG}. Nothing to backfill.`,
    );
    process.exit(1);
  }
  const u = uRes.rows[0];

  // 4. Build context (mirrors dispatch.gatherContext).
  const approved = b.approval_status === "approved";
  const firstFrom = (n) => (n ? (n.split(" ")[0] ?? null) : null);
  const ctx = {
    ownerEmail: p.owner_email,
    ownerName: p.owner_name,
    ownerFirstName: firstFrom(p.owner_name),
    ownerPhone: p.owner_phone,
    builderEmail: b.email,
    builderFirstName: firstFrom(b.name),
    builderCompany: b.company_name ?? b.name ?? "A builder on BuilderHQ",
    builderState: b.business_state,
    // Public profile only shown for approved builders (matches dispatch).
    builderProfileUrl: approved && b.builder_slug ? `${BASE_URL}/b/${b.builder_slug}` : null,
    // Verification chips — proxy from approval (approved ⇒ ABN + ≥1 licence verified).
    abnVerified: approved,
    anyLicenceVerified: approved,
    projectTitle: p.title,
    projectAddress:
      [p.address_line1, p.suburb, p.state, p.postcode].filter(Boolean).join(", ") || null,
    ownerProjectUrl: `${BASE_URL}/owner/projects/${p.slug}`,
    builderProjectUrl: `${BASE_URL}/builder/projects/${p.slug}`,
    source: u.source,
    unlockedViaFba: u.source === "founding",
    unlockedAtIso: new Date(u.unlocked_at).toISOString(),
    ownerId: p.owner_id,
    projectId: p.id,
  };

  console.log("Project:  ", p.title, `(${p.slug})`);
  console.log("Owner:    ", ctx.ownerName, `<${ctx.ownerEmail}>`);
  console.log("Builder:  ", ctx.builderCompany, `<${ctx.builderEmail}>`);
  console.log("Unlock:   ", `source=${ctx.source}  at=${ctx.unlockedAtIso}`);
  console.log("");
  console.log("Will send:");
  console.log(`  • owner bell  → ${ctx.ownerEmail} (in-app, idempotent)`);
  console.log(`  • owner email → ${ctx.ownerEmail}`);
  console.log(`  • builder rcpt→ ${ctx.builderEmail}`);
  console.log(`  • ops email   → ${OPS_EMAIL}`);
  console.log("");

  if (DRY) {
    console.log("Dry run — nothing sent. Re-run with --apply.");
    process.exit(0);
  }

  // 5a. Owner in-app bell (idempotent on the partial unique index).
  const bell = await db.query(
    `INSERT INTO notifications (user_id, kind, project_id, title, body, action_url)
     VALUES ($1, 'project_unlocked', $2, $3, $4, $5)
     ON CONFLICT (user_id, kind, project_id)
       WHERE kind IN ('project_published','project_unlocked')
     DO NOTHING
     RETURNING id`,
    [
      ctx.ownerId,
      ctx.projectId,
      `${ctx.builderCompany} unlocked ${ctx.projectTitle}`,
      "They now have your address, contact, and documents.",
      ctx.ownerProjectUrl,
    ],
  );
  console.log(
    bell.rows.length > 0
      ? `  ✓ owner bell inserted (${bell.rows[0].id})`
      : "  • owner bell already existed (skipped)",
  );

  // 5b. The three emails.
  for (const build of [ownerEmail, builderEmail, opsEmail]) {
    const mail = build(ctx);
    try {
      const id = await sendEmail(mail);
      console.log(`  ✓ ${mail.tag.padEnd(24)} → ${mail.to.padEnd(34)} resendId=${id}`);
    } catch (err) {
      console.error(`  ✗ ${mail.tag.padEnd(24)} → ${mail.to}  ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  console.log("\nDone.");
} finally {
  db.release();
  await pool.end();
}
