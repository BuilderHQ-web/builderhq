/**
 * BuildBriefStrip — the publication, introduced rather than reprinted.
 *
 * This was a full broadsheet front page: dateline, double rules,
 * nameplate, this week's headline and standfirst, and a three-column
 * index of the edition's statistics. Handsome on its own, but it sat
 * in the middle of a product argument reproducing a different medium,
 * and it read as a separate website wedged into this one.
 *
 * Now it does one job: say what The Build Brief is and offer the way
 * in. The contrast does the work the broadsheet furniture used to do.
 * The whole band drops to ink while the rest of the page is cream, so
 * the eye registers a change of register, a publication rather than a
 * pitch, without a single extra rule or box. Instrument Serif carries
 * the nameplate; it is loaded for the publication anyway and appears
 * nowhere else on the landing, which is exactly why it reads as a
 * masthead here.
 *
 * Compact by design: this is an interstitial between chapters, not a
 * chapter. Server component, zero client JS.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  issueNo,
  latestIssue,
} from "@/app/(marketing)/build-brief/brief-data";

const SERIF = { fontFamily: "var(--font-instrument-serif)" } as const;

/** What the publication actually covers, in the reader's terms. */
const COVERS = [
  "What building is costing",
  "What the rules now require",
  "What it means for your project",
];

export function BuildBriefStrip() {
  const issue = latestIssue();

  return (
    <section
      aria-label="The Build Brief"
      className="relative px-5 md:px-10 py-16 lg:py-20"
      style={{ background: "#101820" }}
    >
      {/* A hairline top and bottom so the band reads as a deliberate
          change of paper rather than a gap in the page. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "rgba(0,212,200,0.28)" }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: "rgba(0,212,200,0.28)" }}
      />

      <div className="mx-auto w-full max-w-[1000px] grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        {/* the publication */}
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.24em] uppercase font-ui font-semibold" style={{ color: "#2fd4c8" }}>
            From BuilderHQ, every Friday
          </p>

          <p
            className="mt-3 text-[clamp(2.1rem,3.4vw+0.6rem,3rem)] leading-[1.02] tracking-[-0.01em]"
            style={{ ...SERIF, color: "#f3ede2" }}
          >
            The Build Brief
          </p>

          <p
            className="mt-4 max-w-[52ch] text-[15px] sm:text-[16px] leading-[1.65]"
            style={{ color: "rgba(243,237,226,0.66)" }}
          >
            A short weekly read on the economics of getting homes built
            in Australia. Plain language, every figure sourced, no
            opinion dressed up as news.
          </p>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {COVERS.map((line) => (
              <li
                key={line}
                className="inline-flex items-center gap-2 text-[13px]"
                style={{ color: "rgba(243,237,226,0.78)" }}
              >
                <span
                  aria-hidden
                  className="size-1 rounded-full shrink-0"
                  style={{ background: "#2fd4c8" }}
                />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* the way in */}
        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
          <Link
            href={`/build-brief/${issue.slug}`}
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13px] font-ui font-semibold transition-colors"
            style={{ background: "#00d4c8", color: "#031118" }}
          >
            Read issue {issueNo(issue)}
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/build-brief"
            className="text-[12.5px] font-ui transition-colors hover:opacity-100"
            style={{ color: "rgba(243,237,226,0.6)" }}
          >
            Browse every edition
          </Link>
        </div>
      </div>
    </section>
  );
}
