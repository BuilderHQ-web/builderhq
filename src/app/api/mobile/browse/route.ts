/**
 * GET /api/mobile/browse
 *
 * Builder-side marketplace browse. Returns a paginated list of
 * published/tendering projects with the metadata the mobile cards
 * render, plus a small filter manifest so the screen can populate
 * its facets without an extra roundtrip.
 *
 * Query parameters:
 *   q          — case-insensitive search over project title (web's
 *                ilike behaviour).
 *   type       — single project type (single_dwelling | renovation
 *                | extension | multi_dwelling).
 *   state      — AU state code (VIC, NSW, …).
 *   suburbsIn  — comma-separated suburb list (passed through to the
 *                marketplace listing).
 *   budgets    — comma-separated budget band keys
 *                (under_500k, 500k_1m, …).
 *   inMyArea   — "1" scopes to the caller's service areas; default
 *                is unscoped (every visible project, newest first).
 *   excludeFull — "1" hides projects already at the 3-unlock cap.
 *   excludeUnlocked — "1" hides projects the caller has already
 *                unlocked. The dashboard's "For you" feed uses this;
 *                the browse tab leaves it off so a builder can still
 *                find an already-unlocked project here.
 *   limit      — page size, 1..30, default 12.
 *   offset     — pagination offset.
 *
 * Response:
 *   {
 *     items:     BrowseProjectListItem[]
 *     hasMore:   boolean
 *     nextOffset: number | null
 *     savedIds:  string[]   // builder's full bookmark set, used to
 *                              hydrate per-card heart state in one shot
 *     mySavedCount: number
 *     totalForFilters?: number
 *   }
 *
 * Auth: bearer-token. Builders + admins pass; owners get 403 with a
 * `role: "project_owner"` hint so mobile can switch to the owner
 * variant.
 *
 * Excluding the caller's own already-unlocked projects defaults to
 * OFF — builders want to find a project here even if they unlocked
 * it three days ago and forgot the slug.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  listForMarketplace,
  type MarketplacePreview,
} from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import {
  countMySaved,
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
} from "@/modules/unlocks";
import { UNLOCK_CAP } from "@/modules/unlocks/constants";
import { requireMobileAuth } from "../_lib/requireMobileAuth";

export const runtime = "nodejs";

// Allowed enums — narrow strings client may pass so we don't trust
// arbitrary input downstream.
const PROJECT_TYPES = new Set([
  "single_dwelling",
  "multi_dwelling",
  "renovation",
  "extension",
]);
const AU_STATES = new Set(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]);
const BUDGETS = new Set([
  "under_500k",
  "500k_1m",
  "1m_1_5m",
  "1_5m_2m",
  "2m_3m",
  "3m_5m",
  "over_5m",
]);

interface BrowseListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  type: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  dwellingCount: number | null;
  landSizeBand: string | null;
  buildSizeBand: string | null;
  budgetBand: string | null;
  documentCount: number;
  unlockedCount: number;
  isFull: boolean;
  publishedAt: string | null;
  isNew: boolean;
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampInt(n: number, lo: number, hi: number, fallback: number) {
  if (Number.isFinite(n)) return Math.max(lo, Math.min(hi, Math.floor(n)));
  return fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Browse is for builders.",
          role: auth.value.role,
        },
      },
      { status: 403 },
    );
  }

  const builderId = auth.value.userId;
  const sp = request.nextUrl.searchParams;

  // Parse + validate filters.
  const q = (sp.get("q") ?? "").trim();
  const type = sp.get("type");
  const typeFilter = type && PROJECT_TYPES.has(type) ? type : undefined;
  const state = sp.get("state");
  const stateFilter = state && AU_STATES.has(state) ? state : undefined;
  const suburbs = parseList(sp.get("suburbsIn"));
  const budgets = parseList(sp.get("budgets")).filter((b) => BUDGETS.has(b));
  const inMyArea = sp.get("inMyArea") === "1";
  const excludeFull = sp.get("excludeFull") === "1";
  const excludeUnlocked = sp.get("excludeUnlocked") === "1";
  const limit = clampInt(Number(sp.get("limit")), 1, 30, 12);
  const offset = clampInt(Number(sp.get("offset")), 0, 1_000_000, 0);

  // If `inMyArea`, pull the builder's service areas and map them into
  // the listForMarketplace `serviceAreaMatch` shape.
  let serviceAreaMatch:
    | Array<{ state: string; suburb: string | null; statewide: boolean }>
    | undefined;
  if (inMyArea) {
    const profile = await getBuilderProfile(builderId);
    const areas = profile?.serviceAreas ?? [];
    if (areas.length > 0) {
      serviceAreaMatch = areas.map((a) => ({
        state: a.state,
        suburb: a.suburb,
        statewide: (a.radiusKm ?? 0) >= 50,
      }));
    } else {
      // Builder requested "in my area" but has no areas configured.
      // Returning an empty set is more honest than silently widening.
      return NextResponse.json({
        items: [],
        hasMore: false,
        nextOffset: null,
        savedIds: [],
        mySavedCount: 0,
        emptyReason: "no_service_areas",
      });
    }
  }

  // Over-fetch by +1 to detect hasMore without a second count query —
  // the cheapest pagination trick that still keeps the response shape
  // honest.
  const overFetch = limit + 1;
  // Casts here are safe: each `*Filter` value has been gated through
  // the SET-validated parsing above. We strip the cast at boundary so
  // listForMarketplace's narrow union types accept them.
  const list = await listForMarketplace({
    q: q || undefined,
    type: typeFilter as NonNullable<MarketplacePreview["type"]>,
    state: stateFilter as NonNullable<MarketplacePreview["state"]>,
    suburbsIn: suburbs.length > 0 ? suburbs : undefined,
    budgets:
      budgets.length > 0
        ? (budgets as NonNullable<MarketplacePreview["budgetBand"]>[])
        : undefined,
    serviceAreaMatch: serviceAreaMatch as
      | NonNullable<
          Parameters<typeof listForMarketplace>[0]
        >["serviceAreaMatch"]
      | undefined,
    limit: overFetch,
    offset,
  });

  // Saved + unlocked sets — used to mark cards and (optionally)
  // exclude already-unlocked rows.
  const [savedIds, unlockedIds, mySavedCount] = await Promise.all([
    listMySavedProjectIds(builderId),
    excludeUnlocked
      ? listMyUnlockedProjectIds(builderId)
      : Promise.resolve<string[]>([]),
    countMySaved(builderId),
  ]);
  const unlockedSet = new Set(unlockedIds);

  let filtered = list;
  if (excludeFull) {
    filtered = filtered.filter((p) => p.unlockedCount < UNLOCK_CAP);
  }
  if (excludeUnlocked) {
    filtered = filtered.filter((p) => !unlockedSet.has(p.id));
  }

  const hasMore = filtered.length > limit;
  const sliced = filtered.slice(0, limit);

  const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const items: BrowseListItem[] = sliced.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    type: p.type,
    suburb: p.suburb,
    state: p.state,
    postcode: p.postcode,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    floors: p.floors,
    dwellingCount: p.dwellingCount,
    landSizeBand: p.landSizeBand,
    buildSizeBand: p.buildSizeBand,
    budgetBand: p.budgetBand,
    documentCount: p.documentCount,
    unlockedCount: p.unlockedCount,
    isFull: p.unlockedCount >= UNLOCK_CAP,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    isNew: p.publishedAt
      ? now - p.publishedAt.getTime() < NEW_WINDOW_MS
      : false,
  }));

  return NextResponse.json({
    items,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    savedIds,
    mySavedCount,
  });
}
