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
import { getOwnerReview, listUnreadDocuments } from "@/modules/scope-engine";
import { listBuilderInvites } from "@/modules/tenders";
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
          href={`${base}/projects`}
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Back to projects
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
                  : "Your documents, read in full before any builder prices."}
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
            unreadDocs={run ? await listUnreadDocuments(project.id, run.id) : []}
            round={{
              mode: project.tenderMode === "private" ? "private" : "open",
              spots: project.tenderSpots ?? 3,
              invites: await (async () => {
                if (!canResolve) return [];
                const r = await listBuilderInvites(session.user!.id!, project.id);
                return r.ok
                  ? r.value.map((i) => ({
                      id: i.id,
                      label:
                        i.builderName ?? i.company ?? i.contactName ?? i.email,
                      status: i.status,
                    }))
                  : [];
              })(),
              editHref: `${base}/projects/${project.slug}/edit`,
            }}
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

/** The plain promises of the read, in the order they land. */
const READ_PROMISES = [
  "Every item of work, written from your documents and referenced to the page it came from.",
  "Anything your documents leave open, flagged before a builder prices it.",
  "Tenders you can compare line by line, because every builder prices the same scope.",
] as const;

/**
 * The waiting state a client should WANT to show someone. Two columns
 * on desktop: the status on the left, breathing, with the three stages
 * of the read as a quiet timeline; the paper on the right, with the
 * documents on file and a plain account of what arrives at the end.
 * Confidence comes from specificity, never from promises.
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
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
      {/* the status */}
      <div className="lg:pt-2">
        <p className="text-[10px] tracking-[0.24em] uppercase text-text-dim font-ui font-semibold">
          Preparation under way
        </p>
        <h2 className="mt-3 font-display uppercase tracking-[-0.014em] text-[26px] sm:text-[30px] leading-[1] text-text">
          Your documents are being read
        </h2>
        <p className="mt-4 max-w-[52ch] text-[13.5px] leading-[1.75] text-text-muted">
          Every page is read and turned into a scope of works, with each
          line tied to the page it came from. Reading usually takes less
          than a business day. We will tell you the moment it is ready.
        </p>
        <div className="mt-10">
          <AnalysisTracker runStatus={runStatus} />
        </div>
      </div>

      {/* the paper */}
      <aside className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-6 py-7 sm:px-8 sm:py-8">
        {register.length > 0 ? (
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                Documents on file
              </h3>
              {pages > 0 ? (
                <span className="shrink-0 text-[10.5px] text-text-dim tabular-nums">
                  {register.length} document{register.length === 1 ? "" : "s"} ·{" "}
                  {pages} pages
                </span>
              ) : null}
            </div>
            <ul className="mt-4 divide-y divide-border-subtle border-t border-border-subtle">
              {ordered.map((r) => (
                <li
                  key={r.documentId}
                  className="flex items-baseline justify-between gap-4 py-2.5 text-[12.5px]"
                >
                  <span className="min-w-0 truncate text-text">
                    {names.get(r.documentId) ?? r.docTitle ?? r.filename}
                  </span>
                  <span className="shrink-0 text-[11px] text-text-dim tabular-nums">
                    {r.pageCount ? `${r.pageCount} page${r.pageCount === 1 ? "" : "s"}` : "…"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={register.length > 0 ? "mt-9" : undefined}>
          <h3 className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
            What you will get
          </h3>
          <ul className="mt-4 space-y-4 border-t border-border-subtle pt-4">
            {READ_PROMISES.map((line) => (
              <li
                key={line}
                className="flex gap-3 text-[12.5px] leading-[1.65] text-text-muted"
              >
                <span
                  aria-hidden
                  className="mt-[7px] size-1 shrink-0 rounded-full bg-accent-light/70"
                />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
