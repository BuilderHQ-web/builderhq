/**
 * Re-filing a document, and the one thing it must never break.
 *
 * Category is chosen by which tile the owner drops a file on, and the
 * only way to correct a mis-drop used to be delete and re-upload. A
 * real client did that twice in one sitting: four uploads to place two
 * documents.
 *
 * The change is safer than it looks, and the reason is worth pinning:
 * the scope engine never reads this column. It selects its corpus on
 * project, status and deletedAt, then classifies each document itself
 * into the separate scopeRunDocuments.kind vocabulary. So re-filing
 * cannot invalidate a run or trigger a re-read.
 *
 * The publish gate is the exception. It counts active architectural
 * documents, it runs only at publish, and nothing re-checks afterwards.
 * Moving the last plan out of that category would leave a live round
 * that silently no longer meets its own entry condition, so it is
 * refused. That refusal is the most important test here.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { documents } from "@/modules/documents/schema";
import { setCategory } from "@/modules/documents";
import { assertDevDatabase } from "@/modules/projects/__fixtures__/seats";

const TAG = `setcat-${Date.now().toString(36)}`;
const userIds: string[] = [];
const projectIds: string[] = [];

async function makeUser(): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({
      email: `${TAG}-${userIds.length}@fixture.test`,
      name: "Recat Fixture",
      role: "project_owner",
    })
    .returning({ id: users.id });
  userIds.push(row!.id);
  return row!.id;
}

async function makeProject(ownerId: string, key: string, isSample = false): Promise<string> {
  const [row] = await db
    .insert(projects)
    .values({
      ownerId,
      title: `Recat ${key}`,
      slug: `${TAG}-${key}`,
      type: "single_dwelling",
      status: "draft",
      isSample,
    })
    .returning({ id: projects.id });
  projectIds.push(row!.id);
  return row!.id;
}

async function makeDoc(opts: {
  ownerId: string;
  projectId: string | null;
  category?: string;
  status?: string;
  tenderId?: string | null;
}): Promise<string> {
  const [row] = await db
    .insert(documents)
    .values({
      ownerId: opts.ownerId,
      projectId: opts.projectId,
      tenderId: opts.tenderId ?? null,
      category: (opts.category ?? "other") as "other",
      filename: `${TAG}.pdf`,
      contentType: "application/pdf",
      sizeBytes: 1024,
      objectKey: `${TAG}/${Math.random()}`,
      status: (opts.status ?? "active") as "active",
    })
    .returning({ id: documents.id });
  return row!.id;
}

const categoryOf = async (id: string) =>
  db
    .select({ category: documents.category, updatedAt: documents.updatedAt })
    .from(documents)
    .where(eq(documents.id, id))
    .then((r) => r[0]);

beforeAll(() => {
  assertDevDatabase();
});

afterAll(async () => {
  if (projectIds.length > 0) {
    await db.delete(documents).where(inArray(documents.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (userIds.length > 0) {
    await db.delete(documents).where(inArray(documents.ownerId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

describe("an owner re-files their own document", () => {
  test("the category changes and the row is stamped", async () => {
    const owner = await makeUser();
    const projectId = await makeProject(owner, "happy");
    const id = await makeDoc({ ownerId: owner, projectId, category: "other" });
    const before = await categoryOf(id);

    const r = await setCategory(owner, id, "soil_report");
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);

    const after = await categoryOf(id);
    expect(after!.category).toBe("soil_report");
    expect(after!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before!.updatedAt.getTime(),
    );
  }, 30_000);

  test("re-filing to the category it already has is a no-op, not a write", async () => {
    const owner = await makeUser();
    const projectId = await makeProject(owner, "noop");
    const id = await makeDoc({ ownerId: owner, projectId, category: "specifications" });
    const before = await categoryOf(id);
    await new Promise((r) => setTimeout(r, 20));

    const r = await setCategory(owner, id, "specifications");
    expect(r.ok).toBe(true);
    const after = await categoryOf(id);
    expect(after!.updatedAt.getTime(), "updatedAt churned on a no-op").toBe(
      before!.updatedAt.getTime(),
    );
  }, 30_000);
});

describe("the guards", () => {
  test("someone else's document is refused", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const projectId = await makeProject(owner, "forbidden");
    const id = await makeDoc({ ownerId: owner, projectId });

    const r = await setCategory(stranger, id, "soil_report");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error.code).toBe("forbidden");
    expect((await categoryOf(id))!.category).toBe("other");
  }, 30_000);

  test("a document still uploading is refused", async () => {
    const owner = await makeUser();
    const projectId = await makeProject(owner, "pending");
    const id = await makeDoc({ ownerId: owner, projectId, status: "pending" });

    const r = await setCategory(owner, id, "soil_report");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error.code).toBe("conflict");
  }, 30_000);

  test("the example round is read only", async () => {
    const owner = await makeUser();
    const projectId = await makeProject(owner, "sample", true);
    const id = await makeDoc({ ownerId: owner, projectId, category: "other" });

    const r = await setCategory(owner, id, "soil_report");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error.code).toBe("forbidden");
    expect((await categoryOf(id))!.category).toBe("other");
  }, 30_000);

  test("a document attached to no project is refused", async () => {
    const owner = await makeUser();
    const id = await makeDoc({ ownerId: owner, projectId: null });
    const r = await setCategory(owner, id, "soil_report");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error.code).toBe("conflict");
  }, 30_000);
});

describe("the publish gate cannot be broken from behind", () => {
  test("moving the ONLY architectural plan out is refused", async () => {
    // The hazard: the gate runs at publish and nothing re-checks after,
    // so this would produce a live round that no longer satisfies its
    // own entry condition, invisibly.
    const owner = await makeUser();
    const projectId = await makeProject(owner, "last-plan");
    const id = await makeDoc({ ownerId: owner, projectId, category: "architectural" });

    const r = await setCategory(owner, id, "other");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error.code).toBe("validation");
    expect(r.ok === false && r.error.message).toContain("only architectural plan");
    expect((await categoryOf(id))!.category).toBe("architectural");
  }, 30_000);

  test("moving one of two architectural plans out is allowed", async () => {
    // The positive control. Without it, a function that refused every
    // architectural move would pass the test above.
    const owner = await makeUser();
    const projectId = await makeProject(owner, "two-plans");
    const keep = await makeDoc({ ownerId: owner, projectId, category: "architectural" });
    const move = await makeDoc({ ownerId: owner, projectId, category: "architectural" });

    const r = await setCategory(owner, move, "other");
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);
    expect((await categoryOf(move))!.category).toBe("other");
    expect((await categoryOf(keep))!.category).toBe("architectural");
  }, 30_000);

  test("moving a plan INTO architectural is always allowed", async () => {
    // The gate only ever counts up, so this direction cannot break it.
    const owner = await makeUser();
    const projectId = await makeProject(owner, "into-arch");
    const id = await makeDoc({ ownerId: owner, projectId, category: "other" });

    const r = await setCategory(owner, id, "architectural");
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);
    expect((await categoryOf(id))!.category).toBe("architectural");
  }, 30_000);

  test("a soft-deleted plan does not count as the one keeping the gate satisfied", async () => {
    const owner = await makeUser();
    const projectId = await makeProject(owner, "deleted-plan");
    const gone = await makeDoc({ ownerId: owner, projectId, category: "architectural" });
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, gone));
    const live = await makeDoc({ ownerId: owner, projectId, category: "architectural" });

    // `live` is now the only ACTIVE plan, so moving it must be refused
    // even though a second architectural row exists in the table.
    const r = await setCategory(owner, live, "other");
    expect(r.ok, "a deleted plan was counted as satisfying the gate").toBe(false);
  }, 30_000);
});

describe("the scope engine is untouched by a re-filing", () => {
  test("category is not part of how a run selects its corpus", async () => {
    // Asserted against the source rather than by running an extraction:
    // the corpus query is the thing that would have to change for a
    // re-filing to invalidate a run, so pin that it has no category
    // predicate.
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("../scope-engine/service.ts", import.meta.url),
      "utf8",
    );
    const fn = src.slice(
      src.indexOf("export async function startRun"),
      src.indexOf("// ── the tick ─"),
    );
    expect(fn).toContain("documents.projectId");
    expect(fn, "startRun filters on category — re-filing would change a run")
      .not.toContain("documents.category");
  });
});
