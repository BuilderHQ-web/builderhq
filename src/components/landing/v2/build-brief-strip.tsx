/**
 * BuildBriefStrip — the landing's Build Brief section, set as the
 * front page of a broadsheet: dateline, double rule, serif nameplate,
 * this week's headline, and an index strip of the edition's three
 * Market Watch signals. The credibility IS the design — no gloss,
 * just the publication itself, printed on paper.
 *
 * Everything comes from brief-data, so a new edition re-typesets the
 * front page automatically. Server component, zero client JS.
 */

import Link from "next/link";

import {
  issueNo,
  latestIssue,
} from "@/app/(marketing)/build-brief/brief-data";

const SERIF = { fontFamily: "var(--font-instrument-serif)" } as const;

export function BuildBriefStrip() {
  const issue = latestIssue();

  return (
    <section
      aria-label="The Build Brief"
      className="relative px-5 md:px-10 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[880px]">
        <Link
          href={`/build-brief/${issue.slug}`}
          className="group block rounded-2xl bg-[#fffdf8] ring-1 ring-[#101820]/[0.09] card-elev px-6 py-8 sm:px-12 sm:py-11 transition-all duration-300 hover:-translate-y-1 hover:ring-[#101820]/[0.16]"
        >
          {/* dateline */}
          <div className="flex items-baseline justify-between gap-4 text-[10px] sm:text-[10.5px] tracking-[0.18em] uppercase font-ui font-semibold text-text-dim">
            <span>Issue {issueNo(issue)}</span>
            <span className="hidden sm:block">{issue.displayDate}</span>
            <span>Melbourne</span>
          </div>

          {/* masthead rules */}
          <div aria-hidden className="mt-3 border-t-2 border-[#101820]" />
          <div aria-hidden className="mt-[3px] border-t border-[#101820]/50" />

          {/* nameplate */}
          <p
            className="mt-7 text-center text-[clamp(2.7rem,5.4vw+0.8rem,4.6rem)] leading-[0.95] tracking-[-0.01em] text-text"
            style={SERIF}
          >
            The Build Brief
          </p>
          <p className="mt-3.5 text-center text-[10px] sm:text-[10.5px] tracking-[0.28em] uppercase text-text-dim font-ui font-semibold">
            Five minutes on the economics of getting homes built
          </p>

          <div aria-hidden className="mt-7 border-t border-[#101820]/[0.14]" />

          {/* this week's headline */}
          <h2 className="mt-8 mx-auto max-w-[26ch] text-center font-ui font-semibold tracking-[-0.03em] leading-[1.14] text-[clamp(1.45rem,2vw+0.7rem,2.15rem)] text-text">
            {issue.title}
          </h2>
          <p className="mt-4 mx-auto max-w-[58ch] text-center text-[14px] sm:text-[14.5px] leading-[1.65] text-text-muted">
            {issue.standfirst}
          </p>

          {/* index strip — the edition's three signals */}
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-y-4 border-y border-[#101820]/[0.1] py-5 sm:divide-x sm:divide-[#101820]/[0.1]">
            {issue.signals.map((s) => (
              <div key={s.n} className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <p className="text-[30px] leading-none text-text" style={SERIF}>
                  {s.stat.value}
                </p>
                <p className="mt-2 text-[10.5px] tracking-[0.16em] uppercase text-accent-light font-ui font-semibold">
                  {s.n} · {s.kicker}
                </p>
                <p className="mt-1 text-[12px] leading-[1.5] text-text-muted max-w-[28ch]">
                  {s.stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* foot */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <span className="inline-flex items-center rounded-full bg-[#101820] px-5 py-2.5 text-[12.5px] font-ui font-semibold text-white transition-colors group-hover:bg-[#1b2733]">
              Read Issue {issueNo(issue)} →
            </span>
            <span className="text-[10.5px] tracking-[0.22em] uppercase text-text-dim font-ui font-semibold">
              Plain · Sourced · Every Friday
            </span>
          </div>
        </Link>

        <p className="mt-6 text-center text-[13px] text-text-muted">
          <Link
            href="/build-brief"
            className="font-ui font-medium text-text hover:text-accent-light transition-colors"
          >
            Browse all editions →
          </Link>
        </p>
      </div>
    </section>
  );
}
