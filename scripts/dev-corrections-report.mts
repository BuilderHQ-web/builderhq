/**
 * dev-corrections-report.mts — read the desk's verdicts back as
 * accuracy data.
 *
 * STRICTLY READ-ONLY. One SELECT over `scope_review_events`, joined to
 * runs and projects for context. It writes nothing, anywhere, ever —
 * which is why it is safe to point at production, and it is pointed at
 * production by default because that is where the judgements are.
 *
 * The arithmetic lives in modules/scope-engine/corrections.ts as pure
 * functions, so this script is only a reader and a printer. That split
 * is deliberate: the same numbers will feed the admin metrics page and
 * later the auto-approval gate, and three implementations of one rate
 * is how a dashboard and a gate come to disagree.
 *
 *   pnpm exec esbuild scripts/dev-corrections-report.mts --bundle \
 *     --platform=node --format=esm \
 *     --outfile=node_modules/.cache/corrections.mjs --alias:@=./src \
 *     --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   DATABASE_URL=<url> node --env-file=.env.local \
 *     node_modules/.cache/corrections.mjs [--json] [--project=<slug>]
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

import {
  analyseCorrections,
  worstDivisions,
  type ReviewEventInput,
} from "@/modules/scope-engine/corrections";

const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const ONLY = argOf("--project").trim();
const AS_JSON = process.argv.includes("--json");

const host = new URL(process.env.DATABASE_URL!).host;
const env = host.includes("tiny-resonance") ? "PRODUCTION" : "dev";

interface Row {
  run_id: string;
  subject: string;
  action: string;
  before: { status?: string | null; note?: string | null } | null;
  after: { status?: string | null; note?: string | null } | null;
  actor_id: string | null;
  created_at: string;
  slug: string;
  run_status: string;
}

const result = (await db.execute(sql`
  select e.run_id::text, e.subject, e.action, e.before, e.after,
         e.actor_id::text, e.created_at, p.slug, r.status as run_status
    from scope_review_events e
    join scope_runs r on r.id = e.run_id
    join projects p on p.id = r.project_id
   where p.deleted_at is null
     ${ONLY ? sql`and p.slug = ${ONLY}` : sql``}
   order by e.created_at
`)) as unknown as { rows?: Row[] };
const rows = (result.rows ?? (result as unknown as Row[])) as Row[];

const events: ReviewEventInput[] = rows.map((r) => ({
  runId: r.run_id,
  subject: r.subject,
  action: r.action,
  before: r.before,
  after: r.after,
  actorId: r.actor_id,
  createdAt: new Date(r.created_at),
}));

const report = analyseCorrections(events);

if (AS_JSON) {
  console.log(JSON.stringify({ env, host, report }, null, 2));
  process.exit(0);
}

const pc = (n: number) => `${(n * 100).toFixed(1)}%`;
const bar = "─".repeat(72);

console.log(`\n${bar}`);
console.log(`  DESK CORRECTIONS — what humans changed about the engine's answers`);
console.log(`  ${env} · ${host}${ONLY ? ` · project ${ONLY}` : ""}`);
console.log(bar);

console.log(`\n  ${report.events} events across ${report.runs} run(s)\n`);

console.log("  THE HEADLINE");
console.log(`    implied agreement  ${pc(report.impliedAgreement).padStart(7)}   over all ${report.counts.firstHand + report.bulkConfirmed} judged lines,`);
console.log(`                                 counting a bulk sweep as the agreement it is`);
console.log("");
console.log("  INDIVIDUALLY JUDGED LINES  (selection-biased: a reviewer opens");
console.log("  a line because they mean to change it, so these rates describe");
console.log("  the desk's attention, not the model's error rate)");
console.log(`    considered      ${String(report.counts.firstHand).padStart(5)}`);
console.log(`    confirmed       ${String(report.counts.confirmed).padStart(5)}   ${pc(report.rates.agreement)} agreement`);
console.log(`    edited          ${String(report.counts.edited).padStart(5)}   ${pc(report.rates.edit)}`);
console.log(`    removed         ${String(report.counts.removed).padStart(5)}   ${pc(report.rates.falsePositive)} false positive`);
console.log(`    added by hand   ${String(report.counts.added).padStart(5)}   ${pc(report.rates.falseNegative)} false negative`);

console.log("\n  WEAKER AND EXCLUDED SIGNALS");
console.log(`    bulk-confirmed  ${String(report.bulkConfirmed).padStart(5)}   swept in one click, nobody read them individually`);
console.log(`    reversed        ${String(report.reversed).padStart(5)}   ${pc(report.reversalRate)} of decisions taken back`);

if (report.moves.length > 0) {
  console.log("\n  WHERE THE MODEL AND THE DESK DISAGREED");
  for (const m of report.moves) {
    console.log(`    ${(`${m.from} → ${m.to}`).padEnd(28)} ${String(m.count).padStart(4)}   e.g. ${m.subjects.slice(0, 3).join(", ")}`);
  }
}

const worst = worstDivisions(report, { minLines: 4, limit: 8 });
if (worst.length > 0) {
  console.log("\n  DIVISIONS THE DESK CORRECTS MOST (4+ judged lines)");
  console.log(`    ${"division".padEnd(24)} ${"judged".padStart(6)} ${"agree".padStart(7)} ${"removed".padStart(8)}`);
  for (const d of worst) {
    console.log(
      `    ${d.division.padEnd(24)} ${String(d.counts.firstHand).padStart(6)} ${pc(d.rates.agreement).padStart(7)} ${String(d.counts.removed).padStart(8)}`,
    );
  }
}

const conflicts = Object.entries(report.conflictVerdicts);
const captures = Object.entries(report.captureVerdicts);
if (conflicts.length > 0 || captures.length > 0) {
  console.log("\n  NOT SCOPE LINES, COUNTED APART");
  for (const [k, v] of [...conflicts, ...captures]) {
    console.log(`    ${k.padEnd(24)} ${String(v).padStart(4)}`);
  }
}

console.log(`\n${bar}`);
console.log("  Read-only. Nothing was written.");
console.log(`${bar}\n`);

process.exit(0);
