/**
 * The credit ledger, pinned.
 *
 * This is money, so the tests are about the two ways it can go wrong:
 * a builder holding an unlock nobody paid for, or a builder debited
 * for an unlock they did not get. Both halves commit in one
 * transaction; these prove it, including under a race.
 *
 * Seeded and destroyed against the dev database, because the rules
 * live in SQL (row locks, the FIFO read, the unique index) and a mock
 * would only prove the mock.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";
import { unlocks } from "@/modules/unlocks/schema";
import { builderProfiles } from "@/modules/profiles/schema";
import { assertDevDatabase } from "@/modules/projects/__fixtures__/seats";

import { creditGrants, creditRedemptions } from "./schema";
import {
  balanceFor,
  grantCredit,
  unlockWithCredits,
  acknowledgeGrants,
  unacknowledgedGrantsFor,
  monthsFromNow,
} from "./service";

const TAG = `wallet-${Date.now().toString(36)}`;
const userIds: string[] = [];
const projectIds: string[] = [];

async function makeBuilder(): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({
      email: `${TAG}-${userIds.length}@fixture.builderhq.test`,
      name: "Wallet Fixture",
      role: "builder",
      status: "active",
    })
    .returning({ id: users.id });
  const id = row!.id;
  userIds.push(id);
  // unlockWithCredits runs checkUnlockEligibility, which needs an
  // approved profile. Without this every test would fail on the gate
  // rather than on the ledger.
  await db.insert(builderProfiles).values({
    userId: id,
    companyName: "Wallet Fixture Pty Ltd",
    approvalStatus: "approved",
  });
  return id;
}

async function makeOwnerAndProject(
  type: "single_dwelling" | "multi_dwelling" = "single_dwelling",
): Promise<{ id: string; slug: string }> {
  const [owner] = await db
    .insert(users)
    .values({
      email: `${TAG}-owner-${projectIds.length}@fixture.builderhq.test`,
      name: "Wallet Owner",
      role: "project_owner",
    })
    .returning({ id: users.id });
  userIds.push(owner!.id);
  const slug = `${TAG}-p${projectIds.length}`;
  const [p] = await db
    .insert(projects)
    .values({
      ownerId: owner!.id,
      title: `Wallet ${slug}`,
      slug,
      type,
      status: "published",
      suburb: "Testville",
      state: "VIC",
      publishedAt: new Date(),
    })
    .returning({ id: projects.id });
  projectIds.push(p!.id);
  return { id: p!.id, slug };
}

beforeAll(() => {
  assertDevDatabase();
});

afterAll(async () => {
  if (projectIds.length > 0) {
    await db.delete(unlocks).where(inArray(unlocks.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (userIds.length > 0) {
    // grants/redemptions cascade from users
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

/* ── balance arithmetic ──────────────────────────────────────────── */

describe("the balance is derived, never stored", () => {
  test("a builder with no grants reads as zero, not as missing", async () => {
    const b = await makeBuilder();
    const bal = await balanceFor(b);
    expect(bal.availableAud).toBe(0);
    expect(bal.grants).toEqual([]);
    expect(bal.nextExpiryAt).toBeNull();
  });

  test("grants add up and expired ones stop counting", async () => {
    const b = await makeBuilder();
    await grantCredit({ builderId: b, amountAud: 300, reason: "goodwill" });
    // Expired: inserted directly, because grantCredit refuses a past date.
    await db.insert(creditGrants).values({
      builderId: b,
      amountAud: 500,
      reason: "goodwill",
      expiresAt: new Date(Date.now() - 86_400_000),
    });
    const bal = await balanceFor(b);
    expect(bal.availableAud, "expired credit must not be spendable").toBe(300);
    expect(bal.grantedAud, "history still shows the full amount").toBe(800);
    expect(bal.grants).toHaveLength(2);
    expect(bal.grants.filter((g) => g.live)).toHaveLength(1);
  });

  test("a revoked grant is treated exactly like an expired one", async () => {
    const b = await makeBuilder();
    const g = await grantCredit({ builderId: b, amountAud: 250, reason: "goodwill" });
    expect(g.ok).toBe(true);
    await db
      .update(creditGrants)
      .set({ revokedAt: new Date() })
      .where(eq(creditGrants.id, g.ok ? g.value.id : ""));
    expect((await balanceFor(b)).availableAud).toBe(0);
  });

  test("a grant must be a whole positive amount", async () => {
    const b = await makeBuilder();
    expect((await grantCredit({ builderId: b, amountAud: 0, reason: "x" })).ok).toBe(false);
    expect((await grantCredit({ builderId: b, amountAud: -50, reason: "x" })).ok).toBe(false);
    expect((await grantCredit({ builderId: b, amountAud: 12.5, reason: "x" })).ok).toBe(false);
  });
});

/* ── spending ────────────────────────────────────────────────────── */

describe("spending credit on an unlock", () => {
  test("the unlock is granted, the ledger is debited, and both stick", async () => {
    const b = await makeBuilder();
    const p = await makeOwnerAndProject("single_dwelling"); // $149
    await grantCredit({ builderId: b, amountAud: 300, reason: "goodwill" });

    const r = await unlockWithCredits({ builderId: b, slug: p.slug });
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);
    if (!r.ok) return;
    expect(r.value.spentAud).toBe(149);
    expect(r.value.remainingAud).toBe(151);

    const [u] = await db
      .select()
      .from(unlocks)
      .where(eq(unlocks.projectId, p.id));
    expect(u?.source, "the unlock records how it was funded").toBe("credit");
    expect((await balanceFor(b)).availableAud).toBe(151);
  });

  test("too little credit buys nothing at all", async () => {
    const b = await makeBuilder();
    const p = await makeOwnerAndProject("multi_dwelling"); // $199
    await grantCredit({ builderId: b, amountAud: 100, reason: "goodwill" });

    const r = await unlockWithCredits({ builderId: b, slug: p.slug });
    expect(r.ok).toBe(false);
    // The money must still be there, and no unlock may exist.
    expect((await balanceFor(b)).availableAud).toBe(100);
    const rows = await db.select().from(unlocks).where(eq(unlocks.projectId, p.id));
    expect(rows, "a declined unlock must leave no row").toHaveLength(0);
  });

  test("one unlock can draw on more than one grant, soonest expiry first", async () => {
    const b = await makeBuilder();
    const p = await makeOwnerAndProject("multi_dwelling"); // $199
    // Deliberately granted newest-first so insertion order cannot pass
    // for expiry order.
    await grantCredit({
      builderId: b,
      amountAud: 150,
      reason: "goodwill",
      expiresAt: monthsFromNow(9),
    });
    await grantCredit({
      builderId: b,
      amountAud: 120,
      reason: "goodwill",
      expiresAt: monthsFromNow(2),
    });

    const r = await unlockWithCredits({ builderId: b, slug: p.slug });
    expect(r.ok, r.ok ? "" : JSON.stringify(r.error)).toBe(true);

    const bal = await balanceFor(b);
    expect(bal.availableAud).toBe(270 - 199);
    const soonest = bal.grants.find((g) => g.amountAud === 120)!;
    const later = bal.grants.find((g) => g.amountAud === 150)!;
    expect(soonest.remainingAud, "the grant that lapses first is spent first").toBe(0);
    expect(later.remainingAud).toBe(71);

    const reds = await db
      .select()
      .from(creditRedemptions)
      .where(eq(creditRedemptions.builderId, b));
    expect(reds, "one row per grant drawn on").toHaveLength(2);
  });

  test("two unlocks racing on one balance cannot both win", async () => {
    // $199 of credit against two $149 projects. Exactly one may pass;
    // without the row lock in debitWithin both would read $199 free.
    const b = await makeBuilder();
    const p1 = await makeOwnerAndProject("single_dwelling");
    const p2 = await makeOwnerAndProject("single_dwelling");
    await grantCredit({ builderId: b, amountAud: 199, reason: "goodwill" });

    const [a, c] = await Promise.all([
      unlockWithCredits({ builderId: b, slug: p1.slug }),
      unlockWithCredits({ builderId: b, slug: p2.slug }),
    ]);
    const won = [a, c].filter((x) => x.ok).length;
    expect(won, "exactly one unlock may be funded").toBe(1);

    const bal = await balanceFor(b);
    expect(bal.availableAud).toBe(50);

    // balanceFor clamps a grant's remainder at zero for display, which
    // would hide an overdraw. Assert on the raw ledger instead: the sum
    // of what was taken can never exceed the sum of what was given.
    const [tally] = await db
      .select({
        spent: sql<number>`coalesce(sum(${creditRedemptions.amountAud}), 0)`.mapWith(Number),
      })
      .from(creditRedemptions)
      .where(eq(creditRedemptions.builderId, b));
    expect(tally!.spent, "never spend more than was granted").toBeLessThanOrEqual(199);
    expect(tally!.spent).toBe(149);

    // And exactly one unlock row exists across the two projects.
    const unlockRows = await db
      .select()
      .from(unlocks)
      .where(inArray(unlocks.projectId, [p1.id, p2.id]));
    expect(unlockRows, "one funded unlock, one refusal").toHaveLength(1);
  }, 30_000);

  test("unlocking twice does not charge twice", async () => {
    const b = await makeBuilder();
    const p = await makeOwnerAndProject("single_dwelling");
    await grantCredit({ builderId: b, amountAud: 400, reason: "goodwill" });

    await unlockWithCredits({ builderId: b, slug: p.slug });
    const second = await unlockWithCredits({ builderId: b, slug: p.slug });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.spentAud, "already held, so nothing is taken").toBe(0);
    expect((await balanceFor(b)).availableAud).toBe(251);
  });
});

/* ── the announcement ────────────────────────────────────────────── */

describe("the announcement is per grant and server-side", () => {
  test("a new grant is unacknowledged, and acknowledging is idempotent", async () => {
    const b = await makeBuilder();
    await grantCredit({
      builderId: b,
      amountAud: 696,
      reason: "documentation_shortfall",
      note: "A note the builder reads.",
    });
    expect(await unacknowledgedGrantsFor(b)).toHaveLength(1);

    const first = await acknowledgeGrants(b);
    expect(first.ok && first.value.acknowledged).toBe(1);
    expect(await unacknowledgedGrantsFor(b)).toHaveLength(0);

    const again = await acknowledgeGrants(b);
    expect(again.ok && again.value.acknowledged, "nothing left to stamp").toBe(0);
  });

  test("an expired grant never announces itself", async () => {
    const b = await makeBuilder();
    await db.insert(creditGrants).values({
      builderId: b,
      amountAud: 100,
      reason: "goodwill",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await unacknowledgedGrantsFor(b)).toHaveLength(0);
  });
});
