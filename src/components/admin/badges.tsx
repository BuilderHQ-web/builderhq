/**
 * Tiny pure-render badges used across every admin page so visual
 * language for "what state is this thing in" stays uniform.
 *
 * Server-component-safe (no client directive) — used inside lists and
 * detail headers alike.
 */

import { Badge } from "@/components/ui/badge";
import type { AdminActionKind } from "@/modules/audit";

type ApprovalStatus =
  | "incomplete"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

type UserStatus = "pending_verification" | "active" | "suspended" | "banned";
type Role = "project_owner" | "builder" | "admin" | "architect" | null;

const APPROVAL_META: Record<
  ApprovalStatus,
  { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
  incomplete: { label: "Incomplete", variant: "outline" },
  pending_review: { label: "Pending review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  suspended: { label: "Suspended", variant: "danger" },
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const USER_STATUS_META: Record<
  UserStatus,
  { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
  pending_verification: { label: "Pending email", variant: "warning" },
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "warning" },
  banned: { label: "Banned", variant: "danger" },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const meta = USER_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const ROLE_LABEL: Record<NonNullable<Role>, string> = {
  project_owner: "Owner",
  builder: "Builder",
  admin: "Admin",
  architect: "Designer",
};

export function RoleBadge({ role }: { role: Role }) {
  if (!role) return <Badge variant="outline">No role</Badge>;
  const variant =
    role === "admin" ? "accent" : role === "builder" ? "info" : "default";
  return <Badge variant={variant}>{ROLE_LABEL[role]}</Badge>;
}

const ACTION_LABEL: Record<AdminActionKind, string> = {
  builder_approved: "Approved builder",
  builder_rejected: "Rejected builder",
  builder_suspended: "Suspended builder",
  builder_unsuspended: "Reinstated builder",
  user_suspended: "Suspended user",
  user_unsuspended: "Unsuspended user",
  user_banned: "Banned user",
  user_unbanned: "Unbanned user",
  user_deleted: "Deleted user",
  project_archived: "Archived project",
  project_restored: "Restored project",
  tender_force_decided: "Force-decided tender",
};

export function actionKindLabel(kind: AdminActionKind): string {
  return ACTION_LABEL[kind] ?? kind;
}

const POSITIVE_KINDS: ReadonlySet<AdminActionKind> = new Set([
  "builder_approved",
  "builder_unsuspended",
  "user_unsuspended",
  "user_unbanned",
  "project_restored",
]);
const NEGATIVE_KINDS: ReadonlySet<AdminActionKind> = new Set([
  "builder_rejected",
  "builder_suspended",
  "user_suspended",
  "user_banned",
  "user_deleted",
  "project_archived",
]);

export function ActionKindBadge({ kind }: { kind: AdminActionKind }) {
  const variant: Parameters<typeof Badge>[0]["variant"] = POSITIVE_KINDS.has(
    kind,
  )
    ? "success"
    : NEGATIVE_KINDS.has(kind)
      ? "danger"
      : "info";
  return <Badge variant={variant}>{actionKindLabel(kind)}</Badge>;
}
