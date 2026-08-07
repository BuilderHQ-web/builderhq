/**
 * /owner/projects/[slug]/scope — the tender pack.
 *
 * The owner-facing half of the scope engine, in two acts.
 *
 * WHILE THE READ RUNS: not a spinner but a promise kept visibly — the
 * three stages of the analysis live on screen, with the documents on
 * file and a plain note of what arrives at the end. The page refreshes
 * itself; the moment ops approval lands it becomes the pack.
 *
 * ONCE THE PACK IS READY: a guided, chaptered review — the pack first
 * as a deliverable (what was read, what it covers), then the few
 * decisions that are genuinely the client's, with the ordinary answer
 * one tap away. Going live runs through the one true publish path.
 *
 * Seat-aware: the runner answers; joined seats read.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, FileSearch } from "lucide-react";

import { auth } from "@/modules/auth";
import { getBySlugForViewer } from "@/modules/projects";
import { getOwnerReview } from "@/modules/scope-engine";
import type { SynthesisOverview } from "@/modules/scope-engine/pipeline";
import {
  adviseMissingDocuments,
  getScopeItem,
  registerImportance,
  resolveRegisterNames,
} from "@/modules/scope";
import { summariseDiff, type ScheduleDiff } from "@/modules/tenders/schedule";
import { projectsBase } from "@/lib/dashboard-route";
import { PackReview } from "./pack-review";
import { AnalysisTracker } from "./analysis-tracker";

export const metadata = { title: "Tender pack" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

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
  const {
    phase,
    run,
    register,
    items,
    resolutions,
    canResolve,
    mode,
    addenda,
    namedMissing,
  } = review.value;
  const addendaForClient = addenda.map((a) => ({
    number: a.number,
    issuedAtISO: a.issuedAt.toISOString(),
    summary: summariseDiff(a.diff as ScheduleDiff),
  }));

  // The pack's own read of the project, written at synthesis.
  const overview = (run?.overview ?? null) as SynthesisOverview | null;

  // Document advisories: what the register lacks, and which divisions
  // exist only on the architect's drawings.
  const kindByDoc = new Map(register.map((r) => [r.documentId, r.kind]));
  const divisionSources: Record<string, string[]> = {};
  for (const i of items) {
    if (i.status !== "evidenced") continue;
    const div = getScopeItem(i.itemId)?.division;
    if (!div) continue;
    const kinds = new Set(divisionSources[div] ?? []);
    for (const c of (i.citations ?? []) as Array<{ documentId: string }>) {
      const k = kindByDoc.get(c.documentId);
      if (k) kinds.add(k);
    }
    divisionSources[div] = [...kinds];
  }
  const advisories =
    phase === "ready"
      ? adviseMissingDocuments({
          registerKinds: register.map((r) => r.kind).filter((k): k is string => !!k),
          evidencedDivisions: [...new Set(items.filter((i) => i.status === "evidenced").map((i) => getScopeItem(i.itemId)?.division).filter((d): d is string => !!d))],
          divisionSources,
          projectType: project.type,
        })
      : [];

  const brief = (project.ownerBrief ?? {}) as Record<string, string>;
  const briefComplete = !!project.ownerBriefAt;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1020px]">
        <Link
          href={`${base}/projects/${project.slug}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Back to project
        </Link>

        <div className="mb-7">
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
            <BookOpenCheck className="size-3.5" />
            The tender pack
          </span>
          <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[40px] leading-[0.95] text-text break-words">
            {project.title}
          </h1>
          <p className="mt-2 text-[13px] text-text-muted max-w-[62ch]">
            {mode === "record"
              ? "The pack your round runs on. Every document read against the BuilderHQ Scope Standard, checked by a person, and accepted by you. Changes go out as numbered addenda."
              : mode === "addendum"
                ? "The re-read pack. Your earlier answers carried forward; review what changed and issue the addendum when you are ready. Builders keep pricing the current schedule until you do."
                : phase === "ready"
                  ? "Prepared from your documents under the BuilderHQ Scope Standard, and checked line by line by our review team."
                  : "Your documents, read properly before anything goes to market."}
          </p>
        </div>

        {phase !== "ready" || !run ? (
          phase === "none" ? (
            <div className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-6 py-12 text-center">
              <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-border-accent/45 bg-[rgba(0,212,200,0.08)] text-accent-light">
                <FileSearch className="size-5" />
              </span>
              <h2 className="font-ui font-semibold text-[16px] text-text">
                Preparation has not started
              </h2>
              <p className="mt-1.5 mx-auto max-w-[52ch] text-[13px] leading-[1.65] text-text-muted">
                Submit the project from the wizard and preparation begins.
              </p>
            </div>
          ) : (
            <ReadingState
              runStatus={run?.status ?? "pending"}
              register={register}
            />
          )
        ) : (
          <PackReview
            projectId={project.id}
            slug={project.slug}
            basePath={base}
            canResolve={canResolve}
            mode={mode}
            addenda={addendaForClient}
            overview={overview}
            currentDescription={project.description}
            advisories={advisories}
            brief={brief}
            // The RUNNER answers the brief; a seat viewer reads it.
            // For viewers the stored brief itself says which set was
            // asked (the role key marks an architect's).
            briefAudience={
              canResolve
                ? session.user.role === "architect"
                  ? "architect"
                  : "owner"
                : typeof brief.role === "string"
                  ? "architect"
                  : "owner"
            }
            briefComplete={briefComplete}
            documentNames={(() => {
              const std = resolveRegisterNames(register);
              return Object.fromEntries(
                register.map((r) => [r.documentId, std.get(r.documentId) ?? r.filename]),
              );
            })()}
            namedMissing={(namedMissing ?? []).map((m) => ({
              ref: m.ref,
              sources: m.citations.map((c) => {
                const std = resolveRegisterNames(register);
                return `${std.get(c.documentId) ?? "a document"} p.${c.page}`;
              }),
            }))}
            register={(() => {
              const std = resolveRegisterNames(register);
              return [...register]
                .sort(
                  (a, b) => registerImportance(a.kind) - registerImportance(b.kind),
                )
                .map((r) => ({
                  title: std.get(r.documentId) ?? r.docTitle ?? r.filename,
                  // The raw signals, for rules that must agree with
                  // the server (covered provisional sums).
                  docTitle: r.docTitle,
                  filename: r.filename,
                  kind: r.kind,
                  pages: r.pageCount,
                }));
            })()}
            facts={{
              title: project.title,
              type: project.type,
              typeLabel: TYPE_LABEL[project.type] ?? project.type,
              suburb: project.suburb,
              state: project.state,
              dwellings: project.dwellingCount,
              bedrooms: project.bedrooms,
              bathrooms: project.bathrooms,
              budgetBand: project.budgetBand,
            }}
            standardVersion={run.scopeVersion}
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

/* ── the read, under way ────────────────────────────────────────────── */

/**
 * The waiting state a client should WANT to show someone: the
 * analysis visibly moving, and a plain account of what arrives at the
 * end of it. Confidence comes from specificity, never from promises.
 */
function ReadingState({
  runStatus,
  register,
}: {
  runStatus: string;
  register: Array<{
    documentId: string;
    filename: string;
    docTitle: string | null;
    kind: string | null;
    pageCount: number | null;
  }>;
}) {
  const pages = register.reduce((n, r) => n + (r.pageCount ?? 0), 0);
  const names = resolveRegisterNames(register);
  const ordered = [...register].sort(
    (a, b) => registerImportance(a.kind) - registerImportance(b.kind),
  );
  return (
    <div className="mx-auto max-w-[560px]">
      <div className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-6 sm:px-10 py-10 text-center">
        <AnalysisTracker runStatus={runStatus} />
        <h2 className="mt-8 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
          Your documents are being read
        </h2>
        <p className="mt-2.5 mx-auto max-w-[46ch] text-[13px] leading-[1.7] text-text-muted">
          Every page is read and turned into a clear scope of works, with
          each line tied to the page it came from. This usually takes less
          than a business day. We will tell you the moment it is ready.
        </p>

        {register.length > 0 ? (
          <div className="mt-8 mx-auto max-w-[420px] text-left border-t border-border-subtle pt-4">
            <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
              Documents on file
            </p>
            <ul className="mt-2 space-y-1.5">
              {ordered.map((r) => (
                <li
                  key={r.documentId}
                  className="flex items-baseline justify-between gap-3 text-[12px]"
                >
                  <span className="min-w-0 truncate text-text-muted">
                    {names.get(r.documentId) ?? r.docTitle ?? r.filename}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-text-dim tabular-nums">
                    {r.pageCount ? `${r.pageCount} page${r.pageCount === 1 ? "" : "s"}` : "…"}
                  </span>
                </li>
              ))}
            </ul>
            {pages > 0 ? (
              <p className="mt-2.5 text-[10.5px] text-text-dim">
                {register.length} document{register.length === 1 ? "" : "s"} ·{" "}
                {pages} pages
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 mx-auto max-w-[420px] text-left border-t border-border-subtle pt-4">
          <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
            What you will get
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-[1.6] text-text-muted">
            <li>· Your scope of works, in plain language</li>
            <li>· Anything missing, flagged before builders price</li>
            <li>· Quotes you can compare line by line</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
