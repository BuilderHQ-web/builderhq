/**
 * What survives a re-read, and what must be shown when it does not.
 *
 * A re-read replaces the pack. That is correct: an answer given against
 * one set of documents is not an answer to a different one. But the
 * product told the client "your answers carry forward", and for any
 * project that had never published, they did not. `effective_at` is
 * stamped only when a round goes live, and the carry required it to be
 * set, so the feature worked for the rare case (a re-read of a live
 * round) and silently did nothing for the common one (a first publish).
 *
 * On 21 August 2026 a real client lost a $44,000 allowance that way,
 * and nothing in the logs said so, because the caller only logged when
 * it carried something.
 *
 * These tests pin both halves of the fix: the carry now works before a
 * round has ever gone live, and anything it cannot carry is surfaced
 * rather than dropped.
 *
 * Seeded and destroyed against the dev database. The rules live in SQL,
 * so a mock would only prove the mock.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import {
  scopeRuns,
  scopeRunItems,
  scopeGapResolutions,
} from "@/modules/scope-engine/schema";
import { assertDevDatabase } from "@/modules/projects/__fixtures__/seats";

const TAG = `carry-${Date.now().toString(36)}`;
const userIds: string[] = [];
const projectIds: string[] = [];

async function makeOwner(): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({
      email: `${TAG}-${userIds.length}@fixture.test`,
      name: "Carry Fixture",
      role: "project_owner",
    })
    .returning({ id: users.id });
  userIds.push(row!.id);
  return row!.id;
}

async function makeProject(ownerId: string, key: string): Promise<string> {
  const [row] = await db
    .insert(projects)
    .values({
      ownerId,
      title: `Carry ${key}`,
      slug: `${TAG}-${key}`,
      type: "single_dwelling",
      status: "draft",
    })
    .returning({ id: projects.id });
  projectIds.push(row!.id);
  return row!.id;
}

/**
 * A run with items. `effectiveAt` left null models a project that has
 * never published, which is the case the carry used to miss entirely.
 */
async function makeRun(
  projectId: string,
  opts: {
    status: string;
    effectiveAt?: Date | null;
    approvedAt?: Date | null;
    items: Array<{ itemId: string; status: string; opsStatus?: string; label?: string }>;
  },
): Promise<string> {
  const [run] = await db
    .insert(scopeRuns)
    .values({
      projectId,
      status: opts.status,
      scopeVersion: "test",
      ...(opts.effectiveAt !== undefined ? { effectiveAt: opts.effectiveAt } : {}),
      ...(opts.approvedAt !== undefined ? { approvedAt: opts.approvedAt } : {}),
    })
    .returning({ id: scopeRuns.id });
  const id = run!.id;
  if (opts.items.length > 0) {
    await db.insert(scopeRunItems).values(
      opts.items.map((i) => ({
        runId: id,
        itemId: i.itemId,
        status: i.status,
        ...(i.opsStatus ? { opsStatus: i.opsStatus } : {}),
        ...(i.label ? { label: i.label } : {}),
      })),
    );
  }
  return id;
}

async function answer(
  runId: string,
  itemId: string,
  resolution: string,
  amountAud?: number,
): Promise<void> {
  await db.insert(scopeGapResolutions).values({
    runId,
    itemId,
    resolution,
    ...(amountAud !== undefined ? { amountAud } : {}),
  });
}

const resolutionsOn = async (runId: string) =>
  db
    .select({
      itemId: scopeGapResolutions.itemId,
      resolution: scopeGapResolutions.resolution,
      amountAud: scopeGapResolutions.amountAud,
    })
    .from(scopeGapResolutions)
    .where(eq(scopeGapResolutions.runId, runId));

beforeAll(() => {
  assertDevDatabase();
});

afterAll(async () => {
  if (projectIds.length > 0) {
    await db.delete(scopeRuns).where(inArray(scopeRuns.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

/* ── the fix ─────────────────────────────────────────────────────── */

describe("a first publish carries the client's answers", () => {
  test("answers survive a re-read on a project that has never gone live", async () => {
    // The exact shape of Paul Mete's project: approved, never published,
    // so effective_at is null on every run.
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "first-publish");
    const run1 = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 60_000),
      items: [{ itemId: "hvac.fireplace", status: "gap" }],
    });
    await answer(run1, "hvac.fireplace", "allowance", 44_000);

    const run2 = await makeRun(projectId, {
      status: "review",
      // approveRun refuses while any item is pending; a real run gets
      // its verdicts from the ops desk before approval.
      items: [{ itemId: "hvac.fireplace", status: "gap", opsStatus: "confirmed" }],
    });

    const { approveRun } = await import("@/modules/scope-engine");
    const r = await approveRun(owner, run2);
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);

    const carried = await resolutionsOn(run2);
    const fire = carried.find((x) => x.itemId === "hvac.fireplace");
    expect(fire, "the $44,000 allowance did not carry").toBeDefined();
    expect(fire!.resolution).toBe("allowance");
    expect(fire!.amountAud).toBe(44_000);
  }, 60_000);

  test("the live pack wins when a project has both an effective and a stale approved run", async () => {
    // Postgres sorts NULLs FIRST on DESC, so dropping the effective_at
    // predicate without fixing the ordering would rank a run that never
    // went live above the one that did. This is that regression.
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "ordering");
    const stale = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 10_000), // newer by approval
      items: [{ itemId: "painting.internal-walls-ceilings", status: "gap" }],
    });
    await answer(stale, "painting.internal-walls-ceilings", "allowance", 111);
    const live = await makeRun(projectId, {
      status: "approved",
      effectiveAt: new Date(Date.now() - 50_000),
      approvedAt: new Date(Date.now() - 50_000),
      items: [{ itemId: "painting.internal-walls-ceilings", status: "gap" }],
    });
    await answer(live, "painting.internal-walls-ceilings", "allowance", 999);

    const fresh = await makeRun(projectId, {
      status: "review",
      items: [
        { itemId: "painting.internal-walls-ceilings", status: "gap", opsStatus: "confirmed" },
      ],
    });
    const { approveRun } = await import("@/modules/scope-engine");
    await approveRun(owner, fresh);

    const [carried] = await resolutionsOn(fresh);
    expect(carried?.amountAud, "carried from the stale run, not the live one")
      .toBe(999);
  }, 60_000);
});

/* ── what must not carry ─────────────────────────────────────────── */

describe("an answer given against different evidence is not an answer", () => {
  test("a line the new read no longer calls a gap does not carry", async () => {
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "reclassified");
    const run1 = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 60_000),
      items: [{ itemId: "hvac.fireplace", status: "gap" }],
    });
    await answer(run1, "hvac.fireplace", "allowance", 44_000);

    // The new read decides the home is all-electric with no fireplace.
    const run2 = await makeRun(projectId, {
      status: "review",
      // not_expected is exempt from the pending gate, so no verdict needed.
      items: [{ itemId: "hvac.fireplace", status: "not_expected" }],
    });
    const { approveRun } = await import("@/modules/scope-engine");
    await approveRun(owner, run2);

    const carried = await resolutionsOn(run2);
    expect(carried.find((x) => x.itemId === "hvac.fireplace")).toBeUndefined();
  }, 60_000);

  test("an upload_later promise never carries", async () => {
    // A re-read exists BECAUSE the promised documents arrived, and
    // autoResolveBuilderWork sweeps every upload_later row on the run
    // with no item join, so a carried orphan would flip to
    // builder_priced.
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "upload-later");
    const run1 = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 60_000),
      items: [{ itemId: "approvals.soil-geotech", status: "gap" }],
    });
    await answer(run1, "approvals.soil-geotech", "upload_later");

    const run2 = await makeRun(projectId, {
      status: "review",
      items: [
        { itemId: "approvals.soil-geotech", status: "gap", opsStatus: "confirmed" },
      ],
    });
    const { approveRun } = await import("@/modules/scope-engine");
    await approveRun(owner, run2);

    const carried = await resolutionsOn(run2);
    const soil = carried.find((x) => x.itemId === "approvals.soil-geotech");
    // It may be auto-resolved as builders' work, but it must NOT be
    // carried as a standing promise to upload.
    expect(soil?.resolution).not.toBe("upload_later");
  }, 60_000);
});

/* ── nothing leaves silently ─────────────────────────────────────── */

describe("an answer the new read dropped is shown, never discarded", () => {
  test("a dropped allowance is surfaced with its amount and label", async () => {
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "dropped");
    const run1 = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 60_000),
      items: [
        { itemId: "hvac.fireplace", status: "gap" },
        { itemId: "landscaping.turf", status: "gap" },
      ],
    });
    await answer(run1, "hvac.fireplace", "allowance", 44_000);
    await answer(run1, "landscaping.turf", "builder_priced");

    // Fireplace reclassified away; turf still a live question.
    await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(),
      items: [
        { itemId: "hvac.fireplace", status: "not_expected" },
        { itemId: "landscaping.turf", status: "gap" },
      ],
    });

    const { getOwnerReview } = await import("@/modules/scope-engine");
    const review = await getOwnerReview(projectId, owner);
    expect(review.ok, review.ok ? "" : JSON.stringify(review.error)).toBe(true);
    if (!review.ok) return;

    const dropped = review.value.droppedResolutions ?? [];
    const fire = dropped.find((d) => d.itemId === "hvac.fireplace");
    expect(fire, "the dropped $44,000 was not surfaced").toBeDefined();
    expect(fire!.amountAud).toBe(44_000);
    expect(fire!.resolution).toBe("allowance");
    expect(fire!.label, "label should resolve from the ontology").toBeTruthy();

    // The still-live question must NOT appear as dropped.
    expect(dropped.find((d) => d.itemId === "landscaping.turf")).toBeUndefined();
  }, 60_000);

  test("nothing is reported dropped when every answer still applies", async () => {
    // The positive control: without it, a function that always returns
    // its whole input would pass the test above.
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "nothing-dropped");
    const run1 = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 60_000),
      items: [{ itemId: "landscaping.turf", status: "gap" }],
    });
    await answer(run1, "landscaping.turf", "builder_priced");
    await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(),
      items: [{ itemId: "landscaping.turf", status: "gap" }],
    });

    const { getOwnerReview } = await import("@/modules/scope-engine");
    const review = await getOwnerReview(projectId, owner);
    if (!review.ok) throw new Error("review failed");
    expect(review.value.droppedResolutions ?? []).toEqual([]);
  }, 60_000);

  test("a dropped answer is never folded into the live questions", async () => {
    // The hazard flagged in review: if droppedResolutions leaked into
    // `resolutions`, the UI would render a dropped answer as though the
    // client had answered a question the pack no longer asks.
    const owner = await makeOwner();
    const projectId = await makeProject(owner, "no-leak");
    const run1 = await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(Date.now() - 60_000),
      items: [{ itemId: "hvac.fireplace", status: "gap" }],
    });
    await answer(run1, "hvac.fireplace", "allowance", 44_000);
    await makeRun(projectId, {
      status: "approved",
      effectiveAt: null,
      approvedAt: new Date(),
      items: [{ itemId: "hvac.fireplace", status: "not_expected" }],
    });

    const { getOwnerReview } = await import("@/modules/scope-engine");
    const review = await getOwnerReview(projectId, owner);
    if (!review.ok) throw new Error("review failed");
    expect(
      review.value.resolutions.some((r) => r.itemId === "hvac.fireplace"),
      "a dropped answer leaked into the live resolutions",
    ).toBe(false);
    expect(review.value.droppedResolutions?.length).toBe(1);
  }, 60_000);
});
