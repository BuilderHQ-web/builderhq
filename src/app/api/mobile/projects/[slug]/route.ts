/**
 * GET /api/mobile/projects/[slug]
 *
 * Role-aware project detail endpoint. The same URL serves three modes:
 *
 *   1. owner             — caller owns the project. Full read access:
 *                          every field, documents, tender summary,
 *                          conversation list. This is the only mode
 *                          shipped today.
 *   2. unlocked_builder  — caller is a builder who has paid/granted
 *                          access. Returns full project + docs + their
 *                          own tender (if any). Lands with the builder
 *                          dashboard pass.
 *   3. preview           — caller is a builder who hasn't unlocked yet.
 *                          Returns the locked marketplace preview
 *                          (suburb/type/budget only, no address / docs
 *                          / owner identity). Also next pass.
 *
 * Distinguishing `mode` up-front in the JSON means the mobile screen
 * can branch on a tagged union rather than threading nullables.
 *
 * Auth: bearer token via requireMobileAuth. 404 (notFound) and 403
 * (forbidden) collapse to a single 404 — same as the web detail page —
 * so we don't leak project existence to a probing client.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  getBySlugForOwner,
  getFullForUnlockedBuilder,
  getMarketplacePreview,
  type MarketplacePreview,
  type Project,
} from "@/modules/projects";
import { projects as projectsTable } from "@/modules/projects/schema";
import { listActiveForProjectUnchecked, listForProject as listDocumentsForProject } from "@/modules/documents";
import {
  getActiveTenderForBuilder,
  listTendersForOwner,
  type TenderForOwner,
} from "@/modules/tenders";
import { listForUserOnProject } from "@/modules/messaging";
import {
  countUnlocksForProject,
  isSaved as isProjectSaved,
  isUnlocked as isProjectUnlocked,
} from "@/modules/unlocks";
import { UNLOCK_CAP } from "@/modules/unlocks/constants";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { users } from "@/modules/users";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

// ── Response types ──────────────────────────────────────────────────

interface OwnerDocumentRow {
  id: string;
  category: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  version: number;
  status: string;
  createdAt: string;
}

interface OwnerTenderRow {
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

interface OwnerConversationRow {
  id: string;
  builderId: string;
  builderName: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

interface OwnerProjectPayload {
  mode: "owner";
  project: Project & {
    publishedAtIso: string | null;
    createdAtIso: string;
  };
  stats: {
    unlockCount: number;
    tenderCount: number;
    unreadMessages: number;
  };
  documents: OwnerDocumentRow[];
  tenders: OwnerTenderRow[];
  conversations: OwnerConversationRow[];
  /** The full address + owner display fields are always shown in this
   *  mode, but we still emit a flag so the screen can match on `mode`
   *  rather than checking field nullability. */
  showsFullAddress: true;
}

// ── Builder-side payload types ──────────────────────────────────────

/** Shared preview shape — what a builder sees BEFORE they unlock. No
 *  address, no owner identity, no document downloads. Suburb/state/
 *  postcode are visible so the unlock decision is informed. */
interface BuilderProjectFields {
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
  renovationScope: string | null;
  existingAgeBand: string | null;
  extensionType: string | null;
  extensionSizeBand: string | null;
  budgetBand: string | null;
  targetStartMonth: string | null;
  targetCompletionMonth: string | null;
  description: string | null;
  publishedAtIso: string | null;
}

interface UnlockAffordance {
  /** True when the slot is open AND the builder has the means to fill
   *  it (active FBA grant with credits remaining, or paid path
   *  enabled). False blocks the CTA with the reason below. */
  canUnlock: boolean;
  /** Slots left on the project. 0 means full. */
  slotsRemaining: number;
  unlockCap: number;
  /** "free" when an FBA credit will cover it; "paid" otherwise. */
  pricing:
    | { kind: "free"; reason: "founding_access"; remainingThisCycle: number }
    | { kind: "paid"; priceAud: number }
    | { kind: "unavailable"; reason: string };
}

interface BuilderTenderSnapshot {
  id: string;
  status: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  submittedAt: string | null;
  updatedAt: string;
}

interface PreviewProjectPayload {
  mode: "preview";
  project: BuilderProjectFields;
  documentCount: number;
  unlockedCount: number;
  isSaved: boolean;
  unlock: UnlockAffordance;
  showsFullAddress: false;
}

interface UnlockedBuilderPayload {
  mode: "unlocked_builder";
  project: BuilderProjectFields & {
    addressLine1: string | null;
  };
  documents: OwnerDocumentRow[];
  unlockedCount: number;
  isSaved: boolean;
  myTender: BuilderTenderSnapshot | null;
  showsFullAddress: true;
}

// ── Handler ─────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  // Owner first — they own the read access.
  const ownerResult = await getBySlugForOwner(auth.value.userId, slug);
  if (ownerResult.ok) {
    return ownerMode(ownerResult.value, auth.value.userId);
  }

  // Builder path: resolve the project by slug via the marketplace
  // preview (visible only when published/tendering, deleted projects
  // are filtered out so this collapses to 404). Then branch on whether
  // the caller has unlocked.
  if (auth.value.role === "builder" || auth.value.role === "admin") {
    const preview = await getMarketplacePreview(slug);
    if (!preview.ok) {
      return notFoundResponse();
    }
    const unlocked = await isProjectUnlocked(
      auth.value.userId,
      preview.value.id,
    );
    if (unlocked) {
      return unlockedBuilderMode(preview.value, auth.value.userId);
    }
    return previewMode(preview.value, auth.value.userId);
  }

  return notFoundResponse();
}

function notFoundResponse() {
  return NextResponse.json(
    { error: { code: "not_found", message: "Project not found." } },
    { status: 404 },
  );
}

async function ownerMode(
  project: Project,
  ownerId: string,
): Promise<NextResponse> {
  // Parallel fetches — none depend on the others.
  const [docs, tenderRows, conversations, unlockCount] = await Promise.all([
    listDocumentsForProject(ownerId, project.id),
    listTendersForOwner(project.id),
    listForUserOnProject(ownerId, project.id),
    countUnlocksForProject(project.id),
  ]);

  // Owner display name pulled separately — not all paths need it.
  const [owner] = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
    })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  const tenders: OwnerTenderRow[] = tenderRows.map((t: TenderForOwner) => ({
    id: t.id,
    status: t.status,
    totalPriceAud: t.totalPriceAud,
    durationWeeks: t.durationWeeks,
    proposedStartMonth: t.proposedStartMonth,
    submittedAt: t.submittedAt ? t.submittedAt.toISOString() : null,
    builder: {
      id: t.builder.id,
      displayName: t.builder.companyName ?? t.builder.name ?? "Builder",
      company: t.builder.companyName,
      state: t.builder.state,
      yearsInOperation: t.builder.yearsInOperation,
    },
  }));

  const conversationsOut: OwnerConversationRow[] = conversations.map((c) => ({
    id: c.id,
    builderId: c.other.id,
    builderName: c.other.displayName,
    lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
    lastMessagePreview: c.lastMessagePreview,
    unreadCount: c.unreadCount,
  }));

  const documents: OwnerDocumentRow[] = docs.map((d) => ({
    id: d.id,
    category: d.category,
    filename: d.filename,
    contentType: d.contentType,
    sizeBytes: d.sizeBytes,
    version: d.version,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  }));

  // Submitted/shortlisted/awarded matches the web's `countTendersForProject`
  // semantics so the dashboard counter and detail counter agree.
  const tenderCount = tenderRows.filter((t) =>
    t.status === "submitted" ||
    t.status === "shortlisted" ||
    t.status === "awarded",
  ).length;

  const unreadMessages = conversations
    .filter((c) => c.other.role === "builder")
    .reduce((s, c) => s + c.unreadCount, 0);

  const payload: OwnerProjectPayload = {
    mode: "owner",
    project: {
      ...project,
      publishedAtIso: project.publishedAt
        ? project.publishedAt.toISOString()
        : null,
      createdAtIso: project.createdAt.toISOString(),
    },
    stats: {
      unlockCount,
      tenderCount,
      unreadMessages,
    },
    documents,
    tenders,
    conversations: conversationsOut,
    showsFullAddress: true,
  };

  // Owner display name is implicit (it's the caller); we still expose
  // a hint so a "from" line in messaging can use the first name without
  // a separate /me call. Stash in a header-level field for future use.
  void owner;

  return NextResponse.json(payload);
}

// ── Builder modes ────────────────────────────────────────────────────

/**
 * Per-project unlock price the marketplace charges when FBA credits
 * aren't covering the cost. Mirrors the web side's pricing schedule —
 * keep in lockstep when prices change.
 */
const UNLOCK_PRICE_BY_TYPE: Record<string, number> = {
  single_dwelling: 99,
  multi_dwelling: 149,
  renovation: 79,
  extension: 79,
};

function previewToFields(p: MarketplacePreview): BuilderProjectFields {
  return {
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
    renovationScope: p.renovationScope,
    existingAgeBand: p.existingAgeBand,
    extensionType: p.extensionType,
    extensionSizeBand: p.extensionSizeBand,
    budgetBand: p.budgetBand,
    targetStartMonth: p.targetStartMonth,
    targetCompletionMonth: p.targetCompletionMonth,
    description: p.description,
    publishedAtIso: p.publishedAt ? p.publishedAt.toISOString() : null,
  };
}

async function previewMode(
  preview: MarketplacePreview,
  builderId: string,
): Promise<NextResponse> {
  // Compute unlock affordance. Order of precedence:
  //   · slots full → unavailable
  //   · FBA active + credits left → free
  //   · otherwise → paid (lookup by type) or unavailable
  const slotsRemaining = Math.max(0, UNLOCK_CAP - preview.unlockedCount);

  const [fba, saved] = await Promise.all([
    getFbaStatus(builderId),
    isProjectSaved(builderId, preview.id),
  ]);

  let pricing: UnlockAffordance["pricing"];
  if (slotsRemaining === 0) {
    pricing = { kind: "unavailable", reason: "full" };
  } else if (fba.active && fba.remainingThisCycle > 0) {
    pricing = {
      kind: "free",
      reason: "founding_access",
      remainingThisCycle: fba.remainingThisCycle,
    };
  } else {
    const priceAud = UNLOCK_PRICE_BY_TYPE[preview.type] ?? 99;
    pricing = { kind: "paid", priceAud };
  }

  const payload: PreviewProjectPayload = {
    mode: "preview",
    project: previewToFields(preview),
    documentCount: preview.documentCount,
    unlockedCount: preview.unlockedCount,
    isSaved: saved,
    unlock: {
      canUnlock: slotsRemaining > 0 && pricing.kind !== "unavailable",
      slotsRemaining,
      unlockCap: UNLOCK_CAP,
      pricing,
    },
    showsFullAddress: false,
  };
  return NextResponse.json(payload);
}

async function unlockedBuilderMode(
  preview: MarketplacePreview,
  builderId: string,
): Promise<NextResponse> {
  // Pull the full row (now allowed since they've unlocked) for the
  // address. We've already verified the unlock above, so calling the
  // by-slug fetcher (which gates on visibility, not on the caller)
  // is sufficient.
  const fullRes = await getFullForUnlockedBuilder(preview.slug);
  if (!fullRes.ok) {
    return notFoundResponse();
  }
  const full = fullRes.value;

  // Documents the builder is allowed to see — same query the web
  // builder detail page uses.
  const docs = await listActiveForProjectUnchecked(full.id);

  const [tender, saved] = await Promise.all([
    getActiveTenderForBuilder(builderId, full.id),
    isProjectSaved(builderId, full.id),
  ]);

  const documents: OwnerDocumentRow[] = docs.map((d) => ({
    id: d.id,
    category: d.category,
    filename: d.filename,
    contentType: d.contentType,
    sizeBytes: d.sizeBytes,
    version: d.version,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  }));

  const myTender: BuilderTenderSnapshot | null = tender
    ? {
        id: tender.id,
        status: tender.status,
        totalPriceAud: tender.totalPriceAud,
        durationWeeks: tender.durationWeeks,
        submittedAt: tender.submittedAt
          ? tender.submittedAt.toISOString()
          : null,
        updatedAt: tender.updatedAt.toISOString(),
      }
    : null;

  const payload: UnlockedBuilderPayload = {
    mode: "unlocked_builder",
    project: {
      ...previewToFields(preview),
      addressLine1: full.addressLine1 ?? null,
    },
    documents,
    unlockedCount: preview.unlockedCount,
    isSaved: saved,
    myTender,
    showsFullAddress: true,
  };
  // Quiet TS unused; we keep the table import in case future ops
  // join more project-level fields here.
  void projectsTable;
  return NextResponse.json(payload);
}
