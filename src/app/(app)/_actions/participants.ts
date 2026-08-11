"use server";

/**
 * Participant seats — server actions for the sharing panel and the
 * claim page. Thin: auth → role gate → service (which re-verifies
 * project ownership on every call). The claim action is the one
 * exception to the runner gate: any signed-in account may attempt a
 * claim, and the service enforces the email binding.
 */

import { requireActor } from "@/lib/actor";
import { limiters } from "@/lib/ratelimit";
import { fail, type Result } from "@/lib/result";
import {
  inviteParticipant,
  listParticipants,
  revokeParticipant,
  setParticipantRole,
  resendParticipantInvite,
  claimParticipantInvite,
  dispatchParticipantInvite,
  dispatchParticipantJoined,
  getParticipantInviteByToken,
  type InviteParticipantInput,
  type ParticipantRole,
  type ProjectParticipantRow,
} from "@/modules/projects";

const RUNNER_ROLES = new Set(["project_owner", "architect", "admin"]);

async function requireRunner() {
  const actor = await requireActor();
  if (!actor.ok) return actor;
  if (actor.value.mode !== "session" || !RUNNER_ROLES.has(actor.value.role)) {
    return fail("forbidden", "Only the project runner can manage sharing.");
  }
  return actor;
}

export async function inviteParticipantAction(
  projectId: string,
  input: InviteParticipantInput,
): Promise<Result<ProjectParticipantRow & { emailed: boolean }>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  const rl = await limiters.participantInvite.limit(`user:${actor.value.id}`);
  if (!rl.success) {
    return fail("rate_limited", "Too many invitations at once. Try again in a few minutes.");
  }
  const created = await inviteParticipant(actor.value.id, projectId, input);
  if (!created.ok) return created;
  const { emailed } = await dispatchParticipantInvite(created.value.id);
  return { ok: true, value: { ...created.value, emailed } };
}

export async function listParticipantsAction(projectId: string): Promise<
  Result<
    Array<
      ProjectParticipantRow & {
        joinedUserName: string | null;
        expired: boolean;
        expiresAt: Date;
      }
    >
  >
> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  return listParticipants(actor.value.id, projectId);
}

export async function revokeParticipantAction(
  participantId: string,
): Promise<Result<{ ok: true }>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  return revokeParticipant(actor.value.id, participantId);
}

export async function setParticipantRoleAction(
  participantId: string,
  role: ParticipantRole,
): Promise<Result<{ ok: true }>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  return setParticipantRole(actor.value.id, participantId, role);
}

export async function resendParticipantInviteAction(
  participantId: string,
): Promise<Result<{ emailed: boolean }>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  const rl = await limiters.participantInvite.limit(`user:${actor.value.id}`);
  if (!rl.success) {
    return fail("rate_limited", "Too many invitations at once. Try again in a few minutes.");
  }
  const refreshed = await resendParticipantInvite(actor.value.id, participantId);
  if (!refreshed.ok) return refreshed;
  return { ok: true, value: await dispatchParticipantInvite(refreshed.value.id) };
}

/**
 * Redeem a seat for the signed-in account. Email binding and
 * single-use are enforced in the service; this adapter only supplies
 * the session identity.
 */
export async function claimParticipantInviteAction(
  token: string,
): Promise<Result<{ projectSlug: string }>> {
  const actor = await requireActor();
  if (!actor.ok) return actor;
  if (actor.value.mode !== "session" || !actor.value.email) {
    return fail("forbidden", "Sign in to accept this invitation.");
  }
  const claimed = await claimParticipantInvite(token, {
    userId: actor.value.id,
    userEmail: actor.value.email,
  });
  if (claimed.ok) {
    // The runner hears the door — resolve the seat id off the token
    // (the claim result carries only the redirect slug).
    const resolved = await getParticipantInviteByToken(token);
    if (resolved.ok) {
      await dispatchParticipantJoined(resolved.value.participant.id);
    }
  }
  return claimed;
}
