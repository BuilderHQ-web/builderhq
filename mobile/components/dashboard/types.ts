/**
 * Shared payload shapes for the mobile dashboard endpoints.
 *
 * Mirror the JSON shape emitted by:
 *   GET /api/mobile/dashboard/owner
 *   GET /api/mobile/dashboard/builder
 *
 * Keeping these in a tiny standalone module (vs inlining at the
 * fetch-site) lets multiple components — the screen, skeletons,
 * empty-state copy, telemetry — reach for the same types without
 * duplicating field lists. When the server adds a field, we widen
 * the interface here and TypeScript walks every consumer.
 */

export interface OwnerProjectStats {
  /** How many builders have unlocked this project (capped at 3). */
  unlockCount: number;
  /** Submitted/shortlisted/awarded tenders received. */
  tenderCount: number;
  /** Unread message count summed across all conversations on this project. */
  unreadMessages: number;
}

export interface OwnerProjectListItem {
  id: string;
  slug: string;
  title: string;
  /** "draft" | "published" | "tendering" | "awarded" | "archived" | "rejected" */
  status: string;
  /** "single_dwelling" | "multi_dwelling" | "renovation" | "extension" */
  type: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  /** ISO-8601 from server; mobile converts to Date lazily. */
  publishedAt: string | null;
  createdAt: string;
  stats: OwnerProjectStats;
}

export interface OwnerDashboardStats {
  activeProjects: number;
  draftProjects: number;
  totalTenders: number;
  unreadMessages: number;
}

export interface ActivityItem {
  id: string;
  /** Free-form kind enum from the notifications table — used to pick an
   *  icon + accent. Unknown kinds render a generic dot. */
  kind: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface OwnerDashboardPayload {
  user: { id: string; role: "project_owner" | "builder" | "admin" };
  stats: OwnerDashboardStats;
  projects: OwnerProjectListItem[];
  activity: ActivityItem[];
}
