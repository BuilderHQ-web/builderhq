"use client";

/**
 * The builder demo's screens, composed from the shared product
 * primitives and driven entirely by the step index, so stepping back
 * rewinds the world for free.
 *
 * The visitor plays Meridian Homes on the Northcote project the other
 * demos run. Set pieces, one per stage: the board cascading in and
 * the invitation arriving; the terms of the project; the
 * scope in hand; marking a line and watching it land; the level
 * field assembling; the award.
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Download,
  Flag,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CoverArt } from "@/components/builder/project-cover";
import {
  Card,
  CitePill,
  EASE,
  Head,
  Kicker,
  softRing,
  Spot,
  TealButton,
  type SurfaceProps,
} from "../ui";
import {
  DEMO_COMPARE,
  DEMO_DIMENSIONS,
  DEMO_FLAGS,
  DEMO_RECEIPTS,
  DEMO_TENDERS,
  fmtAud,
} from "../content";
import {
  ARCH_ASKS,
  ARCH_DIVISION,
  ARCH_DOCUMENTS,
  ARCH_PACKAGES,
  ARCH_PROJECT,
  ARCH_RFI,
  ARCH_SCOPE_DIVISIONS,
  ARCH_SCOPE_DIVISIONS_AFTER,
  ARCH_SCOPE_MORE,
  ARCH_TOTALS,
} from "../architect/content";
import {
  BUILDER_ADDRESS,
  BUILDER_AWARD,
  BUILDER_BOARD,
  BUILDER_INVITE,
  BUILDER_MARKING,
  BUILDER_TERMS,
  type BoardListing,
} from "./content";

/** The visitor's chair. */
const YOU = "Meridian Homes";

/**
 * A project on the board, drawn as the product draws it: the cover
 * band with its type chip and budget on the left, the specification
 * on the right. The band is the product's own component, so the demo
 * cannot drift away from the card a builder actually meets.
 */
function ListingCard({
  listing,
  invited,
}: {
  listing: BoardListing;
  invited?: boolean;
}) {
  return (
    <div className="relative flex flex-col lg:flex-row rounded-xl border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <div className="relative shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-border-subtle/60 h-[104px] lg:h-auto lg:w-[188px] lg:min-h-[124px]">
        <CoverArt facts={listing.cover} scrim />
        <span className="absolute top-2.5 left-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-1 rounded-sm border border-border-subtle bg-white/75 backdrop-blur-[2px] text-[9px] tracking-[0.16em] uppercase text-text font-ui font-semibold whitespace-nowrap">
            {listing.chip}
          </span>
          {invited ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-accent/60 bg-white/75 backdrop-blur-[2px] text-[9px] tracking-[0.16em] uppercase text-accent-light font-ui font-semibold whitespace-nowrap">
              <Mail className="size-2.5" />
              Invited
            </span>
          ) : null}
        </span>
        <div className="absolute left-3 bottom-2.5">
          <p className="text-[8px] tracking-[0.18em] uppercase text-text-muted font-ui font-semibold">
            Project budget
          </p>
          <p className="mt-0.5 font-display text-[16px] leading-none tracking-[-0.01em] tabular-nums text-text">
            {listing.budget}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1 px-4 sm:px-5 py-3.5 flex flex-col justify-center gap-2">
        <div className="min-w-0">
          <p className="font-ui font-semibold text-[14px] leading-[1.3] text-text">
            {listing.title}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Lock className="size-3 text-text-dim shrink-0" />
            Address shared when your spot is secured
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {[listing.facts, `${listing.items} scope items`, `${listing.pages} pages read`].map(
            (spec) => (
              <span
                key={spec}
                className="px-2 py-1 rounded-sm bg-bg-elev/70 text-[10.5px] text-text-muted"
              >
                {spec}
              </span>
            ),
          )}
          <span className="ml-auto text-[11px] font-ui font-semibold text-accent-light tabular-nums">
            {listing.spots}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── 1 · find work ──────────────────────────────────────────────────── */

export function BuilderFindSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 board · 2 open-card · 3 invitation · 4 accept
  const inviteIn = stepIdx >= 3;
  return (
    <div>
      <Head
        kicker="Find work · Melbourne, VIC"
        title="Projects open right now"
        sub="Every one has its documents in and its scope of works written. Pick what suits your pipeline."
      />

      {inviteIn ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <Card
            target="invitation"
            className={cn(
              "mt-6 px-5 py-4 border-border-accent/50 bg-[rgba(0,212,200,0.03)]",
              softRing(soft === "invitation"),
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-accent-light shrink-0">
                <Mail className="size-3.5" />
              </span>
              <Kicker>{BUILDER_INVITE.from}</Kicker>
            </div>
            <div className="mt-3">
              <ListingCard
                invited
                listing={{
                  title: ARCH_PROJECT.title,
                  facts: ARCH_PROJECT.facts,
                  budget: "$620k to $760k",
                  spots: BUILDER_INVITE.note,
                  items: ARCH_TOTALS.items,
                  pages: ARCH_TOTALS.pages,
                  chip: BUILDER_INVITE.chip,
                  cover: BUILDER_INVITE.cover,
                }}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Spot id="accept-invite" active={spot === "accept-invite"} reduceMotion={reduceMotion}>
                <TealButton onClick={() => onAction("accept-invite")}>
                  Accept invitation
                  <ArrowRight className="size-4" />
                </TealButton>
              </Spot>
            </div>
          </Card>
        </motion.div>
      ) : null}

      <div
        data-demo-target="board"
        className={cn("mt-5 rounded-lg", softRing(soft === "board"))}
      >
        <div className="flex items-baseline justify-between px-0.5">
          <Kicker>Open to verified builders</Kicker>
          <p className="text-[11px] text-text-dim">
            {BUILDER_BOARD.length} projects open in your area
          </p>
        </div>
        <div className="mt-2 grid gap-2.5">
          {BUILDER_BOARD.map((b, i) => (
            <motion.div
              key={b.title}
              data-demo-target={i === 0 ? "open-card" : undefined}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: reduceMotion ? 0 : i * 0.1, ease: EASE }}
              className={cn("rounded-xl", i === 0 && softRing(soft === "open-card"))}
            >
              <ListingCard listing={b} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 2 · the project ────────────────────────────────────────────────── */

export function BuilderProjectSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 brief · 2 terms · 3 open-scope
  const termsIn = stepIdx >= 2;
  const ready = stepIdx >= 3;
  return (
    <div>
      <Head
        kicker="Your project"
        title={ARCH_PROJECT.title}
        sub="Your spot is secured. Everything below is yours before you price a single line."
        right={
          <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-accent-muted text-accent-light text-[11.5px] font-ui font-semibold">
            <Check className="size-3.5" />
            Spot secured
          </span>
        }
      />

      <Card
        target="brief"
        className={cn("mt-6 px-5 py-4", softRing(soft === "brief"))}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <Kicker>The project</Kicker>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-ui font-medium text-text">
              <MapPin className="size-3.5 text-accent-light" />
              {BUILDER_ADDRESS}
            </p>
            <p className="mt-1 text-[12px] text-text-muted">
              {ARCH_PROJECT.facts}
            </p>
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] text-accent-light font-ui font-semibold">
              <Download className="size-3.5" />
              {ARCH_TOTALS.documents} documents · {ARCH_TOTALS.pages} pages · Download the set
            </p>
          </div>
          <div className="flex items-center gap-5 sm:gap-7">
            {[
              { v: ARCH_TOTALS.items, label: "Scope items" },
              { v: ARCH_TOTALS.trades, label: "Trades" },
            ].map((s) => (
              <div key={s.label} className="text-right">
                <p className="font-display text-[24px] leading-none text-text tabular-nums">
                  {s.v}
                </p>
                <p className="mt-1 text-[9px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <ul className="mt-3 pt-3 border-t border-border-subtle/60 flex flex-wrap gap-1.5">
          {ARCH_DOCUMENTS.slice(0, 5).map((d) => (
            <li
              key={d.name}
              className="px-2.5 py-1 rounded-full border border-border-subtle text-[10.5px] text-text-muted"
            >
              {d.name}
            </li>
          ))}
          <li className="px-2.5 py-1 rounded-full border border-dashed border-border-subtle text-[10.5px] text-text-dim">
            and {ARCH_TOTALS.documents - 5} more
          </li>
        </ul>
      </Card>

      {termsIn ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Card
            target="terms"
            className={cn("mt-4 px-5 py-4", softRing(soft === "terms"))}
          >
            <Kicker>How this project works</Kicker>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {BUILDER_TERMS.map((t) => (
                <div
                  key={t.label}
                  className="rounded-md border border-border-subtle px-3.5 py-3"
                >
                  <p className="flex items-start gap-2 text-[12.5px] font-ui font-semibold text-text">
                    <Check className="size-3.5 text-accent-light shrink-0 mt-[2px]" />
                    {t.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-[1.5] text-text-muted">
                    {t.why}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3.5 pt-3 border-t border-border-subtle/60 text-[11px] text-text-dim">
              What your quote is read against, published before you price:
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_DIMENSIONS.map((d) => (
                <li
                  key={d.label}
                  className="px-2.5 py-1 rounded-full bg-accent-muted text-accent-light text-[10.5px] font-ui font-semibold"
                >
                  {d.label} · {d.weight}%
                </li>
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
          className="mt-6 flex justify-end"
        >
          <Spot id="open-scope" active={spot === "open-scope"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("open-scope")}>
              Open the scope of works
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 3 · the scope in hand ──────────────────────────────────────────── */

export function BuilderScopeSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 expand · 2 cite · 3 fixed budgets · 4 start
  const expanded = stepIdx >= 2;
  const ready = stepIdx >= 4;
  return (
    <div>
      <Head
        kicker={ARCH_PROJECT.title}
        title="Scope of works"
        sub="Written and checked before you arrived. Every builder prices this same list."
        right={
          <div className="flex items-center gap-5 sm:gap-7">
            {[
              { v: ARCH_TOTALS.items, label: "Items" },
              { v: ARCH_TOTALS.trades, label: "Trades" },
              { v: ARCH_TOTALS.evidenced, label: "Cited lines" },
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

      {/* the fixed budgets */}
      <div
        data-demo-target="packages"
        className={cn("mt-4 rounded-lg", softRing(soft === "packages"))}
      >
        <div className="flex items-baseline justify-between px-0.5">
          <Kicker>Provisional sums</Kicker>
          <p className="text-[11px] text-text-dim">
            Set by the client. The same figure for every builder.
          </p>
        </div>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          {ARCH_PACKAGES.map((p) => (
            <Card key={p.id} className="px-4 py-3.5">
              <p className="text-[13px] font-ui font-semibold text-text">
                {p.title}
              </p>
              <p className="mt-1 font-display text-[20px] leading-none text-text tabular-nums">
                {fmtAud(p.amount)}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-text-muted">
                <Lock className="size-2.5" />
                Carried by every builder
              </p>
            </Card>
          ))}
        </div>
      </div>

      {ready ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mt-6 flex justify-end"
        >
          <Spot id="start-tender" active={spot === "start-tender"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("start-tender")}>
              Start your tender
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 4 · your tender ────────────────────────────────────────────────── */

export function BuilderTenderSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 mark · 2 rfi · 3 declarations · 4 submit
  const marked = stepIdx >= 2;
  const rfiIn = stepIdx >= 2;
  const declareIn = stepIdx >= 3;
  const ready = stepIdx >= 4;
  const line = ARCH_DIVISION.lines[0]!;
  return (
    <div>
      <Head
        kicker={`Your tender · ${YOU}`}
        title="Answer the list."
        sub="Every line gets one of three answers. The client sees exactly what you say."
        right={
          <div className="text-right">
            <p className="font-display text-[24px] leading-none text-text tabular-nums">
              {marked ? 12 : 11}
              <span className="text-[14px] text-text-dim"> of {ARCH_TOTALS.items}</span>
            </p>
            <p className="mt-1 text-[9px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
              Lines answered
            </p>
          </div>
        }
      />

      <Card className="mt-6 px-5 py-4">
        <div className="flex items-center justify-between">
          <Kicker>{BUILDER_MARKING.position}</Kicker>
          <span className="text-[11px] text-text-dim">{ARCH_DIVISION.label}</span>
        </div>
        <div className="mt-3 rounded-md border border-border-subtle px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <p className="text-[13.5px] font-ui font-medium text-text">
              {line.label}
            </p>
            <CitePill cite={line.cite} />
          </div>
          <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted max-w-[68ch]">
            {line.note}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {BUILDER_MARKING.states.map((s0) => {
              const isPick = s0 === "Included";
              if (marked) {
                return isPick ? (
                  <motion.span
                    key={s0}
                    initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent-muted text-accent-light text-[12px] font-ui font-semibold"
                  >
                    <Check className="size-3.5" />
                    Included
                  </motion.span>
                ) : null;
              }
              const btn = (
                <button
                  type="button"
                  onClick={() => isPick && onAction("mark-included")}
                  aria-disabled={!isPick}
                  className={cn(
                    "inline-flex items-center h-9 px-4 rounded-full border text-[12px] font-ui font-medium transition-colors",
                    isPick
                      ? "border-border-strong text-text hover:border-border-accent"
                      : "border-border-subtle text-text-muted cursor-default",
                  )}
                >
                  {s0}
                </button>
              );
              return isPick ? (
                <Spot key={s0} id="mark-included" active={spot === "mark-included"} reduceMotion={reduceMotion}>
                  {btn}
                </Spot>
              ) : (
                <span key={s0}>{btn}</span>
              );
            })}
            {marked ? (
              <motion.span
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.35 }}
                className="text-[11.5px] text-text-dim"
              >
                Saved. Next line ready.
              </motion.span>
            ) : null}
          </div>
        </div>
      </Card>

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
              <Kicker>Round notices</Kicker>
              <span className="px-2 py-0.5 rounded-full bg-accent-muted text-accent-light text-[10px] font-ui font-bold tracking-[0.08em] uppercase">
                {ARCH_RFI.addendum}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-[12.5px] text-text leading-[1.55]">
                {ARCH_RFI.question}
              </p>
              <p className="text-[12.5px] font-ui font-medium text-text leading-[1.55]">
                {ARCH_RFI.answer}
              </p>
              <p className="inline-flex items-center gap-1 text-[11px] text-accent-light font-ui font-semibold">
                <Check className="size-3" />
                {ARCH_RFI.status}
              </p>
            </div>
          </Card>
        </motion.div>
      ) : null}

      {declareIn ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Card
            target="declarations"
            className={cn("mt-4 px-5 py-4", softRing(soft === "declarations"))}
          >
            <Kicker>Declared under signature</Kicker>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {ARCH_ASKS.map((a) => (
                <li
                  key={a}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border-subtle text-[11.5px] text-text-muted"
                >
                  <Check className="size-3 text-accent-light" />
                  {a}
                </li>
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
          className="mt-6 flex flex-wrap items-center justify-between gap-4"
        >
          <p className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <ShieldCheck className="size-3.5 text-accent-light" />
            {BUILDER_MARKING.summary}
          </p>
          <Spot id="submit" active={spot === "submit"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("submit")}>
              Submit your tender
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 5 · the level field ────────────────────────────────────────────── */

export function BuilderCompareSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 watch land · 2 prices · 3 gaps · 4 scores ·
  //        5 flags · 6 outcome
  const landing = stepIdx === 1;
  const landed = stepIdx >= 2;
  const gapsIn = stepIdx >= 3;
  const scoresIn = stepIdx >= 4;
  const flagsIn = stepIdx >= 5;
  const ready = stepIdx >= 6;
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!landing || reduceMotion) return;
    const timers = [0, 1, 2].map((n) =>
      setTimeout(() => setTicks(n + 1), n === 0 ? 400 : 400 + n * 1300),
    );
    return () => timers.forEach(clearTimeout);
  }, [landing, reduceMotion]);
  const others = landed || (landing && reduceMotion) ? 2 : landing ? ticks : 0;

  const reveal = (on: boolean) =>
    reduceMotion || !on
      ? {}
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: EASE } };

  // You first, then the others as they land.
  const you = DEMO_TENDERS.find((t) => t.name === YOU)!;
  const rivals = DEMO_TENDERS.filter((t) => t.name !== YOU);
  const shown = [you, ...rivals.slice(0, others)];

  return (
    <div>
      <Head
        kicker="The client's view"
        title="Three tenders, one scope."
        sub="This is what the owner sees when the quotes are in."
      />

      <div
        data-demo-target="price-row"
        className={cn("mt-6 grid gap-3 sm:grid-cols-3 rounded-lg", softRing(soft === "price-row"))}
      >
        {DEMO_TENDERS.map((t) => {
          const here = shown.some((s) => s.name === t.name);
          const isYou = t.name === YOU;
          return (
            <div
              key={t.name}
              className={cn(
                "rounded-lg border min-h-[132px] transition-colors",
                here
                  ? isYou
                    ? "border-border-accent/60 bg-white shadow-[0_1px_2px_rgba(24,34,44,0.06),_0_14px_36px_-18px_rgba(24,34,44,0.25)]"
                    : "border-border-subtle bg-white shadow-[0_1px_2px_rgba(24,34,44,0.06),_0_14px_36px_-18px_rgba(24,34,44,0.25)]"
                  : "border-dashed border-border-subtle",
              )}
            >
              {here ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="px-4 py-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-7 rounded-full bg-accent-muted flex items-center justify-center text-[10px] font-ui font-bold text-accent-light shrink-0">
                        {t.initials}
                      </span>
                      {isYou ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-accent-contrast text-[9px] font-ui font-bold tracking-[0.08em] uppercase">
                          You
                        </span>
                      ) : null}
                    </span>
                    {scoresIn ? (
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
                  <p className="mt-1 font-display text-[22px] leading-none text-text tabular-nums">
                    {fmtAud(t.price)}
                  </p>
                  <div className="mt-2.5">
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
                  {scoresIn ? (
                    <motion.ul {...reveal(true)} className="mt-3 pt-3 border-t border-border-subtle/60 space-y-1.5">
                      {DEMO_DIMENSIONS.slice(0, 3).map((d, di) => (
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
                </motion.div>
              ) : (
                <p className="text-[11.5px] text-text-dim pt-[54px] text-center">
                  Awaiting tender
                </p>
              )}
            </div>
          );
        })}
      </div>

      {gapsIn ? (
        <motion.div {...reveal(true)}>
          <Card
            target="gaps"
            className={cn(
              "mt-4 px-5 py-4 border-[rgba(201,148,34,0.35)]",
              softRing(soft === "gaps"),
            )}
          >
            <Kicker>What the client sees on the cheapest tender</Kicker>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-text">
              Corten is {fmtAud(DEMO_COMPARE.saving)} under you, but{" "}
              {fmtAud(DEMO_COMPARE.exposure)} of that price is not locked
              in. If it grows by{" "}
              <span className="font-ui font-semibold">
                {DEMO_COMPARE.breakevenPct} percent
              </span>
              , the saving is gone. That maths is shown to the client.
            </p>
          </Card>
        </motion.div>
      ) : null}

      {scoresIn ? (
        <motion.div {...reveal(true)}>
          <Card
            target="receipts"
            className={cn("mt-4 px-5 py-4", softRing(soft === "receipts"))}
          >
            <div className="flex items-center justify-between gap-3">
              <Kicker>
                Your {DEMO_RECEIPTS.dimension} · why {DEMO_RECEIPTS.score}?
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
            <p className="mt-2.5 pt-2.5 border-t border-border-subtle/60 text-[11.5px] text-text-muted">
              Every score, for every builder, shows its working like this.
            </p>
          </Card>
        </motion.div>
      ) : null}

      {flagsIn ? (
        <motion.div {...reveal(true)}>
          <Card
            target="flags"
            className={cn("mt-4 px-5 py-4", softRing(soft === "flags"))}
          >
            <div className="flex items-center justify-between gap-3">
              <Kicker>Flags on this project</Kicker>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-ui font-semibold text-accent-light">
                <ShieldCheck className="size-3.5" />
                Your tender drew none
              </span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {DEMO_FLAGS.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <Flag className="size-3.5 text-[#8a6414] shrink-0 mt-[3px]" />
                  <span className="min-w-0 text-[12.5px] text-text">
                    {f.label}
                    <span className="ml-2 text-[10.5px] text-text-dim">
                      {f.builder.split(" ")[0]}
                    </span>
                  </span>
                </li>
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
          className="mt-6 flex justify-end"
        >
          <Spot id="see-outcome" active={spot === "see-outcome"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("see-outcome")}>
              See the outcome
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── 6 · the award ──────────────────────────────────────────────────── */

export function BuilderAwardSurface({
  stepIdx,
  spot,
  soft,
  onAction,
  reduceMotion,
}: SurfaceProps) {
  // Beats: 0 intro · 1 award · 2 finish
  const awarded = stepIdx >= 1;
  const ready = stepIdx >= 2;
  const you = DEMO_TENDERS.find((t) => t.name === YOU)!;
  return (
    <div>
      <Head
        kicker="The outcome"
        title="The award"
        sub="The decision, made with everything on the table."
      />

      {awarded ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <Card
            target="award"
            className={cn(
              "mt-6 px-6 py-6 border-border-accent/50",
              softRing(soft === "award"),
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <span className="relative size-[64px] shrink-0" aria-hidden>
                <svg viewBox="0 0 68 68" className="absolute inset-0">
                  <circle cx="34" cy="34" r="31" fill="none" stroke="rgba(24,34,44,0.08)" strokeWidth="2" />
                  <motion.circle
                    cx="34" cy="34" r="31" fill="none" stroke="#00a69b" strokeWidth="2"
                    strokeLinecap="round" transform="rotate(-90 34 34)"
                    initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: EASE }}
                  />
                  <motion.path
                    d="M23 35 L31 43 L46 26" fill="none" stroke="#0a7d73"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.7, ease: EASE }}
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-ui font-semibold text-text">
                  {BUILDER_AWARD.headline}
                </p>
                <p className="mt-1 text-[12.5px] text-text-muted">
                  {ARCH_PROJECT.title} · {fmtAud(you.price)}
                </p>
                <p className="mt-1 text-[12.5px] text-text-muted">
                  {BUILDER_AWARD.line}
                </p>
              </div>
            </div>
            <ul className="mt-5 pt-4 border-t border-border-subtle/60 grid gap-2 sm:grid-cols-3">
              {BUILDER_AWARD.points.map((p0, i) => (
                <motion.li
                  key={p0}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.6 + i * 0.12, ease: EASE }}
                  className="flex items-start gap-2 text-[12px] text-text-muted"
                >
                  <BadgeCheck className="size-3.5 text-accent-light shrink-0 mt-[1px]" />
                  {p0}
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
          className="mt-6 flex justify-end"
        >
          <Spot id="finish" active={spot === "finish"} reduceMotion={reduceMotion}>
            <TealButton onClick={() => onAction("finish")}>
              Finish
              <ArrowRight className="size-4" />
            </TealButton>
          </Spot>
        </motion.div>
      ) : null}
    </div>
  );
}
