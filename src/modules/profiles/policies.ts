/**
 * profiles · policies.
 *
 * Per-action authorization. Every server action calls one of these
 * BEFORE the service function — never trust the UI to enforce access.
 *
 * Sessions are decoded from the JWT in server actions; the shape comes
 * from src/types/next-auth.d.ts (id, role, status).
 */

interface SessionUser {
  id: string;
  role: "project_owner" | "builder" | "admin" | "architect" | null;
  status: "pending_verification" | "active" | "suspended" | "banned";
}

/** Self or admin can edit a profile row. */
export function canEditProfile(
  viewer: SessionUser | null | undefined,
  profileUserId: string,
): boolean {
  if (!viewer) return false;
  if (viewer.status !== "active") return false;
  if (viewer.role === "admin") return true;
  return viewer.id === profileUserId;
}

/**
 * View access for builder profiles. Approved profiles are public; otherwise
 * only the builder themselves + admin can see. Public-builder pages ship
 * in Phase 6, but the gate stays here so view paths share one source.
 */
export function canViewBuilderProfile(
  viewer: SessionUser | null | undefined,
  profileUserId: string,
  approvalStatus: "incomplete" | "pending_review" | "approved" | "rejected" | "suspended",
): boolean {
  if (approvalStatus === "approved") return true;
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  return viewer.id === profileUserId;
}
