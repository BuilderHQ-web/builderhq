"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { FileText, Users, BarChart3, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Features — Resend-style clean section.
 * Centered heading, 3x2 feature grid with icons, large product screenshot below.
 */

const FEATURES = [
  {
    icon: FileText,
    title: "Project workspace",
    description:
      "Drawings, specs, and scope on one shareable page. Versioned and audit-trailed.",
  },
  {
    icon: Users,
    title: "Matched builders",
    description:
      "Filtered by service area, project type, and credentials. Only qualified builders reach you.",
  },
  {
    icon: BarChart3,
    title: "Tender comparison",
    description:
      "Side-by-side: price, inclusions, exclusions, timeline. Decide in minutes, not weeks.",
  },
  {
    icon: MessageSquare,
    title: "Project messaging",
    description:
      "One thread per project. Threaded, scoped, searchable. RFIs and variations in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Verified profiles",
    description:
      "ABN, state licence, insurance, and scoring — all verified and transparent.",
  },
  {
    icon: Zap,
    title: "Fast turnaround",
    description:
      "Average tender turnaround of 14 days. No more waiting months for responses.",
  },
] as const;

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="px-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Header - centered */}
        <div className="text-center max-w-[700px] mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(2rem,5vw,3.5rem)] font-serif tracking-[-0.02em] text-text"
          >
            Everything in one place.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-4 text-[17px] lg:text-[19px] text-text-muted leading-relaxed"
          >
            All the features you need to tender your project, compare builders,
            and make confident decisions — without the friction.
          </motion.p>
        </div>

        {/* Feature pills - 3 horizontal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 lg:mt-16 flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: FileText, label: "Project workspace" },
            { icon: Users, label: "Matched builders" },
            { icon: BarChart3, label: "Tender comparison" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-border bg-surface-1/50"
            >
              <item.icon className="size-4 text-accent" />
              <span className="text-[14px] text-text">{item.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Product screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 lg:mt-16"
        >
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

            {/* Dashboard mockup content */}
            <DashboardMockup />
          </div>
        </motion.div>

        {/* Feature grid - 3x2 */}
        <div className="mt-16 lg:mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.6,
                delay: 0.4 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flex items-center justify-center size-12 rounded-xl border border-border bg-surface-1 mb-4">
                <feature.icon className="size-5 text-accent" />
              </div>
              <h3 className="text-[18px] font-medium text-text">
                {feature.title}
              </h3>
              <p className="mt-2 text-[15px] text-text-muted leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Dashboard mockup showing the platform UI
 */
function DashboardMockup() {
  return (
    <div className="p-4 lg:p-6">
      {/* Browser header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-1 border border-border-subtle">
            <svg className="size-3 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[12px] text-text-muted">app.builderhq.com.au/projects</span>
          </div>
        </div>
        <div className="w-[52px]" />
      </div>

      {/* App content */}
      <div className="mt-4 flex gap-4 min-h-[400px]">
        {/* Sidebar */}
        <div className="hidden lg:block w-[220px] shrink-0 border-r border-border-subtle pr-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="size-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-[12px] font-bold">
              B
            </div>
            <span className="text-[14px] font-medium text-text">BuilderHQ</span>
          </div>
          <nav className="space-y-1">
            {[
              { label: "Projects", active: true },
              { label: "Tenders" },
              { label: "Builders" },
              { label: "Messages" },
              { label: "Settings" },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "px-3 py-2 rounded-lg text-[13px]",
                  item.active
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:text-text",
                )}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[18px] font-medium text-text">Active Projects</h3>
              <p className="text-[13px] text-text-muted">3 projects in progress</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-accent text-bg text-[13px] font-medium">
              New Project
            </button>
          </div>

          {/* Project cards */}
          <div className="space-y-3">
            {[
              {
                name: "Hampton Residence",
                status: "Tendering",
                tenders: 4,
                value: "$1.8M",
                statusColor: "bg-accent",
              },
              {
                name: "Brighton Renovation",
                status: "Reviewing",
                tenders: 6,
                value: "$620K",
                statusColor: "bg-warning",
              },
              {
                name: "Toorak New Build",
                status: "Draft",
                tenders: 0,
                value: "$2.4M",
                statusColor: "bg-text-dim",
              },
            ].map((project) => (
              <div
                key={project.name}
                className="flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-surface-1/50 hover:bg-surface-1 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-text">
                      {project.name}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium text-bg",
                        project.statusColor,
                      )}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] text-text-muted">
                    {project.tenders} tenders received
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-medium text-text tabular-nums">
                    {project.value}
                  </div>
                  <div className="text-[12px] text-text-dim">Est. value</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
