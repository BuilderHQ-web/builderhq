import { ArrowDown } from "lucide-react";
import { Reveal } from "./reveal";

const rows: Array<{ then: string; now: string }> = [
  {
    then: "Chasing five builders for weeks, inconsistent quotes.",
    now: "Upload once. Tenders back in days, ranked side-by-side.",
  },
  {
    then: "Drawings scattered across email, WhatsApp, and Dropbox.",
    now: "One project page. Versioned docs, audit trail.",
  },
  {
    then: "Builders bid blind on bad-fit work.",
    now: "Preview enough to opt in only when there's real fit.",
  },
  {
    then: "Comparing tenders in a spreadsheet that goes stale.",
    now: "Structured fields. Diff view. Live numbers.",
  },
];

export function Problem() {
  return (
    <section
      id="problem"
      className="relative px-5 md:px-10 pt-16 pb-16 lg:pt-36 lg:pb-32"
    >
      <div className="mx-auto max-w-[1080px]">
        <Reveal>
          <div className="text-center">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              The problem
            </span>
            <h2 className="mt-4 lg:mt-5 mx-auto max-w-[18ch] font-display tracking-[-0.018em] text-[clamp(2.5rem,4.5vw+0.5rem,4.5rem)] leading-[1.02]">
              <span className="text-text">Tendering shouldn&apos;t feel like</span>{" "}
              <span
                className="italic"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, #eef6ff 0%, #7ef5ed 90%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                chasing
              </span>
              .
            </h2>
            <p className="mt-5 lg:mt-7 mx-auto max-w-[60ch] text-[14.5px] sm:text-[15.5px] leading-[1.6] sm:leading-[1.7] text-text-subtle">
              Finding the right builder is the most consequential step of a
              residential build. We fixed the structure of the conversation,
              not just the inbox.
            </p>
          </div>
        </Reveal>

        {/* ── Mobile (and tablet portrait): stacked transformation cards.
            Each row becomes a self-contained "Before / After" card with
            its own glow, an arrow break between halves, and a numeric
            chip in the corner. Reads as a series of small product
            moments instead of a dense list. */}
        <div className="mt-10 lg:hidden flex flex-col gap-4">
          {rows.map((r, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <MobileTransformCard
                index={i + 1}
                then={r.then}
                now={r.now}
              />
            </Reveal>
          ))}
        </div>

        {/* ── Desktop: original two-column comparison table. ──── */}
        <div className="mt-10 lg:mt-20 hidden lg:block">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center px-6 mb-4">
            <span className="text-[10px] tracking-[0.24em] uppercase text-text-dim">
              Today
            </span>
            <span className="w-8" />
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent">
              With BuilderHQ
            </span>
          </div>

          <div className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(8,22,36,0.55),rgba(4,14,24,0.75))] backdrop-blur-sm overflow-hidden">
            {rows.map((r, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <DesktopRow
                  then={r.then}
                  now={r.now}
                  last={i === rows.length - 1}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Mobile-only transformation card. Two stacked panels — a faded
 * "today" half on top with a red dot, and a bright "BuilderHQ" half
 * underneath with the teal glow. A small chevron sits between them
 * so the eye reads "this becomes that." The card itself has a soft
 * accent halo behind it and a glass-style edge to feel like a real
 * product surface, not a list item.
 */
function MobileTransformCard({
  index,
  then,
  now,
}: {
  index: number;
  then: string;
  now: string;
}) {
  const label = String(index).padStart(2, "0");
  return (
    <article className="group relative rounded-2xl overflow-hidden">
      {/* Soft accent halo bleeding off the bottom-right corner. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 size-44 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
        }}
      />
      <div
        className="relative rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(9,27,42,0.85),rgba(5,16,28,0.95))] backdrop-blur-sm overflow-hidden"
      >
        {/* Top hairline — catches "light", same trick as the hero cards. */}
        <span
          aria-hidden
          className="absolute top-0 inset-x-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.5), transparent)",
          }}
        />

        {/* Index chip — sits top-right so the eye finds the sequence
            without us writing "Step 1 of 4" anywhere. */}
        <span
          aria-hidden
          className="absolute top-4 right-4 inline-flex items-center justify-center min-w-9 h-6 px-2 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.025)] text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium tabular-nums"
        >
          {label}
        </span>

        {/* Before panel */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[rgba(255,120,120,0.7)] shadow-[0_0_8px_rgba(255,120,120,0.5)]"
            />
            <span className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-medium">
              Today
            </span>
          </div>
          <p className="text-[14.5px] leading-[1.55] text-text-muted/85 line-through decoration-[rgba(255,255,255,0.18)] decoration-1">
            {then}
          </p>
        </div>

        {/* Divider — short hairline with a soft chevron sitting on it.
            Visual punctuation between "today" and "with BuilderHQ". */}
        <div className="relative h-7 flex items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-x-5 top-1/2 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(126,245,237,0.25), transparent)",
            }}
          />
          <span
            aria-hidden
            className="relative size-7 rounded-full border border-border-accent bg-[rgba(6,18,30,0.95)] flex items-center justify-center text-accent-light shadow-[0_0_18px_rgba(0,212,200,0.25)]"
          >
            <ArrowDown size={12} strokeWidth={2.4} />
          </span>
        </div>

        {/* After panel — slightly brighter background tint so the
            "with BuilderHQ" half visibly carries more weight. */}
        <div className="relative px-5 pt-3 pb-5 bg-[linear-gradient(180deg,rgba(0,212,200,0.045),rgba(0,212,200,0))]">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-accent-light shadow-[0_0_10px_rgba(0,212,200,0.7)]"
            />
            <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-semibold">
              With BuilderHQ
            </span>
          </div>
          <p className="text-[15px] leading-[1.55] text-text font-medium">
            {now}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Desktop row — unchanged from the original two-column comparison. */
function DesktopRow({
  then,
  now,
  last,
}: {
  then: string;
  now: string;
  last: boolean;
}) {
  return (
    <div
      className={[
        "grid grid-cols-[1fr_auto_1fr] gap-8 items-center px-8 py-7",
        last ? "" : "border-b border-border-subtle",
        "transition-colors duration-[400ms] hover:bg-[rgba(0,212,200,0.025)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="mt-[6px] size-1.5 rounded-full bg-[rgba(255,120,120,0.55)] shrink-0" />
        <p className="text-[14px] leading-[1.6] text-text-muted line-through decoration-[rgba(255,255,255,0.18)] decoration-1">
          {then}
        </p>
      </div>

      <span aria-hidden className="flex w-8 justify-center text-accent text-[14px]">
        →
      </span>

      <div className="flex items-start gap-3">
        <span
          className="mt-[6px] size-1.5 rounded-full bg-accent-light shrink-0"
          style={{ boxShadow: "0 0 8px rgba(0,212,200,0.6)" }}
        />
        <p className="text-[14px] leading-[1.6] text-text font-medium">
          {now}
        </p>
      </div>
    </div>
  );
}
