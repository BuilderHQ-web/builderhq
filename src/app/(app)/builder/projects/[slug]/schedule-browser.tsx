"use client";

/**
 * The pack, in full — the post-unlock reading room.
 *
 * A builder who paid for the spot gets the whole analysis, shaped for
 * pricing: the reader's overview of the documents, the list of what
 * the pack does not settle (the same list every rival sees), and the
 * complete schedule by division with the reader's verbatim finding
 * and citation on every line. This is the page a builder keeps open
 * beside their takeoff.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Landmark,
  ScrollText,
  Search,
} from "lucide-react";

import {
  scheduleDivisions,
  formatCitation,
  type TenderSchedule,
  type TenderScheduleItem,
} from "@/modules/tenders/schedule";
import { cn } from "@/lib/utils";

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
  why: string;
  severity: "recommended" | "worth_noting";
}

const formatAud = (n: number) => `$${n.toLocaleString("en-AU")}`;

export function ScheduleBrowser({
  schedule,
  overview,
  advisories,
}: {
  schedule: TenderSchedule;
  overview: PackOverview | null;
  advisories: PackAdvisory[];
}) {
  const divisions = useMemo(() => scheduleDivisions(schedule), [schedule]);
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

  const facts = overview
    ? ([
        overview.dwellings !== null
          ? `${overview.dwellings} dwelling${overview.dwellings === 1 ? "" : "s"}`
          : null,
        overview.bedrooms !== null
          ? `${overview.bedrooms} bed`
          : null,
        overview.bathrooms !== null
          ? `${overview.bathrooms} bath`
          : null,
        overview.storeys !== null
          ? `${overview.storeys} store${overview.storeys === 1 ? "y" : "ys"}`
          : null,
      ].filter(Boolean) as string[])
    : [];

  return (
    <div>
      {overview ? (
        <div className="rounded-lg border border-border-subtle bg-surface-1 card-elev px-4.5 py-4">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold inline-flex items-center gap-1.5">
            <ScrollText className="size-3.5 text-accent-light" />
            The reader&rsquo;s overview
          </p>
          <p className="mt-2 text-[13px] leading-[1.7] text-text-muted">
            {overview.summary}
          </p>
          {facts.length > 0 ? (
            <p className="mt-2.5 text-[11.5px] text-text-dim">
              Read from the documents: {facts.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {advisories.length > 0 ? (
        <div className="mt-4 rounded-lg border border-[rgba(201,148,34,0.35)] bg-[rgba(201,148,34,0.04)] px-4.5 py-4">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a6414] font-ui font-semibold inline-flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" />
            What the pack does not settle
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-text-muted">
            Price these with your eyes open. Every builder on the round
            sees the same list, so a tender that handles them squarely
            reads stronger, not dearer.
          </p>
          <ul className="mt-3 space-y-2.5">
            {advisories.map((a) => (
              <li key={a.key} className="flex items-start gap-2.5">
                <span className="mt-[7px] size-1.5 rounded-full bg-[#c99422] shrink-0" />
                <p className="text-[12.5px] leading-[1.6] text-text-muted min-w-0">
                  <span className="font-ui font-medium text-text">
                    {a.title}
                  </span>
                  <br />
                  {a.why}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
          The schedule, line by line
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-dim" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a line"
            className="h-9 w-[190px] rounded-md border border-border-subtle bg-surface-1 pl-8 pr-3 text-[12px] text-text outline-none focus:border-border-accent transition-colors"
          />
        </div>
      </div>

      <p className="mt-1.5 text-[11.5px] leading-[1.6] text-text-dim max-w-[68ch]">
        Every line below goes to your tender, whatever its label here.
        Documented means the client&rsquo;s documents evidence the line
        and show where; open to price means the documents are silent and
        the client asks you to price it within your quote. When you
        tender, you mark every one.
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {visible.map((d) => {
          const expanded = searching || open.has(d.divisionId);
          const counts = [
            `${d.items.filter((i) => i.kind === "evidenced").length} documented`,
            d.items.some((i) => i.kind === "owner_allowance")
              ? `${d.items.filter((i) => i.kind === "owner_allowance").length} client allowance`
              : null,
            d.items.some((i) => i.kind === "owner_open")
              ? `${d.items.filter((i) => i.kind === "owner_open").length} open to price`
              : null,
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
                    <BrowserLine key={item.itemId} item={item} />
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
          No line matches &ldquo;{query}&rdquo;.
        </p>
      ) : null}
    </div>
  );
}

function BrowserLine({ item }: { item: TenderScheduleItem }) {
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
            <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[#8a6414]">
              Still to be settled: {item.remaining}
            </p>
          ) : null}
          {cite ? (
            <p className="mt-0.5 text-[10.5px] text-text-dim">{cite}</p>
          ) : null}
        </div>
        {item.kind === "owner_allowance" && item.ownerAmountAud !== null ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-ui font-medium text-[#8a6414]">
            <Landmark className="size-3" />
            {formatAud(item.ownerAmountAud)} allowance
          </span>
        ) : item.kind === "owner_open" ? (
          <span className="shrink-0 text-[11px] text-text-dim">
            You price this
          </span>
        ) : null}
      </div>
    </li>
  );
}
