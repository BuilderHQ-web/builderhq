import { NextResponse } from "next/server";

import { auth } from "@/modules/auth";
import { loadRound } from "../_lib/load-round";
import { renderEvaluationReportPdf } from "@/lib/evaluation-report-pdf";

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * GET → the Tender Evaluation Report as a PDF, for the project
 * runner (owner or architect). The round analysis as a client-ready
 * document: overview, money, side by side, per-tender panels and the
 * pre-decision agenda.
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
  const role = session.user.role;
  if (role !== "project_owner" && role !== "architect" && role !== "admin") {
    return new NextResponse("Not found.", { status: 404 });
  }

  const r = await loadRound(session.user.id, slug);
  if (!r.ok) return new NextResponse("Not found.", { status: 404 });
  const { project, round } = r.value;

  if (round.tenders.length === 0) {
    return new NextResponse("No evaluable tenders yet.", { status: 404 });
  }

  const pdf = await renderEvaluationReportPdf({
    projectTitle: project.title,
    projectMeta: [
      TYPE_LABEL[project.type] ?? null,
      project.suburb ? `${project.suburb}, ${project.state}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    dateLine: new Date().toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    round,
  });

  const safeTitle = project.title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const filename = `BuilderHQ-Evaluation-${safeTitle || "Project"}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
