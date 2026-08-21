/**
 * The order builders browse in, pinned.
 *
 * Browse is the first screen a builder sees and the only one where we
 * choose what they look at first. Three rules decide it, and they are
 * a priority list rather than a blend:
 *
 *   1. A round they can still join beats a round that is full.
 *   2. Among those, how well it fits what they build and where.
 *   3. Among those, newest first.
 *
 * The failure worth guarding hardest is a full round at the top of the
 * page. It cannot be acted on, so every one above the fold is a wasted
 * impression and reads as a marketplace that does not know its own
 * stock. The second is subtler and more damaging: matching must ORDER
 * the market, never narrow it. If a builder's service areas started
 * filtering browse, the platform would quietly shrink to whatever they
 * typed into onboarding once, and they would never know what they
 * stopped being shown.
 *
 * Everything here is seeded and destroyed. Ordering lives in SQL, so a
 * mocked database would only prove the mock sorts.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { inArray, like } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { unlocks } from "@/modules/unlocks/schema";
import { listForMarketplace } from "@/modules/projects";
import type { MarketplaceFilters } from "@/modules/projects/types";
import { assertDevDatabase } from "@/modules/projects/__fixtures__/seats";

const TAG = `mkt-order-${Date.now().toString(36)}`;

/** Slug → id, for reading the order back by a name we can reason about. */
const ids = new Map<string, string>();
const projectIds: string[] = [];
const userIds: string[] = [];

/** Older than anything else seeded, so "newest" is unambiguous. */
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

async function makeUser(role: "builder" | "project_owner"): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({
      email: `${TAG}-${userIds.length}@fixture.test`,
      name: `Fixture ${userIds.length}`,
      role,
    })
    .returning({ id: users.id });
  userIds.push(row!.id);
  return row!.id;
}

async function makeProject(opts: {
  key: string;
  ownerId: string;
  type: "single_dwelling" | "multi_dwelling" | "renovation" | "extension";
  state: "VIC" | "NSW" | "QLD";
  suburb: string;
  publishedDaysAgo: number;
  /** Null leaves the platform default of 3. */
  spots?: number | null;
}): Promise<string> {
  const slug = `${TAG}-${opts.key}`;
  const [row] = await db
    .insert(projects)
    .values({
      ownerId: opts.ownerId,
      title: `Fixture ${opts.key}`,
      slug,
      type: opts.type,
      status: "published",
      tenderMode: "open",
      state: opts.state,
      suburb: opts.suburb,
      publishedAt: ago(opts.publishedDaysAgo),
      ...(opts.spots !== undefined ? { tenderSpots: opts.spots } : {}),
    })
    .returning({ id: projects.id });
  ids.set(opts.key, row!.id);
  projectIds.push(row!.id);
  return row!.id;
}

/** Take `n` spots on a project, with `n` distinct builders. */
async function fill(projectId: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const builderId = await makeUser("builder");
    await db
      .insert(unlocks)
      .values({ builderId, projectId, source: "admin" });
  }
}

/** The seeded rows, in the order the marketplace returned them. */
function seededOrder(rows: Array<{ id: string; slug: string }>): string[] {
  const byId = new Map([...ids].map(([k, v]) => [v, k]));
  return rows.filter((r) => byId.has(r.id)).map((r) => byId.get(r.id)!);
}

beforeAll(async () => {
  assertDevDatabase();
  const owner = await makeUser("project_owner");

  // A deliberately awkward board. The full rounds are the NEWEST and
  // the best-matched, so any ordering that forgets rule one will put
  // them on top and fail loudly.
  await makeProject({ key: "full-new-perfect", ownerId: owner, type: "renovation", state: "VIC", suburb: "Essendon", publishedDaysAgo: 1 });
  await makeProject({ key: "open-old-perfect", ownerId: owner, type: "renovation", state: "VIC", suburb: "Essendon", publishedDaysAgo: 300 });
  await makeProject({ key: "open-new-nomatch", ownerId: owner, type: "extension", state: "QLD", suburb: "Cairns", publishedDaysAgo: 2 });
  await makeProject({ key: "open-mid-statewide-type", ownerId: owner, type: "renovation", state: "VIC", suburb: "Geelong", publishedDaysAgo: 50 });
  await makeProject({ key: "open-mid-statewide-only", ownerId: owner, type: "extension", state: "VIC", suburb: "Geelong", publishedDaysAgo: 40 });
  await makeProject({ key: "open-new-typeonly", ownerId: owner, type: "renovation", state: "NSW", suburb: "Newtown", publishedDaysAgo: 3 });
  // Capacity is the round's own, not a constant: two spots, two taken.
  await makeProject({ key: "full-by-own-cap", ownerId: owner, type: "renovation", state: "VIC", suburb: "Essendon", publishedDaysAgo: 4, spots: 2 });

  await fill(ids.get("full-new-perfect")!, 3);
  await fill(ids.get("full-by-own-cap")!, 2);
  // One spot taken of three — still joinable, must rank as open.
  await fill(ids.get("open-old-perfect")!, 1);
}, 120_000);

afterAll(async () => {
  if (projectIds.length > 0) {
    await db.delete(unlocks).where(inArray(unlocks.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
  // Belt and braces: anything tagged that escaped the id lists.
  await db.delete(users).where(like(users.email, `${TAG}-%`));
});

/** The builder this suite ranks for: renovations, Essendon + all of VIC. */
const RANK_FOR: NonNullable<MarketplaceFilters["rankFor"]> = {
  categories: ["renovation"],
  areas: [
    { state: "VIC", suburb: "Essendon", statewide: false },
    { state: "VIC", suburb: null, statewide: true },
  ],
};

describe("rule one — a joinable round always outranks a full one", () => {
  test("a full round sinks below every open round, however new and however well matched", async () => {
    const rows = await listForMarketplace({ rankFor: RANK_FOR, limit: 200 });
    const order = seededOrder(rows);

    const fullPositions = [
      order.indexOf("full-new-perfect"),
      order.indexOf("full-by-own-cap"),
    ];
    const openPositions = order
      .filter((k) => k.startsWith("open-"))
      .map((k) => order.indexOf(k));

    expect(Math.min(...fullPositions)).toBeGreaterThan(Math.max(...openPositions));
  });

  test("full rounds are still listed, not hidden", async () => {
    // Market depth is worth seeing. Sinking is not the same as
    // deleting, and a builder deciding whether to chase a round wants
    // to know the board is busy.
    const order = seededOrder(await listForMarketplace({ rankFor: RANK_FOR, limit: 200 }));
    expect(order).toContain("full-new-perfect");
    expect(order).toContain("full-by-own-cap");
  });

  test("capacity is the round's own, not a fixed three", async () => {
    // full-by-own-cap holds two unlocks against its own two spots. A
    // hardcoded cap of 3 would read it as having a spot left.
    const order = seededOrder(await listForMarketplace({ limit: 200 }));
    const openNoMatch = order.indexOf("open-new-nomatch");
    expect(order.indexOf("full-by-own-cap")).toBeGreaterThan(openNoMatch);
  });

  test("a partly-filled round still counts as open", async () => {
    // open-old-perfect has 1 of 3 taken and is the OLDEST thing here.
    // It must still sit above both full rounds.
    const order = seededOrder(await listForMarketplace({ limit: 200 }));
    expect(order.indexOf("open-old-perfect")).toBeLessThan(order.indexOf("full-new-perfect"));
  });
});

describe("rule two — fit orders the open rounds", () => {
  test("suburb and type beats state and type beats state alone beats nothing", async () => {
    const order = seededOrder(await listForMarketplace({ rankFor: RANK_FOR, limit: 200 }));
    const at = (k: string) => order.indexOf(k);

    // 5: their suburb, their type.
    expect(at("open-old-perfect")).toBeLessThan(at("open-mid-statewide-type"));
    // 3: their state, their type — above 2: their state, wrong type.
    expect(at("open-mid-statewide-type")).toBeLessThan(at("open-mid-statewide-only"));
    // 2: their state, wrong type — above 1: elsewhere, their type.
    expect(at("open-mid-statewide-only")).toBeLessThan(at("open-new-typeonly"));
    // 1: elsewhere but their type — above 0: nothing in common.
    expect(at("open-new-typeonly")).toBeLessThan(at("open-new-nomatch"));
  });

  test("location outranks type, because a builder can stretch a type but not a map", async () => {
    const order = seededOrder(await listForMarketplace({ rankFor: RANK_FOR, limit: 200 }));
    // Wrong type in their own state beats right type interstate, even
    // though the interstate one is far newer (3 days vs 40).
    expect(order.indexOf("open-mid-statewide-only")).toBeLessThan(
      order.indexOf("open-new-typeonly"),
    );
  });

  test("a named suburb still wins when the builder also covers the whole state", async () => {
    // RANK_FOR holds BOTH an Essendon area and a statewide VIC area.
    // If the statewide branch were tested first, Essendon would score
    // 1 like everywhere else in Victoria and the distinction the
    // builder drew in onboarding would be silently discarded.
    const order = seededOrder(await listForMarketplace({ rankFor: RANK_FOR, limit: 200 }));
    expect(order.indexOf("open-old-perfect")).toBeLessThan(
      order.indexOf("open-mid-statewide-type"),
    );
  });
});

describe("rule three — date breaks the remaining ties", () => {
  test("with no builder to rank for, open rounds run newest first", async () => {
    const order = seededOrder(await listForMarketplace({ limit: 200 }));
    const openOnly = order.filter((k) => k.startsWith("open-"));
    // Seeded at 2, 3, 40, 50 and 300 days old.
    expect(openOnly).toEqual([
      "open-new-nomatch",
      "open-new-typeonly",
      "open-mid-statewide-only",
      "open-mid-statewide-type",
      "open-old-perfect",
    ]);
  });

  test("full rounds are date-ordered among themselves too", async () => {
    const order = seededOrder(await listForMarketplace({ limit: 200 }));
    // 1 day old vs 4 days old.
    expect(order.indexOf("full-new-perfect")).toBeLessThan(
      order.indexOf("full-by-own-cap"),
    );
  });
});

describe("ranking orders the market, it never narrows it", () => {
  test("the same rounds come back with and without a builder to rank for", async () => {
    const [ranked, plain] = await Promise.all([
      listForMarketplace({ rankFor: RANK_FOR, limit: 200 }),
      listForMarketplace({ limit: 200 }),
    ]);
    expect(new Set(seededOrder(ranked))).toEqual(new Set(seededOrder(plain)));
  });

  test("a round matching nothing about the builder is still shown", async () => {
    // Queensland extension, for a Victorian renovation builder.
    const order = seededOrder(await listForMarketplace({ rankFor: RANK_FOR, limit: 200 }));
    expect(order).toContain("open-new-nomatch");
  });

  test("an empty rankFor changes nothing", async () => {
    const [empty, plain] = await Promise.all([
      listForMarketplace({ rankFor: { categories: [], areas: [] }, limit: 200 }),
      listForMarketplace({ limit: 200 }),
    ]);
    expect(seededOrder(empty)).toEqual(seededOrder(plain));
  });
});

describe("filters keep working, and compose with the order", () => {
  test("a type filter narrows, and what survives is still correctly ordered", async () => {
    const order = seededOrder(
      await listForMarketplace({ type: "renovation", rankFor: RANK_FOR, limit: 200 }),
    );
    expect(order).not.toContain("open-new-nomatch");
    expect(order).not.toContain("open-mid-statewide-only");
    // Open renovations, best fit first; the full ones last.
    expect(order.indexOf("open-old-perfect")).toBeLessThan(
      order.indexOf("open-mid-statewide-type"),
    );
    expect(order.indexOf("open-mid-statewide-type")).toBeLessThan(
      order.indexOf("full-new-perfect"),
    );
  });

  test("a state filter still hands back full rounds last", async () => {
    const order = seededOrder(
      await listForMarketplace({ state: "VIC", rankFor: RANK_FOR, limit: 200 }),
    );
    expect(order).not.toContain("open-new-nomatch");
    const lastOpen = Math.max(
      ...order.filter((k) => k.startsWith("open-")).map((k) => order.indexOf(k)),
    );
    expect(order.indexOf("full-new-perfect")).toBeGreaterThan(lastOpen);
  });

  test("serviceAreaMatch still filters, unlike rankFor", async () => {
    // The two parameters look alike and must not behave alike. This is
    // the guard that stops someone folding them together later.
    const order = seededOrder(
      await listForMarketplace({
        serviceAreaMatch: [{ state: "QLD", suburb: null, statewide: true }],
        limit: 200,
      }),
    );
    expect(order).toEqual(["open-new-nomatch"]);
  });
});

describe("the order survives pagination", () => {
  test("the first page holds joinable rounds, not whatever is newest", async () => {
    // The reason ordering is in SQL. With a page size of 3, a JS sort
    // over an already-fetched page could only reshuffle the newest
    // three, and the full-but-new round would take a slot on page one.
    const page = seededOrder(await listForMarketplace({ rankFor: RANK_FOR, limit: 3 }));
    expect(page).not.toContain("full-new-perfect");
    expect(page).not.toContain("full-by-own-cap");
  });
});
