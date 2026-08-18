"use client";

/**
 * The homeowner demo's screens, composed from the shared product
 * primitives and driven entirely by the step index, so stepping back
 * rewinds the world for free.
 *
 * Same standard as the architect demo: every screen inside the
 * product frame, one set piece per stage, and a plain line under
 * every heading saying what the screen shows. The script and its
 * beat order are unchanged.
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileUp,
  Flag,
  Lock,
  MessageCircleQuestion,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CitePill,
  DecisionGrid,
  DocRegister,
  EASE,
  Head,
  Kicker,
  ScopeWriter,
  SetChecklist,
  softRing,
  Spot,
  TealButton,
  TenderDoc,
  useCountUp,
  type SurfaceProps,
} from "./ui";
import {
  DEMO_ASKS,
  DEMO_BUILDERS,
  DEMO_COMPARE,
  DEMO_DIMENSIONS,
  DEMO_DIVISION,
  DEMO_DOCUMENTS,
  DEMO_PACKAGES,
  DEMO_PROJECT,
  DEMO_FLAGS,
  DEMO_GRID,
  DEMO_RECEIPTS,
  DEMO_SCOPE_DIVISIONS,
  DEMO_SCOPE_DIVISIONS_AFTER,
  DEMO_SCOPE_MORE,
  DEMO_TENDERS,
  DEMO_TOTALS,
  fmtAud,
} from "./content";

export { type SurfaceProps } from "./ui";

/* ── 1 · upload ─────────────────────────────────────────────────────── */

export function UploadSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 add-plans · 2 register · 3 choose-open ·
  //        4 start-reading
  const filed = stepIdx >= 2;
  const roundOffered = stepIdx >= 3;
  const roundChosen = stepIdx >= 4;
  return (
    <div>
      <Head
        kicker="New project"
        title="Upload your plans"
        sub="Drop in what you have. PDFs from your architect are perfect."
      />

      {!filed ? (
        <Card className="mt-6 border-dashed border-border-strong bg-transparent">
          <div className="px-6 py-12 flex flex-col items-center text-center">
            <span className="size-12 rounded-full bg-accent-muted flex items-center justify-center text-accent-light">
              <FileUp className="size-5" />
            </span>
            <p className="mt-4 text-[14px] font-ui font-medium text-text">
              Drag your documents here
            </p>
            <p className="mt-1 text-[12.5px] text-text-dim">
              Plans, engineering, reports. PDF, up to 30 files.
            </p>
            <Spot id="add-plans" active={spot === "add-plans"} reduceMotion={reduceMotion} className="mt-6">
              <TealButton onClick={() => onAction("add-plans")}>
                Add your plans
                <FileUp className="size-4" />
              </TealButton>
            </Spot>
          </div>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_236px] items-start">
            <DocRegister
              project={DEMO_PROJECT.title}
              docs={DEMO_DOCUMENTS}
              totalLabel={`${DEMO_TOTALS.documents} documents · ${DEMO_TOTALS.pages} pages`}
              reduceMotion={reduceMotion}
              target="register"
              ringed={soft === "register"}
            />
            <div className="hidden lg:block">
              <SetChecklist docs={DEMO_DOCUMENTS} reduceMotion={reduceMotion} />
            </div>
          </div>

          {roundOffered ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Card className="mt-4 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Kicker>Who can tender</Kicker>
                  {roundChosen ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-accent-light">
                      <Check className="size-3.5" />
                      Open to builders · 3 spots
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      id: "choose-open",
                      label: "Open to verified builders",
                      sub: "Builders near you take the spots",
                      pick: true,
                    },
                    {
                      id: "choose-invite",
                      label: "Invite your own",
                      sub: "Only builders you choose",
                      pick: false,
                    },
                    {
                      id: "choose-both",
                      label: "Both",
                      sub: "Your builders plus ours",
                      pick: false,
                    },
                  ].map((o) => {
                    const selected = roundChosen && o.pick;
                    const btn = (
                      <button
                        type="button"
                        onClick={() => o.pick && onAction("choose-open")}
                        aria-disabled={!o.pick}
                        className={cn(
                          "w-full h-full text-left rounded-md border px-3.5 py-3 transition-colors",
                          selected
                            ? "border-border-accent bg-[rgba(0,212,200,0.05)]"
                            : o.pick
                              ? "border-border-subtle hover:border-border-strong"
                              : "border-border-subtle cursor-default",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-ui font-semibold text-text">
                            {o.label}
                          </span>
                          {selected ? (
                            <Check className="size-3.5 text-accent-light shrink-0" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-text-muted">
                          {o.sub}
                        </span>
                      </button>
                    );
                    return o.pick ? (
                      <Spot
                        key={o.id}
                        id="choose-open"
                        active={spot === "choose-open"}
                        reduceMotion={reduceMotion}
                        className="w-full"
                      >
                        {btn}
                      </Spot>
                    ) : (
                      <span key={o.id}>{btn}</span>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ) : null}

          {roundChosen ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mt-5 flex items-center justify-between gap-4"
            >
              <p className="text-[12px] text-text-muted max-w-[46ch]">
                This exact set is what your quotes will be based on.
              </p>
              <Spot id="start-reading" active={spot === "start-reading"} reduceMotion={reduceMotion}>
                <TealButton onClick={() => onAction("start-reading")}>
                  Start the reading
                  <ArrowRight className="size-4" />
                </TealButton>
              </Spot>
            </motion.div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ── 2 · the reading ────────────────────────────────────────────────── */

const READING_FEED = [
  { line: "Waffle pod slab, 300mm pods with 85mm slab", cite: "Structural, page 6" },
  { line: "Colorbond roofing in Monument", cite: "Architectural, page 12" },
  { line: "Class H1 site, priced to the soil report", cite: "Soil report, page 4" },
  { line: "7.1 star thermal performance", cite: "Energy assessment, page 3" },
  { line: "No landscaping documented. Flagged for you.", cite: "Whole set" },
];

export function ReadingSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 watch · 2 human-check · 3 open-scope
  const watching = stepIdx === 1;
  const settled = stepIdx >= 2;
  const pages = useCountUp(DEMO_TOTALS.pages, watching, settled, 4600, reduceMotion);
  const items = useCountUp(DEMO_TOTALS.items, watching, settled, 5000, reduceMotion);
  const cites = useCountUp(486, watching, settled, 5200, reduceMotion);

  const stages: Array<{ label: string; done: boolean; active: boolean; human?: boolean }> = [
    { label: "Identify the documents", done: true, active: false },
    { label: "Read every page", done: settled || pages >= DEMO_TOTALS.pages, active: watching },
    { label: "Write the scope of works", done: settled, active: watching && pages > 100 },
    { label: "Check every item before you see it", done: settled, active: false, human: true },
  ];

  return (
    <div>
      <Head
        kicker="Reading your documents"
        title={settled ? "Your pack is ready." : "Reading, page by page."}
        sub={
          settled
            ? "Every item traced to its page, checked, and ready for you."
            : "Each line we write records the page it came from."
        }
      />

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { v: pages, label: "Pages read" },
          { v: items, label: "Scope items written" },
          { v: cites, label: "Citations recorded" },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3.5">
            <p className="font-display text-[24px] sm:text-[30px] leading-none text-text tabular-nums">
              {s.v.toLocaleString("en-AU")}
            </p>
            <p className="mt-1.5 text-[9px] sm:text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr] items-start">
        <Card className="px-5 py-4">
          <Kicker>What happens</Kicker>
          <ul className="mt-3.5 space-y-3.5">
            {stages.map((s) => (
              <li
                key={s.label}
                data-demo-target={s.human ? "human-check" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md",
                  s.human && softRing(soft === "human-check"),
                  s.human && soft === "human-check" && "px-2 py-1.5 -mx-2",
                )}
              >
                <span
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center shrink-0 border",
                    s.done
                      ? "bg-accent-muted border-transparent text-accent-light"
                      : s.active
                        ? "border-accent text-accent-light"
                        : "border-border-subtle text-text-faint",
                  )}
                >
                  {s.done ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : s.human ? (
                    <UserRound className="size-3" />
                  ) : (
                    <span className={cn("size-1.5 rounded-full bg-current", s.active && !reduceMotion && "animate-pulse")} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[12.5px] font-ui leading-[1.4]",
                    s.done || s.active ? "text-text" : "text-text-dim",
                  )}
                >
                  {s.label}
                </span>
                {s.human && s.done ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-ui font-semibold text-accent-light shrink-0">
                    <ShieldCheck className="size-3" />
                    Reviewed
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <ScopeWriter
          feed={READING_FEED}
          watching={watching}
          settled={settled}
          reduceMotion={reduceMotion}
        />
      </div>

      {settled ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot id="open-scope" active={spot === "open-scope"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("open-scope")}>
              Open your scope of works
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 3 · the scope of works ─────────────────────────────────────────── */

export function ScopeSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 expand · 2 cite · 3 packages · 4 set-budget ·
  //        5 publish
  const expanded = stepIdx >= 2;
  const psSet = stepIdx >= 5;
  return (
    <div>
      <Head
        kicker={DEMO_PROJECT.title}
        title="Scope of works"
        sub="Everything your build needs, in one list. Every builder prices this same list."
        right={
          <div className="flex items-center gap-5 sm:gap-7">
            {[
              { v: DEMO_TOTALS.items, label: "Items" },
              { v: DEMO_TOTALS.trades, label: "Trades" },
              { v: DEMO_TOTALS.documents, label: "Documents" },
            ].map((s) => (
              <div key={s.label} className="text-right">
                <p className="font-display text-[22px] sm:text-[26px] leading-none text-text tabular-nums">
                  {s.v}
                </p>
                <p className="mt-1 text-[9px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        }
      />

      <p className="mt-3 text-[12.5px] text-text-muted">
        <span className="font-ui font-semibold text-text">
          {DEMO_TOTALS.evidenced} lines
        </span>{" "}
        from your documents ·{" "}
        <span className="font-ui font-semibold text-[#2a5cae]">
          {DEMO_TOTALS.builderPriced} lines
        </span>{" "}
        added for the builders to price
      </p>

      {/* divisions */}
      <Card className="mt-5 overflow-hidden">
        <ul className="divide-y divide-border-subtle/50">
          {DEMO_SCOPE_DIVISIONS.map((d, i) => (
            <motion.li
              key={d.label}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: reduceMotion ? 0 : i * 0.05, ease: EASE }}
              className="px-5 py-3 flex items-center justify-between"
            >
              <span className="text-[13px] font-ui text-text">{d.label}</span>
              <span className="text-[11.5px] text-text-dim tabular-nums">
                {d.count} items
              </span>
            </motion.li>
          ))}
          <li>
            <Spot
              id="expand-division"
              active={spot === "expand-division"}
              reduceMotion={reduceMotion}
              className="w-full"
            >
              <button
                type="button"
                onClick={() => onAction("expand-division")}
                className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-bg-elev/60 transition-colors"
              >
                <span className="text-[13px] font-ui font-semibold text-text">
                  {DEMO_DIVISION.label}
                </span>
                <span className="flex items-center gap-2 text-[11.5px] text-text-dim tabular-nums">
                  {DEMO_DIVISION.count} items
                  <ChevronDown
                    className={cn("size-4 transition-transform", expanded && "rotate-180")}
                  />
                </span>
              </button>
            </Spot>
            {expanded ? (
              <motion.ul
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.35, ease: EASE }}
                data-demo-target="division-lines"
                className={cn(
                  "border-t border-border-subtle/50 bg-[rgba(24,34,44,0.015)]",
                  softRing(soft === "division-lines"),
                )}
              >
                {DEMO_DIVISION.lines.map((l) => (
                  <li key={l.label} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                      <p className="text-[13px] font-ui font-medium text-text">
                        {l.label}
                      </p>
                      <CitePill cite={l.cite} />
                    </div>
                    <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted max-w-[68ch]">
                      {l.note}
                    </p>
                  </li>
                ))}
                <li className="px-5 py-2.5 text-[11.5px] text-text-muted">
                  4 more lines in this section
                </li>
              </motion.ul>
            ) : null}
          </li>
          {DEMO_SCOPE_DIVISIONS_AFTER.map((d) => (
            <li key={d.label} className="px-5 py-3 flex items-center justify-between">
              <span className="text-[13px] font-ui text-text">{d.label}</span>
              <span className="text-[11.5px] text-text-dim tabular-nums">
                {d.count} items
              </span>
            </li>
          ))}
          <li className="px-5 py-3 text-[12px] text-text-muted bg-bg-elev/30">
            {DEMO_SCOPE_MORE}
          </li>
        </ul>
      </Card>

      {/* the provisional sum packages */}
      <div
        data-demo-target="packages"
        className={cn("mt-4 rounded-lg", softRing(soft === "packages"))}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 px-0.5">
          <Kicker>Provisional sums</Kicker>
          <p className="text-[11px] text-text-dim">
            Budgets for what your documents leave open
          </p>
        </div>
        <div className="mt-2 grid gap-2.5">
          {DEMO_PACKAGES.map((p) => {
            const set = p.preset || psSet;
            return (
              <Card
                key={p.id}
                className={cn(
                  "px-4.5 py-3.5",
                  !set && "border-[rgba(201,148,34,0.4)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[56ch]">
                    <p className="text-[13.5px] font-ui font-semibold text-text">
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-[1.55] text-text-muted">
                      {p.covers}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-[1.55] text-text-dim">
                      {p.why}
                    </p>
                  </div>
                  {set ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-accent-light shrink-0">
                      <Check className="size-3.5" />
                      Budget set: {fmtAud(p.amount)}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="h-10 px-3.5 rounded-md border border-border-subtle bg-surface-1 inline-flex items-center text-[13px] tabular-nums text-text">
                        {fmtAud(p.amount)}
                      </span>
                      <Spot id="set-budget" active={spot === "set-budget"} reduceMotion={reduceMotion}>
                        <button
                          type="button"
                          onClick={() => onAction("set-budget")}
                          className="inline-flex items-center gap-1.5 h-11 sm:h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12.5px] sm:text-[12px] font-semibold hover:bg-accent-hover transition-colors"
                        >
                          <CircleDollarSign className="size-3.5" />
                          Set budget
                        </button>
                      </Spot>
                    </div>
                  )}
                </div>
                {p.id === "landscaping" && psSet ? (
                  <motion.p
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-[11.5px] leading-[1.6] text-text-dim"
                  >
                    Your budget covers this package as a whole. Builders
                    price against the one figure, not line by line.
                  </motion.p>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      {/* approve: mounts on its own beat, so the budget callout
          before it never has to dodge a control that is not in play */}
      {psSet ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mt-6 flex flex-wrap items-center justify-between gap-4"
        >
          <p className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <ShieldCheck className="size-3.5 text-accent-light" />
            Checked before you see it
          </p>
          <Spot id="publish" active={spot === "publish"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("publish")}>
              Approve and publish
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 4 · going live ─────────────────────────────────────────────────── */

export function RoundSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 builder-view · 2 watch fill · 3 go
  const filling = stepIdx === 2;
  const full = stepIdx >= 3;
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!filling || reduceMotion) return;
    const timers = [0, 1, 2, 3].map((n) =>
      setTimeout(() => setTicks(n), n === 0 ? 0 : 700 + (n - 1) * 1250),
    );
    return () => timers.forEach(clearTimeout);
  }, [filling, reduceMotion]);
  const filled = full || (filling && reduceMotion) ? 3 : filling ? ticks : 0;

  return (
    <div>
      <Head
        kicker="Your project is live"
        title="Builders take a spot."
        sub="Only verified builders. They all price the list you approved."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2 items-start">
        <Card
          target="builder-view"
          className={cn("px-5 py-5", softRing(soft === "builder-view"))}
        >
          <Kicker>What builders see</Kicker>
          <p className="mt-3 text-[16px] font-ui font-semibold text-text">
            {DEMO_PROJECT.title}
          </p>
          <p className="mt-1 text-[12.5px] text-text-muted">{DEMO_PROJECT.facts}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Lock className="size-3.5" />
            Address shared only when a spot is secured
          </p>
          <div className="mt-4 pt-4 border-t border-border-subtle/60 grid grid-cols-3 gap-3 text-center">
            {[
              { v: String(DEMO_TOTALS.items), label: "Scope items" },
              { v: String(DEMO_TOTALS.trades), label: "Trades" },
              { v: "3", label: "Spots" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-[22px] leading-none text-text tabular-nums">
                  {s.v}
                </p>
                <p className="mt-1 text-[9px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card target="spots" className="px-5 py-5">
          <div className="flex items-center justify-between">
            <Kicker>Tender spots</Kicker>
            <span className="text-[11.5px] font-ui font-semibold text-text tabular-nums">
              {filled} of 3
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {DEMO_BUILDERS.map((b, i) => {
              const taken = filled > i;
              return (
                <li
                  key={b.name}
                  className={cn(
                    "rounded-md border px-4 py-3 flex items-center gap-3 transition-colors",
                    taken
                      ? "border-border-accent/50 bg-[rgba(0,212,200,0.04)]"
                      : "border-dashed border-border-subtle",
                  )}
                >
                  {taken ? (
                    <motion.span
                      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="size-8 rounded-full bg-accent-muted flex items-center justify-center text-[11px] font-ui font-bold text-accent-light shrink-0"
                    >
                      {b.initials}
                    </motion.span>
                  ) : (
                    <span className="size-8 rounded-full border border-dashed border-border-strong shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    {taken ? (
                      <motion.span
                        initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="block"
                      >
                        <span className="block text-[13px] font-ui font-medium text-text truncate">
                          {b.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-accent-light font-ui font-semibold">
                          <BadgeCheck className="size-3" />
                          ABN and licence verified
                        </span>
                      </motion.span>
                    ) : (
                      <span className="text-[12.5px] text-text-dim">
                        Spot open
                      </span>
                    )}
                  </span>
                  {taken ? (
                    <span className="text-[10.5px] font-ui font-semibold text-text-dim shrink-0">
                      Secured
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {full ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot id="see-tendering" active={spot === "see-tendering"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("see-tendering")}>
              See what the builders do
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 5 · tenders arrive ─────────────────────────────────────────────── */

const MARK_ROWS = [
  { label: "Waffle pod slab", state: "Included", tone: "teal" },
  { label: "Landscaping package", state: "Provisional sum · $47,000", tone: "amber" },
  { label: "Driveway and crossover", state: "Included", tone: "teal" },
];

export function TenderSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 marking · 2 asks · 3 watch land · 4 go
  const arriving = stepIdx === 3;
  const arrived = stepIdx >= 4;
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!arriving || reduceMotion) return;
    const timers = [0, 1, 2, 3].map((n) =>
      setTimeout(() => setTicks(n), n === 0 ? 0 : 600 + (n - 1) * 1150),
    );
    return () => timers.forEach(clearTimeout);
  }, [arriving, reduceMotion]);
  const landed = arrived || (arriving && reduceMotion) ? 3 : arriving ? ticks : 0;

  return (
    <div>
      <Head
        kicker="The builders' side"
        title="Every builder answers the same scope."
        sub="Each builder answers your list item by item, then the same questions under signature."
      />

      <Card
        target="marking"
        className={cn("mt-6 px-5 py-4", softRing(soft === "marking"))}
      >
        <div className="flex items-center justify-between">
          <Kicker>Inside a builder&rsquo;s submission</Kicker>
          <span className="text-[11px] text-text-dim tabular-nums">
            Line 41 of {DEMO_TOTALS.items}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {MARK_ROWS.map((r, i) => (
            <motion.li
              key={r.label}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.25 + i * 0.2, ease: EASE }}
              className="flex items-center justify-between gap-3 rounded-md border border-border-subtle px-3.5 py-2.5"
            >
              <span className="text-[12.5px] text-text">{r.label}</span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10.5px] font-ui font-semibold",
                  r.tone === "teal"
                    ? "bg-accent-muted text-accent-light"
                    : "bg-[rgba(201,148,34,0.14)] text-[#8a6414]",
                )}
              >
                {r.state}
              </span>
            </motion.li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] text-text-muted">
          Every line in your scope gets an answer.
        </p>
      </Card>

      <Card
        target="asks"
        className={cn("mt-4 px-5 py-4", softRing(soft === "asks"))}
      >
        <Kicker>Every builder also answers</Kicker>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {DEMO_ASKS.map((a) => (
            <li
              key={a}
              className="px-2.5 py-1.5 rounded-full border border-border-subtle text-[11.5px] text-text-muted"
            >
              {a}
            </li>
          ))}
          <li className="px-2.5 py-1.5 rounded-full border border-dashed border-border-subtle text-[11.5px] text-text-dim">
            and plenty more
          </li>
        </ul>
      </Card>

      <div data-demo-target="tender-docs" className="mt-5 grid gap-3 sm:grid-cols-3">
        {DEMO_TENDERS.map((t, i) => (
          <TenderDoc
            key={t.name}
            tender={t}
            here={landed > i}
            reduceMotion={reduceMotion}
            priceNote="ex GST · same list of work"
          />
        ))}
      </div>

      {arrived ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot id="open-comparison" active={spot === "open-comparison"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("open-comparison")}>
              Open the comparison
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 6 · the comparison ─────────────────────────────────────────────── */

export function CompareSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 prices · 2 show-scores · 3 receipts ·
  //        4 show-differences · 5 grid · 6 breakeven · 7 ladder ·
  //        8 show-flags · 9 questions · 10 finish
  const scores = stepIdx >= 3;
  const differing = stepIdx >= 5;
  const maths = stepIdx >= 6;
  const ladder = stepIdx >= 7;
  const flags = stepIdx >= 9;
  const reveal = (on: boolean) =>
    reduceMotion || !on
      ? {}
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: EASE } };

  return (
    <div>
      <Head
        kicker="The comparison"
        title="Three quotes, side by side."
        sub="One list of work, three prices, and the evidence behind every difference."
      />

      {/* the tenders */}
      <div
        data-demo-target="price-row"
        className={cn("mt-6 grid gap-3 sm:grid-cols-3 rounded-lg", softRing(soft === "price-row"))}
      >
        {DEMO_TENDERS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reduceMotion ? 0 : i * 0.1, ease: EASE }}
          >
            <Card className="px-4 py-4 h-full">
              <div className="flex items-center justify-between">
                <span className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-[10px] font-ui font-bold text-accent-light">
                  {t.initials}
                </span>
                {scores ? (
                  <motion.span {...reveal(true)} className="text-right">
                    <span className="block font-display text-[18px] leading-none text-text tabular-nums">
                      {t.overall}
                    </span>
                    <span className="block text-[8px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold mt-0.5">
                      Score
                    </span>
                  </motion.span>
                ) : null}
              </div>
              <p className="mt-2 text-[12px] font-ui font-medium text-text truncate">
                {t.name}
              </p>
              <p className="mt-1 font-display text-[24px] leading-none text-text tabular-nums">
                {fmtAud(t.price)}
              </p>

              <div className="mt-3">
                <div className="h-[5px] rounded-full overflow-hidden flex bg-[rgba(24,34,44,0.07)]">
                  <span className="h-full bg-[#0a7d73]" style={{ width: `${t.firmPct}%` }} />
                  {t.firmPct < 100 ? (
                    <span className="h-full bg-[#c99422]" style={{ width: `${100 - t.firmPct}%` }} />
                  ) : null}
                </div>
                <p className="mt-1.5 text-[10.5px] text-text-muted">
                  {t.firmPct === 100
                    ? "Fully priced. No allowances of its own."
                    : `${t.firmPct}% locked in · ${fmtAud(t.movingAud)} can still change`}
                </p>
              </div>

              {scores ? (
                <motion.ul {...reveal(true)} className="mt-3 pt-3 border-t border-border-subtle/60 space-y-1.5">
                  {DEMO_DIMENSIONS.map((d, di) => (
                    <li key={d.label} className="flex items-center gap-2">
                      <span className="w-[86px] shrink-0 text-[9.5px] text-text-dim font-ui truncate">
                        {d.label}
                      </span>
                      <span className="flex-1 h-[3px] rounded-full bg-[rgba(24,34,44,0.07)] overflow-hidden">
                        <motion.span
                          className="block h-full rounded-full bg-[#0a7d73]"
                          initial={reduceMotion ? { width: `${t.dims[di]}%` } : { width: 0 }}
                          animate={{ width: `${t.dims[di]}%` }}
                          transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.15 + di * 0.06, ease: EASE }}
                        />
                      </span>
                      <span className="w-6 text-right text-[10px] tabular-nums text-text-muted">
                        {t.dims[di]}
                      </span>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* reveal: the scores */}
      {!scores && stepIdx >= 2 ? (
        <div className="mt-5 flex justify-center">
          <Spot id="show-scores" active={spot === "show-scores"} reduceMotion={reduceMotion}>
            <button
              type="button"
              onClick={() => onAction("show-scores")}
              className="inline-flex items-center gap-2 h-11 sm:h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
            >
              Show the scores
              <ChevronDown className="size-3.5" />
            </button>
          </Spot>
        </div>
      ) : null}

      {/* the receipts behind one score */}
      {scores ? (
        <motion.div {...reveal(true)}>
          <Card
            target="receipts"
            className={cn("mt-4 px-5 py-4", softRing(soft === "receipts"))}
          >
            <div className="flex items-center justify-between gap-3">
              <Kicker>
                {DEMO_RECEIPTS.builder} · {DEMO_RECEIPTS.dimension} · why {DEMO_RECEIPTS.score}?
              </Kicker>
              <span className="font-display text-[18px] leading-none text-text tabular-nums">
                {DEMO_RECEIPTS.score}
              </span>
            </div>
            <ul className="mt-2.5 space-y-1">
              {DEMO_RECEIPTS.lines.map((l) => (
                <li key={l.label} className="flex items-baseline gap-2.5">
                  <span
                    className={cn(
                      "w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums",
                      l.value.startsWith("+")
                        ? "font-semibold text-[#0a7d73]"
                        : l.value.startsWith("−")
                          ? "font-medium text-[#a8433e]"
                          : "text-text-dim",
                    )}
                  >
                    {l.value}
                  </span>
                  <span className="text-[11.5px] text-text-muted">{l.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      ) : null}

      {/* reveal: the differences */}
      {scores && !differing && stepIdx >= 4 ? (
        <div className="mt-5 flex justify-center">
          <Spot id="show-differences" active={spot === "show-differences"} reduceMotion={reduceMotion}>
            <button
              type="button"
              onClick={() => onAction("show-differences")}
              className="inline-flex items-center gap-2 h-11 sm:h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
            >
              Where they differ
              <ChevronDown className="size-3.5" />
            </button>
          </Spot>
        </div>
      ) : null}

      {/* the decision grid */}
      {differing ? (
        <motion.div {...reveal(true)}>
          <DecisionGrid
            target="grid"
            ringed={soft === "grid"}
            caption="Highlighted rows are where they differ"
            builders={DEMO_TENDERS.map((t) => t.name.split(" ")[0]!)}
            rows={DEMO_GRID}
          />
        </motion.div>
      ) : null}

      {maths ? (
        <motion.div {...reveal(true)} className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card
            target="breakeven"
            className={cn(
              "px-5 py-4 border-[rgba(201,148,34,0.35)]",
              softRing(soft === "breakeven"),
            )}
          >
            <Kicker>The maths on the cheapest quote</Kicker>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-text">
              Corten is {fmtAud(DEMO_COMPARE.saving)} cheaper. But{" "}
              {fmtAud(DEMO_COMPARE.exposure)} of its price is not locked
              in. If that grows by{" "}
              <span className="font-ui font-semibold">
                {DEMO_COMPARE.breakevenPct} percent
              </span>
              , your saving is gone.
            </p>
          </Card>
          {ladder ? (
          <Card
            target="ladder"
            className={cn("px-5 py-4", softRing(soft === "ladder"))}
          >
            <Kicker>What more money buys</Kicker>
            <p className="mt-2 text-[12.5px] text-text-muted">
              Brightwater costs {fmtAud(DEMO_COMPARE.stepUp)} more than
              Meridian. For that you get:
            </p>
            <ul className="mt-2 space-y-1">
              {DEMO_COMPARE.stepUpBuys.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[12.5px] text-text">
                  <Check className="size-3.5 text-accent-light shrink-0 mt-[2px]" />
                  {b}
                </li>
              ))}
            </ul>
          </Card>
          ) : null}
        </motion.div>
      ) : null}

      {/* reveal: the flags */}
      {ladder && !flags && stepIdx >= 8 ? (
        <div className="mt-5 flex justify-center">
          <Spot id="show-flags" active={spot === "show-flags"} reduceMotion={reduceMotion}>
            <button
              type="button"
              onClick={() => onAction("show-flags")}
              className="inline-flex items-center gap-2 h-11 sm:h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
            >
              Show the flags
              <Flag className="size-3.5" />
            </button>
          </Spot>
        </div>
      ) : null}

      {flags ? (
        <motion.div {...reveal(true)}>
          <Card
            target="flags"
            className={cn("mt-4 px-5 py-4", softRing(soft === "flags"))}
          >
            <Kicker>Flags, with your questions ready</Kicker>
            <ul className="mt-3 space-y-3">
              {DEMO_FLAGS.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <Flag className="size-3.5 text-[#8a6414] shrink-0 mt-[3px]" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-ui font-medium text-text">
                      {f.label}
                      <span className="ml-2 text-[10.5px] font-normal text-text-dim">
                        {f.builder.split(" ")[0]}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-start gap-1.5 text-[12px] leading-[1.55] text-text-muted">
                      <MessageCircleQuestion className="size-3.5 text-accent-light shrink-0 mt-[2px]" />
                      {f.ask}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      ) : null}

      {flags ? (
        <div className="mt-6 flex justify-end">
          <Spot id="finish" active={spot === "finish"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("finish")}>
              Finish
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </div>
      ) : null}
    </div>
  );
}
