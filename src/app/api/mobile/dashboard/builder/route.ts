/**
 * GET /api/mobile/dashboard/builder
 *
 * Hydrates the builder-side home screen in a single roundtrip. Mirrors
 * the web /builder dashboard's information architecture but reduced to
 * the four things a builder actually opens the app for:
 *
 *   1. What's new for me?     → suggested (service-area matched)
 *   2. How am I doing?        → my active tenders (submitted/shortlisted)
 *   3. How much do I have?    → FBA credit status + remaining
 *   4. What was I looking at? → recently unlocked projects
 *
 * Bearer-token authed. 403 with `role: <actual>` hint when a non-
 * builder hits this (mobile can then call the owner dashboard).
 *
 * Service-area-aware: when the builder has service areas configured,
 * the suggested feed scopes to them. Otherwise we fall back to "any
 * recent project" so a new account isn't staring at an empty feed.
 */

import { NextResponse, type NextRequest } from "next/server";
import { inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { listForUser as listNotifications } from "@/modules/notifications";
import {
  listByIds as listProjectsByIds,
  listForMarketplace,
} from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import {
  countMyUnlocks,
  countMySaved,
  listMyUnlockedProjectIds,
} from "@/modules/unlocks";
import { listTendersForBuilder } from "@/modules/tenders";
import { projects as projectsTable } from "@/modules/projects/schema";
import { hasFullVerificationForApproval } from "@/modules/verification";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

// Caps so the payload stays under a sensible ceiling for a single
// home-screen paint. Larger lists live on dedicated tabs (browse,
// tenders) once those land.
const MAX_SUGGESTED = 6;
const MAX_UNLOCKED = 6;
const MAX_TENDERS = 6;
const MAX_ACTIVITY = 10;

interface BuilderProjectRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  type: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  budgetBand: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  unlockedCount: number;
  publishedAt: string | null;
}

interface BuilderTenderRow {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  status: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  submittedAt: string | null;
  updatedAt: string;
}

interface ActivityRow {
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
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "This dashboard is for builders.",
          role: auth.value.role,
        },
      },
      { status: 403 },
    );
  }

  const builderId = auth.value.userId;

  // Pull everything in parallel — none of these depend on each other
  // (suggested resolves service areas first, but we do that inline).
  const [
    fba,
    profile,
    unlockedIds,
    myTendersRaw,
    notifications,
    unlockCount,
    savedCount,
    verification,
  ] = await Promise.all([
    getFbaStatus(builderId),
    getBuilderProfile(builderId),
    listMyUnlockedProjectIds(builderId),
    listTendersForBuilder(builderId),
    listNotifications(builderId, { limit: MAX_ACTIVITY }),
    countMyUnlocks(builderId),
    countMySaved(builderId),
    // Powers the mobile "VerificationCallout" — only meaningful when
    // approvalStatus !== "approved", but the cost is two cheap counts
    // so we fetch it always to keep the response shape stable.
    hasFullVerificationForApproval(builderId),
  ]);

  // Suggested feed — service-area scoped if we have areas, otherwise
  // any recent published/tendering project so a new builder still has
  // something to look at.
  const serviceAreas = profile?.serviceAreas ?? [];
  const suggestedRaw =
    serviceAreas.length > 0
      ? await listForMarketplace({
          serviceAreaMatch: serviceAreas.map((a) => ({
            state: a.state,
            suburb: a.suburb,
            statewide: (a.radiusKm ?? 0) >= 50,
          })),
          limit: MAX_SUGGESTED,
        })
      : await listForMarketplace({ limit: MAX_SUGGESTED });

  // Drop suggested entries the builder has already unlocked — they're
  // already in the "Recent unlocks" section below; no reason to
  // double-render.
  const unlockedIdSet = new Set(unlockedIds);
  const suggested = suggestedRaw
    .filter((p) => !unlockedIdSet.has(p.id))
    .slice(0, MAX_SUGGESTED);

  // Recently unlocked — newest first. listMyUnlockedProjectIds already
  // returns in unlock order; we just trim + fetch the previews.
  const recentUnlockedIds = unlockedIds.slice(0, MAX_UNLOCKED);
  const unlockedPreviewsRaw =
    recentUnlockedIds.length > 0
      ? await listProjectsByIds(recentUnlockedIds)
      : [];
  // Preserve the unlock-time order from `unlockedIds` instead of
  // listByIds's default order (which is publishedAt DESC).
  const unlockedById = new Map(unlockedPreviewsRaw.map((p) => [p.id, p]));
  const unlocked = recentUnlockedIds
    .map((id) => unlockedById.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  // My active tenders — submitted/shortlisted/awarded. Join in project
  // title + slug so each row stands alone in the UI.
  const activeTenders = myTendersRaw
    .filter(
      (t) =>
        t.status === "draft" ||
        t.status === "submitted" ||
        t.status === "shortlisted" ||
        t.status === "awarded",
    )
    .slice(0, MAX_TENDERS);
  const tenderProjectIds = activeTenders.map((t) => t.projectId);
  const tenderProjectsRows =
    tenderProjectIds.length > 0
      ? await db
          .select({
            id: projectsTable.id,
            slug: projectsTable.slug,
            title: projectsTable.title,
          })
          .from(projectsTable)
          .where(inArray(projectsTable.id, tenderProjectIds))
      : [];
  const tenderProjects = new Map(tenderProjectsRows.map((r) => [r.id, r]));

  const myTenders: BuilderTenderRow[] = activeTenders.map((t) => {
    const proj = tenderProjects.get(t.projectId);
    return {
      id: t.id,
      projectId: t.projectId,
      projectSlug: proj?.slug ?? "",
      projectTitle: proj?.title ?? "Project",
      status: t.status,
      totalPriceAud: t.totalPriceAud,
      durationWeeks: t.durationWeeks,
      submittedAt: t.submittedAt ? t.submittedAt.toISOString() : null,
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  const stats = {
    activeTenders: myTenders.filter(
      (t) => t.status === "submitted" || t.status === "shortlisted",
    ).length,
    unlockedProjects: unlockCount,
    savedProjects: savedCount,
    suggestedCount: suggested.length,
  };

  // FBA — only expose the fields the mobile screen renders. Avoids
  // shipping the entire grant row over the wire (it contains operator
  // metadata builders don't need).
  const fbaOut = fba.active
    ? {
        active: true as const,
        remainingThisCycle: fba.remainingThisCycle,
        monthlyQuota: fba.monthlyQuota,
        daysToRefresh: fba.daysToRefresh,
        daysToGrantEnd: fba.daysToGrantEnd,
        cycleIndex: fba.cycleIndex,
        totalCycles: fba.totalCycles,
        totalSavedAud: fba.totalSavedAud,
      }
    : {
        active: false as const,
        reason: fba.reason,
      };

  const activity: ActivityRow[] = notifications.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  const previewToRow = (
    p: (typeof suggestedRaw)[number],
  ): BuilderProjectRow => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    type: p.type,
    suburb: p.suburb,
    state: p.state,
    postcode: p.postcode,
    budgetBand: p.budgetBand,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    unlockedCount: p.unlockedCount,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
  });

  return NextResponse.json({
    user: { id: builderId, role: auth.value.role },
    profile: {
      hasProfile: !!profile,
      approvalStatus: profile?.profile?.approvalStatus ?? null,
      companyName: profile?.profile?.companyName ?? null,
      tradingName: profile?.profile?.tradingName ?? null,
      // First name for the greeting is derived client-side from
      // AuthSession.user.name (already in the iOS session). Not
      // duplicated here to keep the response shape lean.
      serviceAreas: serviceAreas.map((a) => ({
        state: a.state,
        suburb: a.suburb,
        statewide: (a.radiusKm ?? 0) >= 50,
      })),
    },
    /**
     * Verification booleans for the dashboard's "approval callout"
     * card. Only rendered when `profile.approvalStatus !== "approved"`.
     * Mirrors what the web's `<VerificationCallout>` consumes.
     */
    verification: {
      abnVerified: verification.abnVerified,
      anyLicenceVerified: verification.anyLicenceVerified,
      reasons: verification.reasons,
    },
    stats,
    fba: fbaOut,
    suggested: suggested.map(previewToRow),
    unlocked: unlocked.map(previewToRow),
    myTenders,
    activity,
  });
}
