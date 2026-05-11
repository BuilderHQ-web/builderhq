/**
 * admin · service layer.
 *
 * Read + write helpers consumed by the /admin pages. Split into two
 * conceptual halves:
 *
 *   - getAdminDashboardData()      → overview rollup
 *   - listBuilders / listUsers     → table data with filters
 *   - getBuilderForAdmin(builderId) → single-builder detail bundle
 *   - approveBuilder, rejectBuilder, suspendBuilder, ...
 *     → write operations. Every one logs to the audit module after
 *       a successful state change so the audit trail mirrors reality.
 *
 * All writes return Result<...> instead of throwing; the calling
 * server action surfaces the error message to the admin user.
 *
 * Permissions are checked at the server-action layer (every action
 * verifies role === 'admin' before delegating here). This module
 * trusts its callers and only validates state-machine invariants
 * (e.g. you can't approve a builder that's already approved without
 * intent).
 */

import "server-only";
import { and, count, desc, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects";
import { tenders } from "@/modules/tenders";
import {
  builderProfiles,
  projectOwnerProfiles,
  builderLicences,
} from "@/modules/profiles";
import {
  logAdminAction,
  listAdminActionsForSubject,
  listRecentAdminActions,
  type AdminActionRow,
} from "@/modules/audit";

// ── public types ────────────────────────────────────────────────────────

export type AdminDashboardData = {
  totals: {
    users: number;
    owners: number;
    builders: number;
    admins: number;
    suspendedUsers: number;
    bannedUsers: number;
    activeProjects: number;
    publishedProjects: number;
    draftProjects: number;
    tendersTotal: number;
    tendersThisWeek: number;
    totalQuotedValueAud: number;
  };
  builders: {
    pendingReview: number;
    approved: number;
    rejected: number;
    suspended: number;
    incomplete: number;
  };
  /** Pending-review builders ordered by oldest first (longest wait). */
  pendingReviewQueue: AdminBuilderListItem[];
  /** Latest admin actions across the platform. */
  recentActions: AdminActionRow[];
  /** Most-recent signups (any role), newest first. */
  recentSignups: Array<{
    id: string;
    name: string | null;
    email: string;
    role: "project_owner" | "builder" | "admin" | null;
    status: "pending_verification" | "active" | "suspended" | "banned";
    createdAt: Date;
  }>;
};

export type AdminBuilderListItem = {
  userId: string;
  email: string;
  name: string | null;
  companyName: string | null;
  abn: string | null;
  state: string | null;
  approvalStatus:
    | "incomplete"
    | "pending_review"
    | "approved"
    | "rejected"
    | "suspended";
  approvedAt: Date | null;
  approvedVia: string | null;
  userStatus: "pending_verification" | "active" | "suspended" | "banned";
  /** Submitted-for-approval timestamp (== profile updatedAt while
   *  still incomplete; profile.approvedAt when approved). */
  submittedAt: Date;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  awardedCount: number;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: "project_owner" | "builder" | "admin" | null;
  status: "pending_verification" | "active" | "suspended" | "banned";
  createdAt: Date;
  lastSeenAt: Date | null;
};

export type AdminBuilderDetail = {
  user: AdminUserListItem;
  profile: typeof builderProfiles.$inferSelect | null;
  licences: Array<typeof builderLicences.$inferSelect>;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  history: AdminActionRow[];
};

// ── dashboard overview ──────────────────────────────────────────────────

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  // All counts in parallel. Each is a single aggregate query —
  // dashboard load stays cheap regardless of platform scale.
  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    usersCount,
    ownersCount,
    buildersCount,
    adminsCount,
    suspendedCount,
    bannedCount,
    activeProjectsCount,
    publishedProjectsCount,
    draftProjectsCount,
    tendersTotalRow,
    tendersThisWeekRow,
    totalQuotedRow,
    bPending,
    bApproved,
    bRejected,
    bSuspended,
    bIncomplete,
    recentActions,
    recentSignupsRows,
  ] = await Promise.all([
    db.$count(users, isNull(users.deletedAt)),
    db.$count(users, and(eq(users.role, "project_owner"), isNull(users.deletedAt))),
    db.$count(users, and(eq(users.role, "builder"), isNull(users.deletedAt))),
    db.$count(users, and(eq(users.role, "admin"), isNull(users.deletedAt))),
    db.$count(users, and(eq(users.status, "suspended"), isNull(users.deletedAt))),
    db.$count(users, and(eq(users.status, "banned"), isNull(users.deletedAt))),
    db.$count(
      projects,
      and(
        inArray(projects.status, ["published", "tendering"]),
        isNull(projects.deletedAt),
      ),
    ),
    db.$count(
      projects,
      and(eq(projects.status, "published"), isNull(projects.deletedAt)),
    ),
    db.$count(
      projects,
      and(eq(projects.status, "draft"), isNull(projects.deletedAt)),
    ),
    db
      .select({ n: count() })
      .from(tenders)
      .where(
        and(
          inArray(tenders.status, [
            "submitted",
            "shortlisted",
            "awarded",
            "rejected",
          ]),
          isNull(tenders.deletedAt),
        ),
      ),
    db
      .select({ n: count() })
      .from(tenders)
      .where(
        and(
          inArray(tenders.status, [
            "submitted",
            "shortlisted",
            "awarded",
            "rejected",
          ]),
          isNull(tenders.deletedAt),
          gt(tenders.submittedAt, oneWeekAgo),
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${tenders.totalPriceAud}), 0)`.mapWith(
          Number,
        ),
      })
      .from(tenders)
      .where(
        and(
          inArray(tenders.status, [
            "submitted",
            "shortlisted",
            "awarded",
            "rejected",
          ]),
          isNull(tenders.deletedAt),
        ),
      ),
    db.$count(builderProfiles, eq(builderProfiles.approvalStatus, "pending_review")),
    db.$count(builderProfiles, eq(builderProfiles.approvalStatus, "approved")),
    db.$count(builderProfiles, eq(builderProfiles.approvalStatus, "rejected")),
    db.$count(builderProfiles, eq(builderProfiles.approvalStatus, "suspended")),
    db.$count(builderProfiles, eq(builderProfiles.approvalStatus, "incomplete")),
    listRecentAdminActions({ limit: 12 }),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt))
      .limit(8),
  ]);

  const pendingReviewQueue = await listBuilders({
    status: "pending_review",
    limit: 6,
    order: "oldest",
  });

  return {
    totals: {
      users: usersCount,
      owners: ownersCount,
      builders: buildersCount,
      admins: adminsCount,
      suspendedUsers: suspendedCount,
      bannedUsers: bannedCount,
      activeProjects: activeProjectsCount,
      publishedProjects: publishedProjectsCount,
      draftProjects: draftProjectsCount,
      tendersTotal: tendersTotalRow[0]?.n ?? 0,
      tendersThisWeek: tendersThisWeekRow[0]?.n ?? 0,
      totalQuotedValueAud: totalQuotedRow[0]?.total ?? 0,
    },
    builders: {
      pendingReview: bPending,
      approved: bApproved,
      rejected: bRejected,
      suspended: bSuspended,
      incomplete: bIncomplete,
    },
    pendingReviewQueue,
    recentActions,
    recentSignups: recentSignupsRows,
  };
}

// ── builders list ──────────────────────────────────────────────────────

export type BuilderListFilters = {
  status?:
    | "all"
    | "pending_review"
    | "approved"
    | "rejected"
    | "suspended"
    | "incomplete";
  search?: string;
  limit?: number;
  /** 'oldest' (longest-waiting first) | 'newest' (most-recent first).
   *  Default newest. */
  order?: "newest" | "oldest";
};

export async function listBuilders(
  filters: BuilderListFilters = {},
): Promise<AdminBuilderListItem[]> {
  const { status = "all", search, limit = 100, order = "newest" } = filters;
  const conds = [];
  if (status !== "all")
    conds.push(eq(builderProfiles.approvalStatus, status));
  if (search && search.trim()) {
    const needle = `%${search.trim()}%`;
    conds.push(
      or(
        ilike(builderProfiles.companyName, needle),
        ilike(users.email, needle),
        ilike(builderProfiles.abn, needle),
      )!,
    );
  }

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      companyName: builderProfiles.companyName,
      abn: builderProfiles.abn,
      state: builderProfiles.businessState,
      approvalStatus: builderProfiles.approvalStatus,
      approvedAt: builderProfiles.approvedAt,
      approvedVia: builderProfiles.approvedVia,
      userStatus: users.status,
      profileUpdatedAt: builderProfiles.updatedAt,
      profileCreatedAt: builderProfiles.createdAt,
    })
    .from(builderProfiles)
    .innerJoin(users, eq(users.id, builderProfiles.userId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(
      order === "oldest"
        ? builderProfiles.updatedAt
        : desc(builderProfiles.updatedAt),
    )
    .limit(limit);

  if (rows.length === 0) return [];

  // Verification chips + win counts — batched lookups.
  const builderIds = rows.map((r) => r.userId);
  const [verificationByBuilder, awardedByBuilder] = await Promise.all([
    fetchVerificationChipsBatch(builderIds),
    fetchAwardedCountsBatch(builderIds),
  ]);

  return rows.map((r) => {
    const v = verificationByBuilder.get(r.userId) ?? {
      abnVerified: false,
      anyLicenceVerified: false,
    };
    return {
      userId: r.userId,
      email: r.email,
      name: r.name,
      companyName: r.companyName,
      abn: r.abn,
      state: r.state,
      approvalStatus: r.approvalStatus,
      approvedAt: r.approvedAt,
      approvedVia: r.approvedVia,
      userStatus: r.userStatus,
      submittedAt: r.profileUpdatedAt,
      abnVerified: v.abnVerified,
      anyLicenceVerified: v.anyLicenceVerified,
      awardedCount: awardedByBuilder.get(r.userId) ?? 0,
    };
  });
}

async function fetchVerificationChipsBatch(
  builderIds: string[],
): Promise<Map<string, { abnVerified: boolean; anyLicenceVerified: boolean }>> {
  const result = new Map<
    string,
    { abnVerified: boolean; anyLicenceVerified: boolean }
  >();
  if (builderIds.length === 0) return result;
  try {
    const { hasFullVerificationForApproval } = await import(
      "@/modules/verification"
    );
    const checks = await Promise.all(
      builderIds.map(async (id) => {
        try {
          const v = await hasFullVerificationForApproval(id);
          return [
            id,
            {
              abnVerified: v.abnVerified,
              anyLicenceVerified: v.anyLicenceVerified,
            },
          ] as const;
        } catch {
          return [
            id,
            { abnVerified: false, anyLicenceVerified: false },
          ] as const;
        }
      }),
    );
    for (const [id, chips] of checks) result.set(id, chips);
  } catch {
    /* verification module unavailable — empty map */
  }
  return result;
}

async function fetchAwardedCountsBatch(
  builderIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (builderIds.length === 0) return result;
  const rows = await db
    .select({
      builderId: tenders.builderId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(tenders)
    .where(
      and(
        inArray(tenders.builderId, builderIds),
        eq(tenders.status, "awarded"),
        isNull(tenders.deletedAt),
      ),
    )
    .groupBy(tenders.builderId);
  for (const r of rows) result.set(r.builderId, r.n);
  return result;
}

// ── users list ─────────────────────────────────────────────────────────

export type UserListFilters = {
  role?: "all" | "project_owner" | "builder" | "admin";
  status?: "all" | "pending_verification" | "active" | "suspended" | "banned";
  search?: string;
  limit?: number;
};

export async function listUsers(
  filters: UserListFilters = {},
): Promise<AdminUserListItem[]> {
  const { role = "all", status = "all", search, limit = 100 } = filters;
  const conds = [isNull(users.deletedAt)];
  if (role !== "all") conds.push(eq(users.role, role));
  if (status !== "all") conds.push(eq(users.status, status));
  if (search && search.trim()) {
    const needle = `%${search.trim()}%`;
    conds.push(or(ilike(users.email, needle), ilike(users.name, needle))!);
  }

  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(and(...conds))
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

// ── single builder detail ──────────────────────────────────────────────

export async function getBuilderForAdmin(
  userId: string,
): Promise<AdminBuilderDetail | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const [profile] = await db
    .select()
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, userId))
    .limit(1);

  const licences = await db
    .select()
    .from(builderLicences)
    .where(eq(builderLicences.builderId, userId))
    .orderBy(desc(builderLicences.createdAt));

  let abnVerified = false;
  let anyLicenceVerified = false;
  try {
    const { hasFullVerificationForApproval } = await import(
      "@/modules/verification"
    );
    const v = await hasFullVerificationForApproval(userId);
    abnVerified = v.abnVerified;
    anyLicenceVerified = v.anyLicenceVerified;
  } catch {
    /* verification module unavailable — chips default to false */
  }

  const history = await listAdminActionsForSubject({ userId });

  return {
    user: { ...user, role: user.role ?? null },
    profile: profile ?? null,
    licences,
    abnVerified,
    anyLicenceVerified,
    history,
  };
}

// ── writes: builder approval state ─────────────────────────────────────

async function bumpBuilderApprovalStatus(
  actorId: string,
  builderId: string,
  next:
    | "approved"
    | "rejected"
    | "suspended",
  opts: { reason?: string | null; viaManual?: boolean } = {},
): Promise<Result<{ builderId: string }>> {
  const [existing] = await db
    .select({ approvalStatus: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  if (!existing) {
    return fail("not_found", "Builder profile not found.");
  }
  if (existing.approvalStatus === next) {
    return fail("conflict", `Builder is already ${next}.`);
  }

  const patch: Partial<typeof builderProfiles.$inferInsert> = {
    approvalStatus: next,
    updatedAt: new Date(),
  };
  if (next === "approved") {
    patch.approvedAt = new Date();
    patch.approvedBy = actorId;
    patch.approvedVia = opts.viaManual ? "manual" : "auto_admin";
    patch.rejectionReason = null;
  } else if (next === "rejected") {
    patch.rejectionReason = opts.reason ?? null;
  }

  await db
    .update(builderProfiles)
    .set(patch)
    .where(eq(builderProfiles.userId, builderId));

  logger.info(
    {
      event: "admin.builder_status_changed",
      actorId,
      builderId,
      from: existing.approvalStatus,
      to: next,
    },
    "builder approval status changed by admin",
  );

  return ok({ builderId });
}

export async function approveBuilder(
  actorId: string,
  builderId: string,
  reason?: string,
): Promise<Result<{ builderId: string }>> {
  const before = await db
    .select({ status: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  const result = await bumpBuilderApprovalStatus(actorId, builderId, "approved", {
    reason,
    viaManual: true,
  });
  if (!result.ok) return result;
  await logAdminAction({
    actorId,
    kind: "builder_approved",
    subjectUserId: builderId,
    reason: reason ?? null,
    meta: { previousStatus: before[0]?.status ?? null },
  });
  return result;
}

export async function rejectBuilder(
  actorId: string,
  builderId: string,
  reason: string,
): Promise<Result<{ builderId: string }>> {
  if (!reason || reason.trim().length === 0) {
    return fail("validation", "Rejection reason is required.");
  }
  const before = await db
    .select({ status: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  const result = await bumpBuilderApprovalStatus(actorId, builderId, "rejected", {
    reason,
  });
  if (!result.ok) return result;
  await logAdminAction({
    actorId,
    kind: "builder_rejected",
    subjectUserId: builderId,
    reason,
    meta: { previousStatus: before[0]?.status ?? null },
  });
  return result;
}

export async function suspendBuilder(
  actorId: string,
  builderId: string,
  reason: string,
): Promise<Result<{ builderId: string }>> {
  if (!reason || reason.trim().length === 0) {
    return fail("validation", "Suspension reason is required.");
  }
  const before = await db
    .select({ status: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  const result = await bumpBuilderApprovalStatus(actorId, builderId, "suspended", {
    reason,
  });
  if (!result.ok) return result;
  await logAdminAction({
    actorId,
    kind: "builder_suspended",
    subjectUserId: builderId,
    reason,
    meta: { previousStatus: before[0]?.status ?? null },
  });
  return result;
}

/**
 * Reinstate a previously rejected or suspended builder back to
 * approved. Used when ops believes the original decision should be
 * reversed. Logs as 'builder_unsuspended' for clarity in the audit
 * log regardless of which terminal state we're coming back from.
 */
export async function unsuspendBuilder(
  actorId: string,
  builderId: string,
  reason?: string,
): Promise<Result<{ builderId: string }>> {
  const before = await db
    .select({ status: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);
  const previous = before[0]?.status;
  if (previous !== "rejected" && previous !== "suspended") {
    return fail(
      "conflict",
      "Builder isn't rejected or suspended — nothing to reinstate.",
    );
  }
  const result = await bumpBuilderApprovalStatus(
    actorId,
    builderId,
    "approved",
    { reason, viaManual: true },
  );
  if (!result.ok) return result;
  await logAdminAction({
    actorId,
    kind: "builder_unsuspended",
    subjectUserId: builderId,
    reason: reason ?? null,
    meta: { previousStatus: previous },
  });
  return result;
}

// ── writes: user account status ────────────────────────────────────────

async function setUserStatus(
  actorId: string,
  userId: string,
  next: "active" | "suspended" | "banned",
  opts: { reason?: string | null; kind: "suspend" | "unsuspend" | "ban" | "unban" },
): Promise<Result<{ userId: string }>> {
  const [existing] = await db
    .select({ status: users.status, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!existing) return fail("not_found", "User not found.");
  if (existing.role === "admin") {
    return fail("forbidden", "Can't change another admin's account status.");
  }
  if (existing.status === next) {
    return fail("conflict", `User is already ${next}.`);
  }

  await db
    .update(users)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const actionKind =
    opts.kind === "suspend"
      ? "user_suspended"
      : opts.kind === "unsuspend"
        ? "user_unsuspended"
        : opts.kind === "ban"
          ? "user_banned"
          : "user_unbanned";

  await logAdminAction({
    actorId,
    kind: actionKind,
    subjectUserId: userId,
    reason: opts.reason ?? null,
    meta: { previousStatus: existing.status, role: existing.role },
  });

  logger.info(
    {
      event: "admin.user_status_changed",
      actorId,
      userId,
      from: existing.status,
      to: next,
    },
    "user status changed by admin",
  );

  return ok({ userId });
}

export async function suspendUser(
  actorId: string,
  userId: string,
  reason: string,
): Promise<Result<{ userId: string }>> {
  if (!reason || reason.trim().length === 0) {
    return fail("validation", "Suspension reason is required.");
  }
  return setUserStatus(actorId, userId, "suspended", {
    reason,
    kind: "suspend",
  });
}

export async function unsuspendUser(
  actorId: string,
  userId: string,
  reason?: string,
): Promise<Result<{ userId: string }>> {
  return setUserStatus(actorId, userId, "active", { reason, kind: "unsuspend" });
}

export async function banUser(
  actorId: string,
  userId: string,
  reason: string,
): Promise<Result<{ userId: string }>> {
  if (!reason || reason.trim().length === 0) {
    return fail("validation", "Ban reason is required.");
  }
  return setUserStatus(actorId, userId, "banned", { reason, kind: "ban" });
}

export async function unbanUser(
  actorId: string,
  userId: string,
  reason?: string,
): Promise<Result<{ userId: string }>> {
  return setUserStatus(actorId, userId, "active", { reason, kind: "unban" });
}

// suppress unused-import warning — projectOwnerProfiles is reserved for
// future owner-detail rollups.
void projectOwnerProfiles;
