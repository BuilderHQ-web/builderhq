import Link from "next/link";
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
import { getActiveTenderForBuilder } from "@/modules/tenders";
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

  const previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) notFound();
  const preview = previewR.value;

  const [unlocked, saved] = await Promise.all([
    isUnlocked(userId, preview.id),
    isSaved(userId, preview.id),
  ]);

  // If unlocked, fetch the full row + docs for download + owner contact.
  const fullR = unlocked ? await getFullForUnlockedBuilder(slug) : null;
  const docs = await listActiveForProjectUnchecked(preview.id);
  const ownerContact =
    unlocked && fullR?.ok
      ? await getOwnerContactPublic(fullR.value.ownerId)
      : null;
  const fbaStatus = await getStatus(userId);
  const priceAud = unlockPriceFor(preview.type);
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
    />
  );
}
