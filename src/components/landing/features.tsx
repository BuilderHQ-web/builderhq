"use client";

import { Reveal } from "./reveal";
import { WordsReveal } from "./words-reveal";

/**
 * Features — bento grid with asymmetric tiles. Each tile carries a
 * small purpose-built visual instead of a generic card chrome, so
 * the section *shows* what BuilderHQ does instead of telling.
 *
 * Hover is intentionally subtle: a slow border-colour fade + a soft
 * accent inner glow. No translation, no scale, no jumps.
 */
type Tile = {
  n: string;
  name: string;
  description: string;
  span: "wide" | "tall" | "small";
  visual: React.ReactNode;
};

const TILES: Tile[] = [
  {
    n: "01",
    name: "Project workspace",
    description:
      "Drawings, specs, scope on one shareable page. Versioned, audit-trailed.",
    span: "wide",
    visual: <FilesVisual />,
  },
  {
    n: "02",
    name: "Matched builders",
    description:
      "Filtered by service area, project type, ABN, and licence. Only fit-for-purpose unlocks reach you.",
    span: "small",
    visual: <AvatarsVisual />,
  },
  {
    n: "03",
    name: "Tender comparison",
    description:
      "Side-by-side: price, inclusions, exclusions, timeline. Decide in minutes.",
    span: "small",
    visual: <BarsVisual />,
  },
  {
    n: "04",
    name: "Project messaging",
    description:
      "One thread per project. Threaded, scoped, searchable. RFIs and variations have a home.",
    span: "small",
    visual: <ThreadVisual />,
  },
  {
    n: "05",
    name: "Verified profiles",
    description:
      "ABN, ACN, state licence, insurance, and scoring — all in the open.",
    span: "small",
    visual: <BadgeVisual />,
  },
  {
    n: "06",
    name: "Founding access",
    description:
      "Hand-picked builders unlock projects on the house during launch. Earn the platform.",
    span: "wide",
    visual: <RingsVisual />,
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-5 md:px-10 py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-8 lg:gap-16 items-end">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              The platform
            </span>
            <h2 className="mt-5 font-display tracking-[-0.018em] text-[clamp(2.25rem,3.6vw+0.5rem,4rem)] leading-[1] mx-auto lg:mx-0 max-w-[18ch]">
              <WordsReveal className="text-text">Built for the</WordsReveal>{" "}
              <WordsReveal className="accent-italic" startIndex={3}>
                work
              </WordsReveal>
              .
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-prose text-[15px] leading-[1.7] text-text-subtle">
              Every feature is sized to the rhythm of an Australian residential
              build — not a generic marketplace.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          {/* 4-col bento. Wide tiles span 2 cols, small tiles span 1.
              Mobile stacks single-column. */}
          <div className="mt-10 lg:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TILES.map((t) => (
              <Tile key={t.n} tile={t} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Tile({ tile }: { tile: Tile }) {
  const span =
    tile.span === "wide"
      ? "lg:col-span-2"
      : tile.span === "tall"
      ? "lg:row-span-2"
      : "";

  return (
    <article
      className={[
        "group relative rounded-md overflow-hidden",
        "border border-border-subtle bg-[linear-gradient(180deg,rgba(10,26,42,0.55),rgba(6,18,30,0.78))]",
        "transition-[border-color,background] duration-[700ms] ease-[var(--ease-out)]",
        "hover:border-border-accent/60 hover:bg-[linear-gradient(180deg,rgba(10,32,52,0.65),rgba(6,18,30,0.82))]",
        "p-6 lg:p-8 min-h-[260px] sm:min-h-[280px] flex flex-col",
        span,
      ].join(" ")}
    >
      {/* Soft inner glow on hover — masked so it sits inside the border */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[700ms]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,200,0.08), transparent 70%)",
        }}
      />

      <div className="relative flex items-start justify-between mb-6">
        <span className="font-display tracking-[0.22em] text-[11px] text-accent">
          {tile.n}
        </span>
        <span className="text-[9px] tracking-[0.2em] uppercase text-text-dim/70">
          {tile.span === "wide" ? "Pillar" : "Feature"}
        </span>
      </div>

      {/* Visual — flex-1 so it absorbs vertical space and doesn't collide
          with the description below. */}
      <div className="relative flex-1 mb-6 flex items-center justify-center min-h-[110px]">
        {tile.visual}
      </div>

      <h3 className="relative font-ui font-bold tracking-[-0.02em] text-[20px] leading-[1.2] text-text">
        {tile.name}
      </h3>
      <p className="relative mt-2.5 text-[13.5px] leading-[1.65] text-text-subtle">
        {tile.description}
      </p>
    </article>
  );
}

// ── micro visuals ────────────────────────────────────────────────────────

function FilesVisual() {
  // Stacked file rows — slight rotation for depth, subtle breathing.
  const rows = [
    { name: "Architectural plans v3.pdf", size: "2.4 MB" },
    { name: "Specifications.pdf", size: "1.1 MB" },
    { name: "Scope of works.docx", size: "164 KB" },
  ];
  return (
    <div className="w-full max-w-[420px] mx-auto space-y-1.5">
      {rows.map((r, i) => (
        <div
          key={r.name}
          className="px-3.5 py-2.5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)] flex items-center justify-between text-[11px] transition-colors duration-[600ms] group-hover:border-border-accent/40"
          style={{ marginLeft: `${i * 8}px`, marginRight: `${i * 4}px` }}
        >
          <span className="flex items-center gap-2 text-text-muted truncate">
            <span className="size-4 rounded-[2px] bg-[rgba(0,212,200,0.12)] border border-border-accent/40 inline-flex items-center justify-center text-[8px] text-accent-light">
              ▣
            </span>
            <span className="truncate">{r.name}</span>
          </span>
          <span className="text-text-dim font-mono text-[10px] shrink-0 ml-3">
            {r.size}
          </span>
        </div>
      ))}
    </div>
  );
}

function AvatarsVisual() {
  // Avatar pile fanning right, subtle pulse on the lead.
  const ppl = ["JS", "AC", "MR", "TB", "+9"];
  return (
    <div className="flex items-center -space-x-2">
      {ppl.map((p, i) => (
        <span
          key={p}
          className="size-9 rounded-full border-2 border-bg-deep flex items-center justify-center text-[10px] font-bold text-accent-light"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.22), rgba(26,95,212,0.30))",
            zIndex: ppl.length - i,
            boxShadow: i === 0 ? "0 0 18px rgba(0,212,200,0.35)" : undefined,
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

function BarsVisual() {
  // Two builder columns, mini price bar comparison.
  return (
    <div className="w-full max-w-[260px] flex items-end gap-3">
      {[
        { name: "Smith", price: "1.78", h: 64, lead: true },
        { name: "Chen", price: "1.91", h: 78 },
        { name: "Roberts", price: "1.88", h: 73 },
      ].map((b) => (
        <div key={b.name} className="flex-1 flex flex-col items-center gap-1.5">
          <span
            className={`text-[10px] font-mono tabular-nums ${b.lead ? "text-accent-light" : "text-text-dim"}`}
          >
            ${b.price}M
          </span>
          <span
            className="w-full rounded-t-sm border border-[rgba(142,252,244,0.18)]"
            style={{
              height: `${b.h}px`,
              background: b.lead
                ? "linear-gradient(180deg, rgba(126,245,237,0.45), rgba(0,212,200,0.08))"
                : "linear-gradient(180deg, rgba(126,245,237,0.18), rgba(0,212,200,0.04))",
            }}
          />
          <span className="text-[9px] tracking-[0.1em] uppercase text-text-dim">
            {b.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function ThreadVisual() {
  // Two stacked message bubbles.
  return (
    <div className="w-full max-w-[260px] space-y-2">
      <div className="px-3 py-2 rounded-sm rounded-bl-none border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[11px] text-text-muted leading-snug max-w-[88%]">
        <span className="block text-[8.5px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
          Owner
        </span>
        Beam over the kitchen — laminated or steel?
      </div>
      <div className="px-3 py-2 rounded-sm rounded-br-none border border-border-accent/50 bg-[rgba(0,212,200,0.04)] text-[11px] text-accent-light leading-snug max-w-[88%] ml-auto">
        <span className="block text-[8.5px] tracking-[0.16em] uppercase text-accent mb-0.5">
          Smith builders
        </span>
        Going steel. Will share calc tomorrow.
      </div>
    </div>
  );
}

function BadgeVisual() {
  // Concentric tick badge. ringPulse keyframe applies translate(-50%,-50%)
  // for centering, so the rings need to be anchored at left:50%/top:50%
  // for the keyframe's translate to land them in the centre.
  return (
    <div className="relative w-full h-[150px]">
      <span
        className="absolute left-1/2 top-1/2 size-[120px] rounded-full border border-border-accent/30"
        style={{ animation: "ringPulse 4s ease-in-out infinite" }}
      />
      <span
        className="absolute left-1/2 top-1/2 size-[80px] rounded-full border border-border-accent/50"
        style={{ animation: "ringPulse 4s ease-in-out 1s infinite" }}
      />
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-12 rounded-full border border-border-accent bg-accent-muted flex items-center justify-center text-accent-light"
        style={{ boxShadow: "0 0 32px rgba(0,212,200,0.25)" }}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function RingsVisual() {
  // Big concentric rings + counter — for "founding access" pillar.
  // ringPulse uses translate(-50%,-50%) so the rings anchor at 50%/50%.
  return (
    <div className="relative w-full h-[170px]">
      {[200, 150, 100].map((s, i) => (
        <span
          key={s}
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full border border-border-accent/30"
          style={{
            width: s,
            height: s,
            animation: `ringPulse 4.4s ease-in-out ${i * 0.9}s infinite`,
          }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="font-display text-[44px] leading-none text-accent-light tabular-nums">
          50
        </div>
        <div className="text-[9px] tracking-[0.22em] uppercase text-text-dim mt-1">
          Founding builders
        </div>
      </div>
    </div>
  );
}
