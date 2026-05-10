"use client";

import { Reveal } from "./reveal";

type Review = {
  initials: string;
  name: string;
  role: string;
  location: string;
  body: string;
};

// Four sharpest testimonials only. Each one delivers a different
// angle: owner trust, architect efficiency, owner-builder structure,
// builder fit. Six was a marquee filler; four reads as conviction.
const REVIEWS: Review[] = [
  {
    initials: "JM",
    name: "James M.",
    role: "Project owner",
    location: "Brunswick, VIC",
    body: "We used BuilderHQ to tender our rear extension. The process was simple, fast and incredibly effective. We received competitive quotes from quality builders who actually wanted the job — not three PDFs in three different worlds.",
  },
  {
    initials: "SL",
    name: "Sophie L.",
    role: "Registered architect",
    location: "Melbourne, VIC",
    body: "BuilderHQ has streamlined how we help clients find reliable builders. Upload once, let the platform handle the matching. Efficient, transparent, and aligned with how we deliver modern architecture — minus the broker layer.",
  },
  {
    initials: "AK",
    name: "Aisha K.",
    role: "Owner-builder",
    location: "Canberra, ACT",
    body: "I went in blind on my first build. BuilderHQ gave me a structured way to compare quotes — same scope, same format, real numbers. I felt informed, not overwhelmed. The verified-builder chips meant I knew exactly who I was talking to.",
  },
  {
    initials: "NP",
    name: "Nathan P.",
    role: "Boutique builder",
    location: "Geelong, VIC",
    body: "As a small builder, getting access to good projects has always been tough. BuilderHQ levels the playing field. I've already quoted on two jobs since signing up — both perfect fits for my team. Game-changer for how we grow.",
  },
];

export function Testimonials() {
  // Doubled so the marquee loops cleanly with translateX(-50%)
  const doubled = [...REVIEWS, ...REVIEWS];

  return (
    <section
      id="testimonials"
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="px-6 md:px-10">
        <div className="mx-auto max-w-[1320px] text-center mb-14 lg:mb-16">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              Built with industry experts
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.5rem,4.2vw+1rem,5.25rem)] leading-[0.92]">
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.55)" }}
              >
                Shaped by real
              </span>{" "}
              <span className="text-accent-light">feedback</span>.
            </h2>
            <p className="mt-7 mx-auto max-w-[60ch] text-[15px] leading-[1.7] text-text-subtle">
              Built alongside people who understand residential
              construction. Here&apos;s what owners, architects, and builders
              are saying.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Marquee — full bleed, scrolls left-to-right (visually right-to-left
          movement of cards under a static viewport). Edge fades hide the
          loop seam. Pauses on hover. */}
      <div
        className="relative group"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div
          className="flex gap-5 w-max"
          style={{
            animation: "marqueeScroll 60s linear infinite",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.animationPlayState =
              "paused";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.animationPlayState =
              "running";
          }}
        >
          {doubled.map((r, i) => (
            <ReviewCard key={i} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <article
      className="relative w-[420px] shrink-0 rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,26,40,0.85),rgba(6,18,28,0.95))] p-7 transition-colors duration-[400ms] hover:border-border-accent overflow-hidden"
    >
      {/* sheen */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.35), transparent)",
        }}
      />

      <span
        aria-hidden
        className="absolute -top-2 -left-1 font-display text-[120px] leading-none text-accent/[0.08] select-none pointer-events-none"
      >
        &ldquo;
      </span>

      <p className="relative text-[14px] leading-[1.7] text-text-muted mt-6">
        {r.body}
      </p>

      <div className="relative mt-6 pt-5 border-t border-border-subtle/60 flex items-center gap-3">
        <span
          className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {r.initials}
        </span>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-text">
            {r.name} <span className="text-text-dim font-normal">· {r.role}</span>
          </div>
          <div className="text-[10.5px] tracking-[0.04em] text-text-dim">
            {r.location}
          </div>
        </div>
      </div>
    </article>
  );
}
