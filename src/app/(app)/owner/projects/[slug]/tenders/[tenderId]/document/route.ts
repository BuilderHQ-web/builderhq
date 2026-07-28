import { NextResponse } from "next/server";

import { auth } from "@/modules/auth";
import { getBySlugForOwner } from "@/modules/projects";
import { listTendersForOwner } from "@/modules/tenders";
import { listResponsesForProjectTenders } from "@/modules/tenders";
import { buildTenderDocument } from "@/modules/tenders/document";
import { getProjectSchedule } from "@/modules/scope-engine";
import { getBuilderProfile } from "@/modules/profiles";
import { listForTenderUnchecked } from "@/modules/documents";
import { renderTenderPdf } from "@/lib/tender-pdf";

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * GET → a tender's signed Tender Document as a PDF, for the project
 * runner (owner or architect). Same render the builder holds — the
 * evaluation quotes it; this is the primary source.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; tenderId: string }> },
) {
  const { slug, tenderId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Sign in required.", { status: 401 });
  }
  const role = session.user.role;
  if (role !== "project_owner" && role !== "architect" && role !== "admin") {
    return new NextResponse("Not found.", { status: 404 });
  }

  // Ownership gate — the slug lookup is scoped to this user's rows.
  const projectR = await getBySlugForOwner(session.user.id, slug);
  if (!projectR.ok) return new NextResponse("Not found.", { status: 404 });
  const project = projectR.value;

  // The tender must belong to this project and be past draft; the
  // owner list enforces both.
  const tenders = await listTendersForOwner(project.id);
  const tender = tenders.find((t) => t.id === tenderId);
  if (!tender) return new NextResponse("Not found.", { status: 404 });

  const responsesByTender = await listResponsesForProjectTenders(project.id);
  const answers: Record<string, unknown> = {};
  for (const r of responsesByTender.get(tender.id) ?? []) {
    answers[r.qid] = (r.value as { v: unknown }).v;
  }

  const [docs, bundle, schedule] = await Promise.all([
    listForTenderUnchecked(tender.id, { activeOnly: true }),
    getBuilderProfile(tender.builderId),
    getProjectSchedule(project.id),
  ]);
  const licence = bundle?.licences[0] ?? null;

  const model = buildTenderDocument({
    tenderId: tender.id,
    status: tender.status,
    submittedAt: tender.submittedAt,
    instrumentVersion: tender.instrumentVersion,
    answers,
    docs: docs.map((d) => ({ filename: d.filename, sizeBytes: d.sizeBytes })),
    project: {
      title: project.title,
      meta: [
        TYPE_LABEL[project.type] ?? null,
        project.suburb ? `${project.suburb}, ${project.state}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    builder: {
      entity:
        bundle?.profile.companyName ?? tender.builder.companyName ?? null,
      abn: bundle?.profile.abn ?? null,
      licence: licence
        ? `${licence.licenceNumber} (${licence.state})`
        : null,
    },
    schedule,
    now: new Date(),
  });

  const pdf = await renderTenderPdf(model);

  const safeBuilder = (tender.builder.companyName ?? "Builder")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const filename = `BuilderHQ-Tender-${safeBuilder}-${model.ref}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
