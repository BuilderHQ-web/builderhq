import { NextResponse } from "next/server";

import { auth } from "@/modules/auth";
import { getMarketplacePreview } from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import {
  getActiveTenderForBuilder,
  listResponsesForTender,
} from "@/modules/tenders";
import { buildTenderDocument } from "@/modules/tenders/document";
import { getProjectSchedule, getScheduleForRun } from "@/modules/scope-engine";
import { getBuilderProfile } from "@/modules/profiles";
import { listForTenderUnchecked } from "@/modules/documents";
import type { MarketplacePreview } from "@/modules/projects";
import { renderTenderPdf } from "@/lib/tender-pdf";

const TYPE_LABEL: Record<MarketplacePreview["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * GET → the Tender Document as a PDF. Drafts download with a
 * watermark; the clean, sealed document only exists once submitted.
 * Builder-only — the owner-side download ships with the evaluation
 * phase.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Sign in required.", { status: 401 });
  }
  const userId = session.user.id;

  let previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) {
    previewR = await getMarketplacePreview(slug, { includePrivate: true });
  }
  if (!previewR.ok) return new NextResponse("Not found.", { status: 404 });
  const preview = previewR.value;

  if (!(await isUnlocked(userId, preview.id))) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const tender = await getActiveTenderForBuilder(userId, preview.id);
  if (!tender) return new NextResponse("No tender yet.", { status: 404 });

  const responsesR = await listResponsesForTender(userId, tender.id);
  const answers: Record<string, unknown> = {};
  if (responsesR.ok) {
    for (const r of responsesR.value) {
      answers[r.qid] = (r.value as { v: unknown }).v;
    }
  }

  const [docs, bundle, currentSchedule] = await Promise.all([
    listForTenderUnchecked(tender.id),
    getBuilderProfile(userId),
    getProjectSchedule(preview.id),
  ]);
  const licence = bundle?.licences[0] ?? null;

  // The document renders against the pack this tender was PRICED on.
  // An addendum re-issues the round's schedule, but a sealed record
  // never rewrites itself — the pinned run wins over the current one.
  const pinnedRun = answers["scope.schedule_run"];
  const schedule =
    typeof pinnedRun === "string" && pinnedRun !== currentSchedule?.runId
      ? ((await getScheduleForRun(pinnedRun)) ?? currentSchedule)
      : currentSchedule;

  const model = buildTenderDocument({
    tenderId: tender.id,
    status: tender.status,
    submittedAt: tender.submittedAt,
    instrumentVersion: tender.instrumentVersion,
    answers,
    docs: docs.map((d) => ({ filename: d.filename, sizeBytes: d.sizeBytes })),
    project: {
      title: preview.title,
      meta: [
        TYPE_LABEL[preview.type],
        preview.suburb ? `${preview.suburb}, ${preview.state}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    builder: {
      entity: bundle?.profile.companyName ?? null,
      abn: bundle?.profile.abn ?? null,
      licence: licence ? `${licence.licenceNumber} (${licence.state})` : null,
    },
    schedule,
    now: new Date(),
  });

  const pdf = await renderTenderPdf(model);

  const safeTitle = preview.title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const filename = `BuilderHQ-Tender-${safeTitle || "Project"}-${model.ref}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
