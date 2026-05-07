import { Reveal } from "./reveal";

const pains = [
  "Owners chase three to five builders for weeks; quotes come back inconsistent.",
  "Builders bid on bad-fit projects because preview info is thin.",
  "Drawings, specs, and scopes are scattered across email, WhatsApp, and Dropbox.",
  "Tender comparison is done in spreadsheets with stale numbers.",
];

const solutions = [
  "Upload once, share with the right matched builders, get tenders back in days.",
  "Builders see enough preview detail to opt in only when there's real fit.",
  "Documents, scope, and conversations live on one project page — versioned.",
  "Tenders compare side-by-side automatically, with audit trail per change.",
];

export function Problem() {
  return (
    <section
      id="problem"
      className="relative px-6 md:px-10 pt-32 pb-24 lg:pt-40 lg:pb-32"
    >
      <div className="mx-auto max-w-[1320px] grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
        <div className="lg:sticky lg:top-32">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              The problem
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(3rem,5vw+1rem,6rem)] leading-[0.92]">
              Tendering shouldn&apos;t feel like <span className="text-accent-light">chasing</span>.
            </h2>
            <p className="mt-7 max-w-prose text-[15.5px] leading-[1.85] text-text-subtle">
              For a serious residential project, finding the right builder is
              the most consequential — and most painful — step. BuilderHQ
              fixes the structure of the conversation, not just the inbox.
            </p>
          </Reveal>
        </div>

        <div className="flex flex-col gap-4">
          <Reveal>
            <Card kind="pain" label="Today" items={pains} />
          </Reveal>
          <Reveal delay={0.08}>
            <Card kind="solution" label="With BuilderHQ" items={solutions} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Card({
  kind,
  label,
  items,
}: {
  kind: "pain" | "solution";
  label: string;
  items: string[];
}) {
  const isSolution = kind === "solution";
  return (
    <div
      className={[
        "group rounded-md p-7 transition-[border-color,box-shadow,transform] duration-[420ms] ease-[var(--ease-out)]",
        "border",
        isSolution
          ? "border-border-accent bg-[linear-gradient(180deg,rgba(0,212,200,0.05),rgba(4,13,22,0.94))]"
          : "border-border bg-[linear-gradient(180deg,rgba(8,25,40,0.8),rgba(4,13,22,0.94))]",
        "hover:border-border-strong hover:translate-x-1",
      ].join(" ")}
    >
      <div
        className={[
          "text-[10px] tracking-[0.22em] uppercase mb-5",
          isSolution ? "text-accent" : "text-text-dim",
        ].join(" ")}
      >
        {label}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span
              className={[
                "size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] border",
                isSolution
                  ? "bg-accent-muted border-border-accent text-accent-light"
                  : "bg-[rgba(255,80,80,0.10)] border-[rgba(255,80,80,0.18)] text-[rgba(255,120,120,0.9)]",
              ].join(" ")}
            >
              {isSolution ? "✓" : "×"}
            </span>
            <span
              className={[
                "text-[14px] leading-[1.65]",
                isSolution ? "text-text" : "text-text-muted",
              ].join(" ")}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
