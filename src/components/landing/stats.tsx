"use client";

import * as React from "react";
import { useInView, animate } from "motion/react";
import { Reveal } from "./reveal";

const stats: Array<{
  value: number;
  suffix?: string;
  prefix?: string;
  format?: "decimal" | "integer";
  label: string;
}> = [
  { value: 1, suffix: "×", label: "Upload your project once. We do the matching." },
  { value: 100, suffix: "%", label: "Australian residential focus. Nothing else." },
  { value: 0, label: "Builders chasing you for paperwork. Ever again." },
  { value: 24, suffix: "h", label: "Median response time from matched builders." },
];

export function Stats() {
  return (
    <section className="relative px-6 md:px-10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.7fr] gap-12 lg:gap-16 items-end">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              By design
            </span>
            <h2 className="mt-5 font-display tracking-[-0.02em] text-[clamp(2.5rem,4vw+0.5rem,4.5rem)] leading-[0.92]">
              Numbers that <span className="text-accent-light">matter</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[15px] leading-[1.85] text-text-subtle">
              Built specifically for the rhythm of Australian residential
              construction tendering. Every feature exists because we&apos;ve
              watched it fail in spreadsheets and inboxes.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="mt-12 lg:mt-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-border-subtle rounded-md overflow-hidden">
            {stats.map((s, i) => (
              <StatCell key={i} {...s} index={i} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatCell({
  value,
  prefix,
  suffix,
  label,
  index,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  index: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const numRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!inView || !numRef.current) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      delay: index * 0.08,
      onUpdate(latest) {
        if (numRef.current) numRef.current.textContent = String(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [inView, value, index]);

  return (
    <div
      ref={ref}
      className={[
        "group relative p-7 lg:p-9",
        "bg-[linear-gradient(180deg,rgba(8,26,40,0.5),rgba(5,16,26,0.7))]",
        "border-r border-b border-border-subtle/60 last:border-r-0",
        "[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(2)]:border-r-border-subtle/60",
        "[&:nth-child(3)]:lg:border-b-0 [&:nth-child(4)]:border-b-0",
        "transition-colors duration-[260ms] hover:bg-[rgba(0,212,200,0.04)]",
      ].join(" ")}
    >
      <div className="font-display tracking-[-0.02em] text-[clamp(3rem,4vw+1rem,4.5rem)] leading-none text-text tabular-nums">
        {prefix ? <span>{prefix}</span> : null}
        <span ref={numRef}>0</span>
        {suffix ? <span className="text-accent-light">{suffix}</span> : null}
      </div>
      <div className="mt-3 text-[12.5px] leading-[1.55] text-text-dim max-w-[26ch]">{label}</div>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-[420ms] ease-[var(--ease-out)]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.7), transparent)",
        }}
      />
    </div>
  );
}
