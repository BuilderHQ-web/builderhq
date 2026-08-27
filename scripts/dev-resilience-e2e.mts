/**
 * dev-resilience-e2e.mts — DEV ONLY. Drives one real run through the
 * new machinery so the checkpoint, the lease and the resume are proven
 * with a live model, not a mock. Orchestrated from bash:
 *   --start <slug>   create a run, print RUN=<id>
 *   --tick <runId>   one processRunTick with a 40-minute budget
 *   --state <runId>  print checkpoint/lease/status/items as JSON
 */
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { processRunTick, startRun } from "@/modules/scope-engine";

const host = new URL(process.env.DATABASE_URL!).host;
if (/tiny-resonance/.test(host)) {
  console.error("ABORT: dev only:", host);
  process.exit(2);
}
const mode = process.argv[2];
const arg = process.argv[3] ?? "";
if ((mode === "--tick" || mode === "--state" || mode === "--start") && !arg) {
  console.error(`usage: ${mode} <value>`);
  process.exit(2);
}
const rows = async (q: any) => { const r: any = await db.execute(q); return r.rows ?? r; };

if (mode === "--start") {
  const [p] = await rows(sql`select id, title from projects where slug=${arg} and deleted_at is null`);
  if (!p) { console.error("no project"); process.exit(2); }
  const [admin] = await rows(sql`select id from users where role='admin' limit 1`);
  if (!admin) { console.error("no admin user on dev"); process.exit(2); }
  const r = await startRun(p.id, admin.id);
  if (!r.ok) { console.error("startRun failed:", JSON.stringify(r.error)); process.exit(1); }
  console.log("RUN=" + r.value.id);
} else if (mode === "--tick") {
  const t = await processRunTick(arg, 40 * 60_000);
  console.log("TICK=" + JSON.stringify(t.ok ? t.value : t.error));
  process.exit(t.ok ? 0 : 1);
} else if (mode === "--state") {
  const [r] = await rows(sql`
    select status, error, lease_until, (synthesis_checkpoint is not null) as has_checkpoint,
           usage->'synthesis'->>'outputTokens' as synth_out
      from scope_runs where id=${arg}`);
  const [i] = await rows(sql`select count(*)::int c from scope_run_items where run_id=${arg}`);
  console.log("STATE=" + JSON.stringify({ ...r, items: Number(i.c) }));
} else {
  console.error("mode?");
  process.exit(2);
}
process.exit(0);
