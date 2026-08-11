/**
 * GET /api/cron/scope-tick
 *
 * The scope queue's heartbeat. Runs every minute (Vercel cron) and
 * advances every in-flight extraction run — classify, extract,
 * synthesise — oldest first, within one wall-clock budget.
 *
 * This is what makes the promise on the runner's screen true: they
 * submit, they are told their documents are being read, and the
 * reading HAPPENS, with nobody at a desk pressing anything. Ops is
 * emailed only at the two moments a human matters — a pack reaching
 * review, or a run failing.
 *
 * Runs are resumable and persist after every document, so the budget
 * cutoff is safe by construction: a pack too big for one beat simply
 * takes two. The budget stays under the beat interval so consecutive
 * invocations never overlap on the same run.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { tickQueuedRuns } from "@/modules/scope-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await tickQueuedRuns(50_000);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "cron.scope_tick.failed", msg }, "scope tick failed");
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
