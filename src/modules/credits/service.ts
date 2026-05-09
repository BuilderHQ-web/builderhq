/**
 * credits · service layer.
 *
 * Owns Founding Builder Access (FBA): one row per (builder × time
 * window). Cycles tile from `start_at` every 30 days until `end_at`;
 * each cycle gives the builder `monthly_quota` free unlocks (default
 * 5). Unused credits don't roll over — they expire when the cycle
 * ends.
 *
 * Public surface:
 *   getCurrentGrant(builderId)   — most-recent active grant, or null
 *   getStatus(builderId)         — full FBA snapshot (used by UI)
 *   tryConsumeCredit(builderId)  — atomic: returns true if a credit
 *                                   was available + would be debited
 *                                   on this unlock. Caller writes the
 *                                   unlock row with source="founding"
 *                                   *only if* this returns true.
 *   moneySavedAud(builderId)     — lifetime $ saved across all grants
 *   recentCycleHistory(builderId)— per-cycle rollup for the UI
 *   grantFba(builderId, opts)    — admin-grant or auto-grant entry
 *   maybeAutoGrantFounding(b)    — service-internal: grant if eligible
 *                                   (signed up before cutoff + under
 *                                   the 100-builder cap)
 *   revokeGrant(grantId)         — admin pulls a grant early
 */

import "server-only";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import { fbaGrants, type FbaGrantRow } from "./schema";
import type { FbaCycleHistory, FbaStatus } from "./types";

import { unlocks } from "@/modules/unlocks/schema";
import { projects } from "@/modules/projects/schema";
import { unlockPriceFor } from "@/modules/projects/pricing";

// ── tunables ─────────────────────────────────────────────────────────────

/** 30-day rolling cycle length, in milliseconds. */
const CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

/** Founding window — builders signing up before this date are eligible
 *  for an auto-grant. Configurable later via env or admin UI. */
export const FOUNDING_CUTOFF = new Date("2026-05-31T23:59:59+10:00");

/** Hard cap on auto-granted founding seats. Once N grants exist with
 *  source = "founding", no more auto-grants are issued. */
export const FOUNDING_CAP = 100;

/** Default grant length when auto-granting. */
const DEFAULT_GRANT_MONTHS = 3;

/** Default monthly quota. */
const DEFAULT_MONTHLY_QUOTA = 5;

// ── grant CRUD ───────────────────────────────────────────────────────────

/**
 * Returns the builder's most-recent grant whose end_at is in the
 * future and which has not been revoked. Null otherwise.
 *
 * If a builder has multiple overlapping grants (rare, only via admin
 * override), the one with the latest end_at wins.
 */
export async function getCurrentGrant(
  builderId: string,
): Promise<FbaGrantRow | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(fbaGrants)
    .where(
      and(
        eq(fbaGrants.builderId, builderId),
        gte(fbaGrants.endAt, now),
        isNull(fbaGrants.revokedAt),
      ),
    )
    .orderBy(desc(fbaGrants.endAt))
    .limit(1);
  return row ?? null;
}

/** Admin entry-point. Used by both manual grants + the auto-grant
 *  service-internal helper. */
export async function grantFba(
  builderId: string,
  opts: {
    months?: number;
    monthlyQuota?: number;
    source?: FbaGrantRow["source"];
    startAt?: Date;
  } = {},
): Promise<Result<FbaGrantRow>> {
  const start = opts.startAt ?? new Date();
  const months = opts.months ?? DEFAULT_GRANT_MONTHS;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  const [row] = await db
    .insert(fbaGrants)
    .values({
      builderId,
      startAt: start,
      endAt: end,
      monthlyQuota: opts.monthlyQuota ?? DEFAULT_MONTHLY_QUOTA,
      source: opts.source ?? "founding",
    })
    .returning();
  if (!row) return fail("internal", "Failed to record FBA grant.");
  return ok(row);
}

/**
 * Auto-grant FBA if the builder qualifies — called from the builder
 * onboarding-completion path. No-op if:
 *   - the builder already has an active grant
 *   - we're past the founding cutoff
 *   - the founding cap (100 grants) has been reached
 *
 * Returns the grant if one was created, or null if skipped.
 */
export async function maybeAutoGrantFounding(
  builderId: string,
): Promise<FbaGrantRow | null> {
  const existing = await getCurrentGrant(builderId);
  if (existing) return null;

  const now = new Date();
  if (now > FOUNDING_CUTOFF) return null;

  const countRow = await db
    .select({ value: count() })
    .from(fbaGrants)
    .where(eq(fbaGrants.source, "founding"));
  const foundingCount = countRow[0]?.value ?? 0;
  if (foundingCount >= FOUNDING_CAP) return null;

  const r = await grantFba(builderId, { source: "founding" });
  return r.ok ? r.value : null;
}

/** Admin pulls a grant. */
export async function revokeGrant(
  grantId: string,
): Promise<Result<{ id: string }>> {
  await db
    .update(fbaGrants)
    .set({ revokedAt: new Date() })
    .where(eq(fbaGrants.id, grantId));
  return ok({ id: grantId });
}

// ── cycle math ───────────────────────────────────────────────────────────

/**
 * Given a grant + a `now` timestamp, compute the cycle the builder is
 * currently in. Returns null if `now` falls outside the grant window.
 */
export function currentCycleFor(
  grant: FbaGrantRow,
  now = new Date(),
): { index: number; total: number; start: Date; end: Date } | null {
  const startMs = grant.startAt.getTime();
  const endMs = grant.endAt.getTime();
  const nowMs = now.getTime();
  if (nowMs < startMs || nowMs >= endMs) return null;

  const elapsed = nowMs - startMs;
  const index = Math.floor(elapsed / CYCLE_MS);
  const cycleStart = new Date(startMs + index * CYCLE_MS);
  const cycleEnd = new Date(
    Math.min(startMs + (index + 1) * CYCLE_MS, endMs),
  );
  // 3-month calendar grants span 89-92 days depending on which months
  // they cross — using Math.ceil here would round 91/30 up to 4 even
  // though the intent is 3 thirty-day cycles. Math.round handles the
  // small calendar-vs-cycle slop and matches operator intent.
  const total = Math.max(1, Math.round((endMs - startMs) / CYCLE_MS));
  return { index, total, start: cycleStart, end: cycleEnd };
}

// ── status snapshot (the UI's main read) ─────────────────────────────────

export async function getStatus(builderId: string): Promise<FbaStatus> {
  const grant = await getCurrentGrant(builderId);
  if (!grant) {
    // Was there ever a grant? Distinguish revoked / expired / never.
    const [past] = await db
      .select()
      .from(fbaGrants)
      .where(eq(fbaGrants.builderId, builderId))
      .orderBy(desc(fbaGrants.endAt))
      .limit(1);
    if (!past) return { active: false, reason: "no_grant" };
    return {
      active: false,
      reason: past.revokedAt ? "revoked" : "expired",
    };
  }

  const now = new Date();
  const cycle = currentCycleFor(grant, now);
  if (!cycle) return { active: false, reason: "expired" };

  // Credits used this cycle = unlocks in (cycle.start, cycle.end) for
  // this builder with source='founding'.
  const usedRows = await db
    .select({ value: count() })
    .from(unlocks)
    .where(
      and(
        eq(unlocks.builderId, builderId),
        eq(unlocks.source, "founding"),
        gte(unlocks.unlockedAt, cycle.start),
        lt(unlocks.unlockedAt, cycle.end),
      ),
    );
  const usedThisCycle = usedRows[0]?.value ?? 0;

  // Lifetime savings = sum(unlockPrice(project.type)) for all
  // founding-sourced unlocks since this grant started.
  const savedRows = await db
    .select({
      type: projects.type,
      n: count(),
    })
    .from(unlocks)
    .innerJoin(projects, eq(projects.id, unlocks.projectId))
    .where(
      and(
        eq(unlocks.builderId, builderId),
        eq(unlocks.source, "founding"),
        gte(unlocks.unlockedAt, grant.startAt),
      ),
    )
    .groupBy(projects.type);
  const totalSavedAud = savedRows.reduce(
    (s, r) => s + (r.n as number) * unlockPriceFor(r.type),
    0,
  );
  const lifetimeUsed = savedRows.reduce(
    (s, r) => s + (r.n as number),
    0,
  );

  const dayMs = 24 * 60 * 60 * 1000;
  const daysToRefresh = Math.max(
    0,
    Math.ceil((cycle.end.getTime() - now.getTime()) / dayMs),
  );
  const daysToGrantEnd = Math.max(
    0,
    Math.ceil((grant.endAt.getTime() - now.getTime()) / dayMs),
  );

  return {
    active: true,
    grant,
    cycleIndex: cycle.index,
    totalCycles: cycle.total,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    monthlyQuota: grant.monthlyQuota,
    usedThisCycle,
    remainingThisCycle: Math.max(0, grant.monthlyQuota - usedThisCycle),
    daysToRefresh,
    daysToGrantEnd,
    totalSavedAud,
    lifetimeUsed,
  };
}

// ── credit consumption (the gate) ────────────────────────────────────────

/**
 * Atomic check: does the builder have a free credit available right
 * now?
 *
 * This is a *read* — it doesn't mutate. The unlock-flow caller is
 * responsible for inserting an `unlocks` row with source="founding"
 * which is what counts as "consuming" the credit. The unique index
 * on (builder_id, project_id) plus the cycle math make this safe:
 * even if two unlock requests race, only the first insert succeeds;
 * the second sees an existing row and short-circuits.
 *
 * Returns:
 *   { ok: true } if a credit was available and would be claimed.
 *   { ok: false, reason: ... } otherwise.
 */
export async function checkCreditAvailable(
  builderId: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: "no_grant" | "expired" | "exhausted";
      remaining?: number;
    }
> {
  const status = await getStatus(builderId);
  if (!status.active) {
    return {
      ok: false,
      reason: status.reason === "no_grant" ? "no_grant" : "expired",
    };
  }
  if (status.remainingThisCycle <= 0) {
    return { ok: false, reason: "exhausted", remaining: 0 };
  }
  return { ok: true };
}

// ── history ──────────────────────────────────────────────────────────────

export async function recentCycleHistory(
  builderId: string,
): Promise<FbaCycleHistory[]> {
  const grant = await getCurrentGrant(builderId);
  if (!grant) return [];

  const startMs = grant.startAt.getTime();
  const endMs = grant.endAt.getTime();
  // Match the same rounding policy as currentCycleFor — see the note
  // there for why round, not ceil.
  const total = Math.max(1, Math.round((endMs - startMs) / CYCLE_MS));

  // Pull every founding-sourced unlock since the grant started so we
  // can bucket them by cycle without hammering the DB once per cycle.
  const rows = await db
    .select({
      unlockedAt: unlocks.unlockedAt,
      type: projects.type,
    })
    .from(unlocks)
    .innerJoin(projects, eq(projects.id, unlocks.projectId))
    .where(
      and(
        eq(unlocks.builderId, builderId),
        eq(unlocks.source, "founding"),
        gte(unlocks.unlockedAt, grant.startAt),
      ),
    );

  const now = new Date();
  const cycles: FbaCycleHistory[] = [];
  for (let i = 0; i < total; i++) {
    const cStart = new Date(startMs + i * CYCLE_MS);
    const cEnd = new Date(Math.min(startMs + (i + 1) * CYCLE_MS, endMs));
    const inCycle = rows.filter(
      (r) => r.unlockedAt >= cStart && r.unlockedAt < cEnd,
    );
    cycles.push({
      cycleIndex: i,
      cycleStart: cStart,
      cycleEnd: cEnd,
      used: inCycle.length,
      quota: grant.monthlyQuota,
      savedAud: inCycle.reduce((s, r) => s + unlockPriceFor(r.type), 0),
      isCurrent: now >= cStart && now < cEnd,
    });
  }
  return cycles;
}

// ── meta ─────────────────────────────────────────────────────────────────

/** Quick: how many founding seats are still available out of the cap? */
export async function foundingSeatsAvailable(): Promise<{
  taken: number;
  cap: number;
  remaining: number;
}> {
  const rows = await db
    .select({ value: count() })
    .from(fbaGrants)
    .where(eq(fbaGrants.source, "founding"));
  const taken = rows[0]?.value ?? 0;
  return {
    taken,
    cap: FOUNDING_CAP,
    remaining: Math.max(0, FOUNDING_CAP - taken),
  };
}

// Defensive — unused right now but exported for future Stripe path.
export { sql };
