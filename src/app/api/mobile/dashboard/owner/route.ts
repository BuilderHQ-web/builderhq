/**
 * GET /api/mobile/dashboard/owner
 *
 * Hydrates the project-owner home screen. Pulls every visible project
 * for the caller, decorates each with the only counters the mobile
 * dashboard surfaces (tenders received, builders unlocked), tallies a
 * few top-level stats, and returns the recent notifications feed for
 * the activity timeline.
 *
 * Shape is deliberately small + tagged so the mobile client can render
 * stable empty states (zero projects, zero activity) without conditional
 * walking through nullable fields.
 *
 * Bearer-token authed via requireMobileAuth. Returns 403 if the caller's
 * role isn't `project_owner` — mobile then knows to switch to the
 * builder dashboard endpoint instead.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  countTendersForProject,
  listTendersForOwner,
} from "@/modules/tenders";
import { listMine } from "@/modules/projects";
import { countUnlocksByProject } from "@/modules/unlocks";
import { listForUser as listNotifications } from "@/modules/notifications";
import { listForUser as listConversations } from "@/modules/messaging";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

// Hard caps so the payload stays under a sensible ceiling even for
// very active owners. Mobile screens pre-virtualise everything, so
// these are about network not render cost.
const MAX_PROJECTS = 20;
const MAX_ACTIVITY = 12;

interface ProjectStats {
  unlockCount: number;
  tenderCount: number;
  unreadMessages: number;
}

interface ProjectListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  type: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  publishedAt: string | null;
  createdAt: string;
  stats: ProjectStats;
}

interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner" && auth.value.role !== "admin") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "This dashboard is for project owners.",
          // Mobile can read this hint to switch to the builder dashboard
          // call without round-tripping.
          role: auth.value.role,
        },
      },
      { status: 403 },
    );
  }

  // 1. Owner's projects.
  const allProjects = await listMine(auth.value.userId);
  const visibleProjects = allProjects.slice(0, MAX_PROJECTS);
  const projectIds = visibleProjects.map((p) => p.id);

  // 2. Batched counters: unlocks per project, tender count per project.
  //    Tenders use a per-project call inside Promise.all — small N (≤20)
  //    so the extra round-trips are negligible vs. running an
  //    aggregation we'd have to backfill across the codebase.
  const [unlocksByProject, tenderCountsArr, conversations, notifications] =
    await Promise.all([
      countUnlocksByProject(projectIds),
      Promise.all(
        projectIds.map((id) => countTendersForProject(id)),
      ),
      // Conversations carry per-side unread counters that we can group
      // up. listForUser already does the unread math.
      listConversations(auth.value.userId),
      listNotifications(auth.value.userId, { limit: MAX_ACTIVITY }),
    ]);
  const tenderCountByProject = new Map<string, number>();
  for (let i = 0; i < projectIds.length; i++) {
    tenderCountByProject.set(projectIds[i]!, tenderCountsArr[i] ?? 0);
  }

  // Sum unread messages per project. listForUser returns conversations
  // from both sides; for the owner dashboard we want only those where
  // the other participant is a builder (which means the caller is
  // owner-side on that conversation).
  const unreadByProject = new Map<string, number>();
  for (const c of conversations) {
    if (c.other.role !== "builder") continue;
    const prior = unreadByProject.get(c.projectId) ?? 0;
    unreadByProject.set(c.projectId, prior + c.unreadCount);
  }

  // 3. Decorate project rows.
  const projects: ProjectListItem[] = visibleProjects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    type: p.type,
    suburb: p.suburb,
    state: p.state,
    postcode: p.postcode,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    stats: {
      unlockCount: unlocksByProject.get(p.id) ?? 0,
      tenderCount: tenderCountByProject.get(p.id) ?? 0,
      unreadMessages: unreadByProject.get(p.id) ?? 0,
    },
  }));

  // 4. Top-level stats for the hero strip.
  const stats = {
    activeProjects: projects.filter(
      (p) => p.status === "published" || p.status === "tendering",
    ).length,
    draftProjects: projects.filter((p) => p.status === "draft").length,
    totalTenders: projects.reduce((s, p) => s + p.stats.tenderCount, 0),
    unreadMessages: Array.from(unreadByProject.values()).reduce(
      (s, n) => s + n,
      0,
    ),
  };

  // 5. Activity feed — last MAX_ACTIVITY notifications in reverse chrono.
  const activity: ActivityItem[] = notifications.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return NextResponse.json({
    user: {
      id: auth.value.userId,
      role: auth.value.role,
    },
    stats,
    projects,
    activity,
  });
}
