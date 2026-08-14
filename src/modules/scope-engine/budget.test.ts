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

import { describe, it, expect } from "vitest";

import { MIN_TICK_BUDGET_MS, TICK_BUDGET_MS } from "./service";

describe("scope tick budgets", () => {
  it("gives real callers enough to clear every stage floor", () => {
    expect(TICK_BUDGET_MS).toBeGreaterThanOrEqual(MIN_TICK_BUDGET_MS);
  });

  it("keeps the budget inside the 300s function ceiling, with headroom", () => {
    // The route and the admin desk both declare maxDuration = 300.
    // A budget at or above that would be killed mid-write.
    expect(TICK_BUDGET_MS).toBeLessThanOrEqual(290_000);
  });

  it("sets the floor above the synthesis stage, not merely at it", () => {
    // Synthesis needs 90s; the floor carries margin so a tick that
    // only just clears it can still do useful work.
    expect(MIN_TICK_BUDGET_MS).toBeGreaterThan(90_000);
  });
});
