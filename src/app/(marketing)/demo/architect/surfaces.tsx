"use client";

/**
 * The architect demo's screens, composed from the shared product
 * primitives and driven entirely by the step index, so stepping back
 * rewinds the world for free.
 *
 * Each stage carries one set piece and no more: the set filing itself
 * and every discipline ticked; the scope writing itself line by line
 * with its citations attaching; the invitations landing; the RFI
 * answered and stamped as an addendum; three tenders arriving as
 * documents; the comparison assembling one block per beat; and the
 * recommendation rendering under the practice's name.
 *
 * Blocks that exist only here are the architect's reasons to care:
 * the invitation panel, the RFI card, the recommendation export.
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
  Download,
  FileUp,
  Flag,
  Lock,
  Mail,
  MessageCircleQuestion,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CitePill,
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
} from "../ui";
import {
  DEMO_COMPARE,
  DEMO_DIMENSIONS,
  DEMO_FLAGS,
  DEMO_GRID,
  DEMO_RECEIPTS,
  DEMO_TENDERS,
  fmtAud,
} from "../content";
import {
  ARCH_ASKS,
  ARCH_DIVISION,
  ARCH_DOCUMENTS,
  ARCH_MARK_ROWS,
  ARCH_PACKAGES,
  ARCH_PROJECT,
  ARCH_READING_FEED,
  ARCH_REPORT,
  ARCH_RFI,
  ARCH_ROUND,
  ARCH_SCOPE_DIVISIONS,
  ARCH_SCOPE_DIVISIONS_AFTER,
  ARCH_SCOPE_MORE,
  ARCH_TOTALS,
} from "./content";

/* ── 1 · upload ─────────────────────────────────────────────────────── */

export function ArchUploadSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 add-set · 2 register · 3 choose-both ·
  //        4 invites · 5 start-reading
  const filed = stepIdx >= 2;
  const choiceOffered = stepIdx >= 3;
  const chosen = stepIdx >= 4;
  const ready = stepIdx >= 5;
  return (
    <div>
      <Head
        kicker={`New tender · ${ARCH_PROJECT.client}`}
        title="Upload your documentation"
        sub="The set you already have, exactly as you would issue it for tender."
      />

      {!filed ? (
        <Card className="mt-6 border-dashed border-border-strong bg-transparent">
          <div className="px-6 py-12 flex flex-col items-center text-center">
            <span className="size-12 rounded-full bg-accent-muted flex items-center justify-center text-accent-light">
              <FileUp className="size-5" />
            </span>
            <p className="mt-4 text-[14px] font-ui font-medium text-text">
              Drag your set here
            </p>
            <p className="mt-1 text-[12.5px] text-text-dim">
              Drawings, schedules, reports, the specification. PDF, up to 30 files.
            </p>
            <Spot id="add-set" active={spot === "add-set"} reduceMotion={reduceMotion} className="mt-6">
              <TealButton onClick={() => onAction("add-set")}>
                Add your documentation
                <FileUp className="size-4" />
              </TealButton>
            </Spot>
          </div>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_236px] items-start">
            <DocRegister
              project={ARCH_PROJECT.title}
              docs={ARCH_DOCUMENTS}
              totalLabel={`${ARCH_TOTALS.documents} documents · ${ARCH_TOTALS.pages} pages`}
              reduceMotion={reduceMotion}
              target="register"
              ringed={soft === "register"}
            />
            <div className="hidden lg:block">
              <SetChecklist docs={ARCH_DOCUMENTS} reduceMotion={reduceMotion} />
            </div>
          </div>

          {choiceOffered ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Card className="mt-4 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Kicker>Who can tender</Kicker>
                  {chosen ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui font-semibold text-accent-light">
                      <Check className="size-3.5" />
                      Hybrid round · 3 spots
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      id: "choose-invite",
                      label: "Invite your own",
                      sub: "Only builders you choose",
                      pick: false,
                    },
                    {
                      id: "choose-open",
                      label: "Open to verified builders",
                      sub: "Builders near the site take the spots",
                      pick: false,
                    },
                    {
                      id: "choose-both",
                      label: "Your builders plus ours",
                      sub: "Invite yours, we fill the rest",
                      pick: true,
                    },
                  ].map((o) => {
                    const selected = chosen && o.pick;
                    const btn = (
                      <button
                        type="button"
                        onClick={() => o.pick && onAction("choose-both")}
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
                        id="choose-both"
                        active={spot === "choose-both"}
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

          {chosen ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Card
                target="invites"
                className={cn("mt-4 px-5 py-4", softRing(soft === "invites"))}
              >
                <Kicker>Your invitations</Kicker>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                  {ARCH_ROUND.map((b, i) => (
                    <motion.li
                      key={b.name}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.15 + i * 0.14, ease: EASE }}
                      className={cn(
                        "rounded-md border px-3.5 py-3",
                        b.invited
                          ? "border-border-subtle"
                          : "border-dashed border-border-subtle",
                      )}
                    >
                      {b.invited ? (
                        <>
                          <span className="flex items-center gap-2">
                            <span className="size-6 rounded-full bg-accent-muted flex items-center justify-center text-[9.5px] font-ui font-bold text-accent-light shrink-0">
                              {b.initials}
                            </span>
                            <span className="text-[12.5px] font-ui font-medium text-text truncate">
                              {b.name}
                            </span>
                          </span>
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-accent-light font-ui font-semibold">
                            <Mail className="size-3" />
                            Invitation sent
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[12.5px] text-text-muted">
                            1 open spot
                          </span>
                          <span className="mt-1.5 block text-[10.5px] text-text-dim">
                            A verified builder near the site takes it
                          </span>
                        </>
                      )}
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ) : null}

          {ready ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mt-5 flex items-center justify-between gap-4"
            >
              <p className="text-[12px] text-text-muted max-w-[46ch]">
                This exact set is what every builder prices.
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

export function ArchReadingSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 watch · 2 human-check · 3 open-scope
  const watching = stepIdx === 1;
  const settled = stepIdx >= 2;
  const pages = useCountUp(ARCH_TOTALS.pages, watching, settled, 4600, reduceMotion);
  const items = useCountUp(ARCH_TOTALS.items, watching, settled, 5000, reduceMotion);
  const cites = useCountUp(ARCH_TOTALS.citations, watching, settled, 5200, reduceMotion);

  const stages: Array<{ label: string; done: boolean; active: boolean; human?: boolean }> = [
    { label: "Identify the documents", done: true, active: false },
    { label: "Read every page", done: settled || pages >= ARCH_TOTALS.pages, active: watching },
    { label: "Write the scope of works", done: settled, active: watching && pages > 100 },
    { label: "Check every item before it reaches you", done: settled, active: false, human: true },
  ];

  return (
    <div>
      <Head
        kicker="Reading your set"
        title={settled ? "The scope is drafted." : "Reading, page by page."}
        sub={
          settled
            ? "Every item traced to its page, checked, and ready for your review."
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
          feed={ARCH_READING_FEED}
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
              Review the scope of works
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 3 · the scope of works ─────────────────────────────────────────── */

export function ArchScopeSurface({
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
        kicker={ARCH_PROJECT.title}
        title="Scope of works"
        sub="Every item of work in the project, in one list. This is what the builders price."
        right={
          <div className="flex items-center gap-5 sm:gap-7">
            {[
              { v: ARCH_TOTALS.items, label: "Items" },
              { v: ARCH_TOTALS.trades, label: "Trades" },
              { v: ARCH_TOTALS.documents, label: "Documents" },
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
          {ARCH_TOTALS.evidenced} lines
        </span>{" "}
        cited from your set ·{" "}
        <span className="font-ui font-semibold text-[#2a5cae]">
          {ARCH_TOTALS.builderPriced} lines
        </span>{" "}
        added for the builders to price
      </p>

      {/* divisions */}
      <Card className="mt-5 overflow-hidden">
        <ul className="divide-y divide-border-subtle/50">
          {ARCH_SCOPE_DIVISIONS.map((d, i) => (
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
                  {ARCH_DIVISION.label}
                </span>
                <span className="flex items-center gap-2 text-[11.5px] text-text-dim tabular-nums">
                  {ARCH_DIVISION.count} items
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
                {ARCH_DIVISION.lines.map((l) => (
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
                  {ARCH_DIVISION.more}
                </li>
              </motion.ul>
            ) : null}
          </li>
          {ARCH_SCOPE_DIVISIONS_AFTER.map((d) => (
            <li key={d.label} className="px-5 py-3 flex items-center justify-between">
              <span className="text-[13px] font-ui text-text">{d.label}</span>
              <span className="text-[11.5px] text-text-dim tabular-nums">
                {d.count} items
              </span>
            </li>
          ))}
          <li className="px-5 py-3 text-[12px] text-text-muted bg-bg-elev/30">
            {ARCH_SCOPE_MORE}
          </li>
        </ul>
      </Card>

      {/* the provisional sum packages */}
      <div
        data-demo-target="packages"
        className={cn("mt-4 rounded-lg", softRing(soft === "packages"))}
      >
        <div className="flex items-baseline justify-between px-0.5">
          <Kicker>Provisional sums</Kicker>
          <p className="text-[11px] text-text-dim">
            Budgets for the client decisions still open
          </p>
        </div>
        <div className="mt-2 grid gap-2.5">
          {ARCH_PACKAGES.map((p) => {
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
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors"
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
                    Every builder carries this one figure, so the tenders
                    stay comparable while the client decides.
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
            Nothing is issued without your approval
          </p>
          <Spot id="publish" active={spot === "publish"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("publish")}>
              Approve and issue
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 4 · the round ──────────────────────────────────────────────────── */

export function ArchRoundSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 watch fill · 2 builder-view · 3 rfi · 4 go
  const filling = stepIdx === 1;
  const full = stepIdx >= 2;
  const rfiIn = stepIdx >= 3;
  const done = stepIdx >= 4;
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
        kicker="Your round"
        title="The round opens."
        sub="Your invited builders and the open spot, all pricing the scope you issued."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2 items-start">
        <Card className="px-5 py-5">
          <div className="flex items-center justify-between">
            <Kicker>Tender spots</Kicker>
            <span className="text-[11.5px] font-ui font-semibold text-text tabular-nums">
              {filled} of 3
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {ARCH_ROUND.map((b, i) => {
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
                          {b.invited
                            ? "Accepted your invitation"
                            : "Verified pool · ABN and licence checked"}
                        </span>
                      </motion.span>
                    ) : (
                      <span className="text-[12.5px] text-text-dim">
                        {b.invited ? "Invitation out" : "Open spot"}
                      </span>
                    )}
                  </span>
                  {taken ? (
                    <span className="text-[10.5px] font-ui font-semibold text-text-dim shrink-0">
                      {b.invited ? "Invited" : "Pool"}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          target="builder-view"
          className={cn("px-5 py-5", softRing(soft === "builder-view"))}
        >
          <Kicker>What the open spot sees</Kicker>
          <p className="mt-3 text-[16px] font-ui font-semibold text-text">
            {ARCH_PROJECT.title}
          </p>
          <p className="mt-1 text-[12.5px] text-text-muted">{ARCH_PROJECT.facts}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Lock className="size-3.5" />
            Address shared only when a spot is secured
          </p>
          <div className="mt-4 pt-4 border-t border-border-subtle/60 grid grid-cols-3 gap-3 text-center">
            {[
              { v: String(ARCH_TOTALS.items), label: "Scope items" },
              { v: String(ARCH_TOTALS.trades), label: "Trades" },
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
      </div>

      {rfiIn ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Card
            target="rfi"
            className={cn("mt-4 px-5 py-4", softRing(soft === "rfi"))}
          >
            <div className="flex items-center justify-between gap-3">
              <Kicker>Requests for information</Kicker>
              <motion.span
                initial={reduceMotion ? false : { opacity: 0, scale: 1.15 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : 1.55, duration: 0.3, ease: EASE }}
                className="px-2 py-0.5 rounded-full bg-accent-muted text-accent-light text-[10px] font-ui font-bold tracking-[0.08em] uppercase"
              >
                {ARCH_RFI.addendum}
              </motion.span>
            </div>
            <div className="mt-3 space-y-2.5">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.15, ease: EASE }}
                className="flex items-start gap-3"
              >
                <span className="size-7 rounded-full bg-[rgba(24,34,44,0.06)] flex items-center justify-center text-[9.5px] font-ui font-bold text-text-muted shrink-0">
                  {ARCH_RFI.initials}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-text leading-[1.55]">
                    {ARCH_RFI.question}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-dim">{ARCH_RFI.from}</p>
                </div>
              </motion.div>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduceMotion ? 0 : 1.0, ease: EASE }}
                className="flex items-start gap-3"
              >
                <span className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-accent-light shrink-0">
                  <MessageCircleQuestion className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-ui font-medium text-text leading-[1.55]">
                    {ARCH_RFI.answer}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent-light font-ui font-semibold">
                    <Check className="size-3" />
                    {ARCH_RFI.status}
                  </p>
                </div>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      ) : null}

      {done ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot id="see-tendering" active={spot === "see-tendering"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("see-tendering")}>
              See the tenders
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 5 · tenders arrive ─────────────────────────────────────────────── */

export function ArchTenderSurface({
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
        title="Every tender takes the same shape."
        sub="Each builder answers your scope item by item, then declares the rest under signature."
      />

      <Card
        target="marking"
        className={cn("mt-6 px-5 py-4", softRing(soft === "marking"))}
      >
        <div className="flex items-center justify-between">
          <Kicker>Inside a builder&rsquo;s submission</Kicker>
          <span className="text-[11px] text-text-dim tabular-nums">
            Line 38 of {ARCH_TOTALS.items}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {ARCH_MARK_ROWS.map((r, i) => (
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
        <Kicker>Every builder also declares</Kicker>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {ARCH_ASKS.map((a) => (
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

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {DEMO_TENDERS.map((t, i) => (
          <TenderDoc
            key={t.name}
            tender={t}
            here={landed > i}
            reduceMotion={reduceMotion}
            priceNote="ex GST · on your scope"
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

export function ArchCompareSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 prices · 2 show-scores · 3 receipts ·
  //        4 show-differences · 5 grid · 6 breakeven · 7 ladder ·
  //        8 show-flags · 9 questions · 10 report · 11 export
  const scores = stepIdx >= 3;
  const differing = stepIdx >= 5;
  const maths = stepIdx >= 6;
  const ladder = stepIdx >= 7;
  const flags = stepIdx >= 9;
  const report = stepIdx >= 10;
  const reveal = (on: boolean) =>
    reduceMotion || !on
      ? {}
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: EASE } };

  return (
    <div>
      <Head
        kicker="The comparison"
        title="Three tenders, side by side."
        sub="One scope, three prices, and the evidence behind every difference."
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
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
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
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
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
          <Card
            target="grid"
            className={cn("mt-4 overflow-hidden", softRing(soft === "grid"))}
          >
            <div className="px-5 py-3 border-b border-border-subtle/60 flex items-center justify-between">
              <Kicker>The decision grid</Kicker>
              <span className="text-[10.5px] text-text-dim">
                Highlighted rows are where they differ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-subtle/60">
                    <th className="px-5 py-2 text-[10px] tracking-[0.12em] uppercase text-text-dim font-ui font-semibold min-w-[150px]">
                      &nbsp;
                    </th>
                    {DEMO_TENDERS.map((t) => (
                      <th key={t.name} className="px-4 py-2 text-[11px] font-ui font-semibold text-text min-w-[110px]">
                        {t.name.split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_GRID.map((raw) => {
                    // The shared grid is homeowner voiced in one row;
                    // here the allowance carries its scope-stage name.
                    const row =
                      raw.label === "Your garden budget"
                        ? { ...raw, label: "Landscaping budget" }
                        : raw;
                    return (
                    <tr
                      key={row.label}
                      className={cn(
                        "border-b border-border-subtle/40 last:border-0",
                        row.differs && "bg-[rgba(201,148,34,0.07)]",
                      )}
                    >
                      <td className="px-5 py-2 text-[11.5px] text-text-muted">
                        {row.label}
                      </td>
                      {row.vals.map((v, i) => (
                        <td
                          key={i}
                          className={cn(
                            "px-4 py-2 text-[11.5px] tabular-nums",
                            v === "No" || v === "Not included"
                              ? "text-[#8a6414] font-ui font-medium"
                              : "text-text",
                          )}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
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
            <Kicker>The maths on the cheapest tender</Kicker>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-text">
              Corten is {fmtAud(DEMO_COMPARE.saving)} cheaper. But{" "}
              {fmtAud(DEMO_COMPARE.exposure)} of its price is not locked
              in. If that grows by{" "}
              <span className="font-ui font-semibold">
                {DEMO_COMPARE.breakevenPct} percent
              </span>
              , the saving is gone.
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
              Meridian. For that your client gets:
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
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-[12.5px] font-ui font-medium text-text hover:border-border-accent transition-colors"
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
            <Kicker>Flags, with the questions drafted</Kicker>
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

      {/* the client deliverable */}
      {report ? (
        <motion.div {...reveal(true)}>
          <Card
            target="report"
            className={cn(
              "mt-4 px-5 py-4.5 border-border-accent/40",
              softRing(soft === "report"),
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <div className="flex items-start gap-4 min-w-0">
                {/* the document itself */}
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.15, ease: EASE }}
                  className="hidden sm:block w-[88px] shrink-0 rounded-[4px] border border-border-subtle bg-white shadow-[0_10px_24px_-12px_rgba(24,34,44,0.3)] px-3 pt-3 pb-4"
                  aria-hidden
                >
                  <span className="block h-[7px] w-9 rounded-full bg-accent/70" />
                  <span className="mt-2.5 block h-[5px] w-full rounded-full bg-[rgba(24,34,44,0.14)]" />
                  <span className="mt-1.5 block h-[5px] w-4/5 rounded-full bg-[rgba(24,34,44,0.1)]" />
                  <span className="mt-3 block h-[4px] w-full rounded-full bg-[rgba(24,34,44,0.07)]" />
                  <span className="mt-1 block h-[4px] w-full rounded-full bg-[rgba(24,34,44,0.07)]" />
                  <span className="mt-1 block h-[4px] w-3/5 rounded-full bg-[rgba(24,34,44,0.07)]" />
                </motion.div>
                <div className="min-w-0">
                  <Kicker>{ARCH_REPORT.kicker}</Kicker>
                  <p className="mt-1 text-[14.5px] font-ui font-semibold text-text">
                    {ARCH_REPORT.title} · {ARCH_REPORT.client}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-text-muted">
                    {ARCH_REPORT.meta}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {ARCH_REPORT.contents.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-[12px] text-text-muted">
                        <Check className="size-3.5 text-accent-light shrink-0 mt-[1px]" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Spot id="export-report" active={spot === "export-report"} reduceMotion={reduceMotion}>
                <TealButton onClick={() => onAction("export-report")}>
                  Export for your client
                  <Download className="size-4" />
                </TealButton>
              </Spot>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
