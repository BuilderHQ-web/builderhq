"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type TabId = "upload" | "browse" | "compare";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "browse", label: "Browse" },
  { id: "compare", label: "Compare" },
];

const content: Record<
  TabId,
  {
    step: string;
    title: string;
    description: string;
    points: string[];
  }
> = {
  upload: {
    step: "Owner — step 01",
    title: "A project page that does the work",
    description:
      "Smart fields show only what's relevant for your project type. Drawings, specs, and scope upload to a private, signed-URL workspace.",
    points: [
      "Per-type forms (single, multi, reno, extension)",
      "Drag-and-drop docs to private R2 storage",
      "Autosave drafts; publish when ready",
    ],
  },
  browse: {
    step: "Builder — step 02",
    title: "Filter to fit, unlock with confidence",
    description:
      "Filter by suburb, postcode, project type, and budget band. Preview enough detail to commit; unlock the full package when you're ready to tender.",
    points: [
      "Postcode + suburb-precision filters",
      "ABN, licence, and project-type matching",
      "Founding access during launch — no charge",
    ],
  },
  compare: {
    step: "Owner — step 03",
    title: "Decide in one screen, not twelve emails",
    description:
      "Tenders compare side-by-side: price, inclusions, exclusions, timeline, validity. Threaded messaging per project keeps every clarification on record.",
    points: [
      "Structured tender form, not freeform PDFs",
      "One thread per project, every message stored",
      "Shortlist · award · reject in one click",
    ],
  },
};

export function Showcase() {
  const [active, setActive] = useState<TabId>("upload");

  return (
    <section id="showcase" className="relative px-6 md:px-10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1fr] gap-12 lg:gap-16 items-end mb-12 lg:mb-16">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              The platform
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,4.5vw+1rem,5.5rem)] leading-[0.92]">
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.45)" }}
              >
                See it in
              </span>{" "}
              <span className="text-accent-light">motion</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[15px] leading-[1.85] text-text-subtle">
              The actual interfaces, not stylised mockups. Every screen is
              functional, every interaction matches what you&apos;ll see when
              you sign up.
            </p>
          </Reveal>
        </div>

        <Reveal>
          <div className="relative rounded-md border border-border-subtle overflow-hidden bg-[linear-gradient(180deg,rgba(8,25,40,0.5),rgba(4,13,22,0.7))]">
            {/* tab bar */}
            <div role="tablist" className="flex border-b border-border-subtle">
              {tabs.map((t) => {
                const on = t.id === active;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(t.id)}
                    className={cn(
                      "relative px-5 py-3.5 text-[10px] tracking-[0.18em] uppercase",
                      "transition-colors duration-[200ms]",
                      on ? "text-accent-light" : "text-text-dim hover:text-text",
                    )}
                  >
                    {t.label}
                    {on ? (
                      <motion.span
                        layoutId="showcase-underline"
                        className="absolute left-0 right-0 -bottom-px h-px bg-accent-light"
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* content */}
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] min-h-[420px]">
              <div className="p-9 lg:p-11 border-b lg:border-b-0 lg:border-r border-border-subtle flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="text-[9px] tracking-[0.22em] uppercase text-accent">
                      {content[active].step}
                    </span>
                    <h3 className="mt-4 font-ui font-bold tracking-[-0.02em] text-[24px] leading-[1.15] text-text">
                      {content[active].title}
                    </h3>
                    <p className="mt-4 text-[14px] leading-[1.85] text-text-subtle">
                      {content[active].description}
                    </p>
                    <ul className="mt-6 flex flex-col gap-3">
                      {content[active].points.map((p) => (
                        <li key={p} className="flex gap-3 items-start text-[13px] leading-[1.55] text-text-muted">
                          <span
                            className="size-1 rounded-full shrink-0 mt-[7px]"
                            style={{
                              background: "linear-gradient(180deg, #7ef5ed, #00d4c8)",
                              boxShadow: "0 0 8px rgba(0,212,200,0.5)",
                            }}
                          />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative overflow-hidden bg-[linear-gradient(135deg,#081a2a,#0d2236)] flex items-center justify-center p-7 min-h-[320px]">
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(142,252,244,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.04) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-[1] w-full max-w-[420px]"
                  >
                    {active === "upload" && <UploadMock />}
                    {active === "browse" && <BrowseMock />}
                    {active === "compare" && <CompareMock />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── mock screens ─────────────────────────────────────────────────────────

function MockShell({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md border border-border-subtle overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{ background: "linear-gradient(180deg, rgba(10,28,44,0.98), rgba(6,18,30,0.99))" }}
    >
      <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-border-subtle bg-[rgba(255,255,255,0.02)]">
        <span className="text-[10px] font-semibold tracking-[0.04em] text-text">{title}</span>
        <span className="px-2 py-1 border border-border-accent rounded-sm text-[8px] tracking-[0.14em] uppercase text-accent">
          {badge}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function UploadMock() {
  return (
    <MockShell title="Upload project" badge="Step 1 of 6">
      <div className="flex flex-col gap-2.5">
        <Field label="Project type" value="Single dwelling" />
        <Field label="Address" value="14 Treadwell Rd, Niddrie VIC 3042" />
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Bedrooms" value="4" />
          <Field label="Budget band" value="$1.5M – $2M" highlight />
        </div>
        <DropZone />
        <DocRow name="Architectural plans v3.pdf" size="2.4 MB" />
        <DocRow name="Specifications.pdf" size="1.1 MB" />
      </div>
    </MockShell>
  );
}

function BrowseMock() {
  return (
    <MockShell title="Browse projects" badge="3 matched">
      <div className="flex flex-col gap-2">
        {[
          ["Niddrie Townhouse", "VIC · Single dwelling", "$1.5–2M", "open"],
          ["Brunswick Reno", "VIC · Renovation", "$500k–1M", "open"],
          ["Glen Iris Duplex", "VIC · Multi-dwelling", "$2–3M", "pending"],
        ].map(([name, meta, band, status]) => (
          <div
            key={name as string}
            className="px-3.5 py-3 grid grid-cols-[1fr_auto] gap-2.5 items-center rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.02)] transition-colors hover:border-border-accent"
          >
            <div>
              <div className="text-[11.5px] font-semibold text-text">{name}</div>
              <div className="text-[9.5px] tracking-[0.05em] text-text-dim mt-0.5">{meta}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10.5px] font-medium text-text-muted">{band}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-sm text-[8px] tracking-[0.12em] uppercase border",
                  status === "open"
                    ? "border-border-accent bg-accent-muted/40 text-accent"
                    : "border-[rgba(255,180,0,0.25)] bg-[rgba(255,180,0,0.06)] text-warning",
                )}
              >
                {status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function CompareMock() {
  return (
    <MockShell title="Compare tenders" badge="2 received">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { initials: "JS", name: "Jordan Smith", company: "Smith Builders", price: "$1.78M", primary: true },
          { initials: "AC", name: "Alex Chen", company: "Chen Construction", price: "$1.91M" },
        ].map((b) => (
          <div
            key={b.initials}
            className={cn(
              "p-3 rounded-sm border bg-[rgba(255,255,255,0.02)]",
              b.primary ? "border-border-accent" : "border-border-subtle",
            )}
          >
            <div
              className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold mb-2 border border-border-accent"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
                color: "var(--color-accent-light)",
              }}
            >
              {b.initials}
            </div>
            <div className="text-[10.5px] font-semibold text-text">{b.name}</div>
            <div className="text-[8.5px] tracking-[0.06em] text-text-dim mt-0.5">{b.company}</div>
            <div className="mt-2 font-display text-[20px] leading-none text-accent-light tabular-nums">
              {b.price}
            </div>
            <button
              type="button"
              className="mt-3 w-full py-1.5 text-center rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.14em] uppercase text-accent-light hover:bg-accent-muted/70 transition-colors"
            >
              View tender
            </button>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[8px] tracking-[0.18em] uppercase text-text-dim mb-1">{label}</div>
      <div
        className={cn(
          "px-3 py-2 rounded-sm border text-[11px] text-text",
          highlight
            ? "border-border-accent text-accent-light"
            : "border-border-subtle bg-[rgba(255,255,255,0.025)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function DropZone() {
  return (
    <div className="px-4 py-5 text-center rounded-sm border border-dashed border-border-accent bg-[rgba(0,212,200,0.03)]">
      <div className="text-[18px] mb-1 text-accent-light">↑</div>
      <div className="text-[9.5px] text-text-dim">
        Drop drawings, specs, scope —{" "}
        <span className="text-accent-light">browse files</span>
      </div>
    </div>
  );
}

function DocRow({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-2 text-[10px] text-text-muted">
        <span>📄</span>
        <span className="truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-[9px] text-text-dim">{size}</span>
        <span className="text-[8px] tracking-[0.12em] uppercase text-accent">Uploaded</span>
      </div>
    </div>
  );
}
