/**
 * Marquee — single horizontal strip of brand-style claim words. Edges
 * fade to bg so the loop is invisible. Pauses on hover.
 */
const items = [
  "Residential tendering",
  "Verified Australian builders",
  "Drawings · specs · scope",
  "Side-by-side compare",
  "Days, not weeks",
  "Built in Australia",
];

export function Marquee() {
  const doubled = [...items, ...items];
  return (
    <section
      aria-hidden
      className="relative border-y border-border-subtle bg-bg-deep/70 overflow-hidden"
    >
      <div
        className="absolute inset-y-0 left-0 w-[140px] z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, #060f19, transparent)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[140px] z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, #060f19, transparent)" }}
      />
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "marqueeScroll 32s linear infinite" }}
      >
        {doubled.map((label, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 px-9 py-4 font-display text-[18px] tracking-[0.1em] text-text-faint hover:text-accent-light transition-colors duration-[200ms]"
          >
            {label}
            <span
              className="size-1 rounded-full bg-accent shrink-0"
              style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
            />
          </span>
        ))}
      </div>
    </section>
  );
}
