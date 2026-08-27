/**
 * Reversing a desk verdict.
 *
 * A verdict used to be permanent. Confirm, edit or remove a line and
 * there was no way back, so a misclick on line 180 of 241 left a wrong
 * answer standing in a pack a builder would price from.
 *
 * The dangerous part of adding a way back is not the undo — it is
 * everything that reads a verdict afterwards. Three things must stay
 * true, and none of them fails loudly if it stops being true:
 *
 *   1. approveRun's gate must re-block. It is the only thing standing
 *      between a half-reviewed pack and a client, and it counts
 *      PENDING rows — so a reopened line has to become pending, not
 *      merely be marked somehow.
 *   2. The re-read carry must not carry a taken-back verdict, or the
 *      next run inherits an ops note from a judgement that was
 *      explicitly withdrawn.
 *   3. Reversing a capture promotion must not silently retire a
 *      vocabulary key another project is already matching against.
 *
 * Seeded and destroyed against the dev database, because all three
 * rules live in SQL and a mock would only prove the mock.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq, inArray, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import {
  scopeRuns,
  scopeRunItems,
  scopeRunConflicts,
  scopeRunCaptures,
  scopeReviewEvents,
  scopeVocabExtensions,
} from "@/modules/scope-engine/schema";
import { assertDevDatabase } from "@/modules/projects/__fixtures__/seats";

import { reopenItem, reopenConflict, reopenCapture } from "./service";

const TAG = `reopen-${Date.now().toString(36)}`;
const userIds: string[] = [];
const projectIds: string[] = [];
const extKeys: string[] = [];

async function makeActor(): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: `${TAG}-${userIds.length}@fixture.builderhq.test`,
      name: "Reopen Fixture",
      role: "admin",
    })
    .returning({ id: users.id });
  userIds.push(u!.id);
  return u!.id;
}

async function makeRun(status: string): Promise<{ runId: string }> {
  const owner = await makeActor();
  const [p] = await db
    .insert(projects)
    .values({
      ownerId: owner,
      title: `Reopen ${projectIds.length}`,
      slug: `${TAG}-p${projectIds.length}`,
      type: "single_dwelling",
      status: "draft",
    })
    .returning({ id: projects.id });
  projectIds.push(p!.id);
  const [r] = await db
    .insert(scopeRuns)
    .values({ projectId: p!.id, status, scopeVersion: "test" })
    .returning({ id: scopeRuns.id });
  return { runId: r!.id };
}

async function addRow(
  runId: string,
  itemId: string,
  over: Record<string, unknown> = {},
): Promise<string> {
  const [row] = await db
    .insert(scopeRunItems)
    .values({ runId, itemId, status: "gap", opsStatus: "confirmed", ...over })
    .returning({ id: scopeRunItems.id });
  return row!.id;
}

const eventsFor = (runId: string) =>
  db.select().from(scopeReviewEvents).where(eq(scopeReviewEvents.runId, runId));

beforeAll(() => assertDevDatabase());

afterAll(async () => {
  if (projectIds.length > 0) {
    await db.delete(scopeRuns).where(inArray(scopeRuns.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (extKeys.length > 0) {
    await db.delete(scopeVocabExtensions).where(inArray(scopeVocabExtensions.key, extKeys));
  }
  if (userIds.length > 0) await db.delete(users).where(inArray(users.id, userIds));
});

/* ── the undo itself ─────────────────────────────────────────────── */

describe("a verdict can be taken back", () => {
  test("reopening returns the line to pending and logs it without erasing anything", async () => {
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    const id = await addRow(runId, "hvac.fireplace", {
      opsStatus: "removed",
      opsNote: "Not on this project.",
    });

    const r = await reopenItem(actor, id);
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);

    const [row] = await db.select().from(scopeRunItems).where(eq(scopeRunItems.id, id));
    expect(row!.opsStatus, "the gate counts pending, so it must BE pending").toBe("pending");

    const events = await eventsFor(runId);
    expect(events, "the log appends, it does not rewrite").toHaveLength(1);
    expect(events[0]!.action).toBe("item.reopened");
    expect((events[0]!.before as { opsStatus?: string }).opsStatus).toBe("removed");
    expect((events[0]!.before as { opsNote?: string }).opsNote).toBe("Not on this project.");
  }, 30_000);

  test("an added line is deleted rather than left as a phantom", async () => {
    // Ops typed this row. Undoing means it should not exist; leaving it
    // pending would put a line nobody can explain in front of a client.
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    const id = await addRow(runId, "hvac.fireplace", { opsStatus: "added" });

    const r = await reopenItem(actor, id);
    expect(r.ok && r.value.removed).toBe(true);

    const rows = await db.select().from(scopeRunItems).where(eq(scopeRunItems.id, id));
    expect(rows).toHaveLength(0);

    const events = await eventsFor(runId);
    expect(events[0]!.action).toBe("item.unadded");
    expect(
      (events[0]!.before as { opsStatus?: string }).opsStatus,
      "the log still knows it was an addition",
    ).toBe("added");
  }, 30_000);

  test("reopening something already pending is refused, not silently repeated", async () => {
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    const id = await addRow(runId, "hvac.fireplace", { opsStatus: "pending" });
    const r = await reopenItem(actor, id);
    expect(r.ok).toBe(false);
    expect(await eventsFor(runId), "a refusal writes no event").toHaveLength(0);
  }, 30_000);
});

/* ── the window in which undo is allowed ─────────────────────────── */

describe("an approved pack is not reopened line by line", () => {
  test("reopening after approval is refused and says what to do instead", async () => {
    const actor = await makeActor();
    const { runId } = await makeRun("approved");
    const id = await addRow(runId, "hvac.fireplace", { opsStatus: "removed" });

    const r = await reopenItem(actor, id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/addendum/i);

    const [row] = await db.select().from(scopeRunItems).where(eq(scopeRunItems.id, id));
    expect(row!.opsStatus, "and nothing moved").toBe("removed");
  }, 30_000);
});

/* ── the gate this could have broken ─────────────────────────────── */

describe("the approval gate re-blocks on a reopened line", () => {
  test("a pack that could be approved cannot be once a line is reopened", async () => {
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    await addRow(runId, "hvac.fireplace", { opsStatus: "confirmed" });
    const id = await addRow(runId, "landscaping.pool", { opsStatus: "confirmed" });

    const pendingBefore = await db.$count(
      scopeRunItems,
      and(eq(scopeRunItems.runId, runId), eq(scopeRunItems.opsStatus, "pending")),
    );
    expect(pendingBefore, "approvable to begin with").toBe(0);

    await reopenItem(actor, id);

    const pendingAfter = await db.$count(
      scopeRunItems,
      and(eq(scopeRunItems.runId, runId), eq(scopeRunItems.opsStatus, "pending")),
    );
    expect(pendingAfter, "approveRun counts exactly this").toBe(1);
  }, 30_000);
});

/* ── conflicts ───────────────────────────────────────────────────── */

describe("a conflict verdict can be taken back too", () => {
  test("a dismissed conflict returns to pending, where builders see it again", async () => {
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    const [c] = await db
      .insert(scopeRunConflicts)
      .values({
        runId,
        summary: "Two figures disagree about the tank size.",
        severity: "attention",
        source: "model",
        opsStatus: "dismissed",
      })
      .returning({ id: scopeRunConflicts.id });

    const r = await reopenConflict(actor, c!.id);
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);

    const [row] = await db
      .select()
      .from(scopeRunConflicts)
      .where(eq(scopeRunConflicts.id, c!.id));
    expect(row!.opsStatus).toBe("pending");
    const events = await eventsFor(runId);
    expect(events[0]!.action).toBe("conflict.reopened");
  }, 30_000);
});

/* ── the one with teeth: vocabulary ──────────────────────────────── */

describe("undoing a promotion must not break another project", () => {
  test("the extension is retired when nothing else uses it", async () => {
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    const key = `ext.landscaping.${TAG}-solo`;
    extKeys.push(key);

    await db.insert(scopeVocabExtensions).values({
      key,
      divisionId: "landscaping",
      label: "Solo feature",
      plain: "A one-off.",
      status: "extension",
    });
    await addRow(runId, key, { opsStatus: "added", status: "evidenced" });
    const [cap] = await db
      .insert(scopeRunCaptures)
      .values({
        runId,
        label: "Solo feature",
        divisionId: "landscaping",
        opsStatus: "promoted",
        promotedItemId: key,
      })
      .returning({ id: scopeRunCaptures.id });

    const r = await reopenCapture(actor, cap!.id);
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);
    if (r.ok) {
      expect(r.value.extensionRetired).toBe(true);
      expect(r.value.stillUsedBy).toBe(0);
    }

    const [ext] = await db
      .select()
      .from(scopeVocabExtensions)
      .where(eq(scopeVocabExtensions.key, key));
    expect(ext!.status).toBe("retired");

    const lines = await db
      .select()
      .from(scopeRunItems)
      .where(and(eq(scopeRunItems.runId, runId), eq(scopeRunItems.itemId, key)));
    expect(lines, "the line comes off this run").toHaveLength(0);
  }, 30_000);

  test("an extension another run relies on survives the undo", async () => {
    // THE ONE THAT MATTERS. Retiring a key a second project already
    // matches against would silently change that project's scope.
    const actor = await makeActor();
    const { runId } = await makeRun("review");
    const other = await makeRun("approved");
    const key = `ext.landscaping.${TAG}-shared`;
    extKeys.push(key);

    await db.insert(scopeVocabExtensions).values({
      key,
      divisionId: "landscaping",
      label: "Shared feature",
      plain: "Seen on more than one project.",
      status: "extension",
    });
    await addRow(runId, key, { opsStatus: "added", status: "evidenced" });
    await addRow(other.runId, key, { opsStatus: "confirmed", status: "evidenced" });

    const [cap] = await db
      .insert(scopeRunCaptures)
      .values({
        runId,
        label: "Shared feature",
        divisionId: "landscaping",
        opsStatus: "promoted",
        promotedItemId: key,
      })
      .returning({ id: scopeRunCaptures.id });

    const r = await reopenCapture(actor, cap!.id);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.extensionRetired, "another project depends on this key").toBe(false);
      expect(r.value.stillUsedBy).toBe(1);
    }

    const [ext] = await db
      .select()
      .from(scopeVocabExtensions)
      .where(eq(scopeVocabExtensions.key, key));
    expect(ext!.status, "still live for the project using it").toBe("extension");

    const otherLines = await db
      .select()
      .from(scopeRunItems)
      .where(and(eq(scopeRunItems.runId, other.runId), eq(scopeRunItems.itemId, key)));
    expect(otherLines, "and that project's line is untouched").toHaveLength(1);
  }, 30_000);
});

/* ── what the next run inherits ──────────────────────────────────── */

describe("a taken-back verdict is not inherited by the next read", () => {
  test("the carry skips pending, so a reopened line carries nothing", () => {
    // verdictFor is pinned in verdict-carry.test.ts; what matters here
    // is the filter that decides which prior rows reach it at all. A
    // reopened row is `pending`, and carrying it would move the ops
    // note from a judgement that was explicitly withdrawn.
    const src = readServiceSource();
    const fn = src.slice(
      src.indexOf("const priorVerdicts = await db"),
      src.indexOf("// Core-tier learned items"),
    );
    expect(fn).toContain('if (v.opsStatus === "pending") continue;');
  });
});

function readServiceSource(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  return readFileSync(new URL("./service.ts", import.meta.url), "utf8");
}
