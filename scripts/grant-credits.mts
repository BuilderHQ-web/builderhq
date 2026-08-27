/**
 * grant-credits.mts — issue account credit to builders.
 *
 * Dry run by default. Nothing is written without --apply.
 *
 * Idempotent by (builder, reason): re-running with the same --reason
 * will NOT double-credit anyone who already holds a grant under it.
 * That is the whole safety story for a script that hands out money.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/grant-credits.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/grant-credits.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   DATABASE_URL=<dev or prod> node --env-file=.env.local \
 *     node_modules/.cache/grant-credits.mjs --reason=<key> --note="…" \
 *     --grants=email:amount,email:amount [--months=6] [--apply]
 */
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const APPLY = process.argv.includes("--apply");
function die(m: string): never {
  console.error(`\n✗ ${m}\n`);
  process.exit(1);
}

const REASON = argOf("--reason").trim();
const NOTE = argOf("--note").trim();
const MONTHS = Number(argOf("--months") || 6);
const GRANTS = argOf("--grants")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => {
    const [email, amount] = p.split(":");
    if (!email || !amount) die(`Bad --grants entry: ${p}. Use email:amount.`);
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) die(`Bad amount for ${email}: ${amount}`);
    return { email: email!.trim().toLowerCase(), amountAud: n };
  });

if (!REASON) die("Pass --reason=<machine key>, e.g. documentation_shortfall.");
if (GRANTS.length === 0) die("Pass --grants=email:amount,email:amount");
if (!Number.isInteger(MONTHS) || MONTHS <= 0) die("--months must be a positive integer.");

const host = new URL(process.env.DATABASE_URL!).host;
const isProd = host.includes("tiny-resonance");
console.log(`\n${APPLY ? "── APPLY ──" : "── DRY RUN ──"}  (${isProd ? "PROD" : "dev"}: ${host})`);
console.log(`reason  : ${REASON}`);
console.log(`expires : ${MONTHS} months from now`);
console.log(`note    : ${NOTE || "(none)"}\n`);

const rows = async (q: unknown) => {
  const r = (await db.execute(q as never)) as unknown as { rows?: unknown[] };
  return (r.rows ?? r) as Record<string, unknown>[];
};

let toWrite = 0;
const planned: Array<{ id: string; email: string; amountAud: number }> = [];

for (const g of GRANTS) {
  const [u] = await rows(sql`
    select u.id::text as id, u.role::text as role, u.status::text as status,
           coalesce(bp.company_name, '(no profile)') as company
      from users u left join builder_profiles bp on bp.user_id = u.id
     where lower(u.email) = ${g.email}`);
  if (!u) die(`No user: ${g.email}`);
  if (u.role !== "builder") die(`${g.email} is role=${u.role}, expected builder.`);

  const [existing] = await rows(sql`
    select count(*)::int as n, coalesce(sum(amount_aud), 0)::int as total
      from credit_grants
     where builder_id = ${u.id}::uuid and reason = ${REASON}`);
  const already = Number(existing?.n ?? 0);

  if (already > 0) {
    console.log(
      `  SKIP   ${g.email.padEnd(38)} $${String(g.amountAud).padEnd(6)} ` +
        `already holds ${already} grant(s) under "${REASON}" ($${existing?.total})`,
    );
    continue;
  }
  console.log(
    `  GRANT  ${g.email.padEnd(38)} $${String(g.amountAud).padEnd(6)} ${u.company}`,
  );
  planned.push({ id: String(u.id), email: g.email, amountAud: g.amountAud });
  toWrite++;
}

if (toWrite === 0) {
  console.log("\nNothing to do: every builder already holds a grant under this reason.\n");
  process.exit(0);
}

if (!APPLY) {
  console.log(`\nDRY RUN — ${toWrite} grant(s) would be written. Re-run with --apply.\n`);
  process.exit(0);
}

for (const p of planned) {
  await db.execute(sql`
    insert into credit_grants (builder_id, amount_aud, reason, note, expires_at)
    values (
      ${p.id}::uuid,
      ${p.amountAud},
      ${REASON},
      ${NOTE || null},
      now() + ${`${MONTHS} months`}::interval
    )`);
  console.log(`  ✓ ${p.email} — $${p.amountAud}`);
}

console.log(
  `\nWrote ${planned.length} grant(s). No emails were sent: the builders see ` +
    `the announcement on their dashboard next time they sign in.\n`,
);
process.exit(0);
