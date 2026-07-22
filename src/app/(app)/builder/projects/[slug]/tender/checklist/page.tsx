import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { getMarketplacePreview } from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import {
  getActiveTenderForBuilder,
  listResponsesForTender,
} from "@/modules/tenders";
import { ChecklistWizard } from "./checklist";

export const metadata = { title: "Submission checklist" };

/**
 * The structured submission checklist — the instrument every builder
 * completes alongside their quote so tenders compare like for like.
 * Loads the draft tender + saved answers and hands off to the client
 * wizard, which drives autosave.
 *
 * Only reachable with a draft: no tender yet → back to the tender
 * form (the checklist rides the draft), submitted → locked, back to
 * the form which shows the submitted state.
 */
export default async function ChecklistRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?next=/builder/projects/${slug}/tender/checklist`);
  }
  const userId = session.user.id!;

  // Resolve the project — including private rounds, which never show
  // in the marketplace but are fully visible to unlocked builders.
  let previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) {
    previewR = await getMarketplacePreview(slug, { includePrivate: true });
    if (previewR.ok && !(await isUnlocked(userId, previewR.value.id))) {
      notFound();
    }
  }
  if (!previewR.ok) notFound();
  const preview = previewR.value;

  if (!(await isUnlocked(userId, preview.id))) {
    redirect(`/builder/projects/${slug}`);
  }

  const tender = await getActiveTenderForBuilder(userId, preview.id);
  if (!tender || tender.status !== "draft" || tender.instrumentVersion == null) {
    redirect(`/builder/projects/${slug}/tender`);
  }

  const responsesR = await listResponsesForTender(userId, tender.id);
  const initialAnswers: Array<{ qid: string; v: unknown }> = responsesR.ok
    ? responsesR.value.map((r) => ({
        qid: r.qid,
        v: (r.value as { v: unknown }).v,
      }))
    : [];

  return (
    <ChecklistWizard
      slug={slug}
      projectTitle={preview.title}
      tenderId={tender.id}
      instrumentVersion={tender.instrumentVersion}
      initialAnswers={initialAnswers}
      prefills={{
        "tender.totalPriceAud": tender.totalPriceAud,
        "tender.durationWeeks": tender.durationWeeks,
        "tender.validityDays": tender.validityDays,
        "tender.proposedStartMonth": tender.proposedStartMonth,
      }}
    />
  );
}
