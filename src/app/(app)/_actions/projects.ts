"use server";

/**
 * Server actions wrapping the projects module.
 *
 * Pattern: thin adapter — auth check, policy check, then call service.
 * UI imports these (never the module directly) so the network boundary
 * stays in one place.
 */

import { auth } from "@/modules/auth";
import {
  create,
  update,
  publish,
  checkPublishability,
  getByIdForOwner,
  softDelete,
  canCreate,
  canEdit,
  canPublish,
  canDelete,
  type ActorContext,
} from "@/modules/projects";
import { fail, type Result } from "@/lib/result";
import type {
  CreateProjectInput,
  Project,
  PublishabilityReport,
  UpdateProjectInput,
} from "@/modules/projects";

async function requireActor(): Promise<Result<ActorContext>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return fail("forbidden", "Sign in required.");
  }
  return { ok: true, value: { id: user.id, role: user.role } };
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<Result<Project>> {
  const a = await requireActor();
  if (!a.ok) return a;
  if (!canCreate(a.value)) return fail("forbidden", "Not allowed to create projects.");
  return create(a.value.id, input);
}

export async function updateProjectAction(
  projectId: string,
  patch: UpdateProjectInput,
): Promise<Result<Project>> {
  const a = await requireActor();
  if (!a.ok) return a;
  // Re-fetch the project for policy check.
  const got = await getByIdForOwner(a.value.id, projectId);
  if (!got.ok) return got;
  if (!canEdit(a.value, got.value)) return fail("forbidden", "Not allowed to edit.");
  return update(a.value.id, projectId, patch);
}

export async function checkPublishabilityAction(
  projectId: string,
): Promise<Result<PublishabilityReport>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const got = await getByIdForOwner(a.value.id, projectId);
  if (!got.ok) return got;
  if (!canEdit(a.value, got.value)) return fail("forbidden", "Not allowed to view.");
  return checkPublishability(a.value.id, projectId);
}

export async function publishProjectAction(
  projectId: string,
): Promise<Result<Project>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const got = await getByIdForOwner(a.value.id, projectId);
  if (!got.ok) return got;
  if (!canPublish(a.value, got.value)) return fail("forbidden", "Not allowed to publish.");
  return publish(a.value.id, projectId);
}

export async function softDeleteProjectAction(
  projectId: string,
): Promise<Result<{ id: string }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const got = await getByIdForOwner(a.value.id, projectId);
  if (!got.ok) return got;
  if (!canDelete(a.value, got.value)) return fail("forbidden", "Not allowed to delete.");
  return softDelete(a.value.id, projectId);
}
