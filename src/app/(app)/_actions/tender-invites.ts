"use server";

/**
 * Tender round invitations — server actions for the wizard's round
 * step. Thin: auth → role gate → service (which re-verifies project
 * ownership on every call).
 */

import { requireActor } from "@/lib/actor";
import { fail, type Result } from "@/lib/result";
import {
  createBuilderInvite,
  listBuilderInvites,
  revokeBuilderInvite,
  type CreateBuilderInviteInput,
  type TenderBuilderInviteRow,
} from "@/modules/tenders";
import {
  listApprovedBuildersPublic,
  type DirectoryBuilder,
} from "@/modules/profiles";

const RUNNER_ROLES = new Set(["project_owner", "architect", "admin"]);

async function requireRunner() {
  const actor = await requireActor();
  if (!actor.ok) return actor;
  if (actor.value.mode !== "session" || !RUNNER_ROLES.has(actor.value.role)) {
    return fail("forbidden", "Only the project runner can manage invitations.");
  }
  return actor;
}

export async function createBuilderInviteAction(
  projectId: string,
  input: CreateBuilderInviteInput,
): Promise<Result<TenderBuilderInviteRow>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  return createBuilderInvite(actor.value.id, projectId, input);
}

export async function listBuilderInvitesAction(
  projectId: string,
): Promise<Result<Array<TenderBuilderInviteRow & { builderName: string | null }>>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  return listBuilderInvites(actor.value.id, projectId);
}

export async function revokeBuilderInviteAction(
  inviteId: string,
): Promise<Result<{ ok: true }>> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  return revokeBuilderInvite(actor.value.id, inviteId);
}

export async function listApprovedBuildersAction(): Promise<
  Result<DirectoryBuilder[]>
> {
  const actor = await requireRunner();
  if (!actor.ok) return actor;
  const builders = await listApprovedBuildersPublic();
  return { ok: true, value: builders };
}
