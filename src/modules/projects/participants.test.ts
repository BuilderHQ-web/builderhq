/**
 * Participant scoping — the adversarial suite.
 *
 * These rules decide who may read a client's project, who may decide
 * on a tender, and who keeps a private thread with a builder. They are
 * enforced across three layers (a resolver, SQL joins, and service
 * guards), which means a change in any one of them can quietly widen
 * access without breaking a single page. That is the failure this
 * suite exists to catch.
 *
 * It is written adversarially: for every surface, the question is not
 * "does the runner get in" but "who else does". Each case names the
 * attacker and the thing they must not reach.
 *
 * Real database, real rows, real queries. Fixtures seed and destroy.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  getProjectAccess,
  getBySlugForViewer,
  listProjectsSharedWithMe,
  listParticipantsForRunner,
} from "@/modules/projects";
import {
  listForUser,
  listForUserOnProject,
  countUnreadForUser,
} from "@/modules/messaging";
import {
  seedSeats,
  setSeat,
  attachSeatUser,
  detachSeatUser,
  listHas,
  assertDevDatabase,
  purgeFixtureDebris,
  type SeatFixture,
} from "./__fixtures__/seats";

let f: SeatFixture;

beforeAll(async () => {
  assertDevDatabase();
  await purgeFixtureDebris();
  f = await seedSeats();
});

afterAll(async () => {
  await f?.destroy();
});

/* ── the resolver: who holds what ───────────────────────────────── */

describe("getProjectAccess", () => {
  test("the runner is the runner", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.runner);
    expect(a).toEqual({ kind: "runner" });
  });

  test("a joined decider holds a decider seat", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.decider);
    expect(a?.kind).toBe("participant");
    expect(a?.kind === "participant" && a.role).toBe("decider");
  });

  test("a joined viewer holds a viewer seat, never a decider one", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.viewer);
    expect(a?.kind === "participant" && a.role).toBe("viewer");
  });

  // The classic bug: treating an unredeemed invite as access. An
  // invite is an offer, not a seat.
  test("an invited seat that was never claimed grants NOTHING", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.invitedOnly);
    expect(a).toBeNull();
  });

  // Defence in depth. The case above is also blocked by the invite
  // carrying no userId, so it would pass even if the status filter
  // vanished. This one attaches the user to a seat still marked
  // "invited" — the half-claimed shape a partial write or a future
  // code path could leave behind — and proves the STATUS alone
  // refuses it.
  test("a seat attached to a user but still 'invited' grants nothing", async () => {
    await setSeat(f.seatIds.invitedOnly, { status: "invited" });
    await attachSeatUser(f.seatIds.invitedOnly, f.ids.invitedOnly);
    const a = await getProjectAccess(f.projectId, f.ids.invitedOnly);
    expect(a).toBeNull();

    // And the moment it legitimately joins, access appears.
    await setSeat(f.seatIds.invitedOnly, { status: "joined" });
    const joined = await getProjectAccess(f.projectId, f.ids.invitedOnly);
    expect(joined?.kind).toBe("participant");

    await setSeat(f.seatIds.invitedOnly, { status: "invited" });
    await detachSeatUser(f.seatIds.invitedOnly);
  });

  test("a revoked seat grants nothing, even though it once decided", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.revoked);
    expect(a).toBeNull();
  });

  test("a stranger gets nothing", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.stranger);
    expect(a).toBeNull();
  });

  test("a builder who tendered gets NO owner-side access", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.builder);
    expect(a).toBeNull();
  });

  // Sideways leakage: holding a seat somewhere is not holding one here.
  test("a seat on this project grants nothing on another project", async () => {
    const a = await getProjectAccess(f.otherProjectId, f.ids.decider);
    expect(a).toBeNull();
  });

  test("another project's runner is a stranger here", async () => {
    const a = await getProjectAccess(f.projectId, f.ids.otherRunner);
    expect(a).toBeNull();
  });

  test("revocation bites immediately, with no cache to outlive it", async () => {
    const before = await getProjectAccess(f.projectId, f.ids.viewer);
    expect(before?.kind).toBe("participant");

    await setSeat(f.seatIds.viewer, { status: "revoked" });
    const after = await getProjectAccess(f.projectId, f.ids.viewer);
    expect(after).toBeNull();

    await setSeat(f.seatIds.viewer, { status: "joined" });
    const restored = await getProjectAccess(f.projectId, f.ids.viewer);
    expect(restored?.kind).toBe("participant");
  });
});

/* ── the project read ───────────────────────────────────────────── */

describe("getBySlugForViewer", () => {
  test("the runner reads their project", async () => {
    const r = await getBySlugForViewer(f.ids.runner, f.projectSlug);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.access.kind).toBe("runner");
    // No "shared by" badge on your own project.
    expect(r.ok && r.value.sharedBy).toBeNull();
  });

  test("a joined seat reads it and is told who shared it", async () => {
    const r = await getBySlugForViewer(f.ids.decider, f.projectSlug);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.access.kind).toBe("participant");
    expect(r.ok && r.value.sharedBy).not.toBeNull();
  });

  test.each([
    ["a stranger", () => f.ids.stranger],
    ["a builder on the round", () => f.ids.builder],
    ["an unclaimed invitee", () => f.ids.invitedOnly],
    ["a revoked seat", () => f.ids.revoked],
    ["another project's runner", () => f.ids.otherRunner],
  ])("%s is refused", async (_label, getId) => {
    const r = await getBySlugForViewer(getId(), f.projectSlug);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("forbidden");
  });

  test("a seat holder cannot read the unrelated project by slug", async () => {
    const r = await getBySlugForViewer(f.ids.decider, f.otherProjectSlug);
    expect(r.ok).toBe(false);
  });

  test("a nonexistent slug is not found, and does not leak as forbidden", async () => {
    const r = await getBySlugForViewer(f.ids.runner, `${f.tag}-no-such-thing`);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("not_found");
  });
});

/* ── the shared-with-me list ────────────────────────────────────── */

describe("listProjectsSharedWithMe", () => {
  // Positive control first, and deliberately so: every negative case
  // below asserts that a row is ABSENT, which a wrong field name
  // would satisfy for the wrong reason. This test is what proves the
  // others are looking at something real.
  test("a joined seat sees the project", async () => {
    const rows = await listProjectsSharedWithMe(f.ids.decider);
    expect(rows.some((p) => p.projectId === f.projectId)).toBe(true);
  });

  test("the runner's OWN project never appears as shared with them", async () => {
    const rows = await listProjectsSharedWithMe(f.ids.runner);
    expect(rows.some((p) => p.projectId === f.projectId)).toBe(false);
  });

  test.each([
    ["an unclaimed invitee", () => f.ids.invitedOnly],
    ["a revoked seat", () => f.ids.revoked],
    ["a stranger", () => f.ids.stranger],
    ["a builder", () => f.ids.builder],
  ])("%s sees nothing of it", async (_label, getId) => {
    const rows = await listProjectsSharedWithMe(getId());
    expect(rows.some((p) => p.projectId === f.projectId)).toBe(false);
  });

  test("a revoked seat loses the shared list entry immediately", async () => {
    await setSeat(f.seatIds.viewer, { status: "revoked" });
    const during = await listProjectsSharedWithMe(f.ids.viewer);
    expect(during.some((p) => p.projectId === f.projectId)).toBe(false);

    await setSeat(f.seatIds.viewer, { status: "joined" });
    const after = await listProjectsSharedWithMe(f.ids.viewer);
    expect(after.some((p) => p.projectId === f.projectId)).toBe(true);
  });
});

/* ── the runner's own register ──────────────────────────────────── */

describe("listParticipantsForRunner", () => {
  test("the runner sees the seats they granted", async () => {
    const rows = await listParticipantsForRunner(f.ids.runner);
    const mine = rows.filter((r) => r.projectId === f.projectId);
    expect(mine.length).toBeGreaterThan(0);
    // Active seats only: a revoked seat is history, not a client on
    // the practice desk's client column.
    expect(mine.every((r) => r.status === "invited" || r.status === "joined")).toBe(
      true,
    );
    expect(mine.some((r) => r.email.includes("revoked"))).toBe(false);
  });

  test("another runner's register never contains this project", async () => {
    const rows = await listParticipantsForRunner(f.ids.otherRunner);
    expect(rows.some((r) => r.projectId === f.projectId)).toBe(false);
  });

  test("a seat holder is not a runner and gets no register", async () => {
    const rows = await listParticipantsForRunner(f.ids.decider);
    expect(rows.some((r) => r.projectId === f.projectId)).toBe(false);
  });
});

/* ── messaging: the thread follows the LIVE seat ────────────────── */

describe("messaging visibility", () => {
  test("the runner sees their own thread with the builder", async () => {
    const list = await listForUser(f.ids.runner);
    expect(listHas(list, f.conversationIds.runner)).toBe(true);
  });

  test("a live decider sees their parallel thread", async () => {
    const list = await listForUser(f.ids.decider);
    expect(listHas(list, f.conversationIds.decider)).toBe(true);
  });

  test("the runner does NOT see a decider's private thread", async () => {
    const list = await listForUser(f.ids.runner);
    expect(listHas(list, f.conversationIds.decider)).toBe(false);
  });

  test("a decider does NOT see the runner's thread", async () => {
    const list = await listForUser(f.ids.decider);
    expect(listHas(list, f.conversationIds.runner)).toBe(false);
  });

  // The rule that motivated the EXISTS join: a demoted seat keeps the
  // row on record for the builder but loses sight of it themselves.
  test("a seat demoted to viewer loses its thread", async () => {
    const list = await listForUser(f.ids.demoted);
    expect(listHas(list, f.conversationIds.demoted)).toBe(false);
  });

  test("the builder keeps every thread, including the demoted one", async () => {
    const list = await listForUser(f.ids.builder);
    expect(listHas(list, f.conversationIds.runner)).toBe(true);
    expect(listHas(list, f.conversationIds.decider)).toBe(true);
    expect(listHas(list, f.conversationIds.demoted)).toBe(true);
  });

  test("promoting a viewer to decider restores their thread, and demoting removes it again", async () => {
    await setSeat(f.seatIds.demoted, { role: "decider" });
    const promoted = await listForUser(f.ids.demoted);
    expect(listHas(promoted, f.conversationIds.demoted)).toBe(true);

    await setSeat(f.seatIds.demoted, { role: "viewer" });
    const demotedAgain = await listForUser(f.ids.demoted);
    expect(listHas(demotedAgain, f.conversationIds.demoted)).toBe(false);
  });

  test("revoking a live decider takes the thread with it", async () => {
    await setSeat(f.seatIds.decider, { status: "revoked" });
    const list = await listForUser(f.ids.decider);
    expect(listHas(list, f.conversationIds.decider)).toBe(false);

    await setSeat(f.seatIds.decider, { status: "joined" });
    const restored = await listForUser(f.ids.decider);
    expect(listHas(restored, f.conversationIds.decider)).toBe(true);
  });

  test.each([
    ["a stranger", () => f.ids.stranger],
    ["a revoked seat", () => f.ids.revoked],
    ["an unclaimed invitee", () => f.ids.invitedOnly],
    ["another project's runner", () => f.ids.otherRunner],
  ])("%s sees no thread on this project", async (_label, getId) => {
    const list = await listForUser(getId());
    expect(listHas(list, f.conversationIds.runner)).toBe(false);
    expect(listHas(list, f.conversationIds.decider)).toBe(false);
    expect(listHas(list, f.conversationIds.demoted)).toBe(false);
  });

  test("the per-project list obeys the same rules as the global one", async () => {
    const strangerRows = await listForUserOnProject(
      f.ids.stranger,
      f.projectId,
    );
    expect(strangerRows.length).toBe(0);

    const deciderRows = await listForUserOnProject(
      f.ids.decider,
      f.projectId,
    );
    expect(listHas(deciderRows, f.conversationIds.decider)).toBe(true);
    expect(listHas(deciderRows, f.conversationIds.runner)).toBe(false);
  });

  // The badge is computed by a second query. If it disagrees with the
  // list, a user is told they have mail they are not allowed to open.
  test("the unread badge never counts a thread the list withholds", async () => {
    const [strangerCount, revokedCount] = await Promise.all([
      countUnreadForUser(f.ids.stranger),
      countUnreadForUser(f.ids.revoked),
    ]);
    expect(strangerCount).toBe(0);
    expect(revokedCount).toBe(0);
  });

  test("the demoted seat's badge drops with its thread", async () => {
    const count = await countUnreadForUser(f.ids.demoted);
    expect(count).toBe(0);
  });
});
