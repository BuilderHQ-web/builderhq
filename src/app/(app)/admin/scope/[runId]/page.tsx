/**
 * /admin/scope/[runId] — the review desk for one extraction run.
 *
 * The register up top (what the documents ARE), the selection by
 * division (what the run says the project is made of, every claim
 * cited), the gaps, the conflicts. Ops delivers a verdict on every
 * line; approval is blocked until they have. Every verdict is
 * captured as training data.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/modules/auth";
import { getRunForReview } from "@/modules/scope-engine";
import { RunReview } from "./run-review";

export const metadata = { title: "Scope run" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ScopeRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/login?next=/admin/scope");

  const { runId } = await params;
  const r = await getRunForReview(runId);
  if (!r.ok) notFound();
  const { run, project, register, items, conflicts } = r.value;

  const usage = (run.usage ?? {}) as Record<string, unknown>;
  const cost =
    typeof usage.estimatedCostUsd === "number"
      ? (usage.estimatedCostUsd as number)
      : null;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href="/admin/scope"
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          All runs
        </Link>

        <div className="mb-6">
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium">
            Scope run · standard v{run.scopeVersion}
          </span>
          <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[26px] sm:text-[38px] leading-[0.95] text-text break-words">
            {project.title}
          </h1>
          <p className="mt-2 text-[12.5px] text-text-dim">
            {project.type.replace("_", " ")} ·{" "}
            {run.createdAt.toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
            })}
            {cost !== null ? ` · estimated model cost $${cost.toFixed(2)} USD` : ""}
            {run.error ? ` · ${run.error}` : ""}
          </p>
        </div>

        <RunReview
          runId={run.id}
          initialStatus={run.status}
          register={register.map((d) => ({
            id: d.id,
            documentId: d.documentId,
            filename: d.filename,
            status: d.status,
            kind: d.kind,
            revision: d.revision,
            docTitle: d.docTitle,
            pageCount: d.pageCount,
            error: d.error,
          }))}
          items={items.map((i) => ({
            id: i.id,
            itemId: i.itemId,
            status: i.status,
            citations: (i.citations ?? []) as Array<{
              documentId: string;
              page: number;
              revision: string | null;
            }>,
            note: i.note,
            confidence: i.confidence,
            opsStatus: i.opsStatus,
            opsNote: i.opsNote,
          }))}
          conflicts={conflicts.map((c) => ({
            id: c.id,
            summary: c.summary,
            severity: c.severity,
            opsStatus: c.opsStatus,
            citations: (c.citations ?? []) as Array<{
              documentId: string;
              page: number;
              revision: string | null;
            }>,
          }))}
        />
      </div>
    </div>
  );
}
