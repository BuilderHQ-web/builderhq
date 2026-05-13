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

// ─── Project detail payload ──────────────────────────────────────────

export interface ProjectDocumentRow {
  id: string;
  category: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  version: number;
  status: string;
  createdAt: string;
}

export interface ProjectTenderRow {
  id: string;
  status: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  proposedStartMonth: string | null;
  submittedAt: string | null;
  builder: {
    id: string;
    displayName: string;
    company: string | null;
    state: string | null;
    yearsInOperation: number | null;
  };
}

export interface ProjectConversationRow {
  id: string;
  builderId: string;
  builderName: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

/**
 * Full project payload for the owner-mode detail screen. `mode` is the
 * tagged-union discriminator so the screen can render confidently
 * against this shape vs the future `unlocked_builder` / `preview`
 * variants without nullable-field-walking.
 */
export interface OwnerProjectDetailPayload {
  mode: "owner";
  project: {
    id: string;
    slug: string;
    title: string;
    status: string;
    type: string;
    description: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
    addressLine1: string | null;
    dwellingCount: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floors: number | null;
    landSizeBand: string | null;
    buildSizeBand: string | null;
    extensionType: string | null;
    extensionSizeBand: string | null;
    renovationScope: string | null;
    existingAgeBand: string | null;
    budgetBand: string | null;
    targetStartMonth: string | null;
    targetCompletionMonth: string | null;
    publishedAtIso: string | null;
    createdAtIso: string;
  };
  stats: {
    unlockCount: number;
    tenderCount: number;
    unreadMessages: number;
  };
  documents: ProjectDocumentRow[];
  tenders: ProjectTenderRow[];
  conversations: ProjectConversationRow[];
  showsFullAddress: true;
}

export type ProjectDetailPayload = OwnerProjectDetailPayload;
