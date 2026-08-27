/**
 * prod-scope-complete.mts — finish ONE stuck scope run, supervised.
 *
 * WHY THIS EXISTS. Synthesis on a large pack is two long model calls
 * that together outlive the 300-second ceiling every Vercel runner has.
 * Each attempt is killed mid-stream having saved nothing. This runs the
 * SAME processRunTick, at the SAME commit production serves, with a
 * budget that lets it finish. The Postgres lease claim keeps every
 * other runner out; a heartbeat keeps the lease visibly held while the
 * long stream is in flight.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/prod-scope-complete.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/prod-scope-complete.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   DATABASE_URL=<prod pooled> node --env-file=.env.local \
 *     node_modules/.cache/prod-scope-complete.mjs
 */
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { processRunTick } from "@/modules/scope-engine/service";

const RUN = "cd4fbcee-9b8a-49dc-a0f0-ec1d33578b75";
const BUDGET_MS = 45 * 60_000;
const HARD_STOP_MS = 75 * 60_000;
const started = Date.now();
const ts = () => new Date().toISOString();

const host = new URL(process.env.DATABASE_URL!).host;
if (!host.includes("tiny-resonance")) {
  console.error("ABORT: not the prod host:", host);
  process.exit(2);
}
console.log(ts(), "target:", host);

async function state() {
  const r: any = await db.execute(sql`
    select status, error, round(extract(epoch from (now()-updated_at))) idle
      from scope_runs where id=${RUN}`);
  const i: any = await db.execute(sql`
    select count(*)::int c from scope_run_items where run_id=${RUN}`);
  return { ...(r.rows ?? r)[0], items: Number(((i.rows ?? i)[0]).c) };
}

/**
 * The lease is updated_at staleness. My synthesis stream makes no DB
 * writes for many minutes, so without a pulse the run would look
 * abandoned and a stray runner could claim it mid-stream. The pulse
 * arms only after the tick has been in flight for 45s, which is the
 * signature of having actually won the claim: a claim-failure returns
 * in a couple of seconds.
 */
let hb: ReturnType<typeof setInterval> | null = null;
let hbArm: ReturnType<typeof setTimeout> | null = null;
function armHeartbeat() {
  hbArm = setTimeout(() => {
    console.log(ts(), "heartbeat armed — we own the lease");
    hb = setInterval(async () => {
      if (Date.now() - started > HARD_STOP_MS) {
        console.error(ts(), "hard stop after 75 minutes");
        process.exit(3);
      }
      try {
        // The lease is explicit now (lease_until, migration 0049): the
        // heartbeat extends it, which is what "someone is working" means.
        await db.execute(sql`
          update scope_runs set lease_until = now() + interval '6 minutes'
           where id=${RUN} and status in ('classifying','extracting','synthesising')`);
        console.log(ts(), "heartbeat");
      } catch (e) {
        console.error(ts(), "heartbeat error:", e);
      }
    }, 60_000);
  }, 45_000);
}
function disarm() {
  if (hbArm) clearTimeout(hbArm);
  if (hb) clearInterval(hb);
  hbArm = null;
  hb = null;
}

console.log(ts(), "before:", JSON.stringify(await state()));

for (let attempt = 1; attempt <= 90; attempt++) {
  const t0 = Date.now();
  armHeartbeat();
  const res = await processRunTick(RUN, BUDGET_MS).catch((e) => ({
    ok: false as const,
    error: { code: "thrown", message: String(e) },
  }));
  disarm();
  const dur = Math.round((Date.now() - t0) / 1000);
  if (!res.ok) {
    console.error(ts(), "tick error:", JSON.stringify(res.error));
    break;
  }
  console.log(
    ts(),
    `attempt ${attempt}: status=${res.value.status} moreWork=${res.value.moreWork} took=${dur}s`,
  );
  if (["review", "failed", "approved", "superseded"].includes(res.value.status)) break;
  if (dur < 35) {
    // The known ambiguity: a fast ok() means the lease is held by a
    // rival tick, not that the work is done. Wait it out and retry.
    console.log(ts(), "lease held elsewhere — retrying in 10s");
    await new Promise((r) => setTimeout(r, 10_000));
    continue;
  }
  if (!res.value.moreWork) break;
}

console.log(ts(), "after:", JSON.stringify(await state()));
process.exit(0);
