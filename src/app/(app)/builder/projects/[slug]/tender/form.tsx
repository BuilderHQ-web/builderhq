"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Wallet,
  Calendar,
  FileText,
  Hammer,
  ListChecks,
  Upload,
  Download,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Send,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import {
  startTenderAction,
  updateTenderAction,
  setTenderCostLinesAction,
  submitTenderAction,
  withdrawTenderAction,
  listMyTenderDocsAction,
} from "@/app/(app)/_actions/tenders";
import {
  initUploadAction,
  completeUploadAction,
  getDownloadUrlAction,
  softDeleteAction as softDeleteDocAction,
} from "@/app/(app)/_actions/documents";
import { TRADES, type TradeId } from "@/modules/tenders/trades";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type {
  CostLineInput,
  TenderWithLines,
  UpdateTenderInput,
} from "@/modules/tenders";
import type { Document } from "@/modules/documents";
import type { OwnerContact } from "@/modules/profiles";
import type { MarketplacePreview } from "@/modules/projects";

// ── form types ───────────────────────────────────────────────────────────

type LineState = {
  /** UUID generated client-side for new "other" rows. Stable across edits. */
  id: string;
  trade: TradeId;
  /** Empty string when blank — UX nicety; service rejects 0 amount for non-Other. */
  amount: number | null;
  /** Required when trade === "other". */
  label: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

// ── constants ────────────────────────────────────────────────────────────

const VALIDITY_OPTIONS = [
  { id: 7, label: "7 days" },
  { id: 14, label: "14 days" },
  { id: 30, label: "30 days" },
  { id: 60, label: "60 days" },
  { id: 90, label: "90 days" },
];

const TYPE_LABEL: Record<MarketplacePreview["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

const STATUS_LABEL: Record<TenderWithLines["status"], string> = {
  draft: "Draft",
  submitted: "Submitted",
  withdrawn: "Withdrawn",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
  rejected: "Rejected",
};

// ── component ────────────────────────────────────────────────────────────

export function TenderForm({
  preview,
  priceAud,
  initialTender,
  initialDocs,
  ownerContact,
}: {
  preview: MarketplacePreview;
  priceAud: number;
  initialTender: TenderWithLines | null;
  initialDocs: Document[];
  /** Set when the builder has won this tender — surfaces contact info. */
  ownerContact: OwnerContact | null;
}) {
  const router = useRouter();
  const [tender, setTender] = useState<TenderWithLines | null>(initialTender);
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local form state — initialised from existing tender if there is one.
  const [totalPrice, setTotalPrice] = useState<number | null>(
    initialTender?.totalPriceAud ?? null,
  );
  const [duration, setDuration] = useState<number | null>(
    initialTender?.durationWeeks ?? null,
  );
  const [validity, setValidity] = useState<number | null>(
    initialTender?.validityDays ?? null,
  );
  const [startMonth, setStartMonth] = useState(
    initialTender?.proposedStartMonth ?? "",
  );
  const [exclusions, setExclusions] = useState<string[]>(
    initialTender?.exclusions ?? [],
  );
  const [conditions, setConditions] = useState(initialTender?.conditions ?? "");
  const [pitch, setPitch] = useState(initialTender?.pitch ?? "");

  // Cost lines as local state.
  const [lines, setLines] = useState<LineState[]>(
    initialiseLines(initialTender?.costLines ?? []),
  );

  // Section open/closed.
  const [open, setOpen] = useState({
    breakdown: (initialTender?.costLines.length ?? 0) > 0,
    scope:
      (initialTender?.exclusions?.length ?? 0) > 0 ||
      Boolean(initialTender?.conditions),
    pitch: Boolean(initialTender?.pitch) || initialDocs.length > 0,
  });

  const isLocked = (tender?.status ?? "draft") !== "draft";

  // ── kick off the draft on mount if none exists ─────────────────────

  const startedRef = useRef(false);
  useEffect(() => {
    if (tender || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const r = await startTenderAction(preview.id);
      if (!r.ok) {
        setSaveError(r.error.message);
        return;
      }
      setTender(r.value);
    })();
  }, [tender, preview.id]);

  // ── autosave debounced patch sender (for the headline + scope + pitch) ─

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<UpdateTenderInput>({});
  const inflight = useRef(false);

  const flush = useCallback(async () => {
    if (!tender || isLocked) return;
    if (inflight.current) return;
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};
    inflight.current = true;
    setSaveState("saving");
    setSaveError(null);
    try {
      const r = await updateTenderAction(tender.id, patch);
      if (!r.ok) {
        setSaveState("error");
        setSaveError(r.error.message);
        pendingPatch.current = { ...patch, ...pendingPatch.current };
        return;
      }
      setTender((t) => (t ? { ...r.value, costLines: t.costLines } : r.value));
      setSaveState("saved");
    } finally {
      inflight.current = false;
      if (Object.keys(pendingPatch.current).length > 0) scheduleFlush();
    }
  }, [tender, isLocked]);

  const scheduleFlush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 600);
  }, [flush]);

  const setHeadlineField = useCallback(
    <K extends keyof UpdateTenderInput>(
      key: K,
      value: UpdateTenderInput[K],
    ) => {
      pendingPatch.current = { ...pendingPatch.current, [key]: value };
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Debounced cost-line save (separate channel from headline patch).
  const linesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linesInflight = useRef(false);
  const flushLines = useCallback(
    async (force?: LineState[]) => {
      if (!tender || isLocked) return;
      if (linesInflight.current) return;
      linesInflight.current = true;
      setSaveState("saving");
      setSaveError(null);
      try {
        const cleaned = (force ?? lines)
          .filter((l) => l.amount != null && l.amount >= 0)
          .map((l) => ({
            trade: l.trade,
            amountAud: l.amount ?? 0,
            label: l.trade === "other" ? l.label : undefined,
          })) satisfies CostLineInput[];
        const r = await setTenderCostLinesAction(tender.id, cleaned);
        if (!r.ok) {
          setSaveState("error");
          setSaveError(r.error.message);
          return;
        }
        setSaveState("saved");
      } finally {
        linesInflight.current = false;
      }
    },
    [tender, isLocked, lines],
  );

  const scheduleLineSave = useCallback(() => {
    if (linesTimer.current) clearTimeout(linesTimer.current);
    linesTimer.current = setTimeout(() => flushLines(), 700);
  }, [flushLines]);

  // ── line operations ───────────────────────────────────────────────

  /**
   * Upsert by id. The first time the user types into a row that
   * doesn't yet exist in `lines`, the TradeRow handler dispatches
   * with a freshly-minted id + the row's trade — this branch creates
   * the row. Subsequent edits hit the map branch and patch in place.
   * Without the upsert, new rows were silently dropped → the
   * breakdown sum stayed 0 and "Hide empty rows" hid everything.
   */
  const updateLine = (id: string, patch: Partial<LineState>) => {
    setLines((arr) => {
      const idx = arr.findIndex((l) => l.id === id);
      if (idx === -1) {
        return [
          ...arr,
          {
            id,
            trade: patch.trade ?? "other",
            amount: patch.amount ?? null,
            label: patch.label ?? "",
            ...patch,
          },
        ];
      }
      return arr.map((l) => (l.id === id ? { ...l, ...patch } : l));
    });
    scheduleLineSave();
  };

  const addOtherLine = () => {
    setLines((arr) => [
      ...arr,
      { id: crypto.randomUUID(), trade: "other", amount: null, label: "" },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((arr) => arr.filter((l) => l.id !== id));
    scheduleLineSave();
  };

  const breakdownSum = useMemo(
    () => lines.reduce((s, l) => s + (l.amount ?? 0), 0),
    [lines],
  );
  const variance =
    lines.length === 0 || totalPrice == null ? null : breakdownSum - totalPrice;

  // ── docs (reuse existing R2 pipeline; tender_id wires it to this tender) ─

  const [activeUploads, setActiveUploads] = useState<LocalUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const refreshDocs = useCallback(async () => {
    if (!tender) return;
    const r = await listMyTenderDocsAction(tender.id);
    if (r.ok) setDocs(r.value);
  }, [tender]);

  const onDropFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!tender) return;
      const list = Array.from(files);
      for (const f of list) {
        await uploadOne({
          file: f,
          projectId: preview.id,
          tenderId: tender.id,
          setActive: setActiveUploads,
          onDone: refreshDocs,
        });
      }
    },
    [tender, preview.id, refreshDocs],
  );

  // ── submit / withdraw ─────────────────────────────────────────────

  const [busy, setBusy] = useState<"submit" | "withdraw" | null>(null);

  const onSubmit = async () => {
    if (!tender) return;
    setBusy("submit");
    try {
      // Flush pending state first.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (linesTimer.current) clearTimeout(linesTimer.current);
      await flush();
      await flushLines();
      const r = await submitTenderAction(tender.id);
      if (!r.ok) {
        const reasons = (r.error.details?.missing as string[] | undefined) ?? [];
        toast.error(
          "Couldn't submit",
          reasons.length > 0
            ? `Still missing: ${reasons.join(", ")}`
            : r.error.message,
        );
        return;
      }
      setTender(r.value);
      setLines(initialiseLines(r.value.costLines));
      toast.success("Tender submitted", "The owner has been notified.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const onWithdraw = async () => {
    if (!tender) return;
    if (
      !confirm(
        "Withdraw this tender? You can submit a new one afterwards, but this version will be marked withdrawn.",
      )
    )
      return;
    setBusy("withdraw");
    try {
      const r = await withdrawTenderAction(tender.id);
      if (!r.ok) {
        toast.error("Couldn't withdraw", r.error.message);
        return;
      }
      toast.message("Tender withdrawn", "Start a new draft when you're ready.");
      router.push("/builder/tenders");
    } finally {
      setBusy(null);
    }
  };

  // ── readiness for the submit button ───────────────────────────────

  const ready =
    !!totalPrice &&
    totalPrice > 0 &&
    !!duration &&
    duration > 0 &&
    !!validity &&
    validity > 0;

  // ── render ────────────────────────────────────────────────────────

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="border-b border-border-subtle bg-bg-deep/30">
        <div className="px-6 lg:px-10 py-6 lg:py-8 mx-auto max-w-[1500px]">
          <Link
            href={`/builder/projects/${preview.slug}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to project
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
                <FileText className="size-3.5" />
                Tender
                <span className="text-text-dim/60 mx-1">·</span>
                <StatusPill status={tender?.status ?? "draft"} />
              </span>
              <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[34px] sm:text-[40px] leading-[0.95] text-text">
                {preview.title}
              </h1>
              <p className="mt-2 text-[13px] text-text-muted">
                {TYPE_LABEL[preview.type]}
                {preview.suburb ? ` · ${preview.suburb}, ${preview.state}` : ""}
                {" · "}
                <span className="text-text-dim">
                  Unlock fee: ${priceAud}
                </span>
              </p>
            </div>
            <SaveIndicator state={saveState} error={saveError} />
          </div>
        </div>
      </div>

      {/* Award banner — only when this tender has been awarded. Surfaces
          owner contact + a "next steps" line so the builder can follow
          up off-platform. The award email already contains this info,
          but reinforcing it in-app makes the win unmissable. */}
      {tender?.status === "awarded" && ownerContact ? (
        <AwardedBanner contact={ownerContact} projectTitle={preview.title} />
      ) : null}

      <div className="px-6 lg:px-10 py-8 lg:py-10 mx-auto max-w-[1500px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6">
        {/* Main column */}
        <div className="space-y-5 min-w-0">
          {/* SECTION 1 — The number */}
          <Section
            icon={<Wallet className="size-4" />}
            title="The number"
            sub="Required. Total price + duration + validity period."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Total price" required hint="GST inclusive">
                <PriceInput
                  value={totalPrice}
                  disabled={isLocked}
                  onChange={(v) => {
                    setTotalPrice(v);
                    setHeadlineField("totalPriceAud", v);
                  }}
                />
              </Field>
              <Field label="Build duration" required hint="exact weeks">
                <NumberInput
                  value={duration}
                  disabled={isLocked}
                  min={1}
                  max={200}
                  suffix="weeks"
                  onChange={(v) => {
                    setDuration(v);
                    setHeadlineField("durationWeeks", v);
                  }}
                />
              </Field>
              <Field label="Tender validity" required>
                <SelectInput
                  value={validity ?? ""}
                  disabled={isLocked}
                  onChange={(raw) => {
                    const v = raw === "" ? null : Number(raw);
                    setValidity(v);
                    setHeadlineField("validityDays", v);
                  }}
                  options={[
                    { id: "", label: "Pick a period…" },
                    ...VALIDITY_OPTIONS.map((o) => ({
                      id: String(o.id),
                      label: o.label,
                    })),
                  ]}
                />
              </Field>
              <Field label="Proposed start" hint="optional">
                <input
                  type="month"
                  value={startMonth}
                  disabled={isLocked}
                  onChange={(e) => {
                    setStartMonth(e.target.value);
                    setHeadlineField(
                      "proposedStartMonth",
                      e.target.value || null,
                    );
                  }}
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* SECTION 2 — Cost breakdown */}
          <Collapsible
            open={open.breakdown}
            onToggle={() => setOpen((o) => ({ ...o, breakdown: !o.breakdown }))}
            icon={<ListChecks className="size-4" />}
            title="Cost breakdown"
            sub={
              lines.length > 0
                ? `${lines.length} trade${lines.length === 1 ? "" : "s"} filled · transparency = trust`
                : "Optional. Itemise by trade — owners reward this with quicker decisions."
            }
            badge={lines.length > 0 ? "Filled" : "Optional"}
          >
            <CostBreakdown
              lines={lines}
              isLocked={isLocked}
              totalPrice={totalPrice}
              breakdownSum={breakdownSum}
              variance={variance}
              onUpdate={updateLine}
              onAddOther={addOtherLine}
              onRemove={removeLine}
            />
          </Collapsible>

          {/* SECTION 3 — Scope */}
          <Collapsible
            open={open.scope}
            onToggle={() => setOpen((o) => ({ ...o, scope: !o.scope }))}
            icon={<Hammer className="size-4" />}
            title="Scope"
            sub="Optional. Exclusions + caveats."
            badge={
              exclusions.length > 0 || conditions.trim()
                ? "Filled"
                : "Optional"
            }
          >
            <div className="space-y-5">
              <Field label="Exclusions" hint="things the owner has to handle separately">
                <TagInput
                  values={exclusions}
                  disabled={isLocked}
                  placeholder='e.g. "Landscaping", "Owner-supplied appliances"'
                  onChange={(next) => {
                    setExclusions(next);
                    setHeadlineField(
                      "exclusions",
                      next.length === 0 ? null : next,
                    );
                  }}
                />
              </Field>
              <Field label="Conditions" hint="caveats, contingencies, contract notes">
                <textarea
                  defaultValue={conditions}
                  disabled={isLocked}
                  onChange={(e) => {
                    setConditions(e.target.value);
                    setHeadlineField("conditions", e.target.value || null);
                  }}
                  rows={4}
                  placeholder="e.g. Subject to satisfactory soil testing. Excludes any work outside the supplied plans."
                  className={cn(inputCls, "min-h-[110px] py-3 leading-[1.6]")}
                />
              </Field>
            </div>
          </Collapsible>

          {/* SECTION 4 — Your pitch */}
          <Collapsible
            open={open.pitch}
            onToggle={() => setOpen((o) => ({ ...o, pitch: !o.pitch }))}
            icon={<Sparkles className="size-4" />}
            title="Your pitch"
            sub="Optional. Why you — track record, similar projects, your approach."
            badge={pitch.trim() ? "Filled" : "Optional"}
          >
            <Field label="Why you" hint="track record, similar projects, what makes you a fit">
              <textarea
                defaultValue={pitch}
                disabled={isLocked}
                onChange={(e) => {
                  setPitch(e.target.value);
                  setHeadlineField("pitch", e.target.value || null);
                }}
                rows={5}
                placeholder="A few paragraphs about your team, similar builds, and how you'd approach this project."
                className={cn(inputCls, "min-h-[120px] py-3 leading-[1.6]")}
              />
            </Field>
          </Collapsible>

          {/* Withdraw (if submitted/shortlisted) */}
          {tender && (tender.status === "submitted" || tender.status === "shortlisted") ? (
            <div className="pt-6 border-t border-border-subtle/60">
              <button
                type="button"
                onClick={onWithdraw}
                disabled={busy === "withdraw"}
                className="text-[12px] text-text-dim hover:text-danger transition-colors inline-flex items-center gap-2"
              >
                {busy === "withdraw" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
                Withdraw this tender
              </button>
            </div>
          ) : null}
        </div>

        {/* Sticky right rail — live summary + prominent docs upload + TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <LiveSummaryCard
              totalPrice={totalPrice}
              duration={duration}
              validity={validity}
              startMonth={startMonth}
              breakdownSum={breakdownSum}
              variance={variance}
              docCount={docs.length}
              ready={ready}
            />

            <DocsRailCard
              docs={docs}
              activeUploads={activeUploads}
              dragOver={dragOver}
              isLocked={isLocked}
              hasDraft={!!tender}
              onDragOverSet={(v) => setDragOver(v)}
              onDropFiles={onDropFiles}
              onDownload={async (id) => {
                const r = await getDownloadUrlAction(id);
                if (!r.ok) {
                  toast.error("Download failed", r.error.message);
                  return;
                }
                window.open(r.value.url, "_blank", "noopener");
              }}
              onDelete={async (id) => {
                if (!confirm("Delete this document?")) return;
                const r = await softDeleteDocAction(id);
                if (!r.ok) {
                  toast.error("Couldn't delete", r.error.message);
                  return;
                }
                await refreshDocs();
              }}
            />

            <div className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] p-3">
              <div className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim mb-2 px-1">
                Jump to section
              </div>
              <TocLink href="#section-the-number" label="The number" />
              <TocLink href="#section-cost-breakdown" label="Cost breakdown" />
              <TocLink href="#section-scope" label="Scope" />
              <TocLink href="#section-your-pitch" label="Your pitch" />
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-deep/98 backdrop-blur-md">
        <div className="mx-auto max-w-[1500px] px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            {tender?.status === "draft" || !tender ? (
              ready ? (
                <div className="text-[13px] text-accent-light flex items-center gap-2">
                  <Check className="size-4" />
                  Ready to submit
                </div>
              ) : (
                <div className="text-[12.5px] text-text-dim flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-warning shrink-0" />
                  <span className="truncate">
                    Still missing:{" "}
                    {[
                      !totalPrice && "total price",
                      !duration && "duration",
                      !validity && "validity",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )
            ) : (
              <FooterStatusLabel status={tender!.status} />
            )}
          </div>

          {tender?.status === "draft" || !tender ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!ready || busy !== null || !tender}
              className={cn(
                "inline-flex items-center gap-2 h-11 px-6 rounded-full text-[13px] font-semibold tracking-[0.04em] transition-colors duration-[160ms]",
                ready && busy === null
                  ? "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]"
                  : "bg-surface-2 text-text-dim cursor-not-allowed",
              )}
            >
              {busy === "submit" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {busy === "submit" ? "Submitting…" : "Submit tender"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {tender &&
              (tender.status === "submitted" ||
                tender.status === "shortlisted") ? (
                <button
                  type="button"
                  onClick={onWithdraw}
                  disabled={busy === "withdraw"}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-danger/40 text-danger text-[12.5px] tracking-[0.04em] hover:bg-danger/10 transition-colors disabled:opacity-60"
                >
                  {busy === "withdraw" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  {busy === "withdraw" ? "Withdrawing…" : "Withdraw to edit"}
                </button>
              ) : null}
              <Link
                href={`/builder/projects/${preview.slug}`}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-strong text-text text-[12.5px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
              >
                Back to project
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section / Collapsible ────────────────────────────────────────────────

function Section({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`section-${slug(title)}`}
      className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]"
    >
      <header className="px-6 py-4 border-b border-border-subtle/60 flex items-start gap-3">
        <span className="size-8 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
            {title}
          </h2>
          {sub ? <p className="text-[12px] text-text-dim mt-0.5">{sub}</p> : null}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Collapsible({
  open,
  onToggle,
  icon,
  title,
  sub,
  badge,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`section-${slug(title)}`}
      className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-6 py-4 border-b border-border-subtle/60 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.018)] transition-colors"
      >
        <span className="size-8 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
              {title}
            </h2>
            {badge ? (
              <span
                className={cn(
                  "px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
                  badge === "Filled"
                    ? "border-border-accent bg-accent-muted/40 text-accent-light"
                    : "border-border-subtle bg-[rgba(255,255,255,0.018)] text-text-dim",
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {sub ? <p className="text-[12px] text-text-dim mt-0.5">{sub}</p> : null}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-text-dim shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-text-dim shrink-0" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-6">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

// ── Cost breakdown ───────────────────────────────────────────────────────

function CostBreakdown({
  lines,
  isLocked,
  totalPrice,
  breakdownSum,
  variance,
  onUpdate,
  onAddOther,
  onRemove,
}: {
  lines: LineState[];
  isLocked: boolean;
  totalPrice: number | null;
  breakdownSum: number;
  variance: number | null;
  onUpdate: (id: string, patch: Partial<LineState>) => void;
  onAddOther: () => void;
  onRemove: (id: string) => void;
}) {
  const [hideEmpty, setHideEmpty] = useState(false);

  const linesByTrade = useMemo(() => {
    const m = new Map<TradeId, LineState[]>();
    for (const l of lines) {
      const arr = m.get(l.trade) ?? [];
      arr.push(l);
      m.set(l.trade, arr);
    }
    return m;
  }, [lines]);

  const filledCount = lines.filter((l) => (l.amount ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11.5px] text-text-dim">
          {filledCount > 0
            ? `${filledCount} of ${TRADES.length - 1} trades filled`
            : "Itemise by trade — leave blank to skip"}
        </div>
        <button
          type="button"
          onClick={() => setHideEmpty((v) => !v)}
          className="text-[11px] text-text-dim hover:text-accent-light transition-colors inline-flex items-center gap-1.5"
        >
          {hideEmpty ? "Show all rows" : "Hide empty rows"}
        </button>
      </div>

      {/* Trade rows in canonical order (excl. Other) */}
      <div className="rounded-md border border-border-subtle overflow-hidden">
        {TRADES.filter((t) => t.id !== "other").map((trade) => {
          const existing = linesByTrade.get(trade.id)?.[0];
          const filled = (existing?.amount ?? 0) > 0;
          if (hideEmpty && !filled) return null;
          return (
            <TradeRow
              key={trade.id}
              tradeLabel={trade.label}
              hint={trade.hint}
              line={existing}
              onUpdate={(patch) => {
                if (existing) {
                  onUpdate(existing.id, patch);
                } else {
                  // Create a new row by passing through onUpdate with a
                  // freshly-minted client id. Simpler: parent's setter
                  // expects a known id — bubble up via add helper below.
                  // We simulate by triggering update via a fresh row.
                  const id = crypto.randomUUID();
                  onUpdate(id, {
                    id,
                    trade: trade.id,
                    label: "",
                    amount: patch.amount ?? null,
                    ...patch,
                  });
                }
              }}
              isLocked={isLocked}
            />
          );
        })}
      </div>

      {/* Other lines */}
      <div className="rounded-md border border-border-subtle overflow-hidden">
        <div className="px-4 py-2 bg-[rgba(255,255,255,0.018)] border-b border-border-subtle text-[10px] tracking-[0.16em] uppercase text-text-dim flex items-center justify-between">
          <span>Custom lines</span>
          <button
            type="button"
            onClick={onAddOther}
            disabled={isLocked}
            className="text-[10.5px] text-accent-light hover:text-accent transition-colors inline-flex items-center gap-1 normal-case tracking-normal"
          >
            <Plus className="size-3" />
            Add line
          </button>
        </div>
        {lines
          .filter((l) => l.trade === "other")
          .map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[1fr_180px_28px] gap-3 items-center px-4 py-2.5 border-b border-border-subtle/60 last:border-b-0"
            >
              <input
                type="text"
                value={l.label}
                disabled={isLocked}
                placeholder="e.g. Builder's margin"
                onChange={(e) => onUpdate(l.id, { label: e.target.value })}
                className={cn(inputCls, "h-9 text-[12.5px]")}
              />
              <PriceInput
                value={l.amount}
                disabled={isLocked}
                onChange={(amount) => onUpdate(l.id, { amount })}
                size="sm"
              />
              <button
                type="button"
                onClick={() => onRemove(l.id)}
                disabled={isLocked}
                className="size-7 rounded-sm flex items-center justify-center text-text-dim hover:text-danger transition-colors"
                title="Remove"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        {lines.filter((l) => l.trade === "other").length === 0 ? (
          <div className="px-4 py-3 text-[11.5px] text-text-dim/80">
            No custom lines yet. Add one for things like builder&apos;s margin
            or contingency.
          </div>
        ) : null}
      </div>

      {/* Totals + variance */}
      <div
        className={cn(
          "rounded-md border p-4 transition-colors",
          variance == null
            ? "border-border-subtle bg-[rgba(255,255,255,0.012)]"
            : variance === 0
            ? "border-border-accent/50 bg-[rgba(0,212,200,0.04)]"
            : "border-warning/30 bg-warning/[0.05]",
        )}
      >
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Breakdown sum" value={breakdownSum} />
          <Stat label="Tender total" value={totalPrice ?? 0} />
          <Stat
            label="Variance"
            value={variance ?? 0}
            tone={
              variance == null
                ? "neutral"
                : variance === 0
                ? "good"
                : "warn"
            }
          />
        </div>
        {variance != null && variance !== 0 ? (
          <div className="mt-3 text-[12px] text-warning flex items-start gap-2">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            <span>
              Off by {formatAud(Math.abs(variance))}.{" "}
              <span className="text-text-dim">
                On submit, this will auto-balance into &quot;Other&quot; (added
                or adjusted as &quot;Builder&apos;s margin&quot; if needed) so
                the breakdown matches your tender total.
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TradeRow({
  tradeLabel,
  hint,
  line,
  onUpdate,
  isLocked,
}: {
  tradeLabel: string;
  hint?: string;
  line: LineState | undefined;
  onUpdate: (patch: Partial<LineState>) => void;
  isLocked: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_180px] gap-3 items-center px-4 py-2.5 border-b border-border-subtle/60 last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.012)]">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-text">{tradeLabel}</div>
        {hint ? (
          <div className="text-[10.5px] text-text-dim truncate">{hint}</div>
        ) : null}
      </div>
      <PriceInput
        value={line?.amount ?? null}
        disabled={isLocked}
        onChange={(amount) => onUpdate({ amount })}
        size="sm"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "text-accent-light"
      : tone === "warn"
      ? "text-warning"
      : "text-text";
  return (
    <div>
      <div className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div className={cn("font-display tabular-nums leading-none text-[22px]", cls)}>
        {formatAud(value)}
      </div>
    </div>
  );
}

// ── Right-rail cards ─────────────────────────────────────────────────────

function LiveSummaryCard({
  totalPrice,
  duration,
  validity,
  startMonth,
  breakdownSum,
  variance,
  docCount,
  ready,
}: {
  totalPrice: number | null;
  duration: number | null;
  validity: number | null;
  startMonth: string;
  breakdownSum: number;
  variance: number | null;
  docCount: number;
  ready: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border p-5",
        ready
          ? "border-border-accent/45 bg-[linear-gradient(160deg,rgba(0,212,200,0.06),rgba(6,18,30,0.78))]"
          : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
      )}
    >
      {/* corner glow when ready */}
      {ready ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.30), transparent 70%)",
          }}
        />
      ) : null}

      <div className="relative">
        <div className="text-[10px] tracking-[0.2em] uppercase text-accent flex items-center gap-2">
          <Sparkles className="size-3" />
          Live summary
        </div>

        <div className="mt-4">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
            Tender total
          </div>
          <div
            className={cn(
              "font-display tabular-nums leading-none",
              totalPrice ? "text-accent-light" : "text-text-dim/60",
            )}
            style={{ fontSize: 30 }}
          >
            {totalPrice ? formatAud(totalPrice) : "—"}
          </div>
          <div className="mt-1.5 text-[10.5px] text-text-dim">
            {duration ? `${duration} weeks` : "Duration —"} ·{" "}
            {validity ? `${validity}d valid` : "Validity —"}
            {startMonth ? ` · starts ${formatMonthShort(startMonth)}` : ""}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border-subtle/60 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9.5px] tracking-[0.16em] uppercase text-text-dim mb-1">
              Breakdown
            </div>
            <div className="font-mono tabular-nums text-[13px] text-text">
              {breakdownSum > 0 ? formatAud(breakdownSum) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] tracking-[0.16em] uppercase text-text-dim mb-1">
              Variance
            </div>
            <div
              className={cn(
                "font-mono tabular-nums text-[13px]",
                variance == null
                  ? "text-text-dim/60"
                  : variance === 0
                  ? "text-accent-light"
                  : "text-warning",
              )}
            >
              {variance == null
                ? "—"
                : variance === 0
                ? "Balanced"
                : `${variance > 0 ? "+" : ""}${formatAud(variance)}`}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border-subtle/60">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-text-dim">Documents attached</span>
            <span
              className={cn(
                "font-mono tabular-nums",
                docCount > 0 ? "text-text" : "text-text-dim/60",
              )}
            >
              {docCount}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 px-3 py-2 rounded-sm border text-[11.5px] flex items-center gap-2",
            ready
              ? "border-border-accent/40 bg-[rgba(0,212,200,0.04)] text-accent-light"
              : "border-warning/30 bg-warning/[0.04] text-warning",
          )}
        >
          {ready ? (
            <>
              <Check className="size-3.5" />
              Ready to submit
            </>
          ) : (
            <>
              <AlertTriangle className="size-3.5" />
              {!totalPrice && !duration && !validity
                ? "Fill the required fields above"
                : `Still missing: ${[
                    !totalPrice && "price",
                    !duration && "duration",
                    !validity && "validity",
                  ]
                    .filter(Boolean)
                    .join(", ")}`}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DocsRailCard({
  docs,
  activeUploads,
  dragOver,
  isLocked,
  hasDraft,
  onDragOverSet,
  onDropFiles,
  onDownload,
  onDelete,
}: {
  docs: Document[];
  activeUploads: LocalUpload[];
  dragOver: boolean;
  isLocked: boolean;
  hasDraft: boolean;
  onDragOverSet: (v: boolean) => void;
  onDropFiles: (files: FileList | File[]) => void | Promise<void>;
  onDownload: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]">
      <div className="px-4 py-3 border-b border-border-subtle/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-7 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center">
            <Upload className="size-3.5" />
          </span>
          <div>
            <div className="text-[12.5px] font-semibold text-text">
              Tender documents
            </div>
            <div className="text-[10.5px] text-text-dim">
              {docs.length === 0
                ? "Optional, but powerful — owners read these"
                : `${docs.length} attached`}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* AI-extract teaser */}
        <div className="rounded-sm border border-border-accent/30 bg-[rgba(0,212,200,0.04)] px-3 py-2 flex items-start gap-2">
          <Sparkles className="size-3.5 text-accent-light shrink-0 mt-0.5" />
          <div className="text-[11px] leading-[1.5]">
            <div className="text-accent-light font-semibold">
              AI auto-fill — coming soon
            </div>
            <div className="text-text-dim">
              Drop a tender PDF and we&apos;ll populate the form for your review.
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            onDragOverSet(true);
          }}
          onDragLeave={() => onDragOverSet(false)}
          onDrop={(e) => {
            e.preventDefault();
            onDragOverSet(false);
            onDropFiles(e.dataTransfer.files);
          }}
          className={cn(
            "block cursor-pointer rounded-md border-2 border-dashed p-5 text-center transition-colors",
            dragOver
              ? "border-border-accent bg-[rgba(0,212,200,0.06)]"
              : "border-border-subtle hover:border-border bg-[rgba(255,255,255,0.012)]",
            (isLocked || !hasDraft) && "opacity-50 pointer-events-none",
          )}
        >
          <input
            type="file"
            multiple
            disabled={isLocked || !hasDraft}
            className="sr-only"
            onChange={(e) => e.target.files && onDropFiles(e.target.files)}
          />
          <Upload className="mx-auto size-5 text-accent-light mb-2" />
          <div className="text-[12.5px] text-text">
            Drop files, or{" "}
            <span className="text-accent-light underline underline-offset-4">
              browse
            </span>
          </div>
          <div className="mt-1 text-[10px] text-text-dim">
            BoQ PDF · insurance · past projects · max 100 MB
          </div>
        </label>

        {/* In-flight */}
        {activeUploads.length > 0 ? (
          <div className="space-y-2">
            {activeUploads.map((u) => (
              <div
                key={u.id}
                className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)] px-3 py-2 text-[11px]"
              >
                <div className="flex justify-between text-text-muted mb-1">
                  <span className="truncate mr-2">{u.filename}</span>
                  <span
                    className={cn(
                      "shrink-0 tracking-[0.1em] uppercase",
                      u.status === "error" ? "text-danger" : "text-accent-light",
                    )}
                  >
                    {u.status === "uploading" && `${u.progress}%`}
                    {u.status === "confirming" && "…"}
                    {u.status === "done" && "✓"}
                    {u.status === "error" && (u.error ?? "Err")}
                  </span>
                </div>
                <div className="h-[2px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-300",
                      u.status === "error" ? "bg-danger" : "bg-accent",
                    )}
                    style={{
                      width: `${
                        u.status === "done"
                          ? 100
                          : u.status === "confirming"
                          ? 95
                          : u.progress
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Saved docs */}
        {docs.length > 0 ? (
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)]"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-text truncate">
                    {d.filename}
                  </div>
                  <div className="text-[9.5px] text-text-dim">
                    {prettyBytes(d.sizeBytes)} ·{" "}
                    <span
                      className={cn(
                        d.status === "active"
                          ? "text-accent-light"
                          : d.status === "pending"
                          ? "text-warning"
                          : "text-danger",
                      )}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <DocActionButton
                    disabled={d.status !== "active"}
                    label="Download"
                    icon={<Download className="size-3.5" />}
                    onAction={() => onDownload(d.id)}
                  />
                  {!isLocked ? (
                    <DocActionButton
                      label="Delete"
                      danger
                      icon={<Trash2 className="size-3.5" />}
                      onAction={() => onDelete(d.id)}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

// ── Form atoms ───────────────────────────────────────────────────────────

const inputCls =
  "w-full h-11 px-3.5 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[13.5px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-border-accent focus:bg-[rgba(0,212,200,0.025)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10.5px] tracking-[0.18em] uppercase text-text-dim">
          {label}
          {required ? <span className="text-accent ml-1">*</span> : null}
        </span>
        {hint ? (
          <span className="text-[10px] text-text-dim/80 normal-case tracking-normal">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function PriceInput({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [text, setText] = useState(value != null ? String(value) : "");
  // Keep input synced when parent value changes externally (e.g. submit).
  useEffect(() => {
    setText(value != null ? String(value) : "");
  }, [value]);

  return (
    <div
      className={cn(
        "relative flex items-center rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] focus-within:border-border-accent focus-within:bg-[rgba(0,212,200,0.025)]",
        disabled && "opacity-60 cursor-not-allowed",
        size === "sm" ? "h-9" : "h-11",
      )}
    >
      <span
        className={cn(
          "px-3 text-text-dim font-mono",
          size === "sm" ? "text-[12px]" : "text-[14px]",
        )}
      >
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        disabled={disabled}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d]/g, "");
          setText(cleaned);
          onChange(cleaned === "" ? null : Number(cleaned));
        }}
        placeholder="0"
        className={cn(
          "flex-1 bg-transparent border-0 outline-none text-text tabular-nums",
          // The global :focus-visible rule applies a 3px outer shadow
          // ring that bleeds beyond the wrapper border on inset inputs.
          // Suppress it here — the wrapper handles focus styling.
          "focus-visible:shadow-none",
          size === "sm" ? "text-[13px]" : "text-[14.5px] font-display",
          "pr-3",
        )}
      />
      {size === "md" && text.length > 0 ? (
        <span className="px-3 text-[10.5px] tracking-[0.18em] uppercase text-text-dim shrink-0">
          AUD
        </span>
      ) : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  min,
  max,
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] h-11 focus-within:border-border-accent focus-within:bg-[rgba(0,212,200,0.025)]",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        disabled={disabled}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          onChange(Number.isFinite(v) ? v : null);
        }}
        placeholder="0"
        className="flex-1 px-3.5 bg-transparent border-0 outline-none focus-visible:shadow-none text-text font-display text-[14.5px] tabular-nums"
      />
      {suffix ? (
        <span className="px-3 text-[10.5px] tracking-[0.18em] uppercase text-text-dim shrink-0">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function SelectInput({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string | number;
  options: Array<{ id: string; label: string }>;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={String(value)}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TagInput({
  values,
  onChange,
  disabled,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] focus-within:border-border-accent",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-sm border border-border-accent bg-accent-muted/40 text-[11.5px] text-accent-light"
        >
          {v}
          {!disabled ? (
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-text transition-colors"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
            e.preventDefault();
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[160px] h-7 bg-transparent border-0 outline-none text-[12.5px] text-text"
      />
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: TenderWithLines["status"];
}) {
  const cls =
    status === "draft"
      ? "border-border-subtle text-text-dim"
      : status === "submitted" || status === "shortlisted"
      ? "border-border-accent text-accent-light"
      : status === "awarded"
      ? "border-border-accent text-accent"
      : "border-border-subtle text-text-dim";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
        cls,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SaveIndicator({
  state,
  error,
}: {
  state: SaveState;
  error: string | null;
}) {
  return (
    <div className="text-[11px] tracking-[0.04em] flex items-center gap-2 shrink-0">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin text-text-dim" />
          <span className="text-text-dim">Saving…</span>
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3 text-accent-light" />
          <span className="text-text-dim">Saved</span>
        </>
      ) : state === "error" ? (
        <>
          <AlertTriangle className="size-3 text-danger" />
          <span className="text-danger" title={error ?? ""}>
            Save failed
          </span>
        </>
      ) : (
        <span className="text-text-dim/60">Autosaved</span>
      )}
    </div>
  );
}

function TocLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 rounded-sm text-[12.5px] text-text-muted hover:text-text hover:bg-[rgba(255,255,255,0.022)] transition-colors"
    >
      {label}
    </a>
  );
}

function DocActionButton({
  icon,
  label,
  onAction,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onAction: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      title={label}
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onAction();
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "size-7 rounded-sm border border-border-subtle text-text-muted transition-colors flex items-center justify-center",
        danger
          ? "hover:text-danger hover:border-danger/50"
          : "hover:text-accent-light hover:border-border-accent",
        (disabled || busy) && "opacity-40 cursor-not-allowed",
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : icon}
    </button>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function formatAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMonthShort(s: string): string {
  if (!s) return "";
  const [y, m] = s.split("-");
  if (!y || !m) return s;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function initialiseLines(rows: TenderWithLines["costLines"]): LineState[] {
  return rows.map((r) => ({
    id: r.id,
    trade: r.trade,
    amount: r.amountAud,
    label: r.label ?? "",
  }));
}

// ── upload pipeline (reuses R2 flow) ─────────────────────────────────────

type LocalUpload = {
  id: string;
  filename: string;
  status: "uploading" | "confirming" | "done" | "error";
  progress: number;
  error?: string;
};

async function uploadOne(args: {
  file: File;
  projectId: string;
  tenderId: string;
  setActive: React.Dispatch<React.SetStateAction<LocalUpload[]>>;
  onDone: () => void | Promise<void>;
}) {
  const localId = crypto.randomUUID();
  const { file, projectId, tenderId, setActive, onDone } = args;
  setActive((s) => [
    ...s,
    { id: localId, filename: file.name, status: "uploading", progress: 0 },
  ]);
  const patch = (p: Partial<LocalUpload>) =>
    setActive((s) => s.map((u) => (u.id === localId ? { ...u, ...p } : u)));

  try {
    const init = await initUploadAction({
      projectId,
      tenderId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category: "other",
    });
    if (!init.ok) {
      patch({ status: "error", error: init.error.message });
      return;
    }
    await putWithProgress({
      url: init.value.uploadUrl,
      headers: init.value.uploadHeaders,
      body: file,
      onProgress: (pct) => patch({ progress: Math.round(pct * 100) }),
    });
    patch({ status: "confirming" });
    const done = await completeUploadAction(init.value.documentId);
    if (!done.ok) {
      patch({ status: "error", error: done.error.message });
      return;
    }
    patch({ status: "done", progress: 100 });
    await onDone();
    setTimeout(() => {
      setActive((s) => s.filter((u) => u.id !== localId));
    }, 800);
  } catch (err) {
    patch({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function putWithProgress(args: {
  url: string;
  headers: Record<string, string>;
  body: Blob;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", args.url);
    for (const [k, v] of Object.entries(args.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && args.onProgress) {
        args.onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 PUT failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(args.body);
  });
}

// ── Awarded banner + footer-status label ────────────────────────────────

function AwardedBanner({
  contact,
  projectTitle,
}: {
  contact: OwnerContact;
  projectTitle: string;
}) {
  const displayName = contact.companyName ?? contact.name ?? "Project owner";
  return (
    <div className="border-b border-accent/30">
      <div
        className="px-6 lg:px-10 py-6 mx-auto max-w-[1500px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,212,200,0.10), rgba(0,212,200,0.02))",
        }}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="size-10 rounded-md bg-accent text-accent-contrast flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(0,212,200,0.45)]">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-[0.22em] uppercase text-accent font-semibold">
              You won this tender
            </div>
            <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
              Congratulations on {projectTitle}
            </h2>
            <p className="mt-1 text-[12.5px] text-text-muted leading-[1.55]">
              The owner has shared their contact below. Reach out to confirm
              scope, timing, and contract.
            </p>
          </div>
        </div>

        {/* Contact card */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <ContactTile label="Name" value={displayName} />
          <ContactTile
            label="Email"
            value={contact.email}
            href={`mailto:${contact.email}`}
          />
          {contact.phone ? (
            <ContactTile
              label="Phone"
              value={contact.phone}
              href={`tel:${contact.phone.replace(/\s+/g, "")}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContactTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] px-4 py-3 hover:bg-[rgba(0,212,200,0.06)] transition-colors duration-[140ms]">
      <div className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div className="text-[13.5px] text-text font-medium tabular-nums truncate">
        {value}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

function FooterStatusLabel({
  status,
}: {
  status: TenderWithLines["status"];
}) {
  // Single source of truth for footer micro-copy across non-draft states.
  // Awarded gets the celebratory tone; rejected the neutral closing-out
  // tone; everything else stays factual.
  switch (status) {
    case "submitted":
      return (
        <div className="text-[13px] text-accent-light flex items-center gap-2">
          <Check className="size-4" />
          Submitted — locked. Owner is reviewing.
        </div>
      );
    case "shortlisted":
      return (
        <div className="text-[13px] text-accent-light flex items-center gap-2">
          <Check className="size-4" />
          Shortlisted — you&apos;re a contender.
        </div>
      );
    case "awarded":
      return (
        <div className="text-[13px] text-accent flex items-center gap-2 font-medium">
          <Sparkles className="size-4" />
          Awarded — owner contact is at the top of this page.
        </div>
      );
    case "rejected":
      return (
        <div className="text-[13px] text-text-dim flex items-center gap-2">
          <X className="size-4" />
          Decision made — owner went with another builder.
        </div>
      );
    case "withdrawn":
      return (
        <div className="text-[13px] text-text-dim flex items-center gap-2">
          <X className="size-4" />
          Withdrawn.
        </div>
      );
    default:
      return null;
  }
}
