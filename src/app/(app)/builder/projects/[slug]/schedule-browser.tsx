"use client";

/**
 * The pack, in full — the post-unlock reading room.
 *
 * A builder who paid for the spot gets the whole analysis, shaped for
 * pricing: what the pack does not settle (the same list every rival
 * sees), and the complete scope by division with the reader's
 * verbatim finding and citation on every item. This is the page a
 * builder keeps open beside their takeoff.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Landmark,
  Search,
} from "lucide-react";

import {
  scheduleDivisions,
  groupedAllowanceItems,
  formatCitation,
  type TenderSchedule,
  type TenderScheduleItem,
} from "@/modules/tenders/schedule";
import { cn } from "@/lib/utils";
import { NoteHint } from "./note-hint";

/** The reader's overview, structurally (server type stays server-side). */
export interface PackOverview {
  summary: string;
  dwellings: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  storeys: number | null;
}

export interface PackAdvisory {
  key: string;
  title: string;
  /** The builder's reading of the gap; the client's `why` stays on
   *  the pack review. */
  builderWhy: string;
  severity: "recommended" | "worth_noting";
}

const formatAud = (n: number) => `$${n.toLocaleString("en-AU")}`;

export function ScheduleBrowser({
  schedule,
  advisories,
  pdfHref = null,
}: {
  schedule: TenderSchedule;
  advisories: PackAdvisory[];
  /** The scope of works as a PDF — rendered server-side. */
  pdfHref?: string | null;
}) {
  const divisions = useMemo(() => scheduleDivisions(schedule), [schedule]);
  // Client packages carry ONE nominated figure; the first member line
  // of each package wears it, and the rest read as part of the
  // package — never as split per-line prices the client did not set.
  const packageTag = useMemo(() => {
    const grouped = groupedAllowanceItems(schedule);
    const first = new Set<string>();
    const tags = new Map<string, string>();
    for (const [itemId, g] of grouped) {
      if (!first.has(g.key)) {
        first.add(g.key);
        tags.set(itemId, `${formatAud(g.totalAud)} · ${g.label} package`);
      } else {
        tags.set(itemId, `Part of the ${g.label} package`);
      }
    }
    return tags;
  }, [schedule]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = (i: TenderScheduleItem) =>
    q.length === 0 ||
    i.label.toLowerCase().includes(q) ||
    (i.note ?? "").toLowerCase().includes(q) ||
    i.divisionLabel.toLowerCase().includes(q);
  const visible = useMemo(
    () =>
      divisions
        .map((d) => ({
          ...d,
          items: d.items.filter(matches),
          locked: d.locked.filter(matches),
        }))
        .filter((d) => d.items.length + d.locked.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [divisions, q],
  );
  const searching = q.length > 0;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      {advisories.length > 0 ? (
        <div className="mb-7 rounded-lg border border-[rgba(201,148,34,0.35)] bg-[rgba(201,148,34,0.04)] px-5 py-4.5">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a6414] font-ui font-semibold inline-flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" />
            Documents not yet provided
          </p>
          <ul className="mt-3.5 space-y-2.5">
            {advisories.map((a) => (
              <li key={a.key} className="flex items-start gap-2.5">
                <span className="mt-[7px] size-1.5 rounded-full bg-[#c99422] shrink-0" />
                <p className="text-[12.5px] leading-[1.6] text-text-muted min-w-0">
                  <span className="font-ui font-medium text-text">
                    {a.title}
                  </span>
                  <br />
                  {a.builderWhy}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
          Identified scope of works, line by line
        </p>
        <div className="flex items-center gap-2">
          {pdfHref ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-border-subtle text-[12px] font-ui text-text-muted hover:border-border-accent hover:text-text transition-colors"
            >
              <Download className="size-3.5" />
              Download PDF
            </a>
          ) : null}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-dim" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an item"
              className="h-9 w-[190px] rounded-md border border-border-subtle bg-surface-1 pl-8 pr-3 text-[12px] text-text outline-none focus:border-border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-[11.5px] leading-[1.6] text-text-dim max-w-[68ch]">
        Every item below goes into your tender. When you tender, you
        mark what your price does with each one.
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {visible.map((d) => {
          const expanded = searching || open.has(d.divisionId);
          const counts = [
            `${d.items.length} item${d.items.length === 1 ? "" : "s"}`,
            d.locked.length > 0 ? `${d.locked.length} outside the round` : null,
          ].filter(Boolean);
          return (
            <li
              key={d.divisionId}
              className="rounded-lg border border-border-subtle bg-surface-1 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(d.divisionId)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-elev/60 transition-colors"
              >
                <span className="min-w-0">
                  <span className="text-[13px] font-ui font-semibold text-text">
                    {d.label}
                  </span>
                  <span className="ml-2 text-[11px] text-text-dim">
                    {counts.join(" · ")}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-text-dim shrink-0 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              {expanded ? (
                <ul className="border-t border-border-subtle/60 divide-y divide-border-subtle/40">
                  {d.items.map((item) => (
                    <BrowserLine
                      key={item.itemId}
                      item={item}
                      packageTag={packageTag.get(item.itemId) ?? null}
                    />
                  ))}
                  {d.locked.map((item) => (
                    <li
                      key={item.itemId}
                      className="px-4 py-2.5 text-[12px] text-text-dim"
                    >
                      {item.label} · the client took this out of the round
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {visible.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-text-dim">
          No item matches &ldquo;{query}&rdquo;.
        </p>
      ) : null}
    </div>
  );
}

function BrowserLine({
  item,
  packageTag,
}: {
  item: TenderScheduleItem;
  /** Set for client-package members: the whole figure on the first
   *  line of the package, "part of" on the rest. */
  packageTag: string | null;
}) {
  const cite = item.citations[0] ? formatCitation(item.citations[0]) : null;
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-ui font-medium text-text">
            {item.label}
            {item.depth === "partial" ? (
              <span
                className="ml-2 align-middle inline-block rounded-full bg-[rgba(201,148,34,0.14)] text-[#8a6414] px-2 py-[1px] text-[9.5px] tracking-[0.08em] uppercase font-ui font-semibold"
                title={
                  item.remaining ??
                  "Shown in the documents, but not fully specified"
                }
              >
                Documented in part
              </span>
            ) : null}
          </p>
          {item.note ? (
            <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted">
              {item.note}
            </p>
          ) : null}
          {item.depth === "partial" && item.remaining ? (
            <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[#8a6414] flex items-start gap-1">
              <NoteHint className="shrink-0 mt-[1px] text-[#b08a2a] hover:text-[#8a6414]" />
              <span>Notes: {item.remaining}</span>
            </p>
          ) : null}
          {cite ? (
            <p className="mt-0.5 text-[10.5px] text-text-dim">{cite}</p>
          ) : null}
        </div>
        {packageTag ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-ui font-medium text-[#8a6414]">
            <Landmark className="size-3" />
            {packageTag}
          </span>
        ) : item.kind === "owner_allowance" && item.ownerAmountAud !== null ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-ui font-medium text-[#8a6414]">
            <Landmark className="size-3" />
            {formatAud(item.ownerAmountAud)} provisional sum
          </span>
        ) : null}
      </div>
    </li>
  );
}
