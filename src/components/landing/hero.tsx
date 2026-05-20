"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CtaLinks } from "./cta-links";

/**
 * Hero — Premium Resend-style.
 * Massive serif headline, calm subhead, single CTA, floating product card.
 * Clean, minimal, maximum impact.
 */
export function Hero({ cta }: { cta: CtaLinks }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const cardY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const cardRotate = useTransform(scrollYProgress, [0, 1], [0, 5]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 lg:pt-32 lg:pb-24 px-6 overflow-hidden"
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,212,200,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] w-full">
        {/* Main content - centered */}
        <div className="text-center">
          {/* Kicker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle bg-surface-1/50 text-[13px] text-text-muted">
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
                <span className="relative size-2 rounded-full bg-accent" />
              </span>
              Now open for Australian residential projects
            </span>
          </motion.div>

          {/* Headline - Massive, elegant */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 lg:mt-12 font-serif text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.02em] text-text"
          >
            Tender your build.
            <br />
            <span className="text-text-muted">In days, not months.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 lg:mt-8 mx-auto max-w-[540px] text-[17px] lg:text-[19px] leading-relaxed text-text-muted"
          >
            Upload your project once. Get matched with verified builders.
            Compare tenders side-by-side — all in one place.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 lg:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href={cta.primary.href}
              className={cn(
                "group inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-full",
                "bg-text text-bg text-[15px] font-medium",
                "hover:bg-text/90 transition-all duration-300",
              )}
            >
              {cta.primary.label}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href={cta.secondary.href}
              className="inline-flex items-center justify-center h-14 px-6 text-[15px] text-text-muted hover:text-text transition-colors duration-200"
            >
              {cta.secondary.label}
            </Link>
          </motion.div>
        </div>

        {/* Floating product card */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ y: cardY, rotateX: cardRotate, opacity: cardOpacity }}
          className="mt-16 lg:mt-24 mx-auto max-w-[900px] [perspective:1200px]"
        >
          <HeroCard />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Premium floating product card - shows tender comparison
 */
function HeroCard() {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "border border-border bg-bg-raised",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_40px_80px_-20px_rgba(0,0,0,0.5)]",
      )}
    >
      {/* Top accent line */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,212,200,0.4) 50%, transparent 100%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[13px] text-text-muted">Tender Comparison</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
            <span className="relative size-2 rounded-full bg-accent" />
          </span>
          <span className="text-[12px] text-accent">Live</span>
        </div>
      </div>

      {/* Content - Tender comparison table */}
      <div className="p-6">
        {/* Project header */}
        <div className="mb-6">
          <h3 className="text-[18px] font-medium text-text">
            Hampton Residence — New Build
          </h3>
          <p className="mt-1 text-[14px] text-text-muted">
            4 bed, 3 bath · 320m² · Hampton East, VIC
          </p>
        </div>

        {/* Tender rows */}
        <div className="space-y-3">
          <TenderRow
            rank={1}
            name="Smith & Co Builders"
            price="$1,780,000"
            savings="-4.2%"
            verified
            recommended
          />
          <TenderRow
            rank={2}
            name="Precision Homes"
            price="$1,825,000"
            savings="-1.8%"
            verified
          />
          <TenderRow
            rank={3}
            name="Bay Constructions"
            price="$1,858,000"
            savings="Base"
            verified
          />
        </div>

        {/* Bottom stats */}
        <div className="mt-6 pt-6 border-t border-border-subtle flex items-center justify-between">
          <div>
            <div className="text-[12px] text-text-dim uppercase tracking-wider">
              Potential savings
            </div>
            <div className="mt-1 text-[24px] font-medium text-accent tabular-nums">
              $78,000
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-text-dim uppercase tracking-wider">
              Avg response time
            </div>
            <div className="mt-1 text-[24px] font-medium text-text tabular-nums">
              4.2 days
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenderRow({
  rank,
  name,
  price,
  savings,
  verified,
  recommended,
}: {
  rank: number;
  name: string;
  price: string;
  savings: string;
  verified?: boolean;
  recommended?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-colors duration-200",
        recommended
          ? "bg-accent/5 border border-accent/20"
          : "bg-surface-1 border border-transparent hover:bg-surface-2",
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "flex items-center justify-center size-8 rounded-full text-[14px] font-medium",
          recommended
            ? "bg-accent text-bg"
            : "bg-surface-2 text-text-muted",
        )}
      >
        {rank}
      </div>

      {/* Builder info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-text truncate">
            {name}
          </span>
          {verified && (
            <span className="shrink-0 text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
              Verified
            </span>
          )}
          {recommended && (
            <span className="shrink-0 text-[10px] text-accent font-medium">
              Best value
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <div className="text-[16px] font-medium text-text tabular-nums">
          {price}
        </div>
        <div
          className={cn(
            "text-[12px] tabular-nums",
            savings.startsWith("-") ? "text-accent" : "text-text-dim",
          )}
        >
          {savings}
        </div>
      </div>
    </div>
  );
}
