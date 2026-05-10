"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CtaLinks } from "./cta-links";

/**
 * Hero — Resend-clean. One headline, one tagline, two CTAs, one
 * refined dashboard card. Signal-dot kicker + word-by-word reveal +
 * a hairline scan-line that sweeps once on mount give it premium
 * polish without crowding the message.
 */
export function Hero({ cta }: { cta: CtaLinks }) {
  return (
    <section
      id="hero"
      className="relative isolate pt-36 lg:pt-44 pb-24 lg:pb-32 px-6 md:px-10 overflow-hidden"
    >
      {/* Single scan-line sweep on mount — subtle premium signal */}
      <motion.span
        aria-hidden
        initial={{ y: "-30vh", opacity: 0 }}
        animate={{ y: "120vh", opacity: [0, 0.5, 0.5, 0] }}
        transition={{
          duration: 1.8,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.25,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.8), transparent)",
        }}
      />

      <div className="mx-auto max-w-[1320px] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-16 lg:gap-20 items-center">
        {/* Left — copy */}
        <div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
            </span>
            Australian residential tendering
          </motion.span>

          <h1 className="mt-7 font-display uppercase tracking-[-0.018em] leading-[0.9] text-[clamp(3rem,7.5vw+1rem,7rem)]">
            <Row delay={0}>
              <span className="block text-text">Tender</span>
            </Row>
            <Row delay={0.08}>
              <span
                className="block text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.55)" }}
              >
                your build.
              </span>
            </Row>
            <Row delay={0.16}>
              <span
                className="block text-accent-light"
                style={{
                  textShadow:
                    "0 0 60px rgba(0,212,200,0.32), 0 0 120px rgba(0,212,200,0.12)",
                }}
              >
                In days.
              </span>
            </Row>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 max-w-[34rem] text-[16px] leading-[1.7] text-text-subtle"
          >
            Upload your project once. Get matched with verified builders,
            compare tenders side-by-side — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href={cta.primary.href}
              className={cn(
                "group inline-flex items-center gap-2 h-12 px-7 rounded-full",
                "bg-accent text-accent-contrast",
                "text-[13px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
                "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]",
              )}
            >
              {cta.primary.label}
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href={cta.secondary.href}
              className="group inline-flex items-center gap-1.5 text-[13px] tracking-[0.02em] text-text-muted hover:text-text transition-colors duration-[160ms]"
            >
              {cta.secondary.label}
              <ArrowUpRight className="size-3.5 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          </motion.div>

          {/* Trust strip — short, confident proof points under the CTAs.
              Each one's a real platform behaviour, not a slogan. */}
          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-[11px] tracking-[0.04em] text-text-dim"
          >
            <ProofItem label="Free for project owners" />
            <ProofItem label="ABR + state-register verified" />
            <ProofItem label="Australian residential only" />
          </motion.ul>
        </div>

        {/* Right — single refined visual */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden lg:block"
        >
          <ProjectCard />
        </motion.div>
      </div>
    </section>
  );
}

function Row({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ delay, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function ProofItem({ label }: { label: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-[5px] rounded-full bg-accent-light"
        style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
      />
      {label}
    </li>
  );
}

// ── single product preview card ─────────────────────────────────────────
//
// This is the right-side "see what you'll be using" peek. Designed
// to mirror the actual tender comparison page that owners land on
// after publish — verification chips, recommendation badge, median-
// delta pill — so the hero promise ("compare side-by-side") is
// visualised, not just stated.

function ProjectCard() {
  return (
    <div
      className="relative rounded-lg border border-[rgba(100,180,255,0.12)] backdrop-blur-xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.92), rgba(6,18,30,0.96))",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0,212,200,0.12), transparent 60%)",
        }}
      />

      {/* Top bar — mimics the tender comparison page header */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-ui">
            Niddrie Townhouse · 3 tenders
          </span>
        </div>
        <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
          Comparing
        </span>
      </div>

      {/* Pulse strip — three KPI cells echoing the real ProjectPulseHeader */}
      <div className="relative grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.05)]">
        <PulseCell label="Median" value="$1.86M" />
        <PulseCell label="Spread" value="7%" tone="accent" />
        <PulseCell label="Verified" value="100%" tone="accent" />
      </div>

      {/* Two stacked tender rows — preview of the comparison cards.
          Top row carries a "Best value" recommendation badge so the
          card matches the actual product UI. */}
      <div className="p-5 space-y-3">
        <TenderRow
          initials="JS"
          name="Smith Builders"
          price="$1.78M"
          delta="-4% median"
          recommendation="Best value"
          highlight
        />
        <TenderRow
          initials="AC"
          name="Chen Construction"
          price="$1.91M"
          delta="+3% median"
        />
        <TenderRow
          initials="MR"
          name="Roberts &amp; Co"
          price="$1.88M"
          delta="+1% median"
        />
      </div>
    </div>
  );
}

function PulseCell({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={
          tone === "accent"
            ? "font-display tabular-nums leading-none text-accent-light"
            : "font-display tabular-nums leading-none text-text"
        }
        style={{ fontSize: 18 }}
      >
        {value}
      </div>
    </div>
  );
}

function TenderRow({
  initials,
  name,
  price,
  delta,
  recommendation,
  highlight,
}: {
  initials: string;
  name: string;
  price: string;
  delta: string;
  recommendation?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "relative flex items-center gap-3 px-3.5 py-3 rounded-sm border",
        highlight
          ? "border-border-accent/55 bg-[rgba(0,212,200,0.05)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      ].join(" ")}
    >
      {/* Avatar */}
      <span
        className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {initials}
      </span>

      {/* Builder block */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-text truncate">
            {name}
          </span>
          {recommendation ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.16em] uppercase text-accent-light font-semibold">
              {recommendation}
            </span>
          ) : null}
        </div>
        <div className="text-[10px] text-text-dim">
          ABN ✓ · Licence ✓
        </div>
      </div>

      {/* Price + delta */}
      <div className="text-right shrink-0">
        <div
          className={[
            "font-display tabular-nums leading-none",
            highlight ? "text-accent-light" : "text-text",
          ].join(" ")}
          style={{ fontSize: 18 }}
        >
          {price}
        </div>
        <div
          className={[
            "text-[9.5px] mt-0.5 tabular-nums",
            highlight ? "text-accent-light/80" : "text-text-dim",
          ].join(" ")}
        >
          {delta}
        </div>
      </div>
    </div>
  );
}
