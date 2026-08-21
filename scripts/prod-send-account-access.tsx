/**
 * prod-send-account-access.tsx — a concierge password-reset letter.
 *
 * Mints a real password_reset token (identical shape and TTL to the
 * one "Forgot password" issues) and sends a bespoke letter carrying
 * it, rather than the standard template, so the note about the
 * outstanding address confirmation travels with the link instead of
 * arriving separately.
 *
 * Sent straight through the Resend HTTP API: this is a one-off, and
 * the app's own sender suppresses non-allowlisted recipients outside
 * production. The house shell is imported, so the letter is the
 * platform's own typography and footer, not a hand-rolled lookalike.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/prod-send-account-access.tsx --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/prod-send-account-access.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   DATABASE_URL=<prod pooled> node --env-file=.env.local \
 *     node_modules/.cache/prod-send-account-access.mjs --email=<addr> [--apply]
 */
import { randomBytes } from "node:crypto";
import { render } from "@react-email/render";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "@/emails/_shell";

const die = (m: string): never => { console.error(`\n${m}\n`); process.exit(1); };
const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const APPLY = process.argv.includes("--apply");
const EMAIL = argOf("--email").trim().toLowerCase();
const PREV = argOf("--previous-email").trim().toLowerCase();
if (!EMAIL) die("Pass --email=<address>.");
if (!PREV) die("Pass --previous-email=<the address it was changed from>.");

const host = new URL(process.env.DATABASE_URL!).host;
if (!/tiny-resonance/.test(host)) die(`Expected the prod host, got ${host}.`);

const APP = "https://builderhq.com.au";
/** The address the account was moved away from, named so the reason
 *  for this letter is obvious rather than mysterious. */

const CC = "info@builderhq.com.au";
const RESET_TTL_MINUTES = 24 * 60;

const rows = async <T,>(q: unknown): Promise<T[]> => {
  const r: { rows?: unknown[] } = (await db.execute(q as never)) as never;
  return (r.rows ?? r) as T[];
};

interface Who {
  id: string;
  email: string;
  first_name: string | null;
  name: string | null;
  status: string;
  verified: boolean;
  has_password: boolean;
}
const [who] = await rows<Who>(sql`
  select id::text, email, first_name, name, status,
         email_verified is not null as verified,
         password_hash is not null as has_password
    from users where lower(email) = ${EMAIL}`);
if (!who) { die(`No account for ${EMAIL}.`); throw new Error("unreachable"); }
if (who.status === "banned" || who.status === "suspended") {
  die(`Account is ${who.status} — refusing.`);
}
if (!who.has_password) {
  // requestPasswordReset silently skips these; a reset link would be a
  // dead end. Say so rather than send a letter that cannot work.
  die("Account has no password hash — the reset path does not apply.");
}

const firstName =
  who.first_name ?? (who.name ? (who.name.split(" ")[0] ?? null) : null);

// The round this builder holds a seat on, named in the letter so the
// message is about their work rather than about administration.
const [seat] = await rows<{ title: string; suburb: string | null }>(sql`
  select p.title, p.suburb from unlocks u
    join projects p on p.id = u.project_id
   where u.builder_id = ${who.id}
   order by u.unlocked_at desc limit 1`);
const roundName = seat?.suburb ? `${seat.suburb} project` : null;

const token = randomBytes(32).toString("hex");
const resetUrl = `${APP}/reset-password/${token}`;
const greeting = firstName ? `Hi ${firstName},` : "Hi,";

const letter = (
  <EmailShell
    preview="Set your password and confirm your email in one step."
    kicker="Account access"
    heading="Set your password"
    whyReceiving="You are receiving this because we prepared a password reset for the BuilderHQ account at this address."
  >
    <BodyText>{greeting}</BodyText>
    <BodyText>
      When your account email was changed from {PREV} to{" "}
      {who.email}, the new address was never confirmed and a password was
      never set for it.
    </BodyText>
    <BodyText>
      Please set one now. The link below works once and expires in 24 hours.
    </BodyText>

    <PrimaryButton href={resetUrl}>Set password</PrimaryButton>

    <BodyText>
      It confirms your email address at the same time, so both steps are
      handled together.
    </BodyText>
    <BodyText>
      Everything else on your account is in place: your builder profile,
      licence, service areas and project categories
      {roundName ? `, along with your access to the ${roundName}` : ""}.
    </BodyText>

    <Caption>
      Or paste this address into your browser:
      <br />
      <InlineLink href={resetUrl}>{resetUrl}</InlineLink>
    </Caption>

    <Divider space="28px" />

    <Caption>
      If anything looks wrong at any point, reply to this email and we will
      take care of it.
    </Caption>
  </EmailShell>
);

const html = await render(letter);
const text = await render(letter, { plainText: true });
const subject = "Set your BuilderHQ password";

console.log(`\n── concierge account-access letter ───────────────────────`);
console.log(`  db      : ${host} (PROD)`);
console.log(`  to      : ${who.email}${firstName ? `  (${firstName})` : ""}`);
console.log(`  cc      : ${CC}`);
console.log(`  subject : ${subject}`);
console.log(`  status  : ${who.status} · verified=${who.verified}`);
console.log(`  round   : ${roundName ?? "(none)"}`);
console.log(`  link    : ${resetUrl}`);
console.log(`  expires : ${RESET_TTL_MINUTES} minutes after send`);
console.log(`  mode    : ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log(`──────────────────────────────────────────────────────────\n`);
console.log("─── plain text as it will read ───\n");
console.log(text.trim());
console.log("\n──────────────────────────────────\n");

if (!APPLY) { console.log("DRY RUN — no token written, nothing sent.\n"); process.exit(0); }

// Mint the token only on apply, so a dry run never leaves a live
// credential behind. Same identifier and purpose the real flow uses,
// replacing any earlier one.
const identifier = `pwreset:${who.email}`;
const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
await db.execute(sql`delete from verification_tokens where identifier = ${identifier}`);
await db.execute(sql`
  insert into verification_tokens (identifier, token, purpose, expires)
  values (${identifier}, ${token}, 'password_reset', ${expires})`);
console.log("token  : minted");

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    from: process.env.EMAIL_FROM,
    to: [who.email],
    cc: [CC],
    subject,
    html,
    text,
  }),
});
const body = (await res.json()) as { id?: string; message?: string };
if (!res.ok) {
  console.error(`send   : FAILED ${res.status} — ${body.message ?? "unknown"}`);
  process.exit(1);
}
console.log(`send   : sent, resend id ${body.id}\n`);
process.exit(0);
