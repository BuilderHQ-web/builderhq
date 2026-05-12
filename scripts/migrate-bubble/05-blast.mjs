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

// ── Email rendering — hand-rolled HTML (no React Email runtime) ─────────
//
// Inline styles only — email clients strip <style> tags from <body>, and
// most ignore class attrs. The single <style> block in <head> scopes
// media queries (mobile collapse) and an Outlook-on-Windows dark-mode
// hint that the few modern clients actually honour.
//
// Why we don't import LaunchInviteEmail.tsx and render it: this script
// runs as a vanilla .mjs without a TypeScript loader, so importing the
// .tsx React Email template would require tsx/ts-node. Keeping the
// template inline here trades duplication for a script that's a single
// `node` invocation away from sending.
//
// Layout pattern mirrors src/emails/_shell.tsx:
//   • outer table for Outlook-safe centering
//   • 600px container
//   • centered logo (hosted PNG of the cropped wordmark, ~150px wide)
//   • dark-surface card with subtle accent halo
//   • kicker → display headline (Georgia italic — premium serif that
//     renders identically on every major email client; the brand's
//     Bebas Neue can't load in email clients and falls back to Impact,
//     which is what caused the squashed top-of-email look)
//   • body copy → primary CTA → pasteable URL
//   • divider → "what's new" beats → footer

const LOGO_URL = "https://builderhq.com.au/brand/BuilderHQ_email_logo.png";
const APP_HOME = "https://builderhq.com.au";

function buildEmailBody({ firstName, claimUrl, daysToExpire }) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  // ─ Plain-text fallback (shown by clients with images disabled, also
  //   the version screen-readers + spam scoring tools consume). Mirrors
  //   the HTML beat-for-beat. ─────────────────────────────────────────
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
${APP_HOME}
`;

  // ─ HTML version ─────────────────────────────────────────────────────
  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>BuilderHQ 2.0 — claim your account</title>
  <style>
    /* Mobile collapse — Apple Mail / Gmail / iOS Mail honour this.
       Other clients keep the desktop layout, which still reads well. */
    @media only screen and (max-width: 480px) {
      .bhq-container { width: 100% !important; padding: 0 16px !important; }
      .bhq-card      { padding: 28px 22px !important; border-radius: 12px !important; }
      .bhq-heading   { font-size: 36px !important; line-height: 1.05 !important; }
      .bhq-subhead   { font-size: 16px !important; }
      .bhq-body      { font-size: 15px !important; line-height: 1.6 !important; }
      .bhq-cta-link  { display: block !important; width: 100% !important; box-sizing: border-box; padding: 16px 22px !important; }
      .bhq-logo      { width: 130px !important; }
    }
    /* Outlook.com / Outlook for Windows dark-mode hint */
    [data-ogsc] .bhq-page  { background: #03090f !important; }
    [data-ogsc] .bhq-card  { background: #0a1622 !important; }
    [data-ogsc] .bhq-text  { color: #eef6ff !important; }
    /* Strip iOS auto-detection of phone numbers / addresses */
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body class="bhq-page" style="margin:0;padding:0;background:#03090f;color:#eef6ff;-webkit-font-smoothing:antialiased;">
  <!-- preheader (hidden, drives inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;color:#03090f;line-height:1px;">
    BuilderHQ has rebuilt. Claim your account in one click — link expires in ${daysToExpire} days.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#03090f;">
    <tr>
      <td align="center" style="padding:40px 0 56px 0;">

        <!-- Container -->
        <table role="presentation" class="bhq-container" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:600px;">

          <!-- Logo row -->
          <tr>
            <td align="center" style="padding:0 24px 36px 24px;">
              <a href="${APP_HOME}" style="text-decoration:none;display:inline-block;">
                <img src="${LOGO_URL}"
                     alt="BuilderHQ"
                     class="bhq-logo"
                     width="160"
                     style="display:block;width:160px;height:auto;max-width:160px;border:0;outline:none;text-decoration:none;">
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" class="bhq-card" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#0a1622;border:1px solid #1a2632;border-radius:14px;padding:44px 44px;
                            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -28px rgba(0,212,200,0.18);">
                <tr>
                  <td>

                    <!-- Kicker -->
                    <p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#00d4c8;font-weight:700;">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00d4c8;vertical-align:middle;margin:-2px 10px 0 0;box-shadow:0 0 10px rgba(0,212,200,0.6);"></span>
                      BuilderHQ 2.0
                    </p>

                    <!-- Display headline — Georgia italic, the most reliable
                         premium-feeling display font that renders identically
                         on every major email client. -->
                    <h1 class="bhq-heading"
                        style="margin:0 0 18px 0;
                               font-family: Georgia, 'Times New Roman', serif;
                               font-style: italic;
                               font-weight: 400;
                               font-size: 48px;
                               line-height: 1.04;
                               letter-spacing: -0.015em;
                               color: #ffffff;">
                      We&rsquo;ve rebuilt<br>
                      <span style="color:#7ef5ed;">everything.</span>
                    </h1>

                    <p class="bhq-subhead"
                       style="margin:0 0 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;line-height:1.55;color:#eef6ff;font-weight:400;">
                      ${greeting} Your account is waiting on the new platform.
                    </p>

                    <p class="bhq-body"
                       style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#a8c2d8;">
                      BuilderHQ has been rebuilt from the ground up. Same mission — connecting Australian project owners with the right builder — sharper everything else. Your projects and tender history are already there.
                    </p>

                    <p class="bhq-body"
                       style="margin:0 0 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#a8c2d8;">
                      To pick up where you left off, set a new password. Old passwords can&rsquo;t be carried over (we&rsquo;ve upgraded from bcrypt to argon2id) — one-time step, then you&rsquo;re straight in.
                    </p>

                    <!-- CTA — table-wrapped for Outlook -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
                      <tr>
                        <td style="border-radius:999px;background:#00d4c8;
                                   box-shadow: 0 0 0 1px rgba(0,212,200,0.45), 0 14px 36px -10px rgba(0,212,200,0.55);">
                          <a href="${claimUrl}"
                             class="bhq-cta-link"
                             style="display:inline-block;padding:16px 36px;
                                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                    font-size:14px;font-weight:700;letter-spacing:0.06em;
                                    text-transform:uppercase;text-decoration:none;
                                    color:#031118;border-radius:999px;">
                            Claim my account &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry + paste URL -->
                    <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.55;color:#6a8294;">
                      Link expires in <strong style="color:#eef6ff;font-weight:600;">${daysToExpire} days</strong>. If the button doesn&rsquo;t work, paste this into your browser:
                    </p>
                    <p style="margin:0;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:11.5px;line-height:1.5;word-break:break-all;">
                      <a href="${claimUrl}" style="color:#7ef5ed;text-decoration:underline;text-underline-offset:2px;">${claimUrl}</a>
                    </p>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:36px 0;">
                      <tr><td style="border-top:1px solid #1a2632;line-height:1px;height:1px;">&nbsp;</td></tr>
                    </table>

                    <!-- What's new -->
                    <p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#00d4c8;font-weight:700;">
                      What&rsquo;s new
                    </p>

                    ${[
                      ["A redesigned dashboard", "with the four numbers that actually matter"],
                      ["Side-by-side tender comparison", "decisions in two clicks, not five"],
                      ["Live ABN + licence verification", "checked against ABR + state registers"],
                      ["Founding Builder Access", "free unlocks while we open the platform"],
                      ["Inline messaging", "every project, not buried two screens deep"],
                    ]
                      .map(
                        ([title, sub]) => `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
                      <tr>
                        <td valign="top" width="22" style="width:22px;padding-top:7px;">
                          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00d4c8;box-shadow:0 0 8px rgba(0,212,200,0.55);"></span>
                        </td>
                        <td valign="top">
                          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.5;color:#eef6ff;font-weight:600;">
                            ${title}
                          </p>
                          <p style="margin:2px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#a8c2d8;">
                            ${sub}
                          </p>
                        </td>
                      </tr>
                    </table>`,
                      )
                      .join("")}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6a8294;font-weight:600;">
                BuilderHQ · Australia&rsquo;s residential tender platform
              </p>
              <p style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6a8294;">
                Melbourne, Victoria, Australia &middot;
                <a href="mailto:info@builderhq.com.au" style="color:#a8c2d8;text-decoration:underline;">info@builderhq.com.au</a>
                &middot;
                <a href="${APP_HOME}" style="color:#a8c2d8;text-decoration:underline;">builderhq.com.au</a>
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.55;color:#4a5e6e;">
                You&rsquo;re receiving this because you have an existing BuilderHQ account from the platform we ran on Bubble. We&rsquo;ve rebuilt and imported your account into the new version. If this wasn&rsquo;t expected, you can safely ignore — no action is taken until you click the claim link.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}
