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
      className="relative px-6 md:px-10 pt-28 pb-24 lg:pt-36 lg:pb-32"
    >
      <div className="mx-auto max-w-[1080px]">
        <Reveal>
          <div className="text-center">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              The problem
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,5vw+1rem,5.75rem)] leading-[0.92]">
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.55)" }}
              >
                Tendering shouldn&apos;t feel like
              </span>{" "}
              <span className="text-accent-light">chasing</span>.
            </h2>
            <p className="mt-7 mx-auto max-w-[60ch] text-[15.5px] leading-[1.7] text-text-subtle">
              Finding the right builder is the most consequential step of a
              residential build. We fixed the structure of the conversation,
              not just the inbox.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 lg:mt-20">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-8 items-center px-6 mb-4">
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
                <Row then={r.then} now={r.now} last={i === rows.length - 1} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
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
        "grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center px-6 md:px-8 py-6 md:py-7",
        last ? "" : "border-b border-border-subtle",
        "transition-colors duration-[400ms] hover:bg-[rgba(0,212,200,0.025)]",
      ].join(" ")}
    >
      {/* Then */}
      <div className="flex items-start gap-3">
        <span className="mt-[5px] size-1.5 rounded-full bg-[rgba(255,120,120,0.55)] shrink-0" />
        <p className="text-[14px] leading-[1.6] text-text-muted line-through decoration-[rgba(255,255,255,0.18)] decoration-1">
          {then}
        </p>
      </div>

      {/* Arrow */}
      <span aria-hidden className="hidden md:flex w-8 justify-center text-accent text-[14px]">
        →
      </span>
      <span aria-hidden className="md:hidden h-px bg-border-subtle w-full" />

      {/* Now */}
      <div className="flex items-start gap-3">
        <span
          className="mt-[5px] size-1.5 rounded-full bg-accent-light shrink-0"
          style={{ boxShadow: "0 0 8px rgba(0,212,200,0.6)" }}
        />
        <p className="text-[14px] leading-[1.6] text-text font-medium">{now}</p>
      </div>
    </div>
  );
}
