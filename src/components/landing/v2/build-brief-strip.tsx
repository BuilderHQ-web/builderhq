/**
 * BuildBriefStrip — the publication, as a proper chapter.
 *
 * Two earlier attempts and what was wrong with each. First a full
 * broadsheet front page: dateline, double rules, nameplate, this
 * week's headline and a three-column index of statistics. Handsome,
 * but it reproduced a different medium in the middle of a product
 * argument and read as a separate website wedged into this one. Then
 * a compact band in ink, which fixed the reproduction problem by
 * shouting instead: a black stripe across a cream page, half the
 * height of every chapter around it, so it read as an advertisement
 * the page had sold space to.
 *
 * This is the publication treated the way every other chapter is
 * treated. Same cream, same warm field as Problem and Network, same
 * vertical rhythm, same 1100 measure, same split with a bordered
 * panel on the right. Two things do the distinguishing, and both are
 * editorial rather than decorative: Instrument Serif, which appears
 * nowhere else on the landing and therefore reads as a masthead, and
 * the panel, which is the current issue rather than a description of
 * one. A reader can see what they would be reading.
 *
 * Brand teal, not the lens hue: this is BuilderHQ publishing, the same
 * to a homeowner and a builder. Server component, zero client JS.
 */

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import {
  issueNo,
  latestIssue,
} from "@/app/(marketing)/build-brief/brief-data";

import { SectionField } from "./section-field";

const SERIF = { fontFamily: "var(--font-instrument-serif)" } as const;

/** What the publication covers, in the reader's terms. Numbered on the
 *  same rule device the dividers and the Network masthead use. */
const COVERS = [
  "What building is costing",
  "What the rules now require",
  "What it means for your project",
];

export function BuildBriefStrip() {
  const issue = latestIssue();
  const no = issueNo(issue);

  return (
    <section
      id="brief"
      aria-label="The Build Brief"
      className="relative overflow-hidden px-5 md:px-10 py-20 lg:py-24 scroll-mt-16 lg:min-h-[100svh] lg:flex lg:items-center"
    >
      <SectionField variant="warm" />

      <div className="relative mx-auto w-full max-w-[1100px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.88fr] gap-12 lg:gap-16 items-center">
          {/* The publication */}
          <div className="text-center lg:text-left">
            <p className="text-[11px] tracking-[0.24em] uppercase font-ui font-semibold text-accent-light">
              A BuilderHQ publication
            </p>

            <p
              className="mt-5 text-[clamp(2.6rem,4.4vw+0.6rem,4.4rem)] leading-[0.98] tracking-[-0.015em] text-text"
              style={SERIF}
            >
              The Build Brief
            </p>

            <p className="mt-6 mx-auto lg:mx-0 max-w-[46ch] text-pretty text-[15px] sm:text-[16px] leading-[1.7] text-text-muted">
              A short weekly read on the economics of getting homes built
              in Australia. Plain language, every figure attributed to its
              source, and no opinion dressed up as news.
            </p>

            <ul className="mt-8 mx-auto lg:mx-0 max-w-[26rem] flex flex-col gap-3.5">
              {COVERS.map((line, i) => (
                <li key={line} className="flex items-center gap-3.5">
                  <span className="font-mono text-[12px] tabular-nums text-accent-light">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden className="h-px w-6 shrink-0 bg-[rgba(24,34,44,0.14)]" />
                  <span className="text-[14.5px] leading-[1.45] text-text text-left">
                    {line}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-5">
              <Link
                href={`/build-brief/${issue.slug}`}
                className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[14px] font-semibold transition-colors hover:bg-accent-hover"
              >
                Read issue {no}
                <ArrowRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/build-brief"
                className="group inline-flex items-center gap-1.5 h-12 text-[14px] font-medium text-text-muted hover:text-text transition-colors"
              >
                Browse every edition
                <ArrowUpRight className="size-4 opacity-60 transition-all duration-[180ms] group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>

          {/* The current issue, so the offer is visible rather than
              described. Same panel language as Pricing and Network. */}
          <Link
            href={`/build-brief/${issue.slug}`}
            className="group relative block rounded-2xl border border-border bg-white p-7 lg:p-9 overflow-hidden transition-[border-color,transform,box-shadow] duration-[420ms] ease-[var(--ease-out)] hover:-translate-y-1 hover:border-border-accent/60"
            style={{ boxShadow: "0 24px 60px -34px rgba(0,120,112,0.45)" }}
          >
            <span
              aria-hidden
              className="absolute top-0 inset-x-10 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,170,158,0.55), transparent)" }}
            />

            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent-light">
                Issue {no}
              </span>
              <span className="text-[11.5px] text-text-dim">
                {issue.displayDate}
              </span>
            </div>

            <p
              className="mt-6 text-balance text-[clamp(1.5rem,1.5vw+0.9rem,1.95rem)] leading-[1.14] tracking-[-0.01em] text-text"
              style={SERIF}
            >
              {issue.title}
            </p>

            <p className="mt-5 text-[14px] leading-[1.7] text-text-muted line-clamp-4">
              {issue.standfirst}
            </p>

            <span className="mt-7 pt-5 border-t border-border-subtle/70 flex items-center gap-2 text-[13px] font-ui font-semibold text-accent-light">
              Read this issue
              <ArrowRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
