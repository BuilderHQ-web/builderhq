/**
 * BuildBriefStrip — the landing's Build Brief section: a proper section
 * header in the landing's language, then the latest edition as a navy
 * editorial card. The right rail carries the issue's three Market
 * Watch signals as live stat teasers, so the section shows the
 * intelligence rather than just plugging it. Everything comes from
 * brief-data; a new edition updates this section automatically.
 * Server component, zero client JS.
 */

import Image from "next/image";
import Link from "next/link";

import {
  issueNo,
  latestIssue,
} from "@/app/(marketing)/build-brief/brief-data";

export function BuildBriefStrip() {
  const issue = latestIssue();

  return (
    <section
      aria-label="The Build Brief"
      className="relative px-5 md:px-10 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1080px]">
        {/* section header — the landing's standard voice */}
        <div className="flex flex-col items-center text-center gap-4 mb-10 lg:mb-14">
          <span className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.28em] uppercase text-text-dim">
            <span className="h-px w-6 bg-text-faint/40" />
            The Build Brief
            <span className="h-px w-6 bg-text-faint/40" />
          </span>
          <h2 className="font-ui font-semibold text-[clamp(2rem,3vw+0.5rem,3.2rem)] leading-[1.05] tracking-[-0.03em] text-text">
            The week in home building,{" "}
            <span className="text-accent-light">read plainly.</span>
          </h2>
          <p className="max-w-[52ch] text-[14.5px] sm:text-[16px] leading-[1.6] text-text-muted">
            Our weekly briefing on the numbers, decisions and shifts shaping
            residential construction in Australia. Five minutes, sourced,
            every Friday.
          </p>
        </div>

        {/* latest edition */}
        <Link
          href={`/build-brief/${issue.slug}`}
          className="group relative block overflow-hidden rounded-3xl text-white transition-transform duration-300 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(180deg, #0d151e 0%, #090f16 100%)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(86,196,187,0.55), transparent)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 pointer-events-none"
          >
            <Image
              src="/build-brief/masthead-art.jpg"
              alt=""
              width={1600}
              height={1041}
              className="w-full h-auto opacity-55 select-none"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, #0a1017 0%, rgba(10,16,23,0.25) 65%, rgba(10,16,23,0.45) 100%)",
              }}
            />
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-10 lg:gap-14 px-7 py-10 sm:px-12 sm:py-12">
            {/* the edition */}
            <div>
              <p
                className="text-[10.5px] tracking-[0.3em] uppercase font-ui font-semibold"
                style={{ color: "rgba(86,196,187,0.95)" }}
              >
                Latest edition · Issue {issueNo(issue)} · {issue.displayDate}
              </p>
              <p
                className="mt-4 max-w-[22ch] text-[clamp(1.7rem,2.4vw+0.8rem,2.6rem)] leading-[1.08] tracking-[-0.005em]"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                {issue.title}
              </p>
              <p className="mt-4 max-w-[54ch] text-[14px] leading-[1.65] text-white/65">
                {issue.standfirst}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-ui font-semibold text-[#06231f] transition group-hover:brightness-105">
                  Read the latest edition
                </span>
                <span className="text-[11px] tracking-[0.22em] uppercase text-white/40 font-ui font-semibold">
                  Plain · Sourced · Every Friday
                </span>
              </div>
            </div>

            {/* this week's signals */}
            <div className="lg:border-l lg:border-white/10 lg:pl-10">
              <p className="text-[10.5px] tracking-[0.26em] uppercase text-white/45 font-ui font-semibold">
                This week&apos;s signals
              </p>
              <ul className="mt-5 flex flex-col gap-5">
                {issue.signals.map((s) => (
                  <li key={s.n} className="flex items-baseline gap-4">
                    <span
                      className="font-ui font-semibold tabular-nums text-[24px] sm:text-[26px] leading-none tracking-[-0.02em] shrink-0"
                      style={{ color: "rgba(127,209,201,0.95)" }}
                    >
                      {s.stat.value}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] tracking-[0.14em] uppercase text-white/45 font-ui font-semibold">
                        {s.kicker}
                      </span>
                      <span className="block text-[12.5px] leading-[1.45] text-white/70">
                        {s.stat.label}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* breathing room over the art */}
          <div aria-hidden className="relative h-6 sm:h-10" />
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
