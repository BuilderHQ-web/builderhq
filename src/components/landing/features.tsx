"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "./reveal";

const features: Array<{
  n: string;
  name: string;
  description: string;
  detail: string;
}> = [
  {
    n: "01",
    name: "Project workspace",
    description:
      "Drawings, specs, and scope live on a single shareable project page. Versioned, downloadable, audit-trailed.",
    detail: "Private R2 storage · signed-URL downloads · per-file version history",
  },
  {
    n: "02",
    name: "Matched builders",
    description:
      "Builders are filtered by service area, project type, ABN status, and licence — only fit-for-purpose unlocks reach you.",
    detail: "Postcode-precision · ABN + licence checks · category match",
  },
  {
    n: "03",
    name: "Tender comparison",
    description:
      "Side-by-side: price, inclusions, exclusions, timeline, validity, and notes. Decide in minutes, not weeks.",
    detail: "Versioned tenders · diff view · structured fields",
  },
  {
    n: "04",
    name: "Owner ↔ builder messaging",
    description:
      "One thread per project. Threaded, project-scoped, search-able. RFIs and variations have somewhere to live.",
    detail: "Project-scoped threads · attachment support · read receipts",
  },
  {
    n: "05",
    name: "Verified profiles",
    description:
      "ABN, ACN, state-by-state licence, insurance documents, and scoring — all in the open.",
    detail: "ABN lookup · VBA / state register checks · admin moderated",
  },
  {
    n: "06",
    name: "Founding access",
    description:
      "Hand-picked builders unlock projects with complimentary credits during launch. Earn the platform, no Stripe charge.",
    detail: "First 50 builders · monthly credit refresh · admin granted",
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-6 md:px-10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-16 items-end">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              The platform
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,4.5vw+1rem,5.5rem)] leading-[0.92]">
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.55)" }}
              >
                Built for the
              </span>{" "}
              <span className="text-accent-light">work</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-prose text-[15px] leading-[1.85] text-text-subtle">
              Every feature is sized to the rhythm of an Australian residential
              build — not the generic &ldquo;marketplace&rdquo; template.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mt-12 lg:mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-border-subtle border border-border-subtle rounded-md overflow-hidden">
            {features.map((f) => (
              <FeatureCell key={f.n} {...f} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeatureCell({
  n,
  name,
  description,
  detail,
}: {
  n: string;
  name: string;
  description: string;
  detail: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative bg-[linear-gradient(160deg,rgba(9,27,42,0.5),rgba(6,18,30,0.7))] p-9 lg:p-10 transition-colors duration-[260ms] hover:bg-[rgba(0,212,200,0.035)] overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-[420ms] ease-[var(--ease-out)]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.7), transparent)",
        }}
      />
      <span className="font-display tracking-[0.18em] text-[12px] text-accent">
        {n}
      </span>
      <h3 className="mt-5 font-ui font-bold tracking-[-0.02em] text-[22px] leading-[1.2] text-text">
        {name}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.8] text-text-subtle">{description}</p>
      <AnimatePresence initial={false}>
        {hover ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-4 border-t border-border-subtle text-[11.5px] tracking-[0.04em] text-accent-light/80 font-mono">
              {detail}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span
        aria-hidden
        className="absolute right-3 -bottom-2 font-display text-[110px] leading-none text-transparent select-none pointer-events-none"
        style={{ WebkitTextStroke: "1px rgba(142,252,244,0.045)" }}
      >
        {n}
      </span>
    </div>
  );
}
