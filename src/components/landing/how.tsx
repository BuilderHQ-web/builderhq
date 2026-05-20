"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { Upload, Users, FileSpreadsheet, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * How It Works — Base44-style scroll-linked section.
 * Sticky left column with numbered steps, morphing visual on right.
 * On mobile, simplified vertical stack with fade reveals.
 */

const STEPS = [
  {
    number: "01",
    label: "Upload",
    title: "Upload your project",
    description:
      "Upload your drawings, specs, and scope in under 10 minutes. Smart fields adapt to your build type. Everything versioned and audit-trailed.",
    icon: Upload,
  },
  {
    number: "02",
    label: "Match",
    title: "Get matched with builders",
    description:
      "Qualified builders in your area see your project preview. They unlock the full package to tender. Filtered by suburb, licence, and capacity.",
    icon: Users,
  },
  {
    number: "03",
    label: "Compare",
    title: "Compare and decide",
    description:
      "Review structured tenders side-by-side. Price, inclusions, timeline — all normalised. Message builders in-thread. Award with one click.",
    icon: FileSpreadsheet,
  },
] as const;

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Update active step based on scroll position
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const stepIndex = Math.min(
      STEPS.length - 1,
      Math.floor(latest * STEPS.length)
    );
    setActiveStep(stepIndex);
  });

  return (
    <section
      id="how"
      ref={containerRef}
      className="relative bg-surface-1/30"
    >
      {/* Desktop: Sticky scroll-linked layout */}
      <div className="hidden lg:block">
        <div className="h-[300vh]">
          <div className="sticky top-0 h-screen flex items-center overflow-hidden">
            <div className="mx-auto max-w-[1200px] w-full px-6 grid grid-cols-2 gap-16 items-center">
              {/* Left: Steps list */}
              <div>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="inline-block text-[13px] text-accent mb-6"
                >
                  How it works
                </motion.span>

                <div className="space-y-8">
                  {STEPS.map((step, i) => (
                    <StepItem
                      key={step.number}
                      step={step}
                      isActive={i === activeStep}
                      isPast={i < activeStep}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Morphing visual */}
              <div className="relative h-[500px]">
                {STEPS.map((step, i) => (
                  <StepVisual
                    key={step.number}
                    step={step}
                    isActive={i === activeStep}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Simple vertical stack */}
      <div className="lg:hidden py-20 px-6">
        <div className="mx-auto max-w-[600px]">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block text-[13px] text-accent mb-4"
          >
            How it works
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[clamp(2rem,5vw,3rem)] font-serif tracking-[-0.02em] text-text mb-12"
          >
            Three steps to your perfect builder.
          </motion.h2>

          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <MobileStep key={step.number} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepItem({
  step,
  isActive,
  isPast,
}: {
  step: (typeof STEPS)[number];
  isActive: boolean;
  isPast: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "relative pl-8 py-4 border-l-2 transition-all duration-500",
        isActive
          ? "border-accent opacity-100"
          : isPast
            ? "border-accent/30 opacity-50"
            : "border-border opacity-40",
      )}
    >
      {/* Step number indicator */}
      <div
        className={cn(
          "absolute -left-[9px] top-4 size-4 rounded-full border-2 transition-all duration-500",
          isActive
            ? "border-accent bg-accent"
            : isPast
              ? "border-accent/50 bg-accent/20"
              : "border-border bg-bg",
        )}
      />

      <div className="flex items-center gap-3 mb-2">
        <span
          className={cn(
            "text-[12px] font-mono transition-colors duration-300",
            isActive ? "text-accent" : "text-text-dim",
          )}
        >
          {step.number} / 03
        </span>
        <span
          className={cn(
            "text-[12px] transition-colors duration-300",
            isActive ? "text-text-muted" : "text-text-dim",
          )}
        >
          {step.label}
        </span>
      </div>

      <h3
        className={cn(
          "text-[24px] font-medium tracking-[-0.01em] transition-colors duration-300",
          isActive ? "text-text" : "text-text-muted",
        )}
      >
        {step.title}
      </h3>

      <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: isActive ? 1 : 0,
          height: isActive ? "auto" : 0,
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 text-[15px] text-text-muted leading-relaxed overflow-hidden"
      >
        {step.description}
      </motion.p>
    </motion.div>
  );
}

function StepVisual({
  step,
  isActive,
}: {
  step: (typeof STEPS)[number];
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{
        opacity: isActive ? 1 : 0,
        scale: isActive ? 1 : 0.95,
        y: isActive ? 0 : 20,
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute inset-0",
        !isActive && "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "h-full rounded-2xl overflow-hidden",
          "border border-border bg-bg-raised",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_40px_80px_-20px_rgba(0,0,0,0.5)]",
        )}
      >
        {/* Top accent line */}
        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-px z-10"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,212,200,0.4) 50%, transparent 100%)",
          }}
        />

        {step.number === "01" && <UploadVisual />}
        {step.number === "02" && <MatchVisual />}
        {step.number === "03" && <CompareVisual />}
      </div>
    </motion.div>
  );
}

function UploadVisual() {
  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[13px] text-text-muted">New Project</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-4">
            <Upload className="size-8 text-text-dim" />
          </div>
          <h4 className="text-[16px] font-medium text-text">
            Drop your files here
          </h4>
          <p className="mt-1 text-[13px] text-text-muted">
            Drawings, specs, scope documents
          </p>
        </div>

        {/* File list */}
        <div className="mt-8 space-y-2">
          {[
            { name: "Architectural_Plans_v3.pdf", size: "2.4 MB", done: true },
            { name: "Specifications.pdf", size: "1.1 MB", done: true },
            { name: "Scope_of_Works.docx", size: "164 KB", progress: 78 },
          ].map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-1 border border-border-subtle"
            >
              <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Upload className="size-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text truncate">{file.name}</div>
                <div className="text-[11px] text-text-dim">{file.size}</div>
              </div>
              {file.done ? (
                <span className="text-[11px] text-accent">Done</span>
              ) : (
                <span className="text-[11px] text-text-muted">{file.progress}%</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchVisual() {
  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[13px] text-text-muted">Matched Builders</span>
        <span className="ml-auto text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded">
          12 matches
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="py-4 space-y-3">
          {[
            { initials: "SC", name: "Smith & Co Builders", rating: 4.9, jobs: 47, verified: true },
            { initials: "PH", name: "Precision Homes", rating: 4.8, jobs: 32, verified: true },
            { initials: "BC", name: "Bay Constructions", rating: 4.7, jobs: 28, verified: true },
            { initials: "MR", name: "Melbourne Renovations", rating: 4.6, jobs: 19, verified: false },
          ].map((builder) => (
            <div
              key={builder.name}
              className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle hover:border-accent/30 transition-colors"
            >
              <div className="size-10 rounded-full bg-accent/20 flex items-center justify-center text-[12px] font-bold text-accent">
                {builder.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-text truncate">
                    {builder.name}
                  </span>
                  {builder.verified && (
                    <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[12px] text-text-muted">
                  <span>{builder.rating} rating</span>
                  <span className="text-text-dim">·</span>
                  <span>{builder.jobs} jobs</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-text-dim" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareVisual() {
  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[13px] text-text-muted">Tender Comparison</span>
      </div>

      <div className="flex-1 overflow-hidden py-4">
        {/* Comparison header */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-[11px] text-text-dim uppercase tracking-wider">
            Criteria
          </div>
          {["Smith & Co", "Precision", "Bay Const"].map((name) => (
            <div
              key={name}
              className="text-center text-[11px] text-text-muted font-medium"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Comparison rows */}
        {[
          { label: "Price", values: ["$1.78M", "$1.82M", "$1.86M"], best: 0 },
          { label: "Timeline", values: ["14 mo", "16 mo", "15 mo"], best: 0 },
          { label: "Warranty", values: ["7 yr", "6 yr", "6 yr"], best: 0 },
          { label: "Insurance", values: ["$5M", "$5M", "$2M"], best: 0 },
        ].map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-4 gap-2 py-3 border-b border-border-subtle"
          >
            <div className="text-[12px] text-text-muted">{row.label}</div>
            {row.values.map((value, i) => (
              <div
                key={i}
                className={cn(
                  "text-center text-[13px] tabular-nums",
                  i === row.best ? "text-accent font-medium" : "text-text",
                )}
              >
                {value}
              </div>
            ))}
          </div>
        ))}

        {/* Winner highlight */}
        <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-accent uppercase tracking-wider">
                Best value
              </div>
              <div className="text-[16px] font-medium text-text mt-1">
                Smith & Co Builders
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-accent text-bg text-[13px] font-medium">
              Award tender
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileStep({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="size-12 rounded-xl border border-border bg-surface-1 flex items-center justify-center">
          <Icon className="size-5 text-accent" />
        </div>
        <div>
          <span className="text-[12px] font-mono text-accent">
            {step.number} / 03
          </span>
          <h3 className="text-[20px] font-medium text-text">{step.title}</h3>
        </div>
      </div>
      <p className="text-[15px] text-text-muted leading-relaxed pl-16">
        {step.description}
      </p>
    </motion.div>
  );
}
