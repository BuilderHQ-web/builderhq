import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  getMarketplacePreview,
  unlockPriceFor,
} from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import {
  getActiveTenderForBuilder,
  adoptInstrumentForDraft,
  INSTRUMENT_VERSION,
  getProjectOwnerForTender,
  listResponsesForTender,
  checklistProgress,
} from "@/modules/tenders";
import { getOwnerContactPublic } from "@/modules/profiles";
import { listForTenderUnchecked } from "@/modules/documents";
import { TenderForm } from "./form";

export const metadata = { title: "Submit tender" };

/**
 * Builder tender form route. Loads the project preview + the existing
 * draft (or null), then hands everything to the client form which
 * drives autosave + submit + doc uploads.
 */
export default async function TenderRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/builder/projects/${slug}/tender`);
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

  // Builder must have unlocked the project to tender on it.
  const unlocked = await isUnlocked(userId, preview.id);
  if (!unlocked) {
    redirect(`/builder/projects/${slug}`);
  }

  const existing = await getActiveTenderForBuilder(userId, preview.id);
  // Drafts started before the instrument shipped adopt it on open, so
  // the checklist is part of every draft a builder works on today.
  if (existing && existing.status === "draft" && existing.instrumentVersion == null) {
    await adoptInstrumentForDraft(userId, existing.id);
    existing.instrumentVersion = INSTRUMENT_VERSION;
  }
  const docs = existing
    ? await listForTenderUnchecked(existing.id)
    : [];

  // Checklist progress for the submission-standard entry card + gate.
  const checklist = existing
    ? await (async () => {
        const responses = await listResponsesForTender(userId, existing.id);
        return responses.ok
          ? checklistProgress(existing, responses.value)
          : null;
      })()
    : null;

  // Award-handoff: when the builder has won this tender, surface
  // owner contact + name so they can reach out directly. Skip the
  // lookup otherwise to keep the page fast in the common case.
  const ownerContact =
    existing?.status === "awarded"
      ? await (async () => {
          const ownerId = await getProjectOwnerForTender(existing.id);
          if (!ownerId) return null;
          return getOwnerContactPublic(ownerId);
        })()
      : null;

  return (
    <TenderForm
      preview={preview}
      priceAud={unlockPriceFor(preview.type)}
      initialTender={existing}
      initialDocs={docs}
      ownerContact={ownerContact}
      initialChecklist={checklist}
    />
  );
}
