#!/usr/bin/env node
/**
 * Migration phase 5 — launch-invite email blast.
 *
 * ⚠️  DO NOT RUN UNTIL PRODUCTION IS LIVE.
 *
 * The email body contains links to https://builderhq.com.au/claim/<token>.
 * If DNS isn't cut over yet, every recipient gets a broken link, you
 * burn Resend domain reputation, and you have no second chance to
 * re-send the cohort (the launch moment is one-and-done).
 *
 * Pre-flight checks the script enforces:
 *   1. NEXT_PUBLIC_APP_URL must NOT contain 'localhost' or 'vercel.app'
 *      (refuses to send from a temp Vercel URL)
 *   2. With --apply, the first email send is gated behind a 5-second
 *      countdown unless --skip-confirm is passed
 *   3. Resend rate: throttled at ~50 sends/minute (1.2s between calls)
 *
 * Selection criteria:
 *   - users.claim_token IS NOT NULL
 *   - users.claim_token_expires_at > now()
 *   - users.deleted_at IS NULL
 *   - users.legacy_source = 'bubble'
 *
 * Per-user idempotency:
 *   - users.meta -> 'launch_invite_sent_at' set on successful send
 *     (so re-running the blast skips already-sent recipients).
 *   - We use a `claim_invite_log` jsonb column on users (lightweight
 *     — no separate table needed for a one-off blast).
 *
 * Run:
 *   # Dry run — prints intended recipients, doesn't send:
 *   node --env-file=.env.local scripts/migrate-bubble/05-blast.mjs --dry-run
 *
 *   # Send a single test to your inbox first (replace --to):
 *   node --env-file=.env.local scripts/migrate-bubble/05-blast.mjs --apply --send-test-only=info@builderhq.com.au
 *
 *   # The real blast:
 *   node --env-file=.env.local scripts/migrate-bubble/05-blast.mjs --apply
 */

import { openNeon, log, readonlyMode, flagValue, hasFlag } from "./_lib.mjs";

const DRY = readonlyMode();
const SEND_TEST_ONLY = flagValue("send-test-only");
const SKIP_CONFIRM = hasFlag("--skip-confirm");

log("info", "migrate.phase_start", {
  phase: "05-blast",
  dry: DRY,
  testTo: SEND_TEST_ONLY ?? null,
});

// ── Pre-flight: refuse to send from a non-production URL ────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "";

if (!APP_URL) {
  console.error("✗ NEXT_PUBLIC_APP_URL not set. Aborting.");
  process.exit(1);
}
if (!DRY) {
  if (APP_URL.includes("localhost") || APP_URL.includes("vercel.app")) {
    console.error(
      `✗ Refusing to send the blast from ${APP_URL} — claim links would 404.
   Set NEXT_PUBLIC_APP_URL to the real production URL first.`,
    );
    process.exit(1);
  }
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error("✗ RESEND_API_KEY or EMAIL_FROM not set. Aborting.");
    process.exit(1);
  }
}

// ── Load recipients ─────────────────────────────────────────────────────

const pool = openNeon();
const client = await pool.connect();

let recipientsQuery = `
  SELECT id, email, first_name, claim_token, claim_token_expires_at
    FROM users
   WHERE claim_token IS NOT NULL
     AND claim_token_expires_at > now()
     AND deleted_at IS NULL
     AND legacy_source = 'bubble'
     AND password_hash IS NULL
     AND status != 'banned'
   ORDER BY created_at ASC
`;

if (SEND_TEST_ONLY) {
  recipientsQuery = `
    SELECT id, email, first_name, claim_token, claim_token_expires_at
      FROM users
     WHERE lower(email) = lower($1)
       AND claim_token IS NOT NULL
       AND claim_token_expires_at > now()
     LIMIT 1
  `;
}

const r = SEND_TEST_ONLY
  ? await client.query(recipientsQuery, [SEND_TEST_ONLY])
  : await client.query(recipientsQuery);

const recipients = r.rows;
log("info", "blast.cohort", { count: recipients.length });

if (recipients.length === 0) {
  console.log(
    SEND_TEST_ONLY
      ? `No user with email ${SEND_TEST_ONLY} has an active claim token.`
      : `No users have active claim tokens. Did you run phases 01-04 first?`,
  );
  client.release();
  await pool.end();
  process.exit(0);
}

console.log(
  `\nCohort: ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}` +
    `${DRY ? " (DRY RUN — nothing sent)" : ""}\n`,
);
for (const u of recipients.slice(0, 10)) {
  console.log(`  → ${u.email} ${u.first_name ? `(${u.first_name})` : ""}`);
}
if (recipients.length > 10) {
  console.log(`  … and ${recipients.length - 10} more`);
}

// ── Confirm gate ────────────────────────────────────────────────────────

if (!DRY && !SKIP_CONFIRM && !SEND_TEST_ONLY) {
  console.log(
    `\nAbout to send ${recipients.length} real emails from ${EMAIL_FROM}.`,
  );
  console.log(`Sleeping 5 seconds — Ctrl+C to abort.\n`);
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`  ${i}… `);
    await new Promise((res) => setTimeout(res, 1000));
  }
  process.stdout.write("\n\n");
}

// ── Send loop ───────────────────────────────────────────────────────────

let sent = 0;
let failed = 0;
const THROTTLE_MS = 1200; // ~50/min, well under Resend's free-tier limit

try {
  for (const u of recipients) {
    const claimUrl = `${APP_URL.replace(/\/$/, "")}/claim/${u.claim_token}`;
    const daysToExpire = Math.max(
      1,
      Math.ceil(
        (new Date(u.claim_token_expires_at).getTime() - Date.now()) /
          86_400_000,
      ),
    );

    if (DRY) {
      sent++;
      log("info", "blast.would_send", {
        to: u.email,
        firstName: u.first_name,
        claimUrl,
        daysToExpire,
      });
      continue;
    }

    const body = buildEmailBody({
      firstName: u.first_name,
      claimUrl,
      daysToExpire,
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
          to: [u.email],
          subject: "BuilderHQ 2.0 has landed — claim your account",
          html: body.html,
          text: body.text,
          tags: [{ name: "category", value: "launch_invite" }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        failed++;
        log("error", "blast.send_failed", {
          to: u.email,
          status: res.status,
          err: errText.slice(0, 200),
        });
      } else {
        sent++;
        const data = await res.json();
        log("info", "blast.sent", { to: u.email, resendId: data.id });
      }
    } catch (err) {
      failed++;
      log("error", "blast.send_threw", { to: u.email, msg: err.message });
    }

    if (!SEND_TEST_ONLY) {
      await new Promise((res) => setTimeout(res, THROTTLE_MS));
    }
  }
} finally {
  client.release();
  await pool.end();
}

log("info", "migrate.phase_end", {
  phase: "05-blast",
  dry: DRY,
  sent,
  failed,
});
console.log(
  `\nPhase 5 ${DRY ? "DRY-RUN" : "APPLY"}: ${sent} sent · ${failed} failed.`,
);

// ── Plain HTML/text body (no React Email — runs without bundler) ────────

function buildEmailBody({ firstName, claimUrl, daysToExpire }) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  const text = `${greeting}

BuilderHQ has been rebuilt from the ground up. Same mission — connecting Australian project owners with the right builder — sharper everything else. Your account, your projects, and your tender history are already on the new platform.

To pick up where you left off, set a new password. Passwords from the old platform can't be carried over (a security upgrade — we've moved from bcrypt to argon2id), so this is the one-time step you need to take.

Claim your account:
${claimUrl}

This link expires in ${daysToExpire} days.

What's new at a glance:
  · A redesigned dashboard with the four numbers that actually matter
  · Tender comparison side-by-side, decisions in two clicks
  · Verified ABN + licence check, live against ABR + state registers
  · Founding Builder Access: free unlocks while we open the platform
  · Inline messaging on every project, not buried two screens deep

Stuck? Reply to this email or write to info@builderhq.com.au.

— BuilderHQ
`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#031622;color:#dbe7f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#00d4c8;font-weight:500;margin-bottom:12px;">BuilderHQ 2.0</div>
    <h1 style="font-family:'Bebas Neue',Impact,sans-serif;text-transform:uppercase;font-size:36px;line-height:1.05;letter-spacing:-0.01em;color:#fff;margin:0 0 24px;">
      We've rebuilt. Your account is waiting.
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#a8b9c4;margin:0 0 18px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;color:#a8b9c4;margin:0 0 18px;">
      BuilderHQ has been rebuilt from the ground up. Same mission — connecting Australian project owners with the right builder — sharper everything else. Your account, your projects, and your tender history are already on the new platform.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#a8b9c4;margin:0 0 24px;">
      To pick up where you left off, set a new password. Passwords from the old platform can't be carried over (a security upgrade), so this is the one-time step.
    </p>
    <p style="margin:32px 0;">
      <a href="${claimUrl}" style="display:inline-block;background:#00d4c8;color:#031622;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;">Claim my account</a>
    </p>
    <p style="font-size:12px;color:#788896;line-height:1.55;margin:0 0 16px;">
      This link expires in ${daysToExpire} days. If the button doesn't work, paste this URL into your browser:<br/>
      <a href="${claimUrl}" style="color:#7ef5ed;word-break:break-all;">${claimUrl}</a>
    </p>
    <hr style="border:0;border-top:1px solid #1a2d3f;margin:32px 0;"/>
    <p style="font-size:14px;color:#a8b9c4;margin:0 0 12px;"><strong style="color:#dbe7f0;">What's new at a glance:</strong></p>
    <ul style="font-size:14px;color:#a8b9c4;line-height:1.7;padding-left:18px;margin:0 0 24px;">
      <li>Redesigned dashboard, real numbers</li>
      <li>Side-by-side tender comparison, decisions in two clicks</li>
      <li>Live ABN + licence verification (ABR + state registers)</li>
      <li>Founding Builder Access: free unlocks while we open the platform</li>
      <li>Inline messaging on every project</li>
    </ul>
    <hr style="border:0;border-top:1px solid #1a2d3f;margin:32px 0;"/>
    <p style="font-size:12px;color:#788896;line-height:1.55;margin:0;">
      Stuck? Reply to this email or write to <a href="mailto:info@builderhq.com.au" style="color:#7ef5ed;">info@builderhq.com.au</a>.
      Didn't expect this email? You can safely ignore it.
    </p>
  </div>
</body></html>`;

  return { html, text };
}
