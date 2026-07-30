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
  Loader2,
  MinusCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  bulkResolveOpenGapsAction,
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
  ownerAllowanceEligible,
  type DocumentAdvice,
} from "@/modules/scope";
import { applyPackCorrectionsAction } from "@/app/(app)/_actions/projects";
import { OwnerBriefForm } from "./owner-brief-form";

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
  title: string;
  filename: string;
  kind: string | null;
  pages: number | null;
}
interface PackFacts {
  title: string;
  typeLabel: string;
  suburb: string | null;
  state: string | null;
  dwellings: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
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
  canResolve,
  mode = "publish",
  addenda = [],
  overview = null,
  currentDescription = null,
  advisories = [],
  brief = {},
  briefComplete: briefCompleteInitial = false,
  documentNames,
  register,
  facts,
  standardVersion,
  items,
  resolutions,
}: {
  projectId: string;
  canResolve: boolean;
  mode?: "publish" | "addendum" | "record";
  addenda?: PackAddendum[];
  overview?: PackOverview | null;
  currentDescription?: string | null;
  advisories?: DocumentAdvice[];
  brief?: Record<string, string>;
  briefComplete?: boolean;
  documentNames: Record<string, string>;
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
  const [sweeping, setSweeping] = useState(false);

  /* ── derivations ─────────────────────────────────────────────────── */

  const evidenced = useMemo(
    () => items.filter((i) => i.status === "evidenced"),
    [items],
  );
  const gaps = useMemo(() => items.filter((i) => i.status === "gap"), [items]);

  const byDivision = useCallback((list: PackItem[]) => {
    const m = new Map<string, PackItem[]>();
    for (const it of list) {
      const div = getScopeItem(it.itemId)?.division ?? "unknown";
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

  // Chapter 3 holds only the gaps whose missing DOCUMENT is the
  // client's to supply (soil report, engineering, permit conditions).
  // Builder deliverables that live in the same division (occupancy
  // certificates, handover manuals) are decisions like any other —
  // the tender itself asks builders about them.
  const docGaps = useMemo(
    () => gaps.filter((g) => isOwnerDocGap(g.itemId)),
    [gaps],
  );
  const decisionGaps = useMemo(
    () => gaps.filter((g) => !isOwnerDocGap(g.itemId)),
    [gaps],
  );

  const answered = gaps.filter((g) => resolved.has(g.itemId)).length;
  const waitingOnDocs = gaps.filter(
    (g) => resolved.get(g.itemId)?.resolution === "upload_later",
  ).length;
  const openCount = gaps.length - answered;
  const readyToGoLive =
    openCount === 0 && waitingOnDocs === 0 && briefComplete;

  const divisionsCovered = evidencedByDivision.size;
  const pagesRead = register.reduce((n, r) => n + (r.pages ?? 0), 0);

  /* ── writes ──────────────────────────────────────────────────────── */

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

  const sweepRemaining = useCallback(async () => {
    setSweeping(true);
    try {
      const r = await bulkResolveOpenGapsAction(projectId);
      if (!r.ok) {
        toast.error("Could not save", r.error.message);
        return;
      }
      setResolved((prev) => {
        const next = new Map(prev);
        for (const g of gaps) {
          if (!next.has(g.itemId)) {
            next.set(g.itemId, {
              itemId: g.itemId,
              resolution: "builder_priced",
              amountAud: null,
            });
          }
        }
        return next;
      });
      toast.success(
        `${r.value.resolved} line${r.value.resolved === 1 ? "" : "s"} left to the builders to price.`,
      );
    } finally {
      setSweeping(false);
    }
  }, [projectId, gaps]);

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
      } else {
        toast.success("Your round is live. Builders can now see it.");
      }
      router.refresh();
    } finally {
      setCompleting(false);
    }
  }, [projectId, router]);

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
  const decisionOpen = decisionGaps.filter(
    (g) => !resolved.has(g.itemId),
  ).length;
  const chapters: Array<{ n: string; title: string; badge?: string }> = [
    { n: "01", title: "The pack" },
    { n: "02", title: "What your documents cover" },
    {
      n: "03",
      title: "Documents worth adding",
      badge: docOpen > 0 ? String(docOpen) : undefined,
    },
    {
      n: "04",
      title: "Your decisions",
      badge: decisionOpen > 0 ? String(decisionOpen) : undefined,
    },
    {
      n: "05",
      title: "About you",
      badge: briefComplete ? undefined : "6",
    },
  ];

  return (
    <div className="pb-28">
      {/* chapter navigation */}
      <nav className="flex items-stretch gap-1 border-y border-border-subtle overflow-x-auto">
        {chapters.map((c, i) => {
          const active = chapter === i;
          return (
            <button
              key={c.n}
              type="button"
              onClick={() => setChapter(i as Chapter)}
              className={cn(
                "relative flex-1 min-w-[150px] px-3 py-3 text-left transition-colors",
                active ? "text-text" : "text-text-dim hover:text-text-muted",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    active ? "text-accent-light" : "text-text-faint",
                  )}
                >
                  {c.n}
                </span>
                <span className="text-[12px] font-ui font-medium truncate">
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
          <ChapterCoverage
            evidencedByDivision={evidencedByDivision}
            documentNames={documentNames}
            total={evidenced.length}
            onContinue={() => setChapter(2)}
          />
        ) : chapter === 2 ? (
          <ChapterDocuments
            docGaps={docGaps}
            advisories={advisories}
            register={register}
            resolved={resolved}
            readOnly={readOnly}
            rereading={rereading}
            onReread={reread}
            onResolve={onResolve}
            onContinue={() => setChapter(3)}
          />
        ) : chapter === 3 ? (
          <ChapterDecisions
            decisionGaps={decisionGaps}
            resolved={resolved}
            readOnly={readOnly}
            sweeping={sweeping}
            openCount={decisionOpen}
            onResolve={onResolve}
            onSweep={sweepRemaining}
            onContinue={() => setChapter(4)}
          />
        ) : (
          <ChapterAboutYou
            projectId={projectId}
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
                `${waitingOnDocs} answer${waitingOnDocs === 1 ? "" : "s"} promise documents. Add them and read again, or answer another way.`
              ) : openCount > 0 ? (
                `${openCount} question${openCount === 1 ? "" : "s"} still open across chapters 03 and 04.`
              ) : (
                "One last thing: the six-question brief in chapter 05."
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
                        ? "Answer every question first. Chapters 03 and 04 have them."
                        : "Answer the six-question brief in chapter 05 first."
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
  const shape = [
    facts.dwellings && facts.dwellings > 1
      ? `${facts.dwellings} dwellings`
      : null,
    facts.bedrooms ? `${facts.bedrooms} bedrooms` : null,
    facts.bathrooms ? `${facts.bathrooms} bathrooms` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        {mode === "addendum"
          ? "The re-read is complete"
          : "Your tender pack is ready"}
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.75] text-text-muted max-w-[68ch]">
        We read {stats.documents === 1 ? "the document" : `all ${stats.documents} documents`}
        {stats.pages > 0 ? ` and every one of their ${stats.pages} pages` : ""}{" "}
        for your {facts.typeLabel.toLowerCase()}
        {place ? ` in ${place}` : ""}
        {shape ? ` (${shape.toLowerCase()})` : ""} against the BuilderHQ
        Scope Standard v{standardVersion}, a 250 point framework covering
        all 31 divisions of a residential build. Your documents evidence{" "}
        <Strong>{stats.evidenced} scope lines</Strong> across{" "}
        <Strong>{stats.divisions} divisions</Strong>, each one recorded in
        plain language with the exact page it came from. Where the
        documents are silent, we prepared{" "}
        <Strong>
          {stats.questions} question{stats.questions === 1 ? "" : "s"}
        </Strong>{" "}
        so nothing is discovered after builders have priced. A member of
        our review team confirmed every line before this pack reached you.
      </p>

      {/* the numbers */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-px rounded-lg overflow-hidden border border-border-subtle bg-border-subtle">
        {[
          { k: "Documents read", v: String(stats.documents) },
          { k: "Pages read", v: String(stats.pages) },
          { k: "Lines evidenced", v: String(stats.evidenced) },
          { k: "Divisions covered", v: String(stats.divisions) },
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
          What we read
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
                {r.pages ? `${r.pages} pages` : ""}
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

function ChapterCoverage({
  evidencedByDivision,
  documentNames,
  total,
  onContinue,
}: {
  evidencedByDivision: Map<string, PackItem[]>;
  documentNames: Record<string, string>;
  total: number;
  onContinue: () => void;
}) {
  const strongest = SCOPE_DIVISIONS.filter(
    (d) => (evidencedByDivision.get(d.id)?.length ?? 0) > 0,
  )
    .sort(
      (a, b) =>
        (evidencedByDivision.get(b.id)?.length ?? 0) -
        (evidencedByDivision.get(a.id)?.length ?? 0),
    )
    .slice(0, 3)
    .map((d) => d.label.toLowerCase());

  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        What your documents cover
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[66ch]">
        {total} lines of your build are documented, each written in plain
        language with the page it came from
        {strongest.length > 0
          ? `. Your set is strongest on ${strongest.join(", ")}`
          : ""}
        . Builders price these exactly as documented, so nothing here needs
        an answer from you. Open any division to read it back.
      </p>

      <div className="mt-5">
        {SCOPE_DIVISIONS.map((d) => {
          const divItems = evidencedByDivision.get(d.id);
          if (!divItems?.length) return null;
          return (
            <EvidencedDivision
              key={d.id}
              label={d.label}
              items={divItems}
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

function EvidencedDivision({
  label,
  items,
  documentNames,
}: {
  label: string;
  items: PackItem[];
  documentNames: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
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
          {items.length} line{items.length === 1 ? "" : "s"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-text-dim transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <ul className="border-t border-border-subtle/60 px-3.5 py-2.5 flex flex-col gap-2.5">
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
      ) : null}
    </div>
  );
}

/* ── chapter 03 · the documents ─────────────────────────────────────── */

function ChapterDocuments({
  docGaps,
  advisories,
  register,
  resolved,
  readOnly,
  rereading,
  onReread,
  onResolve,
  onContinue,
}: {
  docGaps: PackItem[];
  advisories: DocumentAdvice[];
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
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-[10.5px] text-text-dim min-w-0">
                  To add any of these: upload it to the project, then have
                  the pack read again. Your answers so far carry forward.
                </p>
                {!readOnly ? (
                  <button
                    type="button"
                    disabled={rereading}
                    onClick={onReread}
                    className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border-subtle text-[11.5px] font-ui text-text-muted hover:text-text hover:border-border-strong transition-colors disabled:opacity-60"
                  >
                    {rereading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileUp className="size-3" />
                    )}
                    Documents added, read again
                  </button>
                ) : null}
              </div>
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

function ChapterDecisions({
  decisionGaps,
  resolved,
  readOnly,
  sweeping,
  openCount,
  onResolve,
  onSweep,
  onContinue,
}: {
  decisionGaps: PackItem[];
  resolved: Map<string, PackResolution>;
  readOnly: boolean;
  sweeping: boolean;
  openCount: number;
  onResolve: (
    itemId: string,
    resolution: "allowance" | "builder_priced" | "excluded" | "upload_later",
    amountAud?: number,
  ) => Promise<boolean>;
  onSweep: () => void;
  onContinue: () => void;
}) {
  const answeredHere = decisionGaps.filter((g) => resolved.has(g.itemId)).length;
  const byDivision = new Map<string, PackItem[]>();
  for (const g of decisionGaps) {
    const div = getScopeItem(g.itemId)?.division ?? "unknown";
    byDivision.set(div, [...(byDivision.get(div) ?? []), g]);
  }
  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        Your decisions
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[68ch]">
        These lines were not found in your documents, so each needs one
        answer before builders price your project. For most of them the
        ordinary answer is that{" "}
        <Strong>the builders price it</Strong>: every builder includes the
        line in their own quote, exactly as tendering normally works. Set
        an allowance only where you want every quote to carry the same
        locked figure, and exclude anything this contract will not
        include. There is nothing here you need to research or cost
        yourself.
      </p>

      {!readOnly && openCount > 0 ? (
        <div className="mt-5 rounded-lg border border-border-accent/40 bg-[rgba(0,212,200,0.04)] px-4.5 py-3.5 flex flex-wrap items-center gap-3">
          <p className="text-[12.5px] text-text-muted min-w-0">
            Happy for the builders to handle what remains? One tap answers
            every open question that way. Anything you have already
            answered stays as you set it.
          </p>
          <button
            type="button"
            disabled={sweeping}
            onClick={onSweep}
            className="ml-auto shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {sweeping ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Hammer className="size-3.5" />
            )}
            Builders price the remaining {openCount}
          </button>
        </div>
      ) : null}

      <p className="mt-5 text-[11px] tabular-nums text-text-dim">
        {answeredHere} of {decisionGaps.length} answered in this chapter
      </p>

      {SCOPE_DIVISIONS.map((d) => {
        const divGaps = byDivision.get(d.id);
        if (!divGaps?.length) return null;
        const done = divGaps.filter((g) => resolved.has(g.itemId)).length;
        return (
          <div key={d.id} className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] tracking-[0.08em] uppercase text-text-dim font-ui font-semibold">
                {d.label}
              </p>
              <p
                className={cn(
                  "text-[10.5px] tabular-nums",
                  done === divGaps.length ? "text-[#0a7d73]" : "text-text-dim",
                )}
              >
                {done}/{divGaps.length}
              </p>
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {divGaps.map((g) => (
                <QuestionCard
                  key={g.id}
                  gap={g}
                  resolution={resolved.get(g.itemId) ?? null}
                  readOnly={readOnly}
                  onResolve={onResolve}
                />
              ))}
            </ul>
          </div>
        );
      })}

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

/* ── chapter 05 · about you ─────────────────────────────────────────── */

/**
 * The client's six answers, right where the round closes. Builders on
 * this round see the labels, never the address or any figure: who the
 * client is, whether the money is real, and what they value.
 */
function ChapterAboutYou({
  projectId,
  brief,
  briefComplete,
  readOnly,
  onComplete,
}: {
  projectId: string;
  brief: Record<string, string>;
  briefComplete: boolean;
  readOnly: boolean;
  onComplete: () => void;
}) {
  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.014em] text-[24px] sm:text-[30px] leading-[1] text-text">
        About you
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[66ch]">
        Builders on your round answer seventy structured questions before
        you read a word of their tender. These six are yours. They are
        what any builder would ask at a pre-tender meeting, and answering
        them here means every tender you receive was priced by someone
        who took your round seriously.
      </p>

      <div className="mt-5 rounded-lg border border-border-subtle bg-surface-1 card-elev px-5 py-4.5 max-w-[640px]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border-accent/45 bg-[rgba(0,212,200,0.08)] text-accent-light">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <OwnerBriefForm
              projectId={projectId}
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
      ? `Allowance locked: $${(resolution.amountAud ?? 0).toLocaleString("en-AU")}`
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
          <AnswerChip
            disabled={busy}
            active={resolution?.resolution === "builder_priced"}
            suggested={!suggestAllowance && !docMood && !resolution}
            onClick={() => act("builder_priced")}
          >
            <Hammer className="size-3.5" />
            Builders price this
          </AnswerChip>
          {allowanceEligible ? (
            <AnswerChip
              disabled={busy}
              active={resolution?.resolution === "allowance"}
              suggested={suggestAllowance && !docMood && !resolution}
              onClick={() => setAmountOpen(true)}
            >
              <CircleDollarSign className="size-3.5" />
              Set an allowance
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
          <AnswerChip
            disabled={busy}
            active={resolution?.resolution === "upload_later"}
            suggested={docMood && !resolution}
            onClick={() => act("upload_later")}
          >
            <FileUp className="size-3.5" />
            I will add the document
          </AnswerChip>
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
            Lock the allowance
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
