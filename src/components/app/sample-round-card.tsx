/**
 * The example round's front door — one distinct card on the owner and
 * architect desks. It leads straight to the finished comparison,
 * because the comparison is the argument: three structured tenders
 * over one scope of works, and the cheapest is not the cheapest.
 */

import Link from "next/link";
import { ArrowRight, BookOpenCheck } from "lucide-react";

import { CoverArt } from "@/components/builder/project-cover";

export function SampleRoundCard({
  href,
  role,
}: {
  /** The evaluation route for this role's project surface. */
  href: string;
  role: "owner" | "architect";
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-stretch overflow-hidden rounded-xl border border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.05),rgba(250,248,243,0.5)_65%)] transition-[border-color,box-shadow] duration-150 hover:border-border-accent/60 hover:card-elev-lg"
    >
      <span className="relative hidden sm:block w-[168px] shrink-0 border-r border-border-subtle/60 overflow-hidden">
        <CoverArt
          facts={{
            type: "single_dwelling",
            floors: 3,
            dwellingCount: null,
            renovationScope: null,
            extensionType: null,
          }}
          sizes="168px"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </span>
      <span className="min-w-0 flex-1 px-4 sm:px-6 py-5 flex items-center gap-5">
        <span className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2">
            <span className="text-[9.5px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold">
              The example round
            </span>
            <span className="px-1.5 py-0.5 rounded-sm border border-border-subtle text-[8.5px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
              Example
            </span>
          </span>
          <span className="mt-1.5 block font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
            See a finished round before running your own
          </span>
          <span className="mt-1.5 block text-[12.5px] leading-[1.6] text-text-muted max-w-[62ch]">
            {role === "architect"
              ? "A single dwelling with three tenders in, evaluated and ready to compare side by side. Explore the scope of works, the tenders and the comparison your practice would put its name to."
              : "A single dwelling with three tenders in, evaluated and ready to compare side by side. Explore the scope of works, the tenders and the comparison, then run the same round on your own project."}
          </span>
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 text-[12.5px] font-ui font-semibold text-accent-light shrink-0">
          <BookOpenCheck className="size-4" />
          Open the comparison
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
