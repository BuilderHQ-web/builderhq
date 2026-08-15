import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  getMarketplacePreview,
  getFullForUnlockedBuilder,
  unlockPriceFor,
} from "@/modules/projects";
import { listActiveForProjectUnchecked } from "@/modules/documents";
import { isUnlocked, isSaved } from "@/modules/unlocks";
import { getOwnerContactPublic, getBuilderProfile } from "@/modules/profiles";
import { getStatus } from "@/modules/credits";
import {
  getActiveTenderForBuilder,
  getInviterForProject,
} from "@/modules/tenders";
import { packSummary } from "@/modules/tenders/schedule";
import { listOpenConflictsForProject } from "@/modules/scope-engine";
import {
  getProjectSchedule,
  listAddenda,
  getRoundContextForBuilders,
} from "@/modules/scope-engine";
import { hasFullVerificationForApproval } from "@/modules/verification";
import { listForUserOnProject } from "@/modules/messaging";
import { ProjectDetail } from "./detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: slug };
}

export default async function BuilderProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/builder/projects/${slug}`);
  const userId = session.user.id!;

  // Private rounds never resolve via the marketplace path — fall back
  // for invited builders, who must hold an unlock to see anything.
  let previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) {
    previewR = await getMarketplacePreview(slug, { includePrivate: true });
    if (previewR.ok && !(await isUnlocked(userId, previewR.value.id))) {
      notFound();
    }
  }
  if (!previewR.ok) notFound();
  const preview = previewR.value;

  const conflicts = await listOpenConflictsForProject(preview.id);
  const [unlocked, saved, schedule, addenda, roundContext] = await Promise.all([
    isUnlocked(userId, preview.id),
    isSaved(userId, preview.id),
    getProjectSchedule(preview.id),
    listAddenda(preview.id),
    getRoundContextForBuilders(preview.id),
  ]);
  // The pack, shaped for browsing. Counts travel to everyone. Before
  // the unlock, a small taste of real items travels too (product
  // decision 2026-08-07: four true lines sell the spot better than
  // any summary); the unlocked page reads the full schedule instead,
  // so it carries no highlights at all.
  const rawPack = schedule ? packSummary(schedule) : null;
  const pack = rawPack
    ? {
        ...rawPack,
        highlights: unlocked ? [] : rawPack.highlights.slice(0, 4),
      }
    : null;
  const latestAddendum = addenda[0]
    ? { number: addenda[0].number, issuedAtISO: addenda[0].issuedAt.toISOString() }
    : null;

  // If unlocked, fetch the full row + docs for download + owner contact.
  const fullR = unlocked ? await getFullForUnlockedBuilder(slug) : null;
  const rawDocs = await listActiveForProjectUnchecked(preview.id);
  // Before the unlock, filenames stay server-side: consultants name
  // their files after the street address, and a blur is not a wall.
  // The list still shows what exists (category, size); the names open
  // with the spot.
  const docs = unlocked
    ? rawDocs
    : rawDocs.map((d, i) => ({ ...d, filename: `Document ${i + 1}` }));
  const ownerContact =
    unlocked && fullR?.ok
      ? await getOwnerContactPublic(fullR.value.ownerId)
      : null;
  const fbaStatus = await getStatus(userId);
  const priceAud = unlockPriceFor(preview.type);
  // Provenance: who put this builder's name on the round, if anyone.
  const invitedBy = unlocked
    ? await getInviterForProject(userId, preview.id)
    : null;
  // Existing builder tender for this project (if any) — drives the
  // "Submit tender" / "Edit draft" / "View tender" CTA.
  const myTender = unlocked
    ? await getActiveTenderForBuilder(userId, preview.id)
    : null;

  // Inline project messaging — load the conversation (or 0 if not
  // unlocked yet) so the panel renders without an initial fetch. The
  // service-side filter handles auth gracefully; non-participants
  // just see an empty list.
  const conversations = unlocked
    ? await listForUserOnProject(userId, preview.id)
    : [];

  // Viewer-mode gate. We compute it server-side so the unlock CTA can
  // render a clear "verification required" state up-front — no need to
  // make the user click an unlock button just to discover they're
  // blocked. Only relevant when the project isn't already unlocked
  // (an existing unlock is unaffected by later approval changes).
  // - viewerMode === null  → builder is approved, render the standard
  //                          FBA-aware unlock bar
  // - viewerMode != null   → render the "verify your business to unlock"
  //                          panel with the specific gaps spelled out
  let viewerMode: {
    abnVerified: boolean;
    anyLicenceVerified: boolean;
  } | null = null;
  if (!unlocked) {
    const builder = await getBuilderProfile(userId);
    if (builder?.profile?.approvalStatus !== "approved") {
      const v = await hasFullVerificationForApproval(userId);
      viewerMode = {
        abnVerified: v.abnVerified,
        anyLicenceVerified: v.anyLicenceVerified,
      };
    }
  }

  return (
    <ProjectDetail
      preview={preview}
      conflicts={conflicts}
      full={fullR?.ok ? fullR.value : null}
      unlocked={unlocked}
      saved={saved}
      documents={docs}
      ownerContact={ownerContact}
      fbaStatus={fbaStatus}
      priceAud={priceAud}
      myTenderStatus={myTender?.status ?? null}
      viewerMode={viewerMode}
      myUserId={userId}
      initialConversations={conversations}
      pack={pack}
      latestAddendum={latestAddendum}
      clientBrief={roundContext.brief}
      advisories={unlocked ? roundContext.advisories : []}
      schedule={unlocked ? schedule : null}
      invitedBy={invitedBy}
    />
  );
}
