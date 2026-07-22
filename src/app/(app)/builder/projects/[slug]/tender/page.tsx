import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { getMarketplacePreview } from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import {
  getActiveTenderForBuilder,
  adoptInstrumentForDraft,
  getProjectOwnerForTender,
  listResponsesForTender,
  INSTRUMENT_VERSION,
} from "@/modules/tenders";
import { getBuilderProfile, getOwnerContactPublic } from "@/modules/profiles";
import { listForTenderUnchecked } from "@/modules/documents";
import type { MarketplacePreview } from "@/modules/projects";
import { TenderJourney, type TenderLetterhead } from "./journey";
import { TenderOutcome } from "./outcome";

export const metadata = { title: "Tender" };

const TYPE_LABEL: Record<MarketplacePreview["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * The tender route. The tender IS the deck: a draft (or no tender yet)
 * renders the journey — opening letterhead, the twelve-module deck,
 * review and submit — and a sealed tender renders the read-only
 * outcome. There is no form behind this page; every headline figure
 * mirrors from the deck's answers server-side.
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
  if (!(await isUnlocked(userId, preview.id))) {
    redirect(`/builder/projects/${slug}`);
  }

  const projectMeta = [
    TYPE_LABEL[preview.type],
    preview.suburb ? `${preview.suburb}, ${preview.state}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const existing = await getActiveTenderForBuilder(userId, preview.id);

  // Drafts started before the instrument shipped adopt it on open, so
  // every draft a builder works on today runs the deck.
  if (
    existing &&
    existing.status === "draft" &&
    existing.instrumentVersion == null
  ) {
    await adoptInstrumentForDraft(userId, existing.id);
    existing.instrumentVersion = INSTRUMENT_VERSION;
  }

  // Answers, unwrapped from their {v} envelopes.
  const answers: Array<{ qid: string; v: unknown }> = existing
    ? await (async () => {
        const r = await listResponsesForTender(userId, existing.id);
        return r.ok
          ? r.value.map((row) => ({
              qid: row.qid,
              v: (row.value as { v: unknown }).v,
            }))
          : [];
      })()
    : [];

  const docs = existing ? await listForTenderUnchecked(existing.id) : [];

  // ── sealed: the read-only outcome ─────────────────────────────────
  if (existing && existing.status !== "draft") {
    const ownerContact =
      existing.status === "awarded"
        ? await (async () => {
            const ownerId = await getProjectOwnerForTender(existing.id);
            return ownerId ? getOwnerContactPublic(ownerId) : null;
          })()
        : null;

    return (
      <TenderOutcome
        slug={slug}
        projectTitle={preview.title}
        projectMeta={projectMeta}
        tender={existing}
        answers={Object.fromEntries(answers.map((a) => [a.qid, a.v]))}
        docs={docs}
        ownerContact={ownerContact}
      />
    );
  }

  // ── the journey ───────────────────────────────────────────────────
  // Entity facts that print beside the declarations.
  const bundle = await getBuilderProfile(userId);
  const licence = bundle?.licences[0] ?? null;
  const letterhead: TenderLetterhead | null = bundle
    ? {
        companyName: bundle.profile.companyName,
        abn: bundle.profile.abn,
        licence: licence
          ? `${licence.licenceNumber} (${licence.state})`
          : null,
      }
    : null;

  return (
    <TenderJourney
      slug={slug}
      projectId={preview.id}
      projectTitle={preview.title}
      projectMeta={projectMeta}
      initialTenderId={existing?.id ?? null}
      instrumentVersion={existing?.instrumentVersion ?? INSTRUMENT_VERSION}
      initialAnswers={answers}
      initialDocs={docs}
      letterhead={letterhead}
    />
  );
}
