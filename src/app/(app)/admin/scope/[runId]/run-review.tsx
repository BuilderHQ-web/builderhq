"use client";

/**
 * RunReview — the working half of the review desk.
 *
 * While the run is processing, this drives the tick loop (bounded
 * server actions, repeated until the run reaches review) with live
 * status. Once in review: the register, the selection grouped by
 * Scope Standard division, gaps, conflicts, an add-item picker, and
 * the approve gate. Every verdict calls its action; the service
 * captures each one as training data.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Info,
  Loader2,
  Pencil,
  Play,
  Plus,
  X,
} from "lucide-react";

import {
  addScopeItemAction,
  approveScopeRunAction,
  bulkConfirmScopeAction,
  dismissCaptureAction,
  promoteCaptureAction,
  reviewScopeConflictAction,
  reviewScopeItemAction,
  tickScopeRunAction,
} from "@/app/(app)/_actions/scope";
import { toast } from "@/components/ui/toast";
import { SCOPE_CONFIDENCE_FLOOR } from "@/modules/scope-engine/floor";
import { cn } from "@/lib/utils";
import {
  SCOPE_DIVISIONS,
  getScopeItem,
  SCOPE_ITEMS,
  registerImportance,
  resolveRegisterNames,
} from "@/modules/scope";

interface RegisterRow {
  id: string;
  documentId: string;
  filename: string;
  status: string;
  kind: string | null;
  revision: string | null;
  docTitle: string | null;
  pageCount: number | null;
  error: string | null;
}
interface ItemRow {
  id: string;
  itemId: string;
  status: string;
  citations: Array<{ documentId: string; page: number; revision: string | null }>;
  note: string | null;
  label: string | null;
  depth: "full" | "partial" | null;
  remaining: string | null;
  confidence: number | null;
  opsStatus: string;
  opsNote: string | null;
}
interface ConflictRow {
  id: string;
  summary: string;
  severity: string;
  source: string;
  opsStatus: string;
  citations: Array<{ documentId: string; page: number; revision: string | null }>;
}
interface CaptureRow {
  id: string;
  label: string;
  divisionId: string | null;
  note: string | null;
  confidence: number | null;
  opsStatus: string;
  promotedItemId: string | null;
  citations: Array<{ documentId: string; page: number; revision: string | null }>;
}
interface NamedMissingRow {
  ref: string;
  citations: Array<{ documentId: string; page: number }>;
}
interface ReadinessProp {
  verdict: "fixed_price" | "budget_only";
  factors: string[];
}

const PROCESSING = ["pending", "classifying", "extracting", "synthesising"];

export function RunReview({
  runId,
  initialStatus,
  register,
  items,
  conflicts,
  captures,
  namedMissing,
  readiness,
}: {
  runId: string;
  initialStatus: string;
  register: RegisterRow[];
  items: ItemRow[];
  conflicts: ConflictRow[];
  captures: CaptureRow[];
  namedMissing: NamedMissingRow[];
  readiness: ReadinessProp;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  // One naming convention, everywhere: registers and citations speak
  // standard names ("Structural Engineering"), never raw filenames.
  const docName = useMemo(() => resolveRegisterNames(register), [register]);
  const orderedRegister = useMemo(
    () =>
      [...register].sort(
        (a, b) => registerImportance(a.kind) - registerImportance(b.kind),
      ),
    [register],
  );

  const runToCompletion = useCallback(async () => {
    setRunning(true);
    stopRef.current = false;
    try {
      for (let i = 0; i < 120; i++) {
        if (stopRef.current) break;
        const r = await tickScopeRunAction(runId);
        if (!r.ok) {
          toast.error("Run error", r.error.message);
          break;
        }
        setStatus(r.value.status);
        if (!r.value.moreWork) break;
      }
      router.refresh();
    } finally {
      setRunning(false);
    }
  }, [runId, router]);

  if (PROCESSING.includes(status)) {
    return (
      <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-6 py-10 text-center">
        <p className="text-[13px] text-text-muted">
          Run status:{" "}
          <span className="font-ui font-semibold text-text">{status}</span>
        </p>
        <p className="mt-1 text-[12px] text-text-dim max-w-[52ch] mx-auto">
          Processing happens in bounded slices. Keep this page open and run to
          completion; every slice is saved, so an interruption resumes where
          it stopped.
        </p>
        <button
          type="button"
          disabled={running}
          onClick={runToCompletion}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Working ({status})
            </>
          ) : (
            <>
              <Play className="size-4" />
              Run to completion
            </>
          )}
        </button>
        <RegisterTable register={orderedRegister} docName={docName} />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ReadinessBanner readiness={readiness} />
      <RegisterTable register={orderedRegister} docName={docName} />
      <NamedMissing refs={namedMissing} docName={docName} />
      <Captures captures={captures} docName={docName} status={status} />
      <Selection runId={runId} items={items} docName={docName} status={status} />
      <Conflicts conflicts={conflicts} docName={docName} status={status} />
      {status === "review" ? <ApproveBar runId={runId} items={items} /> : null}
    </div>
  );
}

/* ── the readiness verdict ──────────────────────────────────────────── */

function ReadinessBanner({ readiness }: { readiness: ReadinessProp }) {
  const budget = readiness.verdict === "budget_only";
  return (
    <section
      className={cn(
        "rounded-lg border px-4.5 py-4 card-elev",
        budget
          ? "border-amber-600/30 bg-amber-500/5"
          : "border-emerald-600/25 bg-emerald-500/5",
      )}
    >
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        Tender readiness
      </p>
      <p className="mt-1 text-[13.5px] font-ui font-semibold text-text">
        {budget
          ? "Budget pricing only until the factors below are closed."
          : readiness.factors.length > 0
            ? "Ready for fixed-price tender, with notes below."
            : "Ready for fixed-price tender."}
      </p>
      {readiness.factors.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {readiness.factors.map((f) => (
            <li key={f} className="text-[12px] leading-[1.6] text-text-muted">
              · {f}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ── the pack's own missing-document register ───────────────────────── */

function NamedMissing({
  refs,
  docName,
}: {
  refs: NamedMissingRow[];
  docName: Map<string, string>;
}) {
  if (refs.length === 0) return null;
  // Named documents and report numbers first; vaguer references after.
  const sorted = [...refs].sort(
    (a, b) => Number(/\d/.test(b.ref)) - Number(/\d/.test(a.ref)),
  );
  const VISIBLE = 10;
  const head = sorted.slice(0, VISIBLE);
  const rest = sorted.slice(VISIBLE);
  const line = (r: NamedMissingRow) => (
    <li key={r.ref} className="text-[12px] leading-[1.55] text-text-muted">
      <span className="text-text">&ldquo;{r.ref}&rdquo;</span>
      <span className="text-text-dim">
        {" "}
        · named on{" "}
        {r.citations
          .map((c) => `${docName.get(c.documentId) ?? "a document"} p.${c.page}`)
          .join(", ")}
      </span>
    </li>
  );
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-4.5 py-4">
      <h2 className="text-[13px] font-ui font-semibold text-text">
        Documents referenced but not included · {refs.length}
      </h2>
      <p className="mt-0.5 text-[11.5px] text-text-dim">
        The documents mention these, but they are not in the pack. They may
        exist with the client or a consultant, and are worth asking for.
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">{head.map(line)}</ul>
      {rest.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11.5px] text-text-dim hover:text-text transition-colors">
            {rest.length} more
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">{rest.map(line)}</ul>
        </details>
      ) : null}
    </section>
  );
}

/* ── off-standard captures ──────────────────────────────────────────── */

function Captures({
  captures,
  docName,
  status,
}: {
  captures: CaptureRow[];
  docName: Map<string, string>;
  status: string;
}) {
  const router = useRouter();
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (captures.length === 0) return null;
  const readOnly = status !== "review";

  const decide = async (
    id: string,
    verdict: "extension" | "core" | "dismiss",
  ) => {
    setBusy(id);
    try {
      const r =
        verdict === "dismiss"
          ? await dismissCaptureAction(id)
          : await promoteCaptureAction(id, verdict);
      if (!r.ok) {
        toast.error("Could not decide the capture", r.error.message);
        return;
      }
      setDecided((d) => ({ ...d, [id]: verdict === "dismiss" ? "dismissed" : "promoted" }));
      if (verdict === "core") {
        toast.success("Added to the schedule and the core list.");
      } else if (verdict === "extension") {
        toast.success("Added to the schedule and the platform's list.");
      }
      if (verdict !== "dismiss") router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-lg border border-accent/25 bg-surface-1 card-elev px-4.5 py-4">
      <h2 className="text-[13px] font-ui font-semibold text-text">
        Work outside the Standard
      </h2>
      <p className="mt-0.5 text-[11.5px] text-text-dim">
        The documents show this work, and no Scope Standard item names it
        yet. Add to schedule puts the line on this project and saves it to
        the platform&rsquo;s list, so the next project that shows the same
        work is matched automatically. Add to core list does that AND makes
        it expected on every project of this type. Dismiss it if it is not
        real work.
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {captures.map((c) => {
          const state = decided[c.id] ?? c.opsStatus;
          return (
            <li
              key={c.id}
              className="rounded-md border border-border-subtle px-3.5 py-3 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-ui font-semibold text-text">
                    {c.label}
                    {c.divisionId ? (
                      <span className="ml-2 text-[10.5px] font-normal text-text-dim">
                        {SCOPE_DIVISIONS.find((d) => d.id === c.divisionId)?.label ??
                          c.divisionId}
                      </span>
                    ) : null}
                  </p>
                  {c.note ? (
                    <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted">
                      {c.note}
                    </p>
                  ) : null}
                  {c.citations.length > 0 ? (
                    <p className="mt-0.5 text-[11px] text-text-dim">
                      {c.citations
                        .map(
                          (x) =>
                            `${docName.get(x.documentId) ?? "document"} p.${x.page}`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                {state === "pending" && !readOnly ? (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 shrink">
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={() => decide(c.id, "extension")}
                      title="Adds this line to the schedule, and saves it to the platform's list so the next project that shows it is matched automatically"
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-accent text-accent-contrast text-[11.5px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                      <Plus className="size-3.5" />
                      Add to schedule
                    </button>
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={() => decide(c.id, "core")}
                      title="Adds it to the schedule and to the core list: every future project of this type will be checked for this work"
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-accent/50 text-[11.5px] font-semibold text-[#0a7d73] hover:bg-[rgba(0,212,200,0.08)] transition-colors disabled:opacity-60"
                    >
                      <Plus className="size-3.5" />
                      Add to core list
                    </button>
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={() => decide(c.id, "dismiss")}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-border text-[11.5px] text-text-muted hover:text-text transition-colors disabled:opacity-60"
                    >
                      <X className="size-3.5" />
                      Dismiss
                    </button>
                  </div>
                ) : state !== "pending" ? (
                  <span
                    className={cn(
                      "shrink-0 text-[10.5px] font-ui font-semibold uppercase tracking-[0.08em]",
                      state === "promoted" ? "text-accent-light" : "text-text-dim",
                    )}
                  >
                    {state === "promoted" ? "On the schedule" : "Dismissed"}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── the register ───────────────────────────────────────────────────── */

/** A document whose revision or title marks it as anything other than
 *  a construction issue. */
function isPrelimDoc(d: RegisterRow): boolean {
  const PRELIM =
    /\b(preliminary|prelim|design development|not for construction|for information only)\b/i;
  return Boolean(
    (d.revision && (/^p\d+$/i.test(d.revision.trim()) || PRELIM.test(d.revision))) ||
      (d.docTitle && PRELIM.test(d.docTitle)),
  );
}

function RegisterTable({
  register,
  docName,
}: {
  register: RegisterRow[];
  docName: Map<string, string>;
}) {
  return (
    <section>
      <h2 className="text-[10px] tracking-[0.22em] uppercase text-text-muted font-ui font-semibold pb-2.5 border-b border-border-subtle">
        The register · {register.length} document{register.length === 1 ? "" : "s"}
      </h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {register.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-md border border-border-subtle bg-surface-1 text-[12.5px]"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="text-text font-ui font-medium">
                {docName.get(d.documentId) ?? d.docTitle ?? d.filename}
              </span>
              <span className="text-text-dim">
                {" · "}
                {d.filename}
                {d.pageCount ? ` · ${d.pageCount} page${d.pageCount === 1 ? "" : "s"}` : ""}
              </span>
            </span>
            {d.kind ? (
              <span className="shrink-0 px-2 py-0.5 rounded-sm border border-border-subtle text-[10px] uppercase tracking-[0.1em] text-text-muted">
                {d.kind}
              </span>
            ) : null}
            {d.revision ? (
              <span
                className={cn(
                  "shrink-0 px-2 py-0.5 rounded-sm border text-[10px] uppercase tracking-[0.1em]",
                  isPrelimDoc(d)
                    ? "border-[rgba(201,148,34,0.4)] bg-[rgba(201,148,34,0.08)] text-[#8a6414]"
                    : "border-border-accent/40 bg-[rgba(0,212,200,0.06)] text-[#0a7d73]",
                )}
                title={
                  isPrelimDoc(d)
                    ? "Marked preliminary: not a construction issue"
                    : undefined
                }
              >
                Rev {d.revision}
              </span>
            ) : null}
            {isPrelimDoc(d) ? (
              <span className="shrink-0 px-2 py-0.5 rounded-sm bg-[rgba(201,148,34,0.14)] text-[#8a6414] text-[9.5px] uppercase tracking-[0.1em] font-ui font-semibold">
                Preliminary
              </span>
            ) : null}
            <span
              className={cn(
                "shrink-0 text-[10.5px] uppercase tracking-[0.08em] font-ui font-semibold",
                d.status === "extracted"
                  ? "text-[#0a7d73]"
                  : d.status === "failed"
                    ? "text-[#b2483f]"
                    : "text-text-dim",
              )}
              title={d.error ?? undefined}
            >
              {d.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── the selection ──────────────────────────────────────────────────── */

function citeLabel(
  c: { documentId: string; page: number; revision: string | null },
  docName: Map<string, string>,
): string {
  const name = docName.get(c.documentId) ?? "document";
  return `${name} p.${c.page}${c.revision ? ` rev ${c.revision}` : ""}`;
}

function Selection({
  runId,
  items,
  docName,
  status,
}: {
  runId: string;
  items: ItemRow[];
  docName: Map<string, string>;
  status: string;
}) {
  const [rows, setRows] = useState(items);
  const readOnly = status !== "review";

  const byDivision = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const r of rows) {
      const item = getScopeItem(r.itemId);
      // Learned and custom lines are "<tier>.<divisionId>.<slug>" —
      // they file under their real division beside the Standard's.
      const div =
        item?.division ??
        (r.itemId.startsWith("custom.") || r.itemId.startsWith("ext.")
          ? r.itemId.split(".")[1] ?? "unknown"
          : "unknown");
      const arr = m.get(div) ?? [];
      arr.push(r);
      m.set(div, arr);
    }
    return m;
  }, [rows]);

  const evidenced = rows.filter((r) => r.status === "evidenced").length;
  const gaps = rows.filter((r) => r.status === "gap").length;
  const pending = rows.filter((r) => r.opsStatus === "pending").length;
  // What the sweep will actually confirm: everything pending except
  // sub-floor evidenced lines, which always wait for a person.
  const sweepable = rows.filter(
    (r) =>
      r.opsStatus === "pending" &&
      !(
        r.status === "evidenced" &&
        (r.confidence ?? 0) < SCOPE_CONFIDENCE_FLOOR
      ),
  ).length;

  const apply = (updated: ItemRow) =>
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-2.5 border-b border-border-subtle">
        <h2 className="text-[10px] tracking-[0.22em] uppercase text-text-muted font-ui font-semibold">
          The selection · {evidenced} evidenced · {gaps} gaps
        </h2>
        {!readOnly ? (
          <span className="flex items-center gap-3">
            <span
              className={cn(
                "text-[11px] tabular-nums",
                pending > 0 ? "text-[#8a6414]" : "text-[#0a7d73]",
              )}
            >
              {pending > 0 ? `${pending} awaiting verdict` : "All reviewed"}
            </span>
            {pending > 0 ? (
              <ConfirmAll
                runId={runId}
                pending={sweepable}
                onDone={() =>
                  // Confirm all confirms everything — gaps and
                  // not-expected included. Only sub-floor evidenced
                  // lines wait for an individual verdict.
                  setRows((prev) =>
                    prev.map((r) =>
                      r.opsStatus === "pending" &&
                      !(
                        r.status === "evidenced" &&
                        (r.confidence ?? 0) < SCOPE_CONFIDENCE_FLOOR
                      )
                        ? { ...r, opsStatus: "confirmed" }
                        : r,
                    ),
                  )
                }
              />
            ) : null}
          </span>
        ) : null}
      </div>

      {SCOPE_DIVISIONS.map((d) => {
        const divRows = byDivision.get(d.id);
        if (!divRows || divRows.length === 0) return null;
        return (
          <div key={d.id} className="mt-4">
            <p className="text-[11px] tracking-[0.08em] uppercase text-text-dim font-ui font-semibold">
              {d.order}. {d.label}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {divRows.map((r) => (
                <ItemLine
                  key={r.id}
                  row={r}
                  docName={docName}
                  readOnly={readOnly}
                  onChanged={apply}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {!readOnly ? <AddItem runId={runId} onAdded={(r) => setRows((p) => [...p, r])} /> : null}
    </section>
  );
}

/**
 * The sweep: confirm every line still awaiting a verdict. Sits beside
 * the pending count so the reviewer confirms the tail in one act after
 * working the lines that deserved individual attention.
 */
function ConfirmAll({
  runId,
  pending,
  onDone,
}: {
  runId: string;
  pending: number;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const sweep = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await bulkConfirmScopeAction(runId);
      if (!r.ok) {
        toast.error("Could not confirm", r.error.message);
        return;
      }
      toast.success(`${r.value.confirmed} lines confirmed.`);
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      disabled={busy}
      onClick={sweep}
      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-border-strong text-[11px] font-ui text-text hover:bg-bg-elev transition-colors disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Check className="size-3" />
      )}
      Confirm all {pending}
    </button>
  );
}

function ItemLine({
  row,
  docName,
  readOnly,
  onChanged,
}: {
  row: ItemRow;
  docName: Map<string, string>;
  readOnly: boolean;
  onChanged: (r: ItemRow) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const item = getScopeItem(row.itemId);

  const verdict = async (
    opsStatus: "confirmed" | "edited" | "removed",
    extra?: { status?: "evidenced" | "gap" | "not_expected"; note?: string | null },
  ) => {
    setBusy(true);
    try {
      const r = await reviewScopeItemAction(row.id, { opsStatus, ...extra });
      if (!r.ok) {
        toast.error("Verdict failed", r.error.message);
        return;
      }
      onChanged({
        ...row,
        opsStatus,
        status: (extra?.status ?? row.status) as string,
        note: extra?.note !== undefined ? extra.note : row.note,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      className={cn(
        "rounded-md border px-3.5 py-2.5 bg-surface-1",
        row.status === "gap"
          ? "border-[rgba(201,148,34,0.35)]"
          : row.status === "not_expected"
            ? "border-border-subtle/60 opacity-70"
            : "border-border-subtle",
        row.opsStatus === "removed" && "opacity-45 line-through",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 shrink-0 px-1.5 py-0.5 rounded-sm text-[9px] tracking-[0.12em] uppercase font-ui font-semibold",
            row.status === "evidenced"
              ? "bg-[rgba(0,212,200,0.1)] text-[#0a7d73]"
              : row.status === "gap"
                ? "bg-[rgba(201,148,34,0.12)] text-[#8a6414]"
                : "bg-[rgba(24,34,44,0.06)] text-text-muted",
          )}
        >
          {row.status === "not_expected" ? "not expected" : row.status}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-ui font-medium text-text">
            {item?.label ?? row.label ?? row.itemId}
            <span className="ml-2 font-mono text-[10px] text-text-faint">
              {row.itemId}
            </span>
            {row.status === "evidenced" &&
            (row.confidence ?? 0) < SCOPE_CONFIDENCE_FLOOR ? (
              <span
                className="shrink-0 rounded-full bg-[rgba(201,148,34,0.14)] text-[#8a6414] px-2 py-[2px] text-[9.5px] tracking-[0.08em] uppercase font-ui font-semibold"
                title="Below the confidence floor: the sweep skips this line; it needs an individual verdict"
              >
                Low confidence
              </span>
            ) : null}
            {row.depth === "partial" ? (
              <span
                className="ml-2 shrink-0 rounded-full bg-[rgba(201,148,34,0.14)] text-[#8a6414] px-2 py-[2px] text-[9.5px] tracking-[0.08em] uppercase font-ui font-semibold"
                title={row.remaining ?? "Shown in the documents, but not fully specified"}
              >
                In part
              </span>
            ) : null}
            {row.confidence != null ? (
              <span className="ml-2 text-[10.5px] tabular-nums text-text-dim">
                {(row.confidence * 100).toFixed(0)}%
              </span>
            ) : null}
          </p>
          {row.note ? (
            <p className="mt-0.5 text-[12px] leading-[1.5] text-text-muted">
              {row.note}
            </p>
          ) : null}
          {row.depth === "partial" && row.remaining ? (
            <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[#8a6414] flex items-start gap-1">
              <span
                className="inline-flex shrink-0 mt-[1px] cursor-help"
                title="This line can be priced from the documents, but our reading flagged details still to be confirmed. Check them before relying on the price."
              >
                <Info className="size-3" />
              </span>
              <span>Notes: {row.remaining}</span>
            </p>
          ) : null}
          {row.citations.length > 0 ? (
            <p className="mt-1 text-[10.5px] text-text-dim">
              {row.citations.map((c) => citeLabel(c, docName)).join(" · ")}
            </p>
          ) : null}
        </div>
        {!readOnly && row.opsStatus === "pending" ? (
          <span className="shrink-0 flex items-center gap-1">
            <IconAction
              title="Confirm"
              disabled={busy}
              onClick={() => verdict("confirmed")}
            >
              <Check className="size-3.5" />
            </IconAction>
            <IconAction
              title="Edit"
              disabled={busy}
              onClick={() => setEditing((e) => !e)}
            >
              <Pencil className="size-3.5" />
            </IconAction>
            <IconAction
              title="Remove: the run got this wrong"
              tone="danger"
              disabled={busy}
              onClick={() => verdict("removed")}
            >
              <X className="size-3.5" />
            </IconAction>
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 text-[10px] uppercase tracking-[0.1em] font-ui font-semibold",
              row.opsStatus === "confirmed" || row.opsStatus === "added"
                ? "text-[#0a7d73]"
                : row.opsStatus === "removed"
                  ? "text-[#b2483f]"
                  : row.opsStatus === "edited"
                    ? "text-[#8a6414]"
                    : "text-text-faint",
            )}
          >
            {row.opsStatus}
          </span>
        )}
      </div>
      {editing ? (
        <EditForm
          row={row}
          busy={busy}
          onSave={(status, note) => verdict("edited", { status, note })}
          onCancel={() => setEditing(false)}
        />
      ) : null}
    </li>
  );
}

function EditForm({
  row,
  busy,
  onSave,
  onCancel,
}: {
  row: ItemRow;
  busy: boolean;
  onSave: (
    status: "evidenced" | "gap" | "not_expected",
    note: string | null,
  ) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(row.status as "evidenced" | "gap" | "not_expected");
  const [note, setNote] = useState(row.note ?? "");
  return (
    <div className="mt-2.5 pl-8 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {(["evidenced", "gap", "not_expected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "px-2.5 py-1 rounded-full border text-[10.5px] uppercase tracking-[0.08em] font-ui font-semibold transition-colors",
              status === s
                ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
                : "border-border-subtle text-text-dim hover:text-text",
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Corrected note"
        className="w-full px-3 py-2 rounded-md border border-border-subtle bg-surface-1 text-[12.5px] text-text outline-none focus:border-border-accent"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(status, note.trim() || null)}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-accent text-accent-contrast text-[11.5px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          Save the correction
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11.5px] text-text-dim hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddItem({
  runId,
  onAdded,
}: {
  runId: string;
  onAdded: (r: ItemRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return SCOPE_ITEMS.filter(
      (i) =>
        i.id.includes(q) ||
        i.label.toLowerCase().includes(q) ||
        i.aliases?.some((a) => a.includes(q)),
    ).slice(0, 8);
  }, [query]);

  const add = async (itemId: string, status: "evidenced" | "gap") => {
    setBusy(itemId);
    try {
      const r = await addScopeItemAction(runId, { itemId, status, note: null });
      if (!r.ok) {
        toast.error("Could not add", r.error.message);
        return;
      }
      onAdded({
        id: r.value.id,
        itemId: r.value.itemId,
        status: r.value.status,
        citations: [],
        note: r.value.note,
        label: null,
        depth: null,
        remaining: null,
        confidence: null,
        opsStatus: "added",
        opsNote: null,
      });
      setQuery("");
      toast.success("Added. The pipeline missing this is now on the record.");
    } finally {
      setBusy(null);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border-strong text-text text-[12px] hover:bg-bg-elev transition-colors"
      >
        <Plus className="size-3.5" />
        Add an item the run missed
      </button>
    );
  }
  return (
    <div className="mt-4 rounded-md border border-border-subtle bg-bg-elev/40 p-3.5">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the Scope Standard"
        className="h-10 w-full px-3 rounded-md border border-border-subtle bg-surface-1 text-[13px] text-text outline-none focus:border-border-accent"
      />
      <ul className="mt-2 flex flex-col gap-1">
        {matches.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md border border-border-subtle bg-surface-1 text-[12.5px]"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="text-text font-ui font-medium">{m.label}</span>
              <span className="ml-2 font-mono text-[10px] text-text-faint">
                {m.id}
              </span>
            </span>
            <button
              type="button"
              disabled={busy === m.id}
              onClick={() => add(m.id, "evidenced")}
              className="shrink-0 text-[11px] text-[#0a7d73] hover:underline disabled:opacity-50"
            >
              as evidenced
            </button>
            <button
              type="button"
              disabled={busy === m.id}
              onClick={() => add(m.id, "gap")}
              className="shrink-0 text-[11px] text-[#8a6414] hover:underline disabled:opacity-50"
            >
              as gap
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── conflicts ──────────────────────────────────────────────────────── */

function Conflicts({
  conflicts,
  docName,
  status,
}: {
  conflicts: ConflictRow[];
  docName: Map<string, string>;
  status: string;
}) {
  const [rows, setRows] = useState(conflicts);
  const readOnly = status !== "review";
  if (rows.length === 0) return null;

  const decide = async (
    id: string,
    opsStatus: "resolved" | "dismissed",
  ) => {
    const r = await reviewScopeConflictAction(id, opsStatus, null);
    if (!r.ok) {
      toast.error("Could not save", r.error.message);
      return;
    }
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, opsStatus } : c)));
  };

  return (
    <section>
      <h2 className="text-[10px] tracking-[0.22em] uppercase text-text-muted font-ui font-semibold pb-2.5 border-b border-border-subtle">
        Where the documents disagree · {rows.length}
      </h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.map((c) => (
          <li
            key={c.id}
            className={cn(
              "rounded-md border px-3.5 py-2.5 bg-surface-1",
              c.severity === "high"
                ? "border-[rgba(194,85,80,0.4)]"
                : "border-[rgba(201,148,34,0.35)]",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-[1.55] text-text">
                  {c.source === "baseline" ? (
                    <span
                      className="mr-2 align-middle inline-block rounded-sm bg-[rgba(24,34,44,0.07)] text-text-muted px-1.5 py-[1px] text-[9px] tracking-[0.12em] uppercase font-ui font-semibold"
                      title="Found by the deterministic date and title-block cross-examination, not model judgement"
                    >
                      Baseline
                    </span>
                  ) : null}
                  {c.summary}
                </p>
                {c.citations.length > 0 ? (
                  <p className="mt-1 text-[10.5px] text-text-dim">
                    {c.citations.map((x) => citeLabel(x, docName)).join(" · ")}
                  </p>
                ) : null}
              </div>
              {!readOnly && c.opsStatus === "pending" ? (
                <span className="shrink-0 flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => decide(c.id, "resolved")}
                    className="text-[#0a7d73] hover:underline"
                  >
                    Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(c.id, "dismissed")}
                    className="text-text-dim hover:text-text"
                  >
                    Dismiss
                  </button>
                </span>
              ) : (
                <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] font-ui font-semibold text-text-dim">
                  {c.opsStatus}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── approve ────────────────────────────────────────────────────────── */

function ApproveBar({ runId, items }: { runId: string; items: ItemRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  void items;

  const approve = async () => {
    setBusy(true);
    try {
      const r = await approveScopeRunAction(runId);
      if (!r.ok) {
        toast.error("Not yet", r.error.message);
        return;
      }
      toast.success("Run approved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky bottom-4 flex justify-end">
      <button
        type="button"
        disabled={busy}
        onClick={approve}
        className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold hover:bg-accent-hover transition-colors shadow-[0_8px_24px_-8px_rgba(0,212,200,0.5)] disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4 rotate-[-90deg]" />}
        Approve the run
      </button>
    </div>
  );
}

function IconAction({
  children,
  title,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "size-7 rounded-md border border-border-subtle flex items-center justify-center transition-colors disabled:opacity-50",
        tone === "danger"
          ? "text-text-dim hover:text-[#b2483f] hover:border-[rgba(194,85,80,0.45)]"
          : "text-text-dim hover:text-text hover:border-border-strong",
      )}
    >
      {children}
    </button>
  );
}
