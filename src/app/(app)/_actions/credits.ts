"use server";

/**
 * Builder-side FBA actions. All read-only for now — granting is
 * done admin-side or via maybeAutoGrantFounding inside the
 * onboarding flow.
 */

import { auth } from "@/modules/auth";
import {
  getStatus,
  recentCycleHistory,
  type FbaStatus,
  type FbaCycleHistory,
  canReadStatus,
  type ActorContext,
} from "@/modules/credits";
import { fail, ok, type Result } from "@/lib/result";

async function requireBuilder(): Promise<Result<ActorContext>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return fail("forbidden", "Sign in required.");
  }
  return ok({ id: user.id, role: user.role });
}

export async function getMyFbaStatusAction(): Promise<Result<FbaStatus>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canReadStatus(a.value, a.value.id)) {
    return fail("forbidden", "Not allowed.");
  }
  return ok(await getStatus(a.value.id));
}

export async function getMyFbaHistoryAction(): Promise<
  Result<FbaCycleHistory[]>
> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  return ok(await recentCycleHistory(a.value.id));
}
