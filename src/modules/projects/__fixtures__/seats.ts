/**
 * Seat fixtures — a whole cast of actors around one project, built
 * with real inserts and torn down completely.
 *
 * The scoping rules under test are enforced in SQL joins and service
 * guards, so the fixtures are real rows: a runner who owns the
 * project, every shape of seat around it (joined decider, joined
 * viewer, invited-but-never-joined, revoked, demoted), a builder who
 * tendered, and two outsiders — a stranger and the runner of a
 * DIFFERENT project, who exists purely to prove nothing leaks
 * sideways.
 *
 * Every row carries the run's unique tag in its email/slug so a failed
 * run leaves findable debris, and `destroy()` removes it all.
 */

import { and, eq, inArray, like } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import {
  projects,
  projectParticipants,
} from "@/modules/projects/schema";
import { conversations, messages } from "@/modules/messaging/schema";
import { tenders } from "@/modules/tenders/schema";
import { unlocks } from "@/modules/unlocks/schema";

/** Marks every row this harness creates. */
export const FIXTURE_TAG = "scoping-fixture";

export interface SeatFixture {
  tag: string;
  projectId: string;
  projectSlug: string;
  /** A second project owned by `otherRunner` — the leakage control. */
  otherProjectId: string;
  otherProjectSlug: string;
  ids: {
    runner: string;
    decider: string;
    viewer: string;
    invitedOnly: string;
    revoked: string;
    demoted: string;
    builder: string;
    stranger: string;
    otherRunner: string;
  };
  seatIds: {
    decider: string;
    viewer: string;
    invitedOnly: string;
    revoked: string;
    demoted: string;
  };
  conversationIds: {
    /** Builder ↔ runner. */
    runner: string;
    /** Builder ↔ the decider seat (the parallel thread). */
    decider: string;
    /** Builder ↔ the demoted seat, opened while they still decided. */
    demoted: string;
  };
  tenderId: string;
  destroy: () => Promise<void>;
}

let counter = 0;

async function makeUser(
  tag: string,
  handle: string,
  role: "project_owner" | "architect" | "builder",
): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({
      email: `${tag}.${handle}@fixture.builderhq.test`,
      name: `${handle} ${tag}`,
      firstName: handle,
      role,
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  return row!.id;
}

/**
 * Build the cast. `tag` is unique per call, so concurrent runs and
 * leftovers from a crashed run never collide.
 */
export async function seedSeats(): Promise<SeatFixture> {
  const tag = `${FIXTURE_TAG}-${Date.now().toString(36)}-${counter++}`;

  const [
    runner,
    decider,
    viewer,
    invitedOnly,
    revoked,
    demoted,
    builder,
    stranger,
    otherRunner,
  ] = await Promise.all([
    makeUser(tag, "runner", "architect"),
    makeUser(tag, "decider", "project_owner"),
    makeUser(tag, "viewer", "project_owner"),
    makeUser(tag, "invited", "project_owner"),
    makeUser(tag, "revoked", "project_owner"),
    makeUser(tag, "demoted", "project_owner"),
    makeUser(tag, "builder", "builder"),
    makeUser(tag, "stranger", "project_owner"),
    makeUser(tag, "otherrunner", "architect"),
  ]);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: runner,
      title: `Fixture round ${tag}`,
      slug: `${tag}-round`,
      type: "single_dwelling",
      status: "published",
      tenderMode: "private",
      publishedAt: new Date(),
    })
    .returning({ id: projects.id, slug: projects.slug });

  const [otherProject] = await db
    .insert(projects)
    .values({
      ownerId: otherRunner,
      title: `Unrelated round ${tag}`,
      slug: `${tag}-other`,
      type: "renovation",
      status: "published",
      tenderMode: "private",
      publishedAt: new Date(),
    })
    .returning({ id: projects.id, slug: projects.slug });

  const seat = async (
    userId: string,
    handle: string,
    role: "viewer" | "decider",
    status: "invited" | "joined" | "revoked",
  ) => {
    const [row] = await db
      .insert(projectParticipants)
      .values({
        projectId: project!.id,
        invitedBy: runner,
        email: `${tag}.${handle}@fixture.builderhq.test`,
        // An invite that was never redeemed holds no userId — exactly
        // how the real flow leaves it until the link is claimed.
        userId: status === "invited" ? null : userId,
        role,
        status,
        inviteToken: `${tag}-${handle}-token`,
        joinedAt: status === "joined" ? new Date() : null,
      })
      .returning({ id: projectParticipants.id });
    return row!.id;
  };

  const [
    deciderSeat,
    viewerSeat,
    invitedSeat,
    revokedSeat,
    demotedSeat,
  ] = await Promise.all([
    seat(decider, "decider", "decider", "joined"),
    seat(viewer, "viewer", "viewer", "joined"),
    seat(invitedOnly, "invited", "decider", "invited"),
    // Revoked while holding the strongest seat: the harshest case.
    seat(revoked, "revoked", "decider", "revoked"),
    // Demoted from decider to viewer, still joined.
    seat(demoted, "demoted", "viewer", "joined"),
  ]);

  await db
    .insert(unlocks)
    .values({ builderId: builder, projectId: project!.id, source: "invited" });

  const [tender] = await db
    .insert(tenders)
    .values({
      projectId: project!.id,
      builderId: builder,
      status: "submitted",
      instrumentVersion: 2,
      totalPriceAud: 500_000,
      submittedAt: new Date(),
    })
    .returning({ id: tenders.id });

  // Three owner-side threads on the same builder: the runner's, the
  // live decider's, and one belonging to a seat since demoted. The
  // last is the interesting one — the thread must survive as a record
  // while vanishing from the demoted holder's list.
  const convo = async (ownerId: string) => {
    const [row] = await db
      .insert(conversations)
      .values({
        projectId: project!.id,
        builderId: builder,
        ownerId,
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id });
    await db.insert(messages).values({
      conversationId: row!.id,
      senderId: builder,
      body: "Fixture message from the builder.",
    });
    return row!.id;
  };

  const runnerConvo = await convo(runner);
  const deciderConvo = await convo(decider);
  const demotedConvo = await convo(demoted);

  const userIds = [
    runner,
    decider,
    viewer,
    invitedOnly,
    revoked,
    demoted,
    builder,
    stranger,
    otherRunner,
  ];

  return {
    tag,
    projectId: project!.id,
    projectSlug: project!.slug,
    otherProjectId: otherProject!.id,
    otherProjectSlug: otherProject!.slug,
    ids: {
      runner,
      decider,
      viewer,
      invitedOnly,
      revoked,
      demoted,
      builder,
      stranger,
      otherRunner,
    },
    seatIds: {
      decider: deciderSeat,
      viewer: viewerSeat,
      invitedOnly: invitedSeat,
      revoked: revokedSeat,
      demoted: demotedSeat,
    },
    conversationIds: {
      runner: runnerConvo,
      decider: deciderConvo,
      demoted: demotedConvo,
    },
    tenderId: tender!.id,
    async destroy() {
      // Projects cascade to participants, conversations, tenders and
      // unlocks; users are deleted last because rows reference them.
      await db
        .delete(projects)
        .where(inArray(projects.id, [project!.id, otherProject!.id]));
      await db.delete(users).where(inArray(users.id, userIds));
    },
  };
}

/** Sweep debris from any crashed run. Safe to call at any time. */
export async function purgeFixtureDebris(): Promise<number> {
  const stale = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `%@fixture.builderhq.test`));
  if (stale.length === 0) return 0;
  const ids = stale.map((s) => s.id);
  await db.delete(projects).where(inArray(projects.ownerId, ids));
  await db.delete(users).where(inArray(users.id, ids));
  return ids.length;
}

/** Flip a seat mid-test — revocation and demotion must bite at once. */
export async function setSeat(
  seatId: string,
  patch: { role?: "viewer" | "decider"; status?: "invited" | "joined" | "revoked" },
): Promise<void> {
  await db
    .update(projectParticipants)
    .set(patch)
    .where(eq(projectParticipants.id, seatId));
}

/** Bind a user to a seat without joining it — the half-claimed shape. */
export async function attachSeatUser(
  seatId: string,
  userId: string,
): Promise<void> {
  await db
    .update(projectParticipants)
    .set({ userId })
    .where(eq(projectParticipants.id, seatId));
}

/** Return a seat to its unclaimed shape. */
export async function detachSeatUser(seatId: string): Promise<void> {
  await db
    .update(projectParticipants)
    .set({ userId: null })
    .where(eq(projectParticipants.id, seatId));
}

/** Does this conversation appear in the user's own list? */
export function listHas(
  list: Array<{ id: string }>,
  conversationId: string,
): boolean {
  return list.some((c) => c.id === conversationId);
}

/** Guard: never let a suite run against anything but the dev database. */
export function assertDevDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL is not set.");
  // The production branch is `tiny-resonance`; dev is `patient-frog`.
  if (url.includes("tiny-resonance")) {
    throw new Error(
      "Refusing to run seat fixtures against the production database.",
    );
  }
}

/** Convenience for suites that assert on a participant row directly. */
export async function readSeat(seatId: string) {
  const [row] = await db
    .select()
    .from(projectParticipants)
    .where(and(eq(projectParticipants.id, seatId)))
    .limit(1);
  return row ?? null;
}
