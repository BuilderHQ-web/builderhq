/**
 * GET /api/mobile/projects/browse
 *
 * Paginated marketplace listing for the mobile Browse tab.
 *
 * Query string:
 *   ?q=...                 free-text search across title
 *   ?type=single_dwelling  project type filter
 *   ?state=VIC             AU state
 *   ?postcode=3070         4-digit postcode
 *   ?budgets=under_500k    comma-separated budget bands ("a,b,c")
 *   ?serviceArea=1         if "1", scope to the caller's saved
 *                          service areas (uses their builder_profile)
 *   ?limit=20              default 20, max 50
 *   ?offset=0
 *
 * Bearer-token authed. Builders + admins only — owners use their
 * own dashboard endpoint.
 *
 * Decorates each MarketplacePreview with two builder-specific flags
 * (`isSaved`, `isUnlocked`) so the client can render the heart and
 * unlock CTA state inline without follow-up calls.
 *
 * Success (200):
 *   { items: ProjectRow[], total: number, hasMore: boolean }
 */

import { NextResponse, type NextRequest } from "next/server";

import { listForMarketplace, listByIds } from "@/modules/projects";
import type { MarketplaceFilters } from "@/modules/projects/types";
import { unlockPriceFor } from "@/modules/projects/pricing";
import { getBuilderProfile } from "@/modules/profiles";
import {
  UNLOCK_CAP,
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
} from "@/modules/unlocks";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Browse is for builders.",
        },
      },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const type = url.searchParams.get("type")?.trim() || undefined;
  const state = url.searchParams.get("state")?.trim() || undefined;
  const postcode = url.searchParams.get("postcode")?.trim() || undefined;
  const budgetsParam = url.searchParams.get("budgets")?.trim();
  const budgets = budgetsParam
    ? budgetsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const serviceAreaFlag =
    url.searchParams.get("serviceArea") === "1" ? true : false;

  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );

  // Scope: "all" (default), "saved", or "unlocked". When set to saved
  // or unlocked, the feed is restricted to the builder's own
  // saved/unlocked project ids. Pagination still applies but operates
  // on the filtered slice. Empty scope set → empty feed, surfaced as
  // an empty state on the client.
  const scopeRaw = (url.searchParams.get("scope") ?? "all").toLowerCase();
  const scope: "all" | "saved" | "unlocked" =
    scopeRaw === "saved" || scopeRaw === "unlocked" ? scopeRaw : "all";

  // If serviceArea=1 was passed, scope to the builder's saved areas.
  // Falls back gracefully to "any" if they have no profile or no areas.
  type ServiceAreaMatch = NonNullable<
    MarketplaceFilters["serviceAreaMatch"]
  >[number];
  let serviceAreaMatch: ServiceAreaMatch[] | undefined = undefined;
  if (serviceAreaFlag) {
    const bundle = await getBuilderProfile(auth.value.userId);
    const areas = bundle?.serviceAreas ?? [];
    if (areas.length > 0) {
      serviceAreaMatch = areas.map((a) => ({
        state: a.state as ServiceAreaMatch["state"],
        suburb: a.suburb,
        statewide: (a.radiusKm ?? 0) >= 50,
      }));
    }
  }

  // Pull the builder's saved + unlocked id sets once. We use them both
  // for the per-row `isSaved/isUnlocked` decoration AND, when scope is
  // narrowed, to restrict the candidate pool.
  const [savedIds, unlockedIds] = await Promise.all([
    listMySavedProjectIds(auth.value.userId).catch(() => [] as string[]),
    listMyUnlockedProjectIds(auth.value.userId).catch(() => [] as string[]),
  ]);
  const savedSet = new Set(savedIds);
  const unlockedSet = new Set(unlockedIds);

  // Resolve the candidate list. "all" → server-paginated marketplace
  // search. "saved"/"unlocked" → fetch by id, filter, then paginate
  // here. The id-bounded paths cap at the user's saved/unlocked size
  // (typically tens, not thousands), so client-side filtering is fine.
  let items: Awaited<ReturnType<typeof listForMarketplace>>;
  let hasMoreOverride: boolean | null = null;
  if (scope === "all") {
    const filters: MarketplaceFilters = {
      q,
      type: type as MarketplaceFilters["type"],
      state: state as MarketplaceFilters["state"],
      postcode,
      budgets: budgets as MarketplaceFilters["budgets"],
      serviceAreaMatch,
      limit,
      offset,
    };
    items = await listForMarketplace(filters);
  } else {
    const scopedIds = scope === "saved" ? savedIds : unlockedIds;
    if (scopedIds.length === 0) {
      items = [];
      hasMoreOverride = false;
    } else {
      const all = await listByIds(scopedIds);
      // Apply the same query-string filters in JS — small data set,
      // negligible cost. Keeps the response shape consistent across
      // scope modes.
      const lowered = q?.toLowerCase();
      const budgetSet = budgets && budgets.length > 0
        ? new Set(budgets)
        : null;
      const filtered = all.filter((p) => {
        if (type && p.type !== type) return false;
        if (state && p.state !== state) return false;
        if (postcode && p.postcode !== postcode) return false;
        if (budgetSet && (!p.budgetBand || !budgetSet.has(p.budgetBand))) {
          return false;
        }
        if (lowered && !p.title.toLowerCase().includes(lowered)) {
          return false;
        }
        if (serviceAreaMatch) {
          const hit = serviceAreaMatch.some((m) => {
            if (m.state !== p.state) return false;
            if (m.statewide) return true;
            return m.suburb === p.suburb;
          });
          if (!hit) return false;
        }
        return true;
      });
      // Same ordering convention as listForMarketplace: rounds with a
      // spot left first, then newest. This path sorts in JS because
      // the candidate set is the user's own saved/unlocked ids rather
      // than a SQL page, so the ordering has to be restated here — if
      // the marketplace order changes, this changes with it.
      const openFirst = (p: (typeof filtered)[number]) =>
        p.unlockedCount < (p.tenderSpots ?? UNLOCK_CAP) ? 0 : 1;
      filtered.sort((a, b) => {
        const spots = openFirst(a) - openFirst(b);
        if (spots !== 0) return spots;
        const at = (a.publishedAt ?? a.createdAt)?.getTime() ?? 0;
        const bt = (b.publishedAt ?? b.createdAt)?.getTime() ?? 0;
        return bt - at;
      });
      const slice = filtered.slice(offset, offset + limit);
      hasMoreOverride = offset + slice.length < filtered.length;
      items = slice;
    }
  }

  const shaped = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type,
    status: p.status,
    suburb: p.suburb,
    state: p.state,
    postcode: p.postcode,
    budgetBand: p.budgetBand,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    documentCount: p.documentCount,
    unlockedCount: p.unlockedCount,
    unlockCap: UNLOCK_CAP,
    unlockPriceAud: unlockPriceFor(p.type),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    isSaved: savedSet.has(p.id),
    isUnlocked: unlockedSet.has(p.id),
  }));

  return NextResponse.json({
    items: shaped,
    hasMore: hasMoreOverride ?? shaped.length === limit,
  });
}
