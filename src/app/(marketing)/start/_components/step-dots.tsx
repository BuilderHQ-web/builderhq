"use client";

/**
 * Tiny progress indicator above the form headings. Anchors the user
 * in "step N of 3" without taking visual space. Active dot is teal +
 * a touch wider; remaining dots are faint hairlines.
 */
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <span
            key={i}
            className={[
              "h-1 rounded-full transition-all duration-300",
              active
                ? "bg-accent w-8"
                : done
                  ? "bg-accent/60 w-4"
                  : "bg-border-strong w-4",
            ].join(" ")}
          />
        );
      })}
      <span className="ml-2 text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold">
        Step {step} / {total}
      </span>
    </div>
  );
}
