/**
 * projects · participants.
 *
 * The seat a project runner hands to someone who should see the round
 * without running it — designed around the architect inviting their
 * client, but generic: any runner can share any project. Two roles
 * (see `participantRoleEnum`): a viewer follows, a decider can also
 * shortlist, decline and award. Neither edits the project or manages
 * the round; that stays with the runner (ownerId).
 *
 * The claim is EMAIL-BOUND: an invitation addressed to one mailbox can
 * only be redeemed by an account signed in with that address. Tokens
 * are single-use, unguessable (32 random bytes) and expire 14 days
 * after they were last sent; resending mints a fresh token and re-arms
 * the clock.
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import {
  projects,
  projectParticipants,
  type ProjectParticipantRow,
} from "./schema";
import { users } from "@/modules/users";
import { architectProfiles } from "@/modules/profiles";
import { recordProjectEvent } from "./audit";

/** Days an invitation link stays live after (re)sending. */
export const PARTICIPANT_INVITE_VALIDITY_DAYS = 14;

/** Hard per-project ceiling across ALL participant rows (any status) —
 *  a revoke-and-recreate loop can't turn a project into an email
 *  cannon. Generous: a project rarely needs more than a client and a
 *  couple of family members. */
const PARTICIPANT_ROW_CEILING = 15;

/** Minimum gap between resends of the same invitation. */
const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

export type ParticipantRole = ProjectParticipantRow["role"];

/** The warm labels the UI wears over the cold code values. */
export const PARTICIPANT_ROLE_LABEL: Record<ParticipantRole, string> = {
  viewer: "Following",
  decider: "Deciding",
};

function inviteExpiresAt(invitedAt: Date): Date {
  return new Date(
    invitedAt.getTime() + PARTICIPANT_INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  );
}

function isInviteExpired(row: ProjectParticipantRow): boolean {
  return row.status === "invited" && inviteExpiresAt(row.invitedAt) < new Date();
}

/** Load a project and confirm the actor runs it. */
async function requireRunner(
  runnerId: string,
  projectId: string,
): Promise<Result<{ id: string; slug: string; title: string }>> {
  const [project] = await db
    .select({ id: projects.id, ownerId: projects.ownerId, slug: projects.slug, title: projects.title })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (!project) return fail("not_found", "Project not found.");
  if (project.ownerId !== runnerId) return fail("forbidden", "Not your project.");
  return ok({ id: project.id, slug: project.slug, title: project.title });
}

// ── invite lifecycle (runner side) ───────────────────────────────────────

export interface InviteParticipantInput {
  email: string;
  name?: string;
  role?: ParticipantRole;
}

/**
 * Hand someone a seat. Any project stage is fine — an architect can
 * bring the client in before the drawings are even uploaded; the seat
 * simply shows whatever the project shows. Returns the row; the email
 * goes out via `dispatchParticipantInvite` (caller composes, so this
 * module stays send-free).
 */
export async function inviteParticipant(
  runnerId: string,
  projectId: string,
  input: InviteParticipantInput,
): Promise<Result<ProjectParticipantRow>> {
  const project = await requireRunner(runnerId, projectId);
  if (!project.ok) return project;

  const email = (input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("validation", "Enter a valid email address.");
  }
  const role: ParticipantRole = input.role === "decider" ? "decider" : "viewer";

  const [tally] = await db
    .select({ n: count() })
    .from(projectParticipants)
    .where(eq(projectParticipants.projectId, projectId));
  if ((tally?.n ?? 0) >= PARTICIPANT_ROW_CEILING) {
    return fail(
      "validation",
      "This project has reached its sharing limit. Contact support if you need more seats.",
    );
  }

  // One live seat per mailbox. (Expired-but-still-'invited' rows count
  // too — resend that invitation instead of stacking a duplicate.)
  const existing = await db
    .select({ id: projectParticipants.id })
    .from(projectParticipants)
    .where(
      and(
        eq(projectParticipants.projectId, projectId),
        eq(projectParticipants.email, email),
        inArray(projectParticipants.status, ["invited", "joined"]),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return fail("conflict", "That email already has a seat on this project.");
  }

  const [row] = await db
    .insert(projectParticipants)
    .values({
      projectId,
      invitedBy: runnerId,
      email,
      name: input.name?.trim() || null,
      role,
      inviteToken: randomBytes(32).toString("hex"),
    })
    .returning();
  if (!row) return fail("internal", "Could not create the invitation.");
  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "seat.invited",
    subjectId: row.id,
    summary: `Shared the project with ${row.name ?? row.email} (${PARTICIPANT_ROLE_LABEL[role]}).`,
  });
  return ok(row);
}

/** Active seats (invited + joined), newest first, with the joined
 *  account's display name when there is one. */
export async function listParticipants(
  runnerId: string,
  projectId: string,
): Promise<
  Result<
    Array<
      ProjectParticipantRow & {
        joinedUserName: string | null;
        /** Derived — status 'invited' whose link has lapsed. */
        expired: boolean;
        expiresAt: Date;
      }
    >
  >
> {
  const project = await requireRunner(runnerId, projectId);
  if (!project.ok) return project;

  const rows = await db
    .select({ participant: projectParticipants, joinedUserName: users.name })
    .from(projectParticipants)
    .leftJoin(users, eq(users.id, projectParticipants.userId))
    .where(
      and(
        eq(projectParticipants.projectId, projectId),
        inArray(projectParticipants.status, ["invited", "joined"]),
      ),
    )
    .orderBy(desc(projectParticipants.invitedAt));

  return ok(
    rows.map((r) => ({
      ...r.participant,
      joinedUserName: r.joinedUserName,
      expired: isInviteExpired(r.participant),
      expiresAt: inviteExpiresAt(r.participant.invitedAt),
    })),
  );
}

/**
 * Take a seat back. Unlike builder invites, a JOINED participant can be
 * removed — the runner controls who watches their client's file, and
 * relationships change. Access ends immediately.
 */
export async function revokeParticipant(
  runnerId: string,
  participantId: string,
): Promise<Result<{ ok: true }>> {
  const [row] = await db
    .select({
      id: projectParticipants.id,
      projectId: projectParticipants.projectId,
      status: projectParticipants.status,
      email: projectParticipants.email,
      name: projectParticipants.name,
    })
    .from(projectParticipants)
    .where(eq(projectParticipants.id, participantId))
    .limit(1);
  if (!row) return fail("not_found", "Invitation not found.");

  const project = await requireRunner(runnerId, row.projectId);
  if (!project.ok) return project;
  if (row.status === "revoked") return ok({ ok: true });

  await db
    .update(projectParticipants)
    .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(projectParticipants.id, participantId));
  await recordProjectEvent({
    projectId: row.projectId,
    actorId: runnerId,
    kind: "seat.revoked",
    subjectId: participantId,
    summary: `Removed ${row.name ?? row.email}'s seat.`,
  });
  return ok({ ok: true });
}

/** Change a seat's role (viewer ⇄ decider). Applies to live seats. */
export async function setParticipantRole(
  runnerId: string,
  participantId: string,
  role: ParticipantRole,
): Promise<Result<{ ok: true }>> {
  if (role !== "viewer" && role !== "decider") {
    return fail("validation", "Unknown role.");
  }
  const [row] = await db
    .select({
      id: projectParticipants.id,
      projectId: projectParticipants.projectId,
      status: projectParticipants.status,
      email: projectParticipants.email,
      name: projectParticipants.name,
    })
    .from(projectParticipants)
    .where(eq(projectParticipants.id, participantId))
    .limit(1);
  if (!row) return fail("not_found", "Invitation not found.");

  const project = await requireRunner(runnerId, row.projectId);
  if (!project.ok) return project;
  if (row.status === "revoked") {
    return fail("conflict", "That seat has been revoked.");
  }

  await db
    .update(projectParticipants)
    .set({ role, updatedAt: new Date() })
    .where(eq(projectParticipants.id, participantId));
  await recordProjectEvent({
    projectId: row.projectId,
    actorId: runnerId,
    kind: "seat.role_changed",
    subjectId: participantId,
    summary: `Changed ${row.name ?? row.email}'s access to ${PARTICIPANT_ROLE_LABEL[role]}.`,
  });
  return ok({ ok: true });
}

/**
 * Re-send a pending invitation: mints a FRESH single-use token and
 * re-arms the 14-day clock. The old link dies with the token swap.
 * Cooldown guards the invitee's inbox.
 */
export async function resendParticipantInvite(
  runnerId: string,
  participantId: string,
): Promise<Result<ProjectParticipantRow>> {
  const [row] = await db
    .select()
    .from(projectParticipants)
    .where(eq(projectParticipants.id, participantId))
    .limit(1);
  if (!row) return fail("not_found", "Invitation not found.");

  const project = await requireRunner(runnerId, row.projectId);
  if (!project.ok) return project;
  if (row.status !== "invited") {
    return fail("conflict", "Only pending invitations can be re-sent.");
  }
  if (Date.now() - row.invitedAt.getTime() < RESEND_COOLDOWN_MS) {
    return fail(
      "rate_limited",
      "That invitation was sent less than an hour ago. Give it a moment.",
    );
  }

  const [updated] = await db
    .update(projectParticipants)
    .set({
      inviteToken: randomBytes(32).toString("hex"),
      invitedAt: new Date(),
      // A fresh link earns a fresh nudge window.
      remindedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(projectParticipants.id, participantId))
    .returning();
  if (!updated) return fail("internal", "Could not refresh the invitation.");
  await recordProjectEvent({
    projectId: updated.projectId,
    actorId: runnerId,
    kind: "seat.invite_resent",
    subjectId: participantId,
    summary: `Re-sent the invitation to ${updated.name ?? updated.email}.`,
  });
  return ok(updated);
}

// ── the claim (invitee side) ─────────────────────────────────────────────

export type ParticipantInviteResolution = {
  participant: ProjectParticipantRow;
  /** valid → show the claim; anything else → its dead-end message. */
  state: "valid" | "expired" | "revoked" | "joined";
  expiresAt: Date;
  project: {
    id: string;
    slug: string;
    title: string;
    suburb: string | null;
    state: string | null;
    status: string;
  };
  inviter: { name: string | null; practiceName: string | null };
};

/** Resolve a claim-page token. Pure read — never mutates, so a link
 *  scanner (mail security) can hit the page without burning the seat. */
export async function getParticipantInviteByToken(
  token: string,
): Promise<Result<ParticipantInviteResolution>> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return fail("not_found", "This invitation link is not valid.");
  }
  const inviterUsers = alias(users, "inviter_users");
  const [row] = await db
    .select({
      participant: projectParticipants,
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectSuburb: projects.suburb,
      projectState: projects.state,
      projectStatus: projects.status,
      inviterName: inviterUsers.name,
      inviterPractice: architectProfiles.practiceName,
    })
    .from(projectParticipants)
    .innerJoin(
      projects,
      and(eq(projects.id, projectParticipants.projectId), isNull(projects.deletedAt)),
    )
    .innerJoin(inviterUsers, eq(inviterUsers.id, projectParticipants.invitedBy))
    .leftJoin(
      architectProfiles,
      eq(architectProfiles.userId, projectParticipants.invitedBy),
    )
    .where(eq(projectParticipants.inviteToken, token))
    .limit(1);
  if (!row) {
    return fail("not_found", "This invitation link is not valid.");
  }

  const p = row.participant;
  const state: ParticipantInviteResolution["state"] =
    p.status === "revoked"
      ? "revoked"
      : p.status === "joined"
        ? "joined"
        : isInviteExpired(p)
          ? "expired"
          : "valid";

  return ok({
    participant: p,
    state,
    expiresAt: inviteExpiresAt(p.invitedAt),
    project: {
      id: row.projectId,
      slug: row.projectSlug,
      title: row.projectTitle,
      suburb: row.projectSuburb,
      state: row.projectState,
      status: row.projectStatus,
    },
    inviter: { name: row.inviterName, practiceName: row.inviterPractice },
  });
}

/**
 * Redeem the seat. EMAIL-BOUND: the signed-in account's address must
 * match the invitation's address — an invitation forwarded to someone
 * else is a dead link, not a transferable pass. Single-use via the
 * status flip; a second redemption of a joined seat by the same user
 * is a harmless no-op (returns the project for redirect).
 */
export async function claimParticipantInvite(
  token: string,
  actor: { userId: string; userEmail: string },
): Promise<Result<{ projectSlug: string }>> {
  const resolved = await getParticipantInviteByToken(token);
  if (!resolved.ok) return resolved;
  const { participant, state, project } = resolved.value;

  if (state === "joined") {
    if (participant.userId === actor.userId) {
      return ok({ projectSlug: project.slug });
    }
    return fail("conflict", "This invitation has already been used.");
  }
  if (state === "revoked") {
    return fail("forbidden", "This invitation has been withdrawn.");
  }
  if (state === "expired") {
    return fail(
      "validation",
      "This invitation has expired. Ask for a fresh link.",
    );
  }

  if (participant.email.toLowerCase() !== actor.userEmail.trim().toLowerCase()) {
    return fail(
      "forbidden",
      "This invitation was addressed to a different email. Sign in with the address it was sent to.",
    );
  }

  await db
    .update(projectParticipants)
    .set({
      status: "joined",
      userId: actor.userId,
      joinedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectParticipants.id, participant.id),
        eq(projectParticipants.status, "invited"),
      ),
    );
  return ok({ projectSlug: project.slug });
}

// ── access (the policy hook) ─────────────────────────────────────────────

export type ProjectAccess =
  | { kind: "runner" }
  | { kind: "participant"; role: ParticipantRole; participantId: string }
  | null;

/**
 * THE server-side gate for owner-surface project pages. Every loader
 * that used to check `project.ownerId === userId` asks this instead:
 * the runner keeps full control; a joined participant reads (and, as a
 * decider, decides). Returns null for everyone else — including
 * participants whose seat was revoked.
 */
export async function getProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (!project) return null;
  if (project.ownerId === userId) return { kind: "runner" };

  const [seat] = await db
    .select({ id: projectParticipants.id, role: projectParticipants.role })
    .from(projectParticipants)
    .where(
      and(
        eq(projectParticipants.projectId, projectId),
        eq(projectParticipants.userId, userId),
        eq(projectParticipants.status, "joined"),
      ),
    )
    .limit(1);
  if (!seat) return null;
  return { kind: "participant", role: seat.role, participantId: seat.id };
}

/**
 * Slug → project for anyone with a seat at the table. The runner gets
 * their project exactly as `getBySlugForOwner` returns it; a joined
 * participant gets the same row plus their access marker, so pages can
 * hide the controls the seat doesn't carry. Everyone else: forbidden.
 */
export async function getBySlugForViewer(
  userId: string,
  slug: string,
): Promise<
  Result<{
    project: typeof projects.$inferSelect;
    access: Exclude<ProjectAccess, null>;
    /** Who shared it — set only for participant access, for the badge. */
    sharedBy: { name: string | null; practiceName: string | null } | null;
  }>
> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
    .limit(1);
  if (!project) return fail("not_found", "Project not found.");

  const access = await getProjectAccess(project.id, userId);
  if (!access) return fail("forbidden", "Not your project.");

  let sharedBy: { name: string | null; practiceName: string | null } | null =
    null;
  if (access.kind === "participant") {
    const inviterUsers = alias(users, "inviter_users");
    const [row] = await db
      .select({
        name: inviterUsers.name,
        practiceName: architectProfiles.practiceName,
      })
      .from(projectParticipants)
      .innerJoin(
        inviterUsers,
        eq(inviterUsers.id, projectParticipants.invitedBy),
      )
      .leftJoin(
        architectProfiles,
        eq(architectProfiles.userId, projectParticipants.invitedBy),
      )
      .where(eq(projectParticipants.id, access.participantId))
      .limit(1);
    sharedBy = row ?? null;
  }

  return ok({ project, access, sharedBy });
}

/** Projects shared WITH a user (their joined seats), for the dashboard
 *  "Shared with you" shelf. Carries who shared it for the badge. */
export async function listProjectsSharedWithMe(userId: string): Promise<
  Array<{
    projectId: string;
    slug: string;
    title: string;
    suburb: string | null;
    state: string | null;
    status: string;
    role: ParticipantRole;
    joinedAt: Date | null;
    sharedByName: string | null;
    sharedByPractice: string | null;
  }>
> {
  const inviterUsers = alias(users, "inviter_users");
  const rows = await db
    .select({
      projectId: projects.id,
      slug: projects.slug,
      title: projects.title,
      suburb: projects.suburb,
      state: projects.state,
      status: projects.status,
      role: projectParticipants.role,
      joinedAt: projectParticipants.joinedAt,
      sharedByName: inviterUsers.name,
      sharedByPractice: architectProfiles.practiceName,
    })
    .from(projectParticipants)
    .innerJoin(projects, eq(projects.id, projectParticipants.projectId))
    .innerJoin(inviterUsers, eq(inviterUsers.id, projectParticipants.invitedBy))
    .leftJoin(
      architectProfiles,
      eq(architectProfiles.userId, projectParticipants.invitedBy),
    )
    .where(
      and(
        eq(projectParticipants.userId, userId),
        eq(projectParticipants.status, "joined"),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(projectParticipants.joinedAt));
  return rows;
}
