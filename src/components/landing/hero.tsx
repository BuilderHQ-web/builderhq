"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hero — staggered Bebas treatment, mock dashboard cards on the right.
 * Word-by-word entrance (UPLOAD → COMPARE → BUILD) sets the rhythm of
 * the whole page.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="relative pt-32 lg:pt-40 pb-20 lg:pb-28 px-6 md:px-10"
    >
      {/* Hairline corner brackets — subtle blueprint motif. */}
      <CornerBrackets />

      <div className="mx-auto max-w-[1320px] grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-14 items-end">
        {/* Left — copy */}
        <div>
          <Eyebrow>Australia&apos;s residential tender platform</Eyebrow>

          <h1 className="mt-7 font-display uppercase tracking-[-0.015em] leading-[0.83] text-[clamp(4rem,11vw+1rem,9rem)]">
            <Row delay={0}>
              <span
                className="block text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.72)" }}
              >
                Upload
              </span>
            </Row>
            <Row delay={0.08}>
              <span className="block text-text">Compare</span>
            </Row>
            <Row delay={0.16}>
              <span
                className="block text-accent-light"
                style={{
                  textShadow:
                    "0 0 50px rgba(0,212,200,0.32), 0 0 100px rgba(0,212,200,0.12)",
                }}
              >
                Build.
              </span>
            </Row>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 max-w-[36rem] text-[15.5px] leading-[1.85] text-text-subtle"
          >
            Upload your project once. Reach builders ready to tender, compare
            responses with clarity, and keep every document and conversation in
            one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/signup"
              className={cn(
                "group inline-flex items-center gap-2 h-12 px-7 rounded-full",
                "bg-accent text-accent-contrast",
                "text-[13px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
              )}
            >
              Upload a project
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/signup"
              className={cn(
                "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full",
                "border border-border-strong text-text",
                "text-[13px] tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-surface-1",
              )}
            >
              Browse projects as builder
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-3xl"
          >
            <ProofCard label="For project owners" value="Upload once. Let builders come to you." />
            <ProofCard label="For builders" value="Find tender-ready residential work faster." />
            <ProofCard label="One platform" value="Projects · docs · messages · tenders" />
          </motion.div>
        </div>

        {/* Right — mock dashboard */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-[640px] hidden lg:block"
        >
          <ProjectMock />
          <PipelineMock />
          <AlertsMock />
        </motion.div>
      </div>
    </section>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="inline-block text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium"
    >
      {children}
    </motion.span>
  );
}

function CornerBrackets() {
  return (
    <>
      <span className="hidden lg:block absolute top-7 left-7 w-8 h-8 border-t border-l border-border-accent pointer-events-none" />
      <span className="hidden lg:block absolute top-7 right-7 w-8 h-8 border-t border-r border-border-accent pointer-events-none" />
      <span className="hidden lg:block absolute bottom-7 left-7 w-8 h-8 border-b border-l border-border-accent pointer-events-none" />
      <span className="hidden lg:block absolute bottom-7 right-7 w-8 h-8 border-b border-r border-border-accent pointer-events-none" />
    </>
  );
}

function ProofCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="group rounded-md border border-border-subtle px-4 py-3.5 backdrop-blur-sm transition-[border-color,transform] duration-[200ms] hover:border-border-accent hover:-translate-y-0.5"
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))" }}
    >
      <div className="text-[9px] tracking-[0.2em] uppercase text-text-dim mb-1.5">{label}</div>
      <div className="font-ui font-semibold text-[13.5px] leading-[1.4] text-text">{value}</div>
    </div>
  );
}

// ── mock cards (right column) ────────────────────────────────────────────

function MockCard({
  className,
  title,
  badge,
  children,
}: {
  className?: string;
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute rounded-md border border-[rgba(100,180,255,0.14)] backdrop-blur-xl overflow-hidden",
        "shadow-[0_32px_80px_rgba(0,0,0,0.45)]",
        "transition-[border-color,box-shadow] duration-[350ms] hover:border-border-accent",
        className,
      )}
      style={{
        background: "linear-gradient(160deg, rgba(10,30,48,0.94), rgba(6,18,30,0.97))",
      }}
    >
      <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-[rgba(255,255,255,0.05)]">
        <span className="text-[9px] tracking-[0.18em] uppercase text-text-muted">{title}</span>
        <span className="px-2 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.14em] uppercase text-accent">
          {badge}
        </span>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function ProjectMock() {
  return (
    <MockCard className="top-0 right-0 w-[84%]" title="Project uploaded" badge="Tender open">
      <div className="relative h-[115px] mb-3 rounded-sm overflow-hidden border border-[rgba(255,255,255,0.05)]"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(0,212,200,0.14), transparent 36%), radial-gradient(circle at 80% 10%, rgba(26,95,212,0.36), transparent 30%), linear-gradient(135deg, #0a1f31, #10283b)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(142,252,244,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(180deg, black 30%, transparent 100%)",
          }}
        />
        <div className="absolute bottom-[8%] left-[8%] right-[8%] h-[55%] flex gap-2 items-end">
          {[52, 78, 94, 64].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-sm border border-[rgba(142,252,244,0.18)]"
              style={{
                height: `${h}%`,
                background: "linear-gradient(180deg, rgba(142,252,244,0.18), rgba(0,212,200,0.04))",
                animation: `barRise 5s ease-in-out ${i * 0.25}s infinite`,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          ["Project", "Niddrie Townhouse"],
          ["Type", "Luxury single dwelling"],
          ["Location", "Melbourne, VIC"],
          ["Package", "Plans + specs + scope"],
        ].map(([dl, val]) => (
          <div key={dl} className="px-3 py-2 border border-[rgba(255,255,255,0.05)] rounded-sm bg-[rgba(255,255,255,0.02)]">
            <span className="block text-[9px] tracking-[0.16em] uppercase text-text-dim mb-1">{dl}</span>
            <strong className="block text-[12px] font-medium text-text">{val}</strong>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function PipelineMock() {
  return (
    <MockCard className="left-0 bottom-12 w-[57%]" title="Builder interest" badge="Live">
      <div className="flex flex-col gap-2">
        {[
          ["Matched", 100, "18"],
          ["Unlocked", 76, "12"],
          ["Preparing", 58, "07"],
          ["Submitted", 32, "03"],
        ].map(([label, pct, value]) => (
          <div
            key={label as string}
            className="grid grid-cols-[68px_1fr_24px] items-center gap-2 px-3 py-2 border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] rounded-sm"
          >
            <span className="text-[9px] tracking-[0.16em] uppercase text-text-dim">{label}</span>
            <div className="h-[5px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #1a5fd4, #00d4c8)",
                }}
              />
            </div>
            <b className="text-[11px] font-semibold text-text text-right">{value}</b>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function AlertsMock() {
  return (
    <MockCard className="right-[4%] bottom-0 w-[50%]" title="Owner action" badge="Now">
      <div className="flex flex-col gap-1.5">
        {[
          ["Compare builders", "Profile · tender · message"],
          ["Scope question", "Attached to project"],
        ].map(([t, s]) => (
          <div
            key={t as string}
            className="flex items-center justify-between px-3 py-2 border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] rounded-sm"
          >
            <div>
              <b className="block text-[12px] font-medium text-text">{t}</b>
              <small className="block text-[9px] tracking-[0.12em] uppercase text-text-dim mt-0.5">{s}</small>
            </div>
            <span
              className="size-1.5 rounded-full bg-accent-light"
              style={{
                boxShadow: "0 0 12px rgba(0,212,200,0.7)",
                animation: "dotPulse 2.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>
    </MockCard>
  );
}
