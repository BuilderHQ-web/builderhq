"use client";

/**
 * PackReview — the tender pack, presented as the deliverable it is.
 *
 * A client opening this page is not opening a to-do list. Their
 * documents were read page by page against the Scope Standard and a
 * person confirmed every line; what they see first is that work, and
 * only then the few decisions that are genuinely theirs. Four
 * chapters:
 *
 *   01  The pack        — what was read, what it produced, in numbers
 *                         and in one honest paragraph.
 *   02  The coverage    — every documented line, plain language, cited.
 *   03  The documents   — what is not in the set, and whether to add
 *                         it or carry on.
 *   04  Your decisions  — the open questions, with the ordinary answer
 *                         one tap away: the builders price it. An
 *                         allowance is for when the client wants every
 *                         quote to carry the same figure; exclusion is
 *                         for what this contract will not include.
 *
 * The same component serves three moods via `mode`: the first review
 * before going live ("publish"), the delta review before an addendum
 * ("addendum"), and the read-only record of a live pack ("record").
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FileUp,
  Hammer,
  Info,
  Loader2,
  MinusCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserRound,
  Pencil,
} from "lucide-react";

import {
  completeScopeReviewAction,
  requestScopeRereadAction,
  resolveScopeGapAction,
} from "@/app/(app)/_actions/scope";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  SCOPE_DIVISIONS,
  getScopeItem,
  isOwnerDocGap,
  isDemolitionGap,
  isOwnerAskableGap,
  ownerAllowanceEligible,
  buildAllowancePackages,
  coveredSelectionPackages,
  selectionPackageKey,
  splitPackageAmount,
  type AllowancePackage,
  type DocumentAdvice,
} from "@/modules/scope";
import { applyPackCorrectionsAction } from "@/app/(app)/_actions/projects";
import { OwnerBriefForm } from "./owner-brief-form";
import {
  questionsForBrief,
  type BriefAudience,
} from "@/modules/projects/owner-brief";
import { AddDocuments } from "./add-documents";

/* ── props ──────────────────────────────────────────────────────────── */

interface PackItem {
  id: string;
  itemId: string;
  status: string;
  note: string | null;
  citations: Array<{ documentId: string; page: number; revision: string | null }>;
}
interface PackResolution {
  itemId: string;
  resolution: string;
  amountAud: number | null;
}
export interface PackAddendum {
  number: number;
  issuedAtISO: string;
  summary: string;
}
interface RegisterRow {
  /** Standardised display title ("Architectural Plans"). */
  title: string;
  /** The classifier's raw read of the cover page, when it has one. */
  docTitle: string | null;
  filename: string;
  kind: string | null;
  pages: number | null;
}
interface PackFacts {
  title: string;
  /** Raw project type id ("multi_dwelling") — drives question scoping. */
  type: string;
  typeLabel: string;
  suburb: string | null;
  state: string | null;
  dwellings: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  budgetBand: string | null;
}
interface PackOverview {
  summary: string;
  dwellings: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  storeys: number | null;
}

const KIND_LABEL: Record<string, string> = {
  architectural: "Architectural",
  structural: "Structural",
  civil: "Civil",
  survey: "Survey",
  energy: "Energy",
  specification: "Specification",
  other: "Supporting",
};

type Chapter = 0 | 1 | 2 | 3 | 4;

export function PackReview({
  projectId,
  slug,
  basePath,
  canResolve,
  mode = "publish",
  addenda = [],
  overview = null,
  currentDescription = null,
  advisories = [],
  brief = {},
  briefAudience = "owner",
  briefComplete: briefCompleteInitial = false,
  documentNames,
  namedMissing = [],
  register,
  facts,
  standardVersion,
  items,
  resolutions,
}: {
  projectId: string;
  /** Current slug. Publishing regenerates it; never route from this. */
  slug: string;
  /** "/owner" or "/architect" — the runner's own mount point. */
  basePath: string;
  canResolve: boolean;
  mode?: "publish" | "addendum" | "record";
  addenda?: PackAddendum[];
  overview?: PackOverview | null;
  currentDescription?: string | null;
  advisories?: DocumentAdvice[];
  brief?: Record<string, string>;
  /** Which question set the runner answers — homeowner or architect. */
  briefAudience?: BriefAudience;
  briefComplete?: boolean;
  documentNames: Record<string, string>;
  /** Documents the pack itself names but does not contain. */
  namedMissing?: Array<{ ref: string; sources: string[] }>;
  register: RegisterRow[];
  facts: PackFacts;
  standardVersion: string;
  items: PackItem[];
  resolutions: PackResolution[];
}) {
  const router = useRouter();
  const readOnly = !canResolve || mode === "record";

  const [resolved, setResolved] = useState<Map<string, PackResolution>>(
    () => new Map(resolutions.map((r) => [r.itemId, r])),
  );
  const [chapter, setChapter] = useState<Chapter>(0);
  const [briefComplete, setBriefComplete] = useState(briefCompleteInitial);
  const [completing, setCompleting] = useState(false);
  const [rereading, setRereading] = useState(false);

  /* ── derivations ─────────────────────────────────────────────────── */

  const evidenced = useMemo(
    () => items.filter((i) => i.status === "evidenced"),
    [items],
  );
  const gaps = useMemo(() => items.filter((i) => i.status === "gap"), [items]);

  const byDivision = useCallback((list: PackItem[]) => {
    const m = new Map<string, PackItem[]>();
    for (const it of list) {
      // Learned lines ("ext.<division>.<slug>") and legacy custom
      // lines file under their real division like any authored item.
      const div =
        getScopeItem(it.itemId)?.division ??
        (it.itemId.startsWith("ext.") || it.itemId.startsWith("custom.")
          ? it.itemId.split(".")[1] ?? "unknown"
          : "unknown");
      const arr = m.get(div) ?? [];
      arr.push(it);
      m.set(div, arr);
    }
    return m;
  }, []);
  const evidencedByDivision = useMemo(
    () => byDivision(evidenced),
    [byDivision, evidenced],
  );

  // The client is asked ONLY what is genuinely theirs. Documents they
  // could supply (chapter 03), cosmetic allowance packages and the
  // demolition question (chapter 04). Everything else arrived already
  // resolved to builder-priced at ops approval and appears in the
  // scope of works as information.
  const docGaps = useMemo(
    () => gaps.filter((g) => isOwnerDocGap(g.itemId)),
    [gaps],
  );
  const demolitionGaps = useMemo(
    () => gaps.filter((g) => isDemolitionGap(g.itemId)),
    [gaps],
  );
  // A provisional sum is only asked for when the register does not
  // already carry the document that covers it: an appliance schedule
  // on file means the builders price the appliances from it. Same
  // pure rule, same RAW signals (classifier title + filename) the
  // server reads at approval, so the two cannot disagree. One
  // exception: a budget the runner has already set is a standing
  // decision on the schedule, and its card stays visible whatever
  // the register says.
  const coveredPackages = useMemo(() => {
    const covered = coveredSelectionPackages(
      register.map((r) => ({
        kind: r.kind,
        title: r.docTitle,
        filename: r.filename,
      })),
    );
    for (const r of resolutions) {
      if (r.resolution !== "allowance") continue;
      const key = selectionPackageKey(r.itemId);
      if (key) covered.delete(key);
    }
    return covered;
  }, [register, resolutions]);
  const packages = useMemo(
    () =>
      buildAllowancePackages(
        gaps.map((g) => g.itemId),
        facts.budgetBand,
        facts.type,
        coveredPackages,
      ),
    [gaps, facts.budgetBand, facts.type, coveredPackages],
  );
  const gapByItemId = useMemo(
    () => new Map(gaps.map((g) => [g.itemId, g])),
    [gaps],
  );
  const briefQuestionCount = questionsForBrief(facts.type, briefAudience).length;
  // Builder-priced lines (auto-resolved or answered) shown in the
  // scope of works, per division.
  const builderPriced = useMemo(
    () =>
      gaps.filter(
        (g) =>
          !isOwnerAskableGap(g.itemId) ||
          resolved.get(g.itemId)?.resolution === "builder_priced",
      ),
    [gaps, resolved],
  );
  const builderPricedByDivision = useMemo(
    () => byDivision(builderPriced),
    [byDivision, builderPriced],
  );

  // Only the questions the client is actually asked can block going
  // live. Builders' ordinary work is information here regardless of
  // its data history: runs approved before auto-resolve existed carry
  // no rows for it, and one may even hold a stale documents-to-come
  // answer from the earlier interface. Neither state is the client's
  // to fix.
  const askable = useMemo(
    () =>
      gaps.filter((g) => {
        if (!isOwnerAskableGap(g.itemId)) return false;
        // A covered selection is the builders' to price from the
        // document. The server resolves it: at approval on new runs,
        // or by the go-live safety net on runs approved before the
        // rule existed. Either way it never gates the client.
        const pkg = selectionPackageKey(g.itemId);
        return !(pkg !== null && coveredPackages.has(pkg));
      }),
    [gaps, coveredPackages],
  );
  const answered = askable.filter((g) => resolved.has(g.itemId)).length;
  const waitingOnDocs = docGaps.filter(
    (g) => resolved.get(g.itemId)?.resolution === "upload_later",
  ).length;
  const openCount = askable.length - answered;
  const readyToGoLive =
    openCount === 0 && waitingOnDocs === 0 && briefComplete;

  const divisionsCovered = evidencedByDivision.size;
  const pagesRead = register.reduce((n, r) => n + (r.pages ?? 0), 0);

  /* ── writes ──────────────────────────────────────────────────────── */

  // One package, several lines: resolve each constituent, then land
  // the local state in one commit so the card flips once, not N times.
  const resolveMany = useCallback(
    async (
      entries: Array<{
        itemId: string;
        resolution: "allowance" | "builder_priced" | "excluded";
        amountAud?: number;
      }>,
    ) => {
      for (const e of entries) {
        const r = await resolveScopeGapAction(projectId, e.itemId, {
          resolution: e.resolution,
          amountAud: e.amountAud ?? null,
        });
        if (!r.ok) {
          toast.error("Could not save the answer", r.error.message);
          return false;
        }
      }
      setResolved((prev) => {
        const next = new Map(prev);
        for (const e of entries) {
          next.set(e.itemId, {
            itemId: e.itemId,
            resolution: e.resolution,
            amountAud: e.amountAud ?? null,
          });
        }
        return next;
      });
      return true;
    },
    [projectId],
  );

  const onResolve = useCallback(
    async (
      itemId: string,
      resolution: "allowance" | "builder_priced" | "excluded" | "upload_later",
      amountAud?: number,
    ) => {
      const r = await resolveScopeGapAction(projectId, itemId, {
        resolution,
        amountAud: amountAud ?? null,
      });
      if (!r.ok) {
        toast.error("Could not save the answer", r.error.message);
        return false;
      }
      setResolved((prev) => {
        const next = new Map(prev);
        next.set(itemId, { itemId, resolution, amountAud: amountAud ?? null });
        return next;
      });
      return true;
    },
    [projectId],
  );

  const goLive = useCallback(async () => {
    setCompleting(true);
    try {
      const r = await completeScopeReviewAction(projectId);
      if (!r.ok) {
        toast.error("Not quite yet", r.error.message);
        return;
      }
      if ("addendum" in r.value) {
        toast.success(
          `Addendum ${String(r.value.addendum).padStart(2, "0")} issued. Every builder on the round has been told.`,
        );
        router.push(`${basePath}/projects/${slug}/live`);
        return;
      }
      toast.success("Your round is live. Builders can now see it.");
      // Publishing REGENERATES the slug, so the URL this page is
      // standing on stops existing the moment the round opens. Route
      // to the new one, never refresh the old.
      router.push(`${basePath}/projects/${r.value.slug}/live`);
    } finally {
      setCompleting(false);
    }
  }, [projectId, router, basePath, slug]);

  const reread = useCallback(async () => {
    setRereading(true);
    try {
      const r = await requestScopeRereadAction(projectId);
      if (!r.ok) {
        toast.error("Could not request the re-read", r.error.message);
        return;
      }
      toast.success("Reading again. You will be told when the fresh pack is ready.");
      router.refresh();
    } finally {
      setRereading(false);
    }
  }, [projectId, router]);

  /* ── chapters ────────────────────────────────────────────────────── */

  const docOpen = docGaps.filter((g) => !resolved.has(g.itemId)).length;
  const packagesOpen = packages.filter((p) =>
    p.itemIds.some((id) => !resolved.has(id)),
  ).length;
  const demolitionOpen = demolitionGaps.some((g) => !resolved.has(g.itemId))
    ? 1
    : 0;
  const allowanceOpen = packagesOpen + demolitionOpen;
  const chapters: Array<{ n: string; title: string; badge?: string }> = [
    { n: "01", title: "The pack" },
    { n: "02", title: "Scope of works" },
    {
      n: "03",
      title: "Documents",
      badge: docOpen > 0 ? String(docOpen) : undefined,
    },
    {
      n: "04",
      title: "Provisional sums",
      badge: allowanceOpen > 0 ? String(allowanceOpen) : undefined,
    },
    {
      n: "05",
      title: briefAudience === "architect" ? "Your brief" : "About you",
      badge: briefComplete ? undefined : String(briefQuestionCount),
    },
  ];

  return (
    <div className="pb-28">
      {/* chapter navigation — a fixed five-column band, nothing scrolls */}
      <nav className="grid grid-cols-5 border-y border-border-subtle">
        {chapters.map((c, i) => {
          const active = chapter === i;
          return (
            <button
              key={c.n}
              type="button"
              onClick={() => setChapter(i as Chapter)}
              className={cn(
                "relative min-w-0 px-2.5 sm:px-3 py-3 text-left transition-colors",
                active ? "text-text" : "text-text-dim hover:text-text-muted",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "hidden sm:inline text-[10px] font-mono shrink-0",
                    active ? "text-accent-light" : "text-text-faint",
                  )}
                >
                  {c.n}
                </span>
                <span className="text-[11px] sm:text-[12px] font-ui font-medium truncate">
                  {c.title}
                </span>
                {c.badge ? (
                  <span className="ml-auto shrink-0 rounded-full bg-[rgba(201,148,34,0.12)] text-[#8a6414] px-1.5 py-px text-[10px] font-ui font-semibold tabular-nums">
                    {c.badge}
                  </span>
                ) : i >= 2 ? (
                  <BadgeCheck className="ml-auto size-3.5 shrink-0 text-[#0a7d73]" />
                ) : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 -bottom-px h-[2px] transition-colors",
                  active ? "bg-accent" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </nav>

      <div className="pt-7">
        {chapter === 0 ? (
          <ChapterPack
            facts={facts}
            overview={overview}
            currentDescription={currentDescription}
            projectId={projectId}
            readOnly={readOnly}
            register={register}
            standardVersion={standardVersion}
            stats={{
              documents: register.length,
              pages: pagesRead,
              evidenced: evidenced.length,
              divisions: divisionsCovered,
              questions: gaps.length,
            }}
            addenda={addenda}
            mode={mode}
            onContinue={() => setChapter(1)}
          />
        ) : chapter === 1 ? (
          <ChapterScopeOfWorks
            evidencedByDivision={evidencedByDivision}
            builderPricedByDivision={builderPricedByDivision}
            documentNames={documentNames}
            total={evidenced.length}
            builderPricedTotal={builderPriced.length}
            onContinue={() => setChapter(2)}
          />
        ) : chapter === 2 ? (
          <ChapterDocuments
            projectId={projectId}
            docGaps={docGaps}
            advisories={advisories}
            namedMissing={namedMissing}
            register={register}
            resolved={resolved}
            readOnly={readOnly}
            rereading={rereading}
            onReread={reread}
            onResolve={onResolve}
            onContinue={() => setChapter(3)}
          />
        ) : chapter === 3 ? (
          <ChapterAllowances
            packages={packages}
            demolitionGaps={demolitionGaps}
            gapByItemId={gapByItemId}
            typeLabel={facts.typeLabel}
            resolved={resolved}
            readOnly={readOnly}
            onResolveMany={resolveMany}
            onContinue={() => setChapter(4)}
          />
        ) : (
          <ChapterAboutYou
            projectId={projectId}
            projectType={facts.type}
            audience={briefAudience}
            brief={brief}
            briefComplete={briefComplete}
            readOnly={readOnly}
            onComplete={() => setBriefComplete(true)}
          />
        )}
      </div>

      {/* the standing rail */}
      {!readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1020px] px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-3">
            <p className="text-[12px] text-text-muted min-w-0">
              {readyToGoLive ? (
                <span className="inline-flex items-center gap-1.5 text-[#0a7d73] font-ui font-medium">
                  <Check className="size-3.5" />
                  Every question answered.
                  {mode === "addendum"
                    ? " The addendum is ready to issue."
                    : " Your round is ready to go live."}
                </span>
              ) : waitingOnDocs > 0 ? (
                waitingOnDocs === 1
                  ? "1 answer promises documents. Add it and read again, or answer another way."
                  : `${waitingOnDocs} answers promise documents. Add them and read again, or answer another way.`
              ) : openCount > 0 ? (
                `${openCount} answer${openCount === 1 ? "" : "s"} to go: provisional sums in 04${docOpen > 0 ? ", documents in 03" : ""}.`
              ) : (
                "One last thing: your brief for the builders in chapter 05."
              )}
            </p>
            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              {waitingOnDocs > 0 ? (
                <button
                  type="button"
                  disabled={rereading}
                  onClick={reread}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border-strong bg-surface-1 text-text text-[12.5px] hover:bg-bg-elev transition-colors disabled:opacity-60"
                >
                  {rereading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileUp className="size-3.5" />
                  )}
                  Documents added, read again
                </button>
              ) : null}
              {chapter < 4 && !readyToGoLive ? (
                <button
                  type="button"
                  onClick={() => setChapter((c) => (c + 1) as Chapter)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-subtle text-[12.5px] text-text-muted hover:text-text hover:border-border-strong transition-colors"
                >
                  Continue
                  <ArrowRight className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                disabled={completing || !readyToGoLive}
                onClick={goLive}
                title={
                  readyToGoLive
                    ? undefined
                    : waitingOnDocs > 0
                      ? "Some answers promise documents. Add them and request a re-read first."
                      : openCount > 0
                        ? "A few answers remain in chapters 03 and 04."
                        : "Answer your brief for the builders in chapter 05 first."
                }
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-accent text-accent-contrast text-[12.5px] font-semibold hover:bg-accent-hover transition-colors shadow-[0_8px_24px_-8px_rgba(0,212,200,0.5)] disabled:opacity-50"
              >
                {completing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Rocket className="size-4" />
                )}
                {mode === "addendum" ? "Issue the addendum" : "Approve and go live"}
              </button>
            </div>
          </div>
        </div>
      ) : mode === "record" && canResolve ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1020px] px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-3">
            <p className="text-[12px] text-text-dim min-w-0">
              This pack is live for the round. Changing it starts with a
              re-read of the documents.
            </p>
            <button
              type="button"
              disabled={rereading}
              onClick={reread}
              className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border-strong bg-surface-1 text-text text-[12.5px] hover:bg-bg-elev transition-colors disabled:opacity-60 shrink-0"
            >
              {rereading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileUp className="size-3.5" />
              )}
              Documents changed, read again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── chapter 01 · the pack ──────────────────────────────────────────── */

function ChapterPack({
  facts,
  overview,
  currentDescription,
  projectId,
  readOnly,
  register,
  standardVersion,
  stats,
  addenda,
  mode,
  onContinue,
}: {
  facts: PackFacts;
  overview: PackOverview | null;
  currentDescription: string | null;
  projectId: string;
  readOnly: boolean;
  register: RegisterRow[];
  standardVersion: string;
  stats: {
    documents: number;
    pages: number;
    evidenced: number;
    divisions: number;
    questions: number;
  };
  addenda: PackAddendum[];
  mode: "publish" | "addendum" | "record";
  onContinue: () => void;
}) {
  const place = [facts.suburb, facts.state].filter(Boolean).join(", ");

  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        {mode === "addendum"
          ? "The re-read is complete"
          : "Your tender pack is ready"}
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.75] text-text-muted max-w-[68ch]">
        We read{" "}
        {stats.documents === 1
          ? "your document"
          : `all ${stats.documents} documents`}
        {stats.pages > 0 ? `, every one of their ${stats.pages} page${stats.pages === 1 ? "" : "s"},` : ""}{" "}
        for your {facts.typeLabel.toLowerCase()}
        {place ? ` in ${place}` : ""}. The result is your scope of works:{" "}
        <Strong>{stats.evidenced} item{stats.evidenced === 1 ? "" : "s"}</Strong> across{" "}
        <Strong>{stats.divisions} trades</Strong>, each tied to the page
        it came from. Where your documents are silent, we prepared{" "}
        <Strong>
          {stats.questions} question{stats.questions === 1 ? "" : "s"}
        </Strong>{" "}
        so nothing surprises you after builders have priced.
      </p>

      {/* the numbers */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-px rounded-lg overflow-hidden border border-border-subtle bg-border-subtle">
        {[
          { k: "Documents read", v: String(stats.documents) },
          { k: "Pages read", v: String(stats.pages) },
          { k: "Items evidenced", v: String(stats.evidenced) },
          { k: "Trades covered", v: String(stats.divisions) },
          { k: "Questions prepared", v: String(stats.questions) },
        ].map((s) => (
          <div key={s.k} className="bg-surface-1 px-4 py-3.5">
            <p className="text-[9px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
              {s.k}
            </p>
            <p className="mt-1 font-display text-[22px] leading-none text-text tabular-nums">
              {s.v}
            </p>
          </div>
        ))}
      </div>

      {overview ? (
        <PackVerification
          overview={overview}
          facts={facts}
          currentDescription={currentDescription}
          projectId={projectId}
          readOnly={readOnly}
        />
      ) : null}

      {/* the register */}
      <div className="mt-6 rounded-lg border border-border-subtle bg-surface-1 card-elev">
        <p className="px-4.5 pt-4 text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
          What we read · Scope Standard v{standardVersion}
        </p>
        <ul className="mt-1.5 px-4.5 pb-4 divide-y divide-border-subtle/50">
          {register.map((r, i) => (
            <li key={i} className="py-2.5 flex items-center gap-3">
              <FileText className="size-3.5 text-text-dim shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-ui text-text truncate">
                  {r.title}
                </span>
                <span className="block text-[10.5px] text-text-dim truncate">
                  {r.filename}
                </span>
              </span>
              {r.kind ? (
                <span className="shrink-0 rounded-full border border-border-subtle px-2 py-[3px] text-[9.5px] tracking-[0.08em] uppercase text-text-muted">
                  {KIND_LABEL[r.kind] ?? r.kind}
                </span>
              ) : null}
              <span className="shrink-0 text-[10.5px] text-text-dim tabular-nums w-14 text-right">
                {r.pages ? `${r.pages} page${r.pages === 1 ? "" : "s"}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {addenda.length > 0 ? (
        <div className="mt-6">
          <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
            Addenda issued on this round
          </p>
          <ul className="mt-2 divide-y divide-border-subtle/60 border-y border-border-subtle/60">
            {addenda.map((a) => (
              <li
                key={a.number}
                className="py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <span className="text-[12.5px] font-ui font-semibold text-text">
                  Addendum {String(a.number).padStart(2, "0")}
                </span>
                <span className="text-[11.5px] text-text-muted">{a.summary}</span>
                <span className="text-[10.5px] text-text-dim ml-auto">
                  {new Date(a.issuedAtISO).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-dim">
          <ShieldCheck className="size-3.5 text-[#0a7d73]" />
          Checked line by line by a person
        </span>
        <button
          type="button"
          onClick={onContinue}
          className="ml-auto inline-flex items-center gap-1.5 h-10 px-4.5 rounded-full border border-border-strong text-[12.5px] font-ui text-text hover:bg-bg-elev transition-colors"
        >
          See what your documents cover
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-ui font-semibold text-text">{children}</span>;
}

/* ── the pack checks the listing ────────────────────────────────────── */

/**
 * The documents against what the runner typed. Counts that disagree
 * get a one-tap correction; the pack's own overview is offered as the
 * listing description. The address is never touched, and nothing here
 * changes without the runner's tap.
 */
function PackVerification({
  overview,
  facts,
  currentDescription,
  projectId,
  readOnly,
}: {
  overview: PackOverview;
  facts: PackFacts;
  currentDescription: string | null;
  projectId: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(() => new Set());

  const mismatches: Array<{
    key: "bedrooms" | "bathrooms" | "dwellingCount" | "floors";
    label: string;
    entered: number | null;
    read: number;
  }> = [];
  if (overview.bedrooms !== null && overview.bedrooms !== facts.bedrooms) {
    mismatches.push({ key: "bedrooms", label: "Bedrooms", entered: facts.bedrooms, read: overview.bedrooms });
  }
  if (overview.bathrooms !== null && overview.bathrooms !== facts.bathrooms) {
    mismatches.push({ key: "bathrooms", label: "Bathrooms", entered: facts.bathrooms, read: overview.bathrooms });
  }
  if (overview.dwellings !== null && overview.dwellings !== facts.dwellings) {
    mismatches.push({ key: "dwellingCount", label: "Dwellings", entered: facts.dwellings, read: overview.dwellings });
  }

  const descriptionDiffers =
    overview.summary.trim().length >= 40 &&
    overview.summary.trim() !== (currentDescription ?? "").trim();

  const apply = async (
    key: string,
    input: Parameters<typeof applyPackCorrectionsAction>[1],
  ) => {
    setBusy(key);
    try {
      const r = await applyPackCorrectionsAction(projectId, input);
      if (!r.ok) {
        toast.error("Could not update", r.error.message);
        return;
      }
      setApplied((prev) => new Set(prev).add(key));
      toast.success("Listing updated from the pack.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (mismatches.length === 0 && !descriptionDiffers) return null;

  return (
    <div className="mt-6 rounded-lg border border-border-accent/40 bg-[rgba(0,212,200,0.03)] card-elev px-4.5 py-4">
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-accent-deep font-ui font-semibold inline-flex items-center gap-1.5">
        <Sparkles className="size-3" />
        The documents, checked against your listing
      </p>

      {mismatches.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {mismatches.map((m) => (
            <li
              key={m.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
            >
              <p className="text-[12.5px] text-text-muted min-w-0">
                <span className="font-ui font-medium text-text">{m.label}:</span>{" "}
                you entered {m.entered ?? "nothing"}; the documents show{" "}
                <span className="font-ui font-semibold text-text">{m.read}</span>.
              </p>
              {!readOnly && !applied.has(m.key) ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => apply(m.key, { [m.key]: m.read })}
                  className="shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-border-strong text-[11px] font-ui text-text hover:bg-bg-elev transition-colors disabled:opacity-60"
                >
                  {busy === m.key ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Use the documents&rsquo; figure
                </button>
              ) : applied.has(m.key) ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#0a7d73] font-ui font-medium">
                  <Check className="size-3" />
                  Updated
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {descriptionDiffers ? (
        <div className={cn("pt-3", mismatches.length > 0 && "mt-3 border-t border-border-subtle/60")}>
          <p className="text-[11px] text-text-dim">
            A description written from the documents, ready for your
            listing. No address, ever.
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.7] text-text italic">
            &ldquo;{overview.summary}&rdquo;
          </p>
          {!readOnly && !applied.has("description") ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => apply("description", { description: overview.summary })}
              className="mt-2.5 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border-strong text-[11.5px] font-ui text-text hover:bg-bg-elev transition-colors disabled:opacity-60"
            >
              {busy === "description" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Use as the project description
            </button>
          ) : applied.has("description") ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#0a7d73] font-ui font-medium">
              <Check className="size-3" />
              Description updated
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ── chapter 02 · the coverage ──────────────────────────────────────── */

function ChapterScopeOfWorks({
  evidencedByDivision,
  builderPricedByDivision,
  documentNames,
  total,
  builderPricedTotal,
  onContinue,
}: {
  evidencedByDivision: Map<string, PackItem[]>;
  builderPricedByDivision: Map<string, PackItem[]>;
  documentNames: Record<string, string>;
  total: number;
  builderPricedTotal: number;
  onContinue: () => void;
}) {
  const grandTotal = total + builderPricedTotal;

  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        Scope of works
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[68ch]">
        <Strong>
          {grandTotal} line{grandTotal === 1 ? "" : "s"} of work
        </Strong>
        , built from your documents. Every builder prices this same
        list, line by line, so their quotes compare exactly. Nothing
        here needs an answer from you.
      </p>

      <div className="mt-5">
        {SCOPE_DIVISIONS.map((d) => {
          const divItems = evidencedByDivision.get(d.id);
          const divFlagged = builderPricedByDivision.get(d.id);
          if (!divItems?.length && !divFlagged?.length) return null;
          return (
            <ScopeDivisionBlock
              key={d.id}
              label={d.label}
              items={divItems ?? []}
              flagged={divFlagged ?? []}
              documentNames={documentNames}
            />
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 h-10 px-4.5 rounded-full border border-border-strong text-[12.5px] font-ui text-text hover:bg-bg-elev transition-colors"
        >
          Continue
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * A small (i) that opens one plain sentence on hover, focus or tap.
 * Rendered inside the dropdown's group headings, where the model's
 * two kinds of line earn a one-line explanation each.
 */
function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="What this means"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onBlur={() => setOpen(false)}
        // Hover is a mouse behaviour only: on touch, the synthetic
        // mouseenter before click would open-then-toggle-closed and
        // the hint would need two taps.
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        className="text-text-faint hover:text-text-muted transition-colors"
      >
        <Info className="size-3" />
      </button>
      {open ? (
        <span className="absolute left-0 top-full z-20 mt-1.5 w-[240px] max-w-[72vw] rounded-md border border-border-subtle bg-surface-1 card-elev px-3 py-2 text-left text-[11px] leading-[1.55] normal-case tracking-normal font-normal text-text-muted">
          {text}
        </span>
      ) : null}
    </span>
  );
}

function ScopeDivisionBlock({
  label,
  items,
  flagged,
  documentNames,
}: {
  label: string;
  items: PackItem[];
  flagged: PackItem[];
  documentNames: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const count = items.length + flagged.length;
  return (
    <div className="mt-2.5 border border-border-subtle rounded-md bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 text-[12.5px] font-ui font-medium text-text truncate">
          {label}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-text-dim">
          {count} line{count === 1 ? "" : "s"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-text-dim transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border-subtle/60 px-3.5 py-2.5">
          {items.length > 0 ? (
            <>
              <p className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
                From your documents
                <InfoHint text="Read directly from your documents. Each line shows the page it came from." />
              </p>
              <ul className="mt-1.5 flex flex-col gap-2.5">
                {items.map((it) => {
                  const item = getScopeItem(it.itemId);
                  return (
                    <li key={it.id}>
                      <p className="text-[12.5px] font-ui font-medium text-text">
                        {item?.label ?? it.itemId}
                      </p>
                      {it.note ? (
                        <p className="mt-0.5 text-[11.5px] leading-[1.55] text-text-muted">
                          {it.note}
                        </p>
                      ) : null}
                      {it.citations.length > 0 ? (
                        <p className="mt-0.5 text-[10px] text-text-dim">
                          {it.citations
                            .map(
                              (c) =>
                                `${documentNames[c.documentId] ?? "Document"} p.${c.page}${c.revision ? ` rev ${c.revision}` : ""}`,
                            )
                            .join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          {flagged.length > 0 ? (
            <div
              className={cn(
                items.length > 0 &&
                  "mt-3 pt-3 border-t border-border-subtle/50",
              )}
            >
              <p className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-[#2a5cae] font-ui font-semibold">
                Added for the builders to price
                <InfoHint text="Work the build will need that your documents do not detail. We add these lines so every builder prices them now, not as a variation later." />
              </p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {flagged.map((it) => {
                  const item = getScopeItem(it.itemId);
                  return (
                    <li key={it.id}>
                      <p className="text-[12px] font-ui text-text">
                        {item?.label ?? it.itemId}
                      </p>
                      {it.note ? (
                        <p className="mt-0.5 text-[11px] leading-[1.5] text-text-dim">
                          {it.note}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ── chapter 03 · the documents ─────────────────────────────────────── */

function ChapterDocuments({
  projectId,
  docGaps,
  advisories,
  namedMissing = [],
  register,
  resolved,
  readOnly,
  rereading,
  onReread,
  onResolve,
  onContinue,
}: {
  projectId: string;
  docGaps: PackItem[];
  advisories: DocumentAdvice[];
  namedMissing?: Array<{ ref: string; sources: string[] }>;
  register: RegisterRow[];
  resolved: Map<string, PackResolution>;
  readOnly: boolean;
  rereading: boolean;
  onReread: () => void;
  onResolve: (
    itemId: string,
    resolution: "allowance" | "builder_priced" | "excluded" | "upload_later",
    amountAud?: number,
  ) => Promise<boolean>;
  onContinue: () => void;
}) {
  const kinds = new Set(register.map((r) => r.kind).filter(Boolean));
  const nothing = docGaps.length === 0 && advisories.length === 0;
  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        Documents worth adding
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[66ch]">
        {nothing
          ? "Your document set covers the reports and schedules builders usually ask for. Nothing needs adding before the round goes out."
          : `Your set includes ${[...kinds].map((k) => (KIND_LABEL[k!] ?? k!).toLowerCase()).join(", ")} documentation. Below is what a builder would notice missing. None of it blocks your round: every quote simply carries fewer assumptions for each document you add.`}
      </p>

      {nothing ? (
        <div className="mt-5 rounded-lg border border-border-subtle bg-surface-1 card-elev px-5 py-6 flex items-center gap-3">
          <BadgeCheck className="size-5 text-[#0a7d73] shrink-0" />
          <p className="text-[13px] text-text-muted">
            An unusually complete set. Builders price with fewer
            assumptions when the paperwork is this thorough.
          </p>
        </div>
      ) : (
        <>
          {docGaps.length > 0 ? (
            <>
              <p className="mt-5 text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                Reports the pack looked for
              </p>
              <ul className="mt-2 flex flex-col gap-2.5">
                {docGaps.map((g) => (
                  <QuestionCard
                    key={g.id}
                    gap={g}
                    resolution={resolved.get(g.itemId) ?? null}
                    readOnly={readOnly}
                    onResolve={onResolve}
                    docMood
                  />
                ))}
              </ul>
            </>
          ) : null}

          {advisories.length > 0 ? (
            <>
              <p className="mt-6 text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                What a builder would notice
              </p>
              <ul className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {advisories.map((a) => (
                  <li
                    key={a.key}
                    className="rounded-md border border-border-subtle bg-surface-1 px-4 py-3.5"
                  >
                    <p className="flex items-center gap-2 text-[13px] font-ui font-medium text-text">
                      <FileText className="size-3.5 text-text-dim shrink-0" />
                      {a.title}
                      {a.severity === "recommended" ? (
                        <span className="ml-auto shrink-0 rounded-full bg-[rgba(201,148,34,0.12)] text-[#8a6414] px-2 py-px text-[9px] tracking-[0.08em] uppercase font-ui font-semibold">
                          Recommended
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-[1.6] text-text-muted">
                      {a.why}
                    </p>
                  </li>
                ))}
              </ul>
              {namedMissing.length > 0 ? (
                <div className="mt-4 rounded-lg border border-border-subtle bg-surface-1 card-elev px-4 py-3.5">
                  <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                    Your documents mention these
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.6] text-text-muted max-w-[64ch]">
                    Your own documents refer to the items below, and they are
                    not in the pack yet. If you have them, adding them gives
                    builders the full picture; if a consultant holds them, it
                    is worth asking.
                  </p>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {namedMissing.map((m) => (
                      <li
                        key={m.ref}
                        className="text-[12px] leading-[1.55] text-text-muted"
                      >
                        <span className="text-text">&ldquo;{m.ref}&rdquo;</span>
                        <span className="text-text-dim">
                          {" "}
                          · mentioned in {m.sources.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!readOnly ? (
                <div className="mt-4 rounded-lg border border-border-subtle bg-surface-1 card-elev px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                      Add documents here
                    </p>
                    <p className="text-[10.5px] text-text-dim">
                      Your answers so far carry forward through the re-read.
                    </p>
                  </div>
                  <div className="mt-2.5">
                    <AddDocuments projectId={projectId} />
                  </div>
                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="button"
                      disabled={rereading}
                      onClick={onReread}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border-subtle text-[11.5px] font-ui text-text-muted hover:text-text hover:border-border-strong transition-colors disabled:opacity-60"
                    >
                      {rereading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <FileUp className="size-3" />
                      )}
                      Documents added, read again
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 h-10 px-4.5 rounded-full border border-border-strong text-[12.5px] font-ui text-text hover:bg-bg-elev transition-colors"
        >
          On to your decisions
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── chapter 04 · the decisions ─────────────────────────────────────── */

function ChapterAllowances({
  packages,
  demolitionGaps,
  gapByItemId,
  typeLabel,
  resolved,
  readOnly,
  onResolveMany,
  onContinue,
}: {
  packages: AllowancePackage[];
  demolitionGaps: PackItem[];
  gapByItemId: Map<string, PackItem>;
  typeLabel: string;
  resolved: Map<string, PackResolution>;
  readOnly: boolean;
  onResolveMany: (
    entries: Array<{
      itemId: string;
      resolution: "allowance" | "builder_priced" | "excluded";
      amountAud?: number;
    }>,
  ) => Promise<boolean>;
  onContinue: () => void;
}) {
  const nothing = packages.length === 0 && demolitionGaps.length === 0;
  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        Provisional sums
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[68ch]">
        {nothing
          ? "Your documents cover every selection. Builders price everything exactly as documented."
          : "A provisional sum is a budget for choices your documents do not detail yet. Every builder carries the same figure, so the quotes stay comparable. We have suggested a figure for each; adjust it, or leave it to the builders to price."}
      </p>

      {nothing ? (
        <div className="mt-5 rounded-lg border border-border-subtle bg-surface-1 card-elev px-5 py-6 flex items-center gap-3">
          <BadgeCheck className="size-5 text-[#0a7d73] shrink-0" />
          <p className="text-[13px] text-text-muted">
            Every selection is documented. Nothing to decide here.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3.5">
          {packages.map((pack) => (
            <AllowancePackageCard
              key={pack.key}
              pack={pack}
              gapByItemId={gapByItemId}
              typeLabel={typeLabel}
              resolved={resolved}
              readOnly={readOnly}
              onResolveMany={onResolveMany}
            />
          ))}
          {demolitionGaps.length > 0 ? (
            <DemolitionCard
              gaps={demolitionGaps}
              resolved={resolved}
              readOnly={readOnly}
              onResolveMany={onResolveMany}
            />
          ) : null}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 h-10 px-4.5 rounded-full border border-border-strong text-[12.5px] font-ui text-text hover:bg-bg-elev transition-colors"
        >
          One last thing
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * One package, one decision. The recommendation line reads like a
 * person who has seen a hundred of these: what is missing, what
 * projects like this one usually allow, and a figure ready to adjust.
 */
function AllowancePackageCard({
  pack,
  gapByItemId,
  typeLabel,
  resolved,
  readOnly,
  onResolveMany,
}: {
  pack: AllowancePackage;
  gapByItemId: Map<string, PackItem>;
  typeLabel: string;
  resolved: Map<string, PackResolution>;
  readOnly: boolean;
  onResolveMany: (
    entries: Array<{
      itemId: string;
      resolution: "allowance" | "builder_priced" | "excluded";
      amountAud?: number;
    }>,
  ) => Promise<boolean>;
}) {
  const states = pack.itemIds.map((id) => resolved.get(id) ?? null);
  const answered = states.every((r) => r !== null);
  const lockedTotal = states.reduce(
    (n, r) => n + (r?.resolution === "allowance" ? (r.amountAud ?? 0) : 0),
    0,
  );
  const allBuilders =
    answered && states.every((r) => r?.resolution === "builder_priced");

  const [amount, setAmount] = useState(
    pack.suggestedAud !== null ? String(pack.suggestedAud) : "",
  );
  const [busy, setBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  // A locked figure is a decision, not a sentence: Change reopens the
  // card seeded with the locked total, and saving locks it again.
  const [editing, setEditing] = useState(false);
  const deciding = !answered || editing;

  const startEditing = () => {
    if (lockedTotal > 0) setAmount(String(lockedTotal));
    else if (pack.suggestedAud !== null) setAmount(String(pack.suggestedAud));
    setEditing(true);
  };

  const lock = async () => {
    const total = Math.round(Number(amount));
    if (!(total > 0)) return;
    setBusy(true);
    try {
      const parts = splitPackageAmount(pack.key, pack.itemIds, total);
      const ok = await onResolveMany(
        parts.map((part) => ({
          itemId: part.itemId,
          resolution: "allowance" as const,
          amountAud: part.amountAud,
        })),
      );
      if (ok) setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const leaveToBuilders = async () => {
    setBusy(true);
    try {
      const ok = await onResolveMany(
        pack.itemIds.map((itemId) => ({
          itemId,
          resolution: "builder_priced" as const,
        })),
      );
      if (ok) setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-1 card-elev px-4.5 py-4 transition-colors",
        answered ? "border-border-subtle" : "border-[rgba(201,148,34,0.4)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-ui font-semibold text-text">
            {pack.title}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.6] text-text-muted">
            {pack.covers}
          </p>
        </div>
        {answered ? (
          <span className="shrink-0 inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-[#0a7d73]">
              <Check className="size-3.5" />
              {allBuilders
                ? "Builders will price these"
                : `Budget set: $${lockedTotal.toLocaleString("en-AU")}`}
            </span>
            {!readOnly && !editing ? (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-1 text-[11px] text-text-dim hover:text-text transition-colors"
              >
                <Pencil className="size-3" />
                Change
              </button>
            ) : null}
          </span>
        ) : null}
      </div>

      {deciding ? (
        <p className="mt-2.5 text-[12.5px] leading-[1.65] text-text-muted max-w-[64ch]">
          Your documents do not include a schedule for this.{" "}
          {pack.suggestedAud !== null && pack.budgetLabel ? (
            <>
              On a {typeLabel.toLowerCase()} {pack.budgetLabel}, this is
              usually {pack.pctRange[0]} to {pack.pctRange[1]} percent of
              the budget. Suggested:{" "}
              <Strong>${pack.suggestedAud.toLocaleString("en-AU")}</Strong>.
            </>
          ) : (
            <>
              This is usually {pack.pctRange[0]} to {pack.pctRange[1]}{" "}
              percent of the build budget.
            </>
          )}
        </p>
      ) : null}

      {!readOnly && deciding ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-dim">
              $
            </span>
            <input
              type="number"
              min={1}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={
                pack.suggestedAud !== null ? String(pack.suggestedAud) : "12000"
              }
              className="h-10 w-[150px] pl-7 pr-3 rounded-md border border-border-subtle bg-surface-1 text-[13px] tabular-nums text-text outline-none focus:border-border-accent"
            />
          </div>
          <button
            type="button"
            disabled={busy || !(Number(amount) > 0)}
            onClick={lock}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CircleDollarSign className="size-3.5" />
            )}
            Set budget
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={leaveToBuilders}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-border-subtle text-[12px] text-text-muted hover:text-text hover:border-border-strong transition-colors disabled:opacity-50"
          >
            <Hammer className="size-3.5" />
            Leave to builders
          </button>
          {editing ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="inline-flex items-center h-10 px-2.5 text-[11.5px] text-text-dim hover:text-text transition-colors disabled:opacity-50"
            >
              Keep as it is
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setDetailOpen((o) => !o)}
        className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-text-dim hover:text-text transition-colors"
      >
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            detailOpen && "rotate-180",
          )}
        />
        {pack.itemIds.length} line{pack.itemIds.length === 1 ? "" : "s"} in
        this package
      </button>
      {detailOpen ? (
        <ul className="mt-1.5 pl-4 flex flex-col gap-1">
          {pack.itemIds.map((id) => {
            const item = getScopeItem(id);
            const r = resolved.get(id);
            return (
              <li
                key={id}
                className="flex items-baseline justify-between gap-3 text-[11.5px]"
              >
                <span className="text-text-muted min-w-0 truncate">
                  {item?.label ?? id}
                  {gapByItemId.get(id)?.note ? (
                    <span className="text-text-dim">
                      {" "}
                      · {gapByItemId.get(id)!.note}
                    </span>
                  ) : null}
                </span>
                {r?.resolution === "allowance" ? (
                  <span className="shrink-0 tabular-nums text-text">
                    ${(r.amountAud ?? 0).toLocaleString("en-AU")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** The one non-cosmetic question worth asking: who demolishes? */
function DemolitionCard({
  gaps,
  resolved,
  readOnly,
  onResolveMany,
}: {
  gaps: PackItem[];
  resolved: Map<string, PackResolution>;
  readOnly: boolean;
  onResolveMany: (
    entries: Array<{
      itemId: string;
      resolution: "allowance" | "builder_priced" | "excluded";
      amountAud?: number;
    }>,
  ) => Promise<boolean>;
}) {
  const answered = gaps.every((g) => resolved.has(g.itemId));
  const excludedAll =
    answered &&
    gaps.every((g) => resolved.get(g.itemId)?.resolution === "excluded");
  const [busy, setBusy] = useState(false);

  const act = async (resolution: "builder_priced" | "excluded") => {
    setBusy(true);
    try {
      await onResolveMany(gaps.map((g) => ({ itemId: g.itemId, resolution })));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-1 card-elev px-4.5 py-4",
        answered ? "border-border-subtle" : "border-[rgba(201,148,34,0.4)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-ui font-semibold text-text">
            Demolition
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.6] text-text-muted max-w-[62ch]">
            Your documents do not say who demolishes. One answer covers it.
          </p>
        </div>
        {answered ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-[#0a7d73]">
            <Check className="size-3.5" />
            {excludedAll
              ? "You are arranging it separately"
              : "The builders will price it"}
          </span>
        ) : null}
      </div>
      {!readOnly && !answered ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => act("builder_priced")}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-strong text-[12px] font-ui text-text hover:bg-bg-elev transition-colors disabled:opacity-50"
          >
            <Hammer className="size-3.5" />
            The builders handle demolition
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act("excluded")}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-border-subtle text-[12px] text-text-muted hover:text-text hover:border-border-strong transition-colors disabled:opacity-50"
          >
            <MinusCircle className="size-3.5" />
            I have arranged it separately
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ── chapter 05 · about you ─────────────────────────────────────────── */

/**
 * The runner's brief, right where the round closes. Builders on this
 * round see the labels, never the address or any figure. Usually
 * already answered at upload time; this chapter is the catch-up.
 */
function ChapterAboutYou({
  projectId,
  projectType,
  audience,
  brief,
  briefComplete,
  readOnly,
  onComplete,
}: {
  projectId: string;
  projectType: string;
  audience: BriefAudience;
  brief: Record<string, string>;
  briefComplete: boolean;
  readOnly: boolean;
  onComplete: () => void;
}) {
  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        {audience === "architect" ? "Your brief" : "About you"}
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[66ch]">
        {audience === "architect"
          ? "Builders read these answers before they price. A few quick questions about the client and your role, one tap each."
          : "Builders read these answers before they price. A few quick questions, one tap each."}
      </p>

      <div className="mt-5 rounded-lg border border-border-subtle bg-surface-1 card-elev px-5 py-4.5 max-w-[640px]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border-accent/45 bg-[rgba(0,212,200,0.08)] text-accent-light">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <OwnerBriefForm
              projectId={projectId}
              projectType={projectType}
              audience={audience}
              initial={brief}
              readOnly={readOnly}
              onComplete={onComplete}
            />
          </div>
        </div>
      </div>

      {briefComplete ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[#0a7d73] font-ui font-medium">
          <BadgeCheck className="size-3.5" />
          Done. Builders see these answers with your project.
        </p>
      ) : null}
    </div>
  );
}

/* ── one question ───────────────────────────────────────────────────── */

function QuestionCard({
  gap,
  resolution,
  readOnly,
  onResolve,
  docMood = false,
}: {
  gap: PackItem;
  resolution: PackResolution | null;
  readOnly: boolean;
  onResolve: (
    itemId: string,
    resolution: "allowance" | "builder_priced" | "excluded" | "upload_later",
    amountAud?: number,
  ) => Promise<boolean>;
  docMood?: boolean;
}) {
  const item = getScopeItem(gap.itemId);
  // A client may lock an allowance only on selections and cosmetic
  // works; the server refuses everything else, so the chip never
  // offers what the engine would reject.
  const allowanceEligible = ownerAllowanceEligible(gap.itemId);
  const suggestAllowance = allowanceEligible;
  const [amountOpen, setAmountOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (
    kind: "allowance" | "builder_priced" | "excluded" | "upload_later",
    amt?: number,
  ) => {
    setBusy(true);
    try {
      const done = await onResolve(gap.itemId, kind, amt);
      if (done) setAmountOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const verdict = resolution
    ? resolution.resolution === "allowance"
      ? `Budget set: $${(resolution.amountAud ?? 0).toLocaleString("en-AU")}`
      : resolution.resolution === "builder_priced"
        ? "Builders will price this"
        : resolution.resolution === "excluded"
          ? "Excluded from this tender"
          : "Documents to come"
    : null;

  return (
    <li
      className={cn(
        "rounded-md border px-4 py-3.5 bg-surface-1 transition-colors",
        resolution
          ? "border-border-subtle"
          : "border-[rgba(201,148,34,0.4)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-ui font-medium text-text">
            {item?.label ?? gap.itemId}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.6] text-text-muted max-w-[62ch]">
            {gap.note ?? item?.plain}
          </p>
        </div>
        {verdict ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-[#0a7d73]">
            <Check className="size-3.5" />
            {verdict}
          </span>
        ) : null}
      </div>

      {!readOnly && !amountOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {docMood ? (
            <>
              <AnswerChip
                disabled={busy}
                active={resolution?.resolution === "upload_later"}
                suggested={!resolution}
                onClick={() => act("upload_later")}
              >
                <FileUp className="size-3.5" />
                I will add this document
              </AnswerChip>
              <AnswerChip
                disabled={busy}
                active={resolution?.resolution === "builder_priced"}
                onClick={() => act("builder_priced")}
              >
                <Hammer className="size-3.5" />
                Carry on, builders price the work
              </AnswerChip>
            </>
          ) : (
            <>
              <AnswerChip
                disabled={busy}
                active={resolution?.resolution === "builder_priced"}
                suggested={!suggestAllowance && !resolution}
                onClick={() => act("builder_priced")}
              >
                <Hammer className="size-3.5" />
                Builders price this
              </AnswerChip>
              {allowanceEligible ? (
                <AnswerChip
                  disabled={busy}
                  active={resolution?.resolution === "allowance"}
                  suggested={suggestAllowance && !resolution}
                  onClick={() => setAmountOpen(true)}
                >
                  <CircleDollarSign className="size-3.5" />
                  Set a budget
                </AnswerChip>
              ) : null}
              <AnswerChip
                disabled={busy}
                active={resolution?.resolution === "excluded"}
                onClick={() => act("excluded")}
              >
                <MinusCircle className="size-3.5" />
                Exclude
              </AnswerChip>
            </>
          )}
        </div>
      ) : null}

      {!readOnly && amountOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-dim">
              $
            </span>
            <input
              type="number"
              min={1}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12000"
              className="h-10 w-[160px] pl-7 pr-3 rounded-md border border-border-subtle bg-surface-1 text-[13px] tabular-nums text-text outline-none focus:border-border-accent"
            />
          </div>
          <button
            type="button"
            disabled={busy || !(Number(amount) > 0)}
            onClick={() => act("allowance", Math.round(Number(amount)))}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Set budget
          </button>
          <button
            type="button"
            onClick={() => setAmountOpen(false)}
            className="text-[12px] text-text-dim hover:text-text transition-colors"
          >
            Cancel
          </button>
          <p className="w-full text-[10.5px] text-text-dim">
            Every builder prices against this exact sum, so quotes stay
            comparable. Whole dollars.
          </p>
        </div>
      ) : null}
    </li>
  );
}

function AnswerChip({
  children,
  onClick,
  disabled,
  active,
  suggested,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  suggested?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] transition-colors disabled:opacity-50",
        active
          ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
          : suggested
            ? "border-border-strong bg-surface-1 text-text hover:border-border-accent"
            : "border-border-subtle text-text-muted hover:text-text hover:border-border-strong",
      )}
    >
      {children}
      {suggested && !active ? (
        <span className="rounded-full bg-[rgba(0,212,200,0.1)] text-accent-deep px-1.5 py-px text-[9px] tracking-[0.06em] uppercase font-ui font-semibold">
          Usual
        </span>
      ) : null}
    </button>
  );
}
