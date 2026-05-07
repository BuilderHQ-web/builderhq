import { Reveal } from "./reveal";

const features = [
  {
    n: "01",
    name: "Project workspace",
    description:
      "Drawings, specs, and scope live on a single shareable project page. Versioned, downloadable, audit-trailed.",
  },
  {
    n: "02",
    name: "Matched builders",
    description:
      "Builders are filtered by service area, project type, ABN status, and licence — only fit-for-purpose unlocks reach you.",
  },
  {
    n: "03",
    name: "Tender comparison",
    description:
      "Side-by-side: price, inclusions, exclusions, timeline, validity, and notes. Decide in minutes, not weeks.",
  },
  {
    n: "04",
    name: "Owner ↔ builder messaging",
    description:
      "One thread per project. Threaded, project-scoped, search-able. RFIs and variations have somewhere to live.",
  },
  {
    n: "05",
    name: "Verified builder profiles",
    description:
      "ABN, ACN, state-by-state licence, insurance documents, and scoring — all in the open.",
  },
  {
    n: "06",
    name: "Founding builder access",
    description:
      "Hand-picked builders unlock projects with complimentary credits during launch. Earn the platform, no Stripe charge.",
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
              <div
                key={f.n}
                className="group relative bg-[linear-gradient(160deg,rgba(9,27,42,0.55),rgba(6,18,30,0.85))] p-9 lg:p-10 transition-colors duration-[260ms] hover:bg-[rgba(0,212,200,0.04)] overflow-hidden"
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
                  {f.n}
                </span>
                <h3 className="mt-5 font-ui font-bold tracking-[-0.02em] text-[22px] leading-[1.2] text-text">
                  {f.name}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.8] text-text-subtle">
                  {f.description}
                </p>
                <span
                  aria-hidden
                  className="absolute right-3 -bottom-2 font-display text-[110px] leading-none text-transparent select-none pointer-events-none"
                  style={{ WebkitTextStroke: "1px rgba(142,252,244,0.05)" }}
                >
                  {f.n}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
