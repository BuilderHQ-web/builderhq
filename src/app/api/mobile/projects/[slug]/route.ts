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
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  getBySlugForOwner,
  getFullForUnlockedBuilder,
  getMarketplacePreview,
  update as updateProject,
  softDelete as softDeleteProject,
  type MarketplacePreview,
  type Project,
} from "@/modules/projects";
import { unlockPriceFor } from "@/modules/projects/pricing";
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
  /** The owner's brief. Visible pre-unlock (product decision 2026-07-03):
   *  builders need it to judge fit; listings are reviewed before going
   *  live so the free text stays address-safe. */
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
  /** The underlying paid-path price for this project's type. Always
   *  returned, even when FBA covers it, so the mobile CTA can render a
   *  slashed-price treatment ("~~$149~~ Free with founding access").
   *  Gives builders an explicit "you saved $X" signal. */
  basePriceAud: number;
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

/** Owner identity surfaced AFTER unlock. Builders get this so they can
 *  trust who they're tendering to (name + tenure on platform + how many
 *  projects this owner has run). Email/phone live in the messaging
 *  flow — keep this read-only and safe to embed in the cached
 *  payload. */
interface UnlockedOwnerCard {
  id: string;
  name: string;
  joinedAtIso: string;
  /** Total projects this owner has ever published (any status). Gives
   *  builders a "first-timer vs repeat client" signal. */
  publishedProjectCount: number;
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
  owner: UnlockedOwnerCard;
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
//
// Pricing is sourced from the canonical `unlockPriceFor()` helper in
// `@/modules/projects/pricing` — the same table the web uses. The
// previous local hardcoded table here had drifted (multi_dwelling: 149
// vs canonical 249); always go through the helper so we can't drift
// again.

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

  const basePriceAud = unlockPriceFor(preview.type);

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
    pricing = { kind: "paid", priceAud: basePriceAud };
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
      basePriceAud,
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

  // Parallel: tender + saved flag + owner row + the owner's lifetime
  // published-project count. The count gives builders a "first-timer
  // vs repeat client" trust signal in the owner card.
  const [tender, saved, ownerRow, ownerPublishedCount] = await Promise.all([
    getActiveTenderForBuilder(builderId, full.id),
    isProjectSaved(builderId, full.id),
    db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, full.ownerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, full.ownerId))
      .then((rows) => rows[0]?.count ?? 0),
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

  // Compose the owner's display name — prefer first+last so we don't
  // leak a stale OAuth-provided full name when the user has overridden
  // it later. Falls back to `name` then to a generic.
  const ownerDisplayName = (() => {
    if (!ownerRow) return "Project owner";
    const fl = [ownerRow.firstName, ownerRow.lastName]
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .join(" ")
      .trim();
    if (fl.length > 0) return fl;
    if (ownerRow.name && ownerRow.name.trim().length > 0) {
      return ownerRow.name.trim();
    }
    return "Project owner";
  })();

  const owner: UnlockedOwnerCard = {
    id: full.ownerId,
    name: ownerDisplayName,
    joinedAtIso: ownerRow?.createdAt
      ? ownerRow.createdAt.toISOString()
      : new Date().toISOString(),
    publishedProjectCount: ownerPublishedCount,
  };

  const payload: UnlockedBuilderPayload = {
    mode: "unlocked_builder",
    project: {
      ...previewToFields(preview),
      addressLine1: full.addressLine1 ?? null,
      description: full.description ?? null,
    },
    documents,
    unlockedCount: preview.unlockedCount,
    isSaved: saved,
    myTender,
    owner,
    showsFullAddress: true,
  };
  return NextResponse.json(payload);
}

// ── PATCH — owner edits an existing project ─────────────────────────
//
// Partial update of the editable project fields. Owner-only. Status is
// untouched (a published project stays published; the slug only regens
// for drafts, handled in the service). Returns the fresh project fields.

const EDITABLE_FIELDS = [
  // `title` is server-derived (type + suburb + state) — not owner-editable.
  "description",
  "addressLine1",
  "suburb",
  "state",
  "postcode",
  "bedrooms",
  "bathrooms",
  "floors",
  "landSizeBand",
  "buildSizeBand",
  "dwellingCount",
  "existingAgeBand",
  "extensionType",
  "extensionSizeBand",
  "budgetBand",
  "targetStartMonth",
  "targetCompletionMonth",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only project owners can edit projects." } },
      { status: 403 },
    );
  }

  const ownerResult = await getBySlugForOwner(auth.value.userId, slug);
  if (!ownerResult.ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }
  const project = ownerResult.value;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: { code: "validation", message: "Body must be an object." } },
      { status: 400 },
    );
  }
  const body = raw as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (Array.isArray(body.renovationScopeTags)) {
    patch.renovationScopeTags = body.renovationScopeTags;
  }

  const result = await updateProject(
    auth.value.userId,
    project.id,
    patch as Parameters<typeof updateProject>[2],
  );
  if (!result.ok) {
    const status =
      result.error.code === "not_found" ? 404 :
      result.error.code === "forbidden" ? 403 :
      result.error.code === "validation" ? 400 :
      500;
    // Surface per-field errors (cleared required field on a live project)
    // so the client can render them inline.
    const details = result.error.details as { fieldErrors?: Record<string, string> } | undefined;
    return NextResponse.json(
      {
        error: {
          code: result.error.code,
          message: result.error.message,
          // `details` is the mobile client's field-error channel.
          ...(details?.fieldErrors ? { details: details.fieldErrors } : {}),
        },
      },
      { status },
    );
  }

  const p = result.value;
  return NextResponse.json({
    project: {
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      type: p.type,
      // Lets the client detect a draft→live auto-promotion on save.
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    },
  });
}

// MARK: - DELETE (owner, gated on zero unlocks)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only project owners can delete projects." } },
      { status: 403 },
    );
  }

  const ownerResult = await getBySlugForOwner(auth.value.userId, slug);
  if (!ownerResult.ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }
  const project = ownerResult.value;

  // A project any builder has unlocked can't be deleted — they spent a
  // credit / paid for access. Tell the client so it can offer "archive".
  const unlockCount = await countUnlocksForProject(project.id);
  if (unlockCount > 0) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: `This project has been unlocked by ${unlockCount} builder${unlockCount === 1 ? "" : "s"}, so it can't be deleted.`,
          // Structured detail the iOS client reads to drive the blocked UI.
          details: { reason: "has_active_unlocks", unlockCount: String(unlockCount) },
        },
      },
      { status: 400 },
    );
  }

  const result = await softDeleteProject(auth.value.userId, project.id);
  if (!result.ok) {
    const status =
      result.error.code === "not_found" ? 404 :
      result.error.code === "forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  return NextResponse.json({ deleted: { id: result.value.id } });
}
