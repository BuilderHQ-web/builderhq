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
  type Project,
} from "@/modules/projects";
import { listForProject as listDocumentsForProject } from "@/modules/documents";
import {
  listTendersForOwner,
  type TenderForOwner,
} from "@/modules/tenders";
import { listForUserOnProject } from "@/modules/messaging";
import { countUnlocksForProject } from "@/modules/unlocks";
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

// ── Handler ─────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  // Try owner-mode first. If not an owner of this project, fall
  // through to builder logic in a future pass. For now, anyone who
  // isn't the owner gets a 404 — same as the web detail page's
  // permission collapse.
  const ownerResult = await getBySlugForOwner(auth.value.userId, slug);
  if (ownerResult.ok) {
    return ownerMode(ownerResult.value, auth.value.userId);
  }

  // Builder paths land in the next pass. Until then, anything that
  // isn't owner-mode collapses to 404.
  return NextResponse.json(
    {
      error: {
        code: "not_found",
        message: "Project not found.",
      },
    },
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
