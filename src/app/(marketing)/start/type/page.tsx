/**
 * /start/type — Step 1 of the ads funnel: pick a project type.
 *
 * Single tap. No fields, no commitment. The selection is saved as a
 * URL query param into /start/contact so the next page knows what to
 * persist when we create the draft.
 *
 * Four options — single dwelling, multi dwelling, renovation,
 * extension. Mirrors `projectTypeEnum` in the schema.
 */

import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { TypeGrid } from "./type-grid";
import { StepDots } from "../_components/step-dots";

export const metadata = {
  title: "What are you building? — BuilderHQ",
};

export default function StartTypePage() {
  return (
    <div className="px-5 md:px-10 pt-10 sm:pt-16">
      <div className="mx-auto max-w-[1080px]">
        <Link
          href="/start"
          className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12.5px] font-ui transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Back
        </Link>

        <div className="mt-8 sm:mt-10 mb-10">
          <Suspense fallback={null}>
            <StepDots step={1} total={3} />
          </Suspense>
          <h1 className="mt-5 font-display uppercase tracking-[-0.014em] leading-[0.95] text-[clamp(2rem,5vw+0.8rem,3.8rem)]">
            <span className="text-text">What are you</span>{" "}
            <span className="text-accent">building?</span>
          </h1>
          <p className="mt-4 text-text-muted text-[15px] sm:text-[16px] leading-[1.55] max-w-[520px] font-body">
            Pick the closest match. You can refine the details next.
          </p>
        </div>

        <Suspense fallback={<TypeGridSkeleton />}>
          <TypeGrid />
        </Suspense>
      </div>
    </div>
  );
}

function TypeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 rounded-2xl border border-border bg-surface-1/30 animate-pulse"
        />
      ))}
    </div>
  );
}
