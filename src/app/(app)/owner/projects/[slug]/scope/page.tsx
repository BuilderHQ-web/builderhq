/**
 * /owner/projects/[slug]/scope — the tender pack review.
 *
 * The owner-facing half of the scope engine. Before ops approval:
 * a quiet "being read" state. After: the pack — what the documents
 * cover (in plain language, every line cited) and the questions that
 * remain, each answerable three ways: set an allowance, exclude it,
 * or promise documents. When every question has an answer, the
 * runner sends the round live through the one true publish path.
 *
 * Seat-aware: the runner answers; joined seats read.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Clock } from "lucide-react";

import { auth } from "@/modules/auth";
import { getBySlugForViewer } from "@/modules/projects";
import { getOwnerReview } from "@/modules/scope-engine";
import { projectsBase } from "@/lib/dashboard-route";
import { PackReview } from "./pack-review";

export const metadata = { title: "Tender pack" };
export const dynamic = "force-dynamic";

export default async function ScopeReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}/scope`);
  const base = projectsBase(session.user.role);

  const p = await getBySlugForViewer(session.user.id!, slug);
  if (!p.ok) notFound();
  const { project } = p.value;

  const review = await getOwnerReview(project.id, session.user.id!);
  if (!review.ok) notFound();
  const { phase, run, documentNames, items, resolutions, canResolve } =
    review.value;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[980px]">
        <Link
          href={`${base}/projects/${project.slug}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Back to project
        </Link>

        <div className="mb-6">
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
            <BookOpenCheck className="size-3.5" />
            The tender pack
          </span>
          <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[40px] leading-[0.95] text-text break-words">
            {project.title}
          </h1>
          <p className="mt-2 text-[13px] text-text-muted max-w-[62ch]">
            Every document read against the BuilderHQ Scope Standard and
            checked by a person. What is covered, what is not, and what that
            means for your tender.
          </p>
        </div>

        {phase !== "ready" || !run ? (
          <div className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-6 py-12 text-center">
            <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-border-accent/45 bg-[rgba(0,212,200,0.08)] text-accent-light">
              <Clock className="size-5" />
            </span>
            <h2 className="font-ui font-semibold text-[16px] text-text">
              {phase === "none"
                ? "Preparation has not started"
                : "Your documents are being read"}
            </h2>
            <p className="mt-1.5 mx-auto max-w-[52ch] text-[13px] leading-[1.65] text-text-muted">
              {phase === "none"
                ? "Submit the project from the wizard and preparation begins."
                : "The pack is being prepared and reviewed. This usually completes within one business day, and you will be told the moment it is ready."}
            </p>
          </div>
        ) : (
          <PackReview
            projectId={project.id}
            projectType={project.type}
            documentNames={documentNames}
            canResolve={canResolve}
            items={items.map((i) => ({
              id: i.id,
              itemId: i.itemId,
              status: i.status,
              note: i.note,
              citations: (i.citations ?? []) as Array<{
                documentId: string;
                page: number;
                revision: string | null;
              }>,
            }))}
            resolutions={resolutions.map((r) => ({
              itemId: r.itemId,
              resolution: r.resolution,
              amountAud: r.amountAud,
            }))}
          />
        )}
      </div>
    </div>
  );
}
