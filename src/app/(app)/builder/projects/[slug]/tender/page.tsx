import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  getMarketplacePreview,
  unlockPriceFor,
} from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import { getActiveTenderForBuilder } from "@/modules/tenders";
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

  const previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) notFound();
  const preview = previewR.value;

  // Builder must have unlocked the project to tender on it.
  const unlocked = await isUnlocked(userId, preview.id);
  if (!unlocked) {
    redirect(`/builder/projects/${slug}`);
  }

  const existing = await getActiveTenderForBuilder(userId, preview.id);
  const docs = existing
    ? await listForTenderUnchecked(existing.id)
    : [];

  return (
    <TenderForm
      preview={preview}
      priceAud={unlockPriceFor(preview.type)}
      initialTender={existing}
      initialDocs={docs}
    />
  );
}
