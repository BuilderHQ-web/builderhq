/**
 * The tick budget contract.
 *
 * The queue froze in production for a reason no test could have caught
 * by exercising behaviour: the cron handed processRunTick 50s while the
 * synthesis stage refuses to start below 90s. Every tick returned
 * "moreWork: true" — a SUCCESS — so nothing threw, nothing logged, and
 * a run sat at `extracting` forever while the cron reported ok.
 *
 * Meanwhile every dev script passed 240_000 and worked perfectly, which
 * is why it survived to launch. These are arithmetic guards on the
 * constants themselves: the only shape of test that would have failed.
 */

import { readFileSync } from "node:fs";

import { describe, it, expect } from "vitest";

import { LEASE_MS, MIN_TICK_BUDGET_MS, TICK_BUDGET_MS } from "./service";

/** The ceilings the platform actually enforces, read from the routes. */
function declaredMaxDurationMs(rel: string): number {
  const src = readFileSync(new URL(rel, import.meta.url), "utf8");
  const m = /export const maxDuration = (\d+)/.exec(src);
  if (!m) throw new Error(`no maxDuration in ${rel}`);
  return Number(m[1]) * 1000;
}

describe("scope tick budgets", () => {
  it("gives real callers enough to clear every stage floor", () => {
    expect(TICK_BUDGET_MS).toBeGreaterThanOrEqual(MIN_TICK_BUDGET_MS);
  });

  it("keeps the budget inside every declared platform ceiling, with headroom", () => {
    // The assertion reads maxDuration from the routes themselves, so
    // raising or lowering a ceiling without re-tuning the budget fails
    // here rather than in production. A budget at or above the ceiling
    // is killed mid-write; 40s is the margin for the return path.
    const ceilings = [
      declaredMaxDurationMs("../../app/api/cron/scope-tick/route.ts"),
      declaredMaxDurationMs("../../app/(app)/admin/scope/[runId]/page.tsx"),
    ];
    for (const ceiling of ceilings) {
      expect(TICK_BUDGET_MS).toBeLessThanOrEqual(ceiling - 40_000);
    }
    // And both surfaces must agree, or the same run behaves differently
    // depending on who ticks it.
    expect(new Set(ceilings).size).toBe(1);
  });

  it("sets the floor above the synthesis stage, not merely at it", () => {
    // Synthesis needs 90s; the floor carries margin so a tick that
    // only just clears it can still do useful work.
    expect(MIN_TICK_BUDGET_MS).toBeGreaterThan(90_000);
  });

  it("leases a run for longer than a tick can possibly run", () => {
    // If a lease could expire mid-tick, a second tick would claim the
    // run and start the same stage again. That is what sent ops four
    // "pack ready" emails for one pack, each with different counts.
    expect(LEASE_MS).toBeGreaterThan(TICK_BUDGET_MS);
  });

  it("leaves the platform room to shut a tick down before the lease lapses", () => {
    expect(LEASE_MS - TICK_BUDGET_MS).toBeGreaterThanOrEqual(30_000);
  });
});
