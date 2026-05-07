import { Upload, Users, FileSpreadsheet } from "lucide-react";
import { Reveal } from "./reveal";
import type { LucideIcon } from "lucide-react";

const steps: Array<{
  n: string;
  title: string;
  description: string;
  points: string[];
  icon: LucideIcon;
}> = [
  {
    n: "Step 01",
    icon: Upload,
    title: "Upload your project",
    description:
      "Drawings, specs, scope, address. One form. Ten minutes.",
    points: [
      "Smart fields by build type",
      "Drag & drop docs, autosaved",
      "Preview vs full visibility controls",
    ],
  },
  {
    n: "Step 02",
    icon: Users,
    title: "Builders unlock",
    description:
      "Matched builders preview, then unlock the full package to tender.",
    points: [
      "Filtered by suburb, type, licence",
      "Founding access — first 50 builders free",
      "Paid unlocks after launch",
    ],
  },
  {
    n: "Step 03",
    icon: FileSpreadsheet,
    title: "Compare and decide",
    description:
      "Structured tenders, side-by-side. Message in-thread. Decide.",
    points: [
      "Diff view across price, scope, timeline",
      "Threaded messaging per project",
      "Shortlist · award · reject in one click",
    ],
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="relative px-6 md:px-10 py-24 lg:py-32 border-y border-border-subtle"
      style={{
        background:
          "linear-gradient(180deg, rgba(6,18,30,0.5), rgba(3,9,15,0.6))",
      }}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1fr] gap-12 lg:gap-16 items-end">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              How it works
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,4.5vw+1rem,5.5rem)] leading-[0.92]">
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.45)" }}
              >
                Three steps,
              </span>{" "}
              <span className="text-accent-light">no chasing</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[15px] leading-[1.7] text-text-subtle">
              From raw drawings to a signed builder. Modelled on how
              Australian residential projects actually tender.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <Step {...s} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  description,
  points,
}: {
  n: string;
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <div className="group relative h-full p-9 rounded-md border border-border bg-[linear-gradient(180deg,rgba(9,27,42,0.7),rgba(6,20,32,0.85))] transition-[border-color,transform] duration-[600ms] ease-[var(--ease-out)] hover:border-border-accent hover:-translate-y-1 overflow-hidden">
      <span className="font-display tracking-[0.22em] text-[11px] text-accent">{n}</span>
      <div className="mt-7 size-12 rounded-md border border-border-accent bg-accent-muted flex items-center justify-center">
        <Icon className="size-5 text-accent-light" />
      </div>
      <h3 className="mt-7 font-ui font-bold tracking-[-0.02em] text-[20px] leading-[1.2] text-text">
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.8] text-text-subtle">{description}</p>
      <ul className="mt-6 flex flex-col gap-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 items-start text-[13px] leading-[1.55] text-text-dim">
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
    </div>
  );
}
