/**
 * Scope engine access — the adversarial suite.
 *
 * The scope engine holds the two most consequential writes on the
 * platform: the answers that become every builder's priced scope, and
 * the acceptance that opens a round or re-issues it as an addendum.
 * Reading the pack follows the seat; WRITING to it is the runner's
 * alone, and no seat, however senior, inherits it.
 *
 * These tests do not need an extraction run. Every guard resolves
 * access BEFORE it touches a run, which is itself the property worth
 * pinning: a stranger must be refused for being a stranger, not
 * because the project happens to have no pack today.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { and, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { scopeRuns } from "@/modules/scope-engine/schema";

import {
  getOwnerReview,
  resolveGap,
  requestReread,
  completeOwnerReview,
  getProjectSchedule,
  listAddenda,
  bulkConfirmPending,
} from "@/modules/scope-engine";
import { SCOPE_CONFIDENCE_FLOOR } from "@/modules/scope-engine/floor";
import { scopeRunItems } from "@/modules/scope-engine/schema";
import { eq } from "drizzle-orm";
import {
  seedSeats,
  assertDevDatabase,
  type SeatFixture,
} from "@/modules/projects/__fixtures__/seats";
import { saveOwnerBrief, applyPackCorrections } from "@/modules/projects";

let f: SeatFixture;

beforeAll(async () => {
  assertDevDatabase();
  f = await seedSeats();
});

afterAll(async () => {
  await f?.destroy();
});

/* ── reading the pack follows the seat ──────────────────────────── */

describe("getOwnerReview", () => {
  test("the runner reads, and may act", async () => {
    const r = await getOwnerReview(f.projectId, f.ids.runner);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.canResolve).toBe(true);
  });

  test("a decider seat reads but may NOT act", async () => {
    const r = await getOwnerReview(f.projectId, f.ids.decider);
    expect(r.ok).toBe(true);
    // The strongest seat on the round still cannot answer the client's
    // scope. Deciding is about tenders, never about the pack.
    expect(r.ok && r.value.canResolve).toBe(false);
  });

  test("a viewer seat reads but may not act", async () => {
    const r = await getOwnerReview(f.projectId, f.ids.viewer);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.canResolve).toBe(false);
  });

  test.each([
    ["a stranger", () => f.ids.stranger],
    ["a builder on the round", () => f.ids.builder],
    ["an unclaimed invitee", () => f.ids.invitedOnly],
    ["a revoked seat", () => f.ids.revoked],
    ["another project's runner", () => f.ids.otherRunner],
  ])("%s cannot read the pack at all", async (_label, getId) => {
    const r = await getOwnerReview(f.projectId, getId());
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("forbidden");
  });

  test("a project with no run reports 'none' rather than leaking a shape", async () => {
    const r = await getOwnerReview(f.projectId, f.ids.runner);
    expect(r.ok && r.value.phase).toBe("none");
    expect(r.ok && r.value.items).toEqual([]);
    expect(r.ok && r.value.resolutions).toEqual([]);
  });
});

/* ── writing is the runner's alone ──────────────────────────────── */

describe("resolveGap", () => {
  test.each([
    ["a decider seat", () => f.ids.decider],
    ["a viewer seat", () => f.ids.viewer],
    ["a stranger", () => f.ids.stranger],
    ["a builder", () => f.ids.builder],
    ["another project's runner", () => f.ids.otherRunner],
  ])("%s is refused before any pack lookup", async (_label, getId) => {
    const r = await resolveGap(getId(), f.projectId, "appliances.oven", {
      resolution: "excluded",
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("forbidden");
  });

  // The runner gets past the seat check and fails for the RIGHT
  // reason: there is no approved pack here, not "not your project".
  test("the runner passes the seat check and fails on substance", async () => {
    const r = await resolveGap(f.ids.runner, f.projectId, "appliances.oven", {
      resolution: "excluded",
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("conflict");
  });
});

describe("requestReread", () => {
  test.each([
    ["a decider seat", () => f.ids.decider],
    ["a viewer seat", () => f.ids.viewer],
    ["a stranger", () => f.ids.stranger],
    ["a builder", () => f.ids.builder],
  ])("%s cannot restart the reading", async (_label, getId) => {
    const r = await requestReread(f.projectId, getId());
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("forbidden");
  });
});

describe("completeOwnerReview", () => {
  test.each([
    ["a decider seat", () => f.ids.decider],
    ["a viewer seat", () => f.ids.viewer],
    ["a stranger", () => f.ids.stranger],
    ["a builder", () => f.ids.builder],
  ])("%s cannot open a round or issue an addendum", async (_label, getId) => {
    const r = await completeOwnerReview(f.projectId, getId());
    expect(r.ok).toBe(false);
    expect(["forbidden", "conflict"]).toContain(!r.ok && r.error.code);
  });

  test("the runner is refused while there is no ready pack", async () => {
    const r = await completeOwnerReview(f.projectId, f.ids.runner);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("conflict");
  });
});

/* ── the sweep respects the confidence floor ────────────────────── */

describe("bulkConfirmPending and the confidence floor", () => {
  test("the sweep confirms confident lines and leaves doubtful ones pending", async () => {
    // A run in review with three lines: a confident evidenced claim, a
    // doubtful evidenced claim, and a gap (whose confidence is about
    // gap-ness, not a factual claim — the sweep may take it).
    const [run] = await db
      .insert(scopeRuns)
      .values({
        projectId: f.projectId,
        status: "review",
        scopeVersion: "1.0.0",
      })
      .returning({ id: scopeRuns.id });
    await db.insert(scopeRunItems).values([
      {
        runId: run!.id,
        itemId: "framing.wall-framing",
        status: "evidenced",
        citations: [],
        confidence: 0.9,
      },
      {
        runId: run!.id,
        itemId: "roofing.tile-roof",
        status: "evidenced",
        citations: [],
        confidence: SCOPE_CONFIDENCE_FLOOR - 0.1,
      },
      {
        runId: run!.id,
        itemId: "appliances.oven",
        status: "gap",
        citations: [],
        confidence: 0.4,
      },
    ]);

    const r = await bulkConfirmPending(f.ids.runner, run!.id);
    expect(r.ok && r.value.confirmed).toBe(2);

    const rows = await db
      .select({
        itemId: scopeRunItems.itemId,
        opsStatus: scopeRunItems.opsStatus,
      })
      .from(scopeRunItems)
      .where(eq(scopeRunItems.runId, run!.id));
    const byItem = new Map(rows.map((x) => [x.itemId, x.opsStatus]));
    expect(byItem.get("framing.wall-framing")).toBe("confirmed");
    expect(byItem.get("appliances.oven")).toBe("confirmed");
    // The doubtful claim waits for a person, and approval waits on it.
    expect(byItem.get("roofing.tile-roof")).toBe("pending");

    await db.delete(scopeRuns).where(eq(scopeRuns.id, run!.id));
  });
});

/* ── allowances belong to selections only ───────────────────────── */

describe("resolveGap allowance eligibility", () => {
  test("a structural line refuses a client allowance for the RIGHT reason", async () => {
    // The runner is authorised and passes the seat check; on a project
    // with an approved pack the next guard would be eligibility. Here
    // there is no approved pack, so the conflict fires first — the
    // eligibility rule itself is pinned in the pure suite. This case
    // pins the ORDER: authorisation, then pack, then eligibility.
    const r = await resolveGap(
      f.ids.runner,
      f.projectId,
      "earthworks.rock-excavation",
      { resolution: "allowance", amountAud: 10_000 },
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("conflict");
  });
});

/* ── the owner brief writes ─────────────────────────────────────── */

describe("saveOwnerBrief", () => {
  test.each([
    ["a decider seat", () => f.ids.decider],
    ["a viewer seat", () => f.ids.viewer],
    ["a stranger", () => f.ids.stranger],
    ["a builder", () => f.ids.builder],
  ])("%s cannot answer the client's brief", async (_label, getId) => {
    const r = await saveOwnerBrief(getId(), f.projectId, {
      funding: "savings",
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("forbidden");
  });

  test("the runner saves a partial without completing", async () => {
    const r = await saveOwnerBrief(f.ids.runner, f.projectId, {
      funding: "finance_approved",
    });
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.complete).toBe(false);
  });

  test("junk answers are refused", async () => {
    const r = await saveOwnerBrief(f.ids.runner, f.projectId, {
      funding: "trust me",
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("validation");
  });
});

/* ── the pack's corrections ─────────────────────────────────────── */

describe("applyPackCorrections", () => {
  test.each([
    ["a decider seat", () => f.ids.decider],
    ["a stranger", () => f.ids.stranger],
    ["a builder", () => f.ids.builder],
  ])("%s cannot touch the listing", async (_label, getId) => {
    const r = await applyPackCorrections(getId(), f.projectId, {
      bedrooms: 4,
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("forbidden");
  });

  test("the runner applies a fact and it lands", async () => {
    const r = await applyPackCorrections(f.ids.runner, f.projectId, {
      bedrooms: 4,
      bathrooms: 3,
    });
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.applied.sort()).toEqual(["bathrooms", "bedrooms"]);
  });

  test("nonsense figures are refused", async () => {
    const r = await applyPackCorrections(f.ids.runner, f.projectId, {
      bedrooms: 500,
    });
    expect(r.ok).toBe(false);
  });

  test("an empty patch is refused rather than silently applied", async () => {
    const r = await applyPackCorrections(f.ids.runner, f.projectId, {});
    expect(r.ok).toBe(false);
  });

  test("a short description is refused", async () => {
    const r = await applyPackCorrections(f.ids.runner, f.projectId, {
      description: "Too short.",
    });
    expect(r.ok).toBe(false);
  });
});

/* ── the schedule and the register ──────────────────────────────── */

describe("the effective schedule", () => {
  test("a project with no effective run has no schedule, not an empty one", async () => {
    const s = await getProjectSchedule(f.projectId);
    // Null keeps the round on the legacy instrument. An empty schedule
    // would flip every builder onto a pack with zero lines to price.
    expect(s).toBeNull();
  });

  test("a project with no addenda has an empty register", async () => {
    const rows = await listAddenda(f.projectId);
    expect(rows).toEqual([]);
  });

  // A canary over real data rather than the fixture. `effective_at`
  // marks the ONE run a project's builders are pricing; two would mean
  // two different answers to "what is the scope", and whichever query
  // ran last would win. Any violation is a genuine defect, so this is
  // worth failing the suite over even though it reads ambient rows.
  test("no project anywhere has two effective packs at once", async () => {
    const offenders = await db
      .select({
        projectId: scopeRuns.projectId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(scopeRuns)
      .where(sql`${scopeRuns.effectiveAt} is not null`)
      .groupBy(scopeRuns.projectId)
      .having(sql`count(*) > 1`);
    expect(offenders).toEqual([]);
  });

  test("no superseded or failed run still claims to be effective", async () => {
    const offenders = await db
      .select({ id: scopeRuns.id, status: scopeRuns.status })
      .from(scopeRuns)
      .where(
        and(
          ne(scopeRuns.status, "approved"),
          sql`${scopeRuns.effectiveAt} is not null`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
