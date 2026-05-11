"use server";

/**
 * Server actions for the admin module.
 *
 * Pattern (uniform across every action below):
 *   1. resolve session via auth()
 *   2. require role === "admin" via canAccessAdmin (forbidden otherwise)
 *   3. delegate to the admin module's service function
 *   4. on success, revalidate any path that displays the changed data
 *
 * Reads are wrapped too so the UI can use a single error envelope —
 * if the session vanishes between server render and a fetch, the
 * client surface uses the same Result handling instead of swallowing
 * an unexpected throw.
 *
 * Revalidation strategy:
 *   - Builder approval changes invalidate the overview, the builders
 *     list, and the affected builder's detail page.
 *   - User status changes invalidate the overview, the users list, and
 *     (best-effort) the builder detail if that user happens to be a
 *     builder. Cheap to over-invalidate.
 */

import { revalidatePath } from "next/cache";

import { auth } from "@/modules/auth";
import { fail, ok, type Result } from "@/lib/result";
import {
  approveBuilder,
  banUser,
  canAccessAdmin,
  deleteUser,
  getAdminDashboardData,
  getBuilderForAdmin,
  listBuilders,
  listUsers,
  rejectBuilder,
  suspendBuilder,
  suspendUser,
  unbanUser,
  unsuspendBuilder,
  unsuspendUser,
  type AdminBuilderDetail,
  type AdminBuilderListItem,
  type AdminDashboardData,
  type AdminUserListItem,
  type BuilderListFilters,
  type UserListFilters,
} from "@/modules/admin";

type AdminActor = { id: string };

async function requireAdmin(): Promise<Result<AdminActor>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return fail("forbidden", "Sign in required.");
  if (!canAccessAdmin({ id: user.id, role: user.role })) {
    return fail("forbidden", "Admin access required.");
  }
  return ok({ id: user.id });
}

function revalidateAfterBuilderChange(builderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/builders");
  revalidatePath(`/admin/builders/${builderId}`);
}

function revalidateAfterUserChange(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  // The user might be a builder — invalidate that too. Cheap.
  revalidatePath("/admin/builders");
  revalidatePath(`/admin/builders/${userId}`);
}

// ── reads ──────────────────────────────────────────────────────────────

export async function getAdminDashboardDataAction(): Promise<
  Result<AdminDashboardData>
> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return ok(await getAdminDashboardData());
}

export async function listBuildersAction(
  filters: BuilderListFilters = {},
): Promise<Result<AdminBuilderListItem[]>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return ok(await listBuilders(filters));
}

export async function listUsersAction(
  filters: UserListFilters = {},
): Promise<Result<AdminUserListItem[]>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return ok(await listUsers(filters));
}

export async function getBuilderForAdminAction(
  userId: string,
): Promise<Result<AdminBuilderDetail>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const detail = await getBuilderForAdmin(userId);
  if (!detail) return fail("not_found", "Builder not found.");
  return ok(detail);
}

// ── writes: builder approval ──────────────────────────────────────────

export async function approveBuilderAction(
  builderId: string,
  reason?: string,
): Promise<Result<{ builderId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await approveBuilder(a.value.id, builderId, reason);
  if (r.ok) revalidateAfterBuilderChange(builderId);
  return r;
}

export async function rejectBuilderAction(
  builderId: string,
  reason: string,
): Promise<Result<{ builderId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await rejectBuilder(a.value.id, builderId, reason);
  if (r.ok) revalidateAfterBuilderChange(builderId);
  return r;
}

export async function suspendBuilderAction(
  builderId: string,
  reason: string,
): Promise<Result<{ builderId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await suspendBuilder(a.value.id, builderId, reason);
  if (r.ok) revalidateAfterBuilderChange(builderId);
  return r;
}

export async function unsuspendBuilderAction(
  builderId: string,
  reason?: string,
): Promise<Result<{ builderId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await unsuspendBuilder(a.value.id, builderId, reason);
  if (r.ok) revalidateAfterBuilderChange(builderId);
  return r;
}

// ── writes: user account status ───────────────────────────────────────

export async function suspendUserAction(
  userId: string,
  reason: string,
): Promise<Result<{ userId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await suspendUser(a.value.id, userId, reason);
  if (r.ok) revalidateAfterUserChange(userId);
  return r;
}

export async function unsuspendUserAction(
  userId: string,
  reason?: string,
): Promise<Result<{ userId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await unsuspendUser(a.value.id, userId, reason);
  if (r.ok) revalidateAfterUserChange(userId);
  return r;
}

export async function banUserAction(
  userId: string,
  reason: string,
): Promise<Result<{ userId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await banUser(a.value.id, userId, reason);
  if (r.ok) revalidateAfterUserChange(userId);
  return r;
}

export async function unbanUserAction(
  userId: string,
  reason?: string,
): Promise<Result<{ userId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await unbanUser(a.value.id, userId, reason);
  if (r.ok) revalidateAfterUserChange(userId);
  return r;
}

/**
 * Soft-delete an account from the admin surface. Scrubs PII via the
 * SQL redact_user() function — relational rows (projects, tenders,
 * conversations) survive so the counter-party retains their history.
 */
export async function deleteUserAction(
  userId: string,
  reason: string,
): Promise<Result<{ userId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await deleteUser(a.value.id, userId, reason);
  if (r.ok) revalidateAfterUserChange(userId);
  return r;
}
