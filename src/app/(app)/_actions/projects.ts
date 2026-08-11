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
import { env } from "@/lib/env";
import { fail, ok, type Result } from "@/lib/result";
import { requireActorForProject as resolveActorForProject } from "@/lib/actor";
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

/**
 * Wizard-side actor resolver. Accepts the regular Auth.js session
 * AND — for the ads-funnel — a soft-auth cookie that pins to this
 * exact project. The cookie path returns `role: "project_owner"`
 * because the funnel only signs up owners; canEdit() then applies
 * its usual ownership check against the project row.
 *
 * Mutation-style actions that should NEVER bypass email verification
 * (publish, delete) keep using `requireActor()` directly — those
 * paths reject anonymous + soft-auth callers regardless of project
 * scope.
 */
async function requireActorForProject(
  projectId: string,
): Promise<Result<ActorContext>> {
  const r = await resolveActorForProject(projectId);
  if (!r.ok) return r;
  // Strip the `mode` discriminator before handing to the projects
  // module's policy layer, which knows nothing about session source.
  return { ok: true, value: { id: r.value.id, role: r.value.role } };
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
  // Project-scoped: a soft-auth ads-funnel cookie that pins to this
  // exact project is allowed (lets the wizard autosave for a user
  // who hasn't clicked the magic link yet).
  const a = await requireActorForProject(projectId);
  if (!a.ok) return a;
  const got = await getByIdForOwner(a.value.id, projectId);
  if (!got.ok) return got;
  if (got.value.isSample) {
    return fail("forbidden", "The example round is read only.");
  }
  if (!canEdit(a.value, got.value)) return fail("forbidden", "Not allowed to edit.");
  return update(a.value.id, projectId, patch);
}

export async function checkPublishabilityAction(
  projectId: string,
): Promise<Result<PublishabilityReport>> {
  const a = await requireActorForProject(projectId);
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
  if (got.value.isSample) {
    return fail("forbidden", "The example round is read only.");
  }
  if (!canPublish(a.value, got.value)) return fail("forbidden", "Not allowed to publish.");

  // The scope publish gate: when on, publishing becomes a submission
  // for preparation — the pipeline reads the documents, ops reviews,
  // the owner answers the gaps, and only then does the round go live
  // (through this same publish path, called by completeOwnerReview).
  if (env.SCOPE_PUBLISH_GATE) {
    const { requestPreparation } = await import("@/modules/scope-engine");
    const prepared = await requestPreparation(projectId, a.value.id);
    if (!prepared.ok) return prepared;
    const fresh = await getByIdForOwner(a.value.id, projectId);
    if (!fresh.ok) return fresh;
    return ok(fresh.value);
  }

  return publish(a.value.id, projectId);
}

export async function softDeleteProjectAction(
  projectId: string,
): Promise<Result<{ id: string }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const got = await getByIdForOwner(a.value.id, projectId);
  if (!got.ok) return got;
  if (got.value.isSample) {
    return fail("forbidden", "The example round is read only.");
  }
  if (!canDelete(a.value, got.value)) return fail("forbidden", "Not allowed to delete.");
  return softDelete(a.value.id, projectId);
}

/** The runner's pre-tender brief: click answers, saved as they land. */
export async function saveOwnerBriefAction(
  projectId: string,
  brief: unknown,
): Promise<Result<{ complete: boolean }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const { isSampleProject } = await import("@/modules/sample");
  if (await isSampleProject(projectId)) {
    return fail("forbidden", "The example round is read only.");
  }
  const { saveOwnerBrief } = await import("@/modules/projects");
  return saveOwnerBrief(a.value.id, projectId, brief);
}

/** Apply the pack's read (facts, description) back onto the listing. */
export async function applyPackCorrectionsAction(
  projectId: string,
  input: {
    description?: string;
    bedrooms?: number;
    bathrooms?: number;
    dwellingCount?: number;
    floors?: number;
  },
): Promise<Result<{ applied: string[] }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const { applyPackCorrections } = await import("@/modules/projects");
  return applyPackCorrections(a.value.id, projectId, input);
}
