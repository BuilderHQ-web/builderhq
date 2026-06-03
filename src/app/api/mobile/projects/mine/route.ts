/**
 * GET /api/mobile/projects/mine
 *
 * Owner's full project list — drives the mobile owner "Projects" tab.
 *
 * The dashboard endpoint caps at 20 for the home-screen preview; this
 * endpoint returns every project the owner has (draft, published,
 * tendering, completed, cancelled) so the Projects tab can show the
 * complete archive. Each row is decorated with the same `stats`
 * counters as the dashboard so the UI can render unlock / tender /
 * unread badges without follow-up calls.
 *
 *   ?status=draft|published|tendering|completed|cancelled
 *     Optional server-side scope filter. Matches the iOS scope pills.
 *
 *   ?q=...
 *     Optional title search. Case-insensitive substring match in JS
 *     since the list is small (owner-scoped).
 *
 * Auth: bearer JWT, role-gated to `project_owner`.
 *
 * Success (200):
 *   { items: ProjectListItem[] }
 *
 * Failures:
 *   401  unauth
 *   403  not a project_owner
 */

import { NextResponse, type NextRequest } from "next/server";

import { listMine } from "@/modules/projects";
import { countTendersForProject } from "@/modules/tenders";
import { listForUser as listConversations } from "@/modules/messaging";
import { countUnlocksByProject } from "@/modules/unlocks";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

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
  stats: {
    unlockCount: number;
    tenderCount: number;
    unreadMessages: number;
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Only project owners can list their projects here.",
        },
      },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status")?.trim();
  const q = url.searchParams.get("q")?.trim().toLowerCase();

  const allProjects = await listMine(auth.value.userId);

  // Filter in JS — owner-scoped lists are small (typically <100 even
  // for power users), and avoiding a typed-enum dance in Drizzle here
  // keeps the route's shape identical to the dashboard endpoint.
  const filtered = allProjects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (q && !p.title.toLowerCase().includes(q)) return false;
    return true;
  });
  const projectIds = filtered.map((p) => p.id);

  // Same batched counters as the dashboard endpoint. Empty input lists
  // short-circuit cleanly inside each helper.
  const [unlocksByProject, tenderCountsArr, conversations] = await Promise.all([
    projectIds.length === 0
      ? Promise.resolve(new Map<string, number>())
      : countUnlocksByProject(projectIds),
    projectIds.length === 0
      ? Promise.resolve([] as number[])
      : Promise.all(projectIds.map((id) => countTendersForProject(id))),
    listConversations(auth.value.userId),
  ]);

  const tenderCountByProject = new Map<string, number>();
  for (let i = 0; i < projectIds.length; i++) {
    tenderCountByProject.set(projectIds[i]!, tenderCountsArr[i] ?? 0);
  }

  const unreadByProject = new Map<string, number>();
  for (const c of conversations) {
    if (c.other.role !== "builder") continue;
    const prior = unreadByProject.get(c.projectId) ?? 0;
    unreadByProject.set(c.projectId, prior + c.unreadCount);
  }

  const items: ProjectListItem[] = filtered.map((p) => ({
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

  // Default priority order (scalable, server-side): projects with
  // tenders first, then live (published/tendering), then drafts, then
  // the rest — newest first within each tier. A status scope-pill
  // collapses to one tier so this just becomes newest-first there.
  const tier = (it: ProjectListItem): number => {
    if (it.stats.tenderCount > 0) return 0;
    if (it.status === "published" || it.status === "tendering") return 1;
    if (it.status === "draft") return 2;
    return 3;
  };
  items.sort((a, b) => {
    const t = tier(a) - tier(b);
    return t !== 0 ? t : b.createdAt.localeCompare(a.createdAt);
  });

  return NextResponse.json({ items });
}
