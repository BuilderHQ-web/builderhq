"use client";

/**
 * PackReview — the owner answering their tender pack.
 *
 * Two halves. "What your documents cover": the evidenced items by
 * division, each in plain language with its citations — reassurance,
 * no action needed. "The questions": every gap, grouped by division,
 * each answered one of three ways — set an allowance (a locked sum
 * every builder prices against equally), exclude it from this
 * contract, or promise documents (which routes the project back
 * through a re-read). Progress is explicit; the round goes live only
 * when nothing is left unanswered.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleDollarSign,
  FileUp,
  Loader2,
  MinusCircle,
  Rocket,
} from "lucide-react";

import {
  completeScopeReviewAction,
  requestScopeRereadAction,
  resolveScopeGapAction,
} from "@/app/(app)/_actions/scope";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { SCOPE_DIVISIONS, getScopeItem } from "@/modules/scope";

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

export function PackReview({
  projectId,
  projectType,
  documentNames,
  canResolve,
  items,
  resolutions,
  mode = "publish",
  addenda = [],
}: {
  projectId: string;
  projectType: string;
  documentNames: Record<string, string>;
  canResolve: boolean;
  items: PackItem[];
  resolutions: PackResolution[];
  /**
   * What acceptance means here: "publish" opens the round, "addendum"
   * re-issues a live round's pack, "record" shows the effective pack
   * read-only with the re-read as the only act left.
   */
  mode?: "publish" | "addendum" | "record";
  addenda?: PackAddendum[];
}) {
  void projectType;
  const router = useRouter();
  const [resolved, setResolved] = useState<Map<string, PackResolution>>(
    () => new Map(resolutions.map((r) => [r.itemId, r])),
  );
  const [completing, setCompleting] = useState(false);
  const [rereading, setRereading] = useState(false);

  const evidenced = useMemo(
    () => items.filter((i) => i.status === "evidenced"),
    [items],
  );
  const gaps = useMemo(() => items.filter((i) => i.status === "gap"), [items]);
  const answered = gaps.filter((g) => resolved.has(g.itemId)).length;
  const waitingOnDocs = gaps.filter(
    (g) => resolved.get(g.itemId)?.resolution === "upload_later",
  ).length;
  const allAnswered = answered === gaps.length;
  const readyToGoLive = allAnswered && waitingOnDocs === 0;

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

  const gapsByDivision = useMemo(() => byDivision(gaps), [byDivision, gaps]);
  const evidencedByDivision = useMemo(
    () => byDivision(evidenced),
    [byDivision, evidenced],
  );

  const onResolve = useCallback(
    async (
      itemId: string,
      resolution: "allowance" | "excluded" | "upload_later",
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
        next.set(itemId, {
          itemId,
          resolution,
          amountAud: amountAud ?? null,
        });
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

  return (
    <div className="flex flex-col gap-8">
      {/* the ledger */}
      <div className="flex flex-wrap items-stretch divide-x divide-border-subtle border-y border-border-subtle py-3">
        <PackStat label="Documented items" value={String(evidenced.length)} />
        <PackStat label="Questions" value={String(gaps.length)} />
        <PackStat
          label="Answered"
          value={`${answered} of ${gaps.length}`}
          emphasis={allAnswered}
        />
      </div>

      {/* the questions — action first */}
      {gaps.length > 0 ? (
        <section>
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-[#8a6414] font-ui font-semibold pb-2.5 border-b border-border-subtle">
            The questions · {gaps.length - answered} still open
          </h2>
          <p className="mt-2 text-[12.5px] text-text-muted max-w-[64ch]">
            {mode === "addendum"
              ? "The re-read raised these. Answers you already gave carried forward; only what changed asks again. Each needs one answer before the addendum can issue."
              : "Your documents are silent on these. Each needs one answer before the round goes live: set an allowance every builder prices against equally, exclude it from this contract, or add the missing documents."}
          </p>
          {SCOPE_DIVISIONS.map((d) => {
            const divGaps = gapsByDivision.get(d.id);
            if (!divGaps?.length) return null;
            return (
              <div key={d.id} className="mt-4">
                <p className="text-[11px] tracking-[0.08em] uppercase text-text-dim font-ui font-semibold">
                  {d.label}
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {divGaps.map((g) => (
                    <GapLine
                      key={g.id}
                      gap={g}
                      resolution={resolved.get(g.itemId) ?? null}
                      canResolve={canResolve && mode !== "record"}
                      onResolve={onResolve}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* what the documents cover */}
      <section>
        <h2 className="text-[10px] tracking-[0.22em] uppercase text-[#0a7d73] font-ui font-semibold pb-2.5 border-b border-border-subtle">
          What your documents cover · {evidenced.length} items
        </h2>
        <p className="mt-2 text-[12.5px] text-text-muted max-w-[64ch]">
          Everything below was found in your documents, with the page it
          came from. Builders price these like for like. Nothing here needs
          an answer.
        </p>
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
      </section>

      {/* the addendum register */}
      {addenda.length > 0 ? (
        <section>
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-semibold pb-2.5 border-b border-border-subtle">
            Addenda issued on this round
          </h2>
          <ul className="mt-2 divide-y divide-border-subtle/60">
            {addenda.map((a) => (
              <li
                key={a.number}
                className="py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <span className="text-[13px] font-ui font-semibold text-text">
                  Addendum {String(a.number).padStart(2, "0")}
                </span>
                <span className="text-[12px] text-text-muted">{a.summary}</span>
                <span className="text-[11px] text-text-dim ml-auto">
                  {new Date(a.issuedAtISO).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* the gate */}
      {canResolve && mode === "record" ? (
        <div className="sticky bottom-4 flex items-center justify-end gap-3">
          <p className="text-[12px] text-text-dim mr-auto">
            This pack is live for the round. Changing it starts with a
            re-read of the documents.
          </p>
          <button
            type="button"
            disabled={rereading}
            onClick={reread}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border-strong bg-surface-1 text-text text-[13px] hover:bg-bg-elev transition-colors disabled:opacity-60"
          >
            {rereading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Documents changed, read again
          </button>
        </div>
      ) : canResolve ? (
        <div className="sticky bottom-4 flex items-center justify-end gap-3">
          {waitingOnDocs > 0 ? (
            <button
              type="button"
              disabled={rereading}
              onClick={reread}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border-strong bg-surface-1 text-text text-[13px] hover:bg-bg-elev transition-colors disabled:opacity-60"
            >
              {rereading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              Documents added, read again
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
                  : "Answer every question first."
            }
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold hover:bg-accent-hover transition-colors shadow-[0_8px_24px_-8px_rgba(0,212,200,0.5)] disabled:opacity-50"
          >
            {completing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Rocket className="size-4" />
            )}
            {mode === "addendum" ? "Issue the addendum" : "Approve and go live"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PackStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="px-5 sm:px-7 text-center min-w-0">
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-[20px] leading-none tabular-nums",
          emphasis ? "text-[#0a7d73]" : "text-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ── one open question ──────────────────────────────────────────────── */

function GapLine({
  gap,
  resolution,
  canResolve,
  onResolve,
}: {
  gap: PackItem;
  resolution: PackResolution | null;
  canResolve: boolean;
  onResolve: (
    itemId: string,
    resolution: "allowance" | "excluded" | "upload_later",
    amountAud?: number,
  ) => Promise<boolean>;
}) {
  const item = getScopeItem(gap.itemId);
  const [amountOpen, setAmountOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (
    kind: "allowance" | "excluded" | "upload_later",
    amt?: number,
  ) => {
    setBusy(true);
    try {
      const okDone = await onResolve(gap.itemId, kind, amt);
      if (okDone) setAmountOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const verdict = resolution
    ? resolution.resolution === "allowance"
      ? `Allowance set: $${(resolution.amountAud ?? 0).toLocaleString("en-AU")}`
      : resolution.resolution === "excluded"
        ? "Excluded from this tender"
        : "Documents to come"
    : null;

  return (
    <li
      className={cn(
        "rounded-md border px-3.5 py-3 bg-surface-1",
        resolution ? "border-border-subtle" : "border-[rgba(201,148,34,0.4)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-ui font-medium text-text">
            {item?.label ?? gap.itemId}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted">
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

      {canResolve && !amountOpen ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <GapButton
            disabled={busy}
            active={resolution?.resolution === "allowance"}
            onClick={() => setAmountOpen(true)}
          >
            <CircleDollarSign className="size-3.5" />
            Set an allowance
          </GapButton>
          <GapButton
            disabled={busy}
            active={resolution?.resolution === "excluded"}
            onClick={() => act("excluded")}
          >
            <MinusCircle className="size-3.5" />
            Exclude from this tender
          </GapButton>
          <GapButton
            disabled={busy}
            active={resolution?.resolution === "upload_later"}
            onClick={() => act("upload_later")}
          >
            <FileUp className="size-3.5" />
            I will add documents
          </GapButton>
        </div>
      ) : null}

      {canResolve && amountOpen ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
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

function GapButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
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
          : "border-border-subtle text-text-muted hover:text-text hover:border-border-strong",
      )}
    >
      {children}
    </button>
  );
}

/* ── the documented list ────────────────────────────────────────────── */

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
    <div className="mt-3 border border-border-subtle rounded-md bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 text-[12.5px] font-ui font-medium text-text truncate">
          {label}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-text-dim">
          {items.length} item{items.length === 1 ? "" : "s"}
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
                  <p className="mt-0.5 text-[11.5px] leading-[1.5] text-text-muted">
                    {it.note}
                  </p>
                ) : null}
                {it.citations.length > 0 ? (
                  <p className="mt-0.5 text-[10px] text-text-dim">
                    {it.citations
                      .map(
                        (c) =>
                          `${documentNames[c.documentId] ?? "document"} p.${c.page}${c.revision ? ` rev ${c.revision}` : ""}`,
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
