/**
 * BuildBriefStrip — the landing's pointer to The Build Brief: one quiet
 * navy editorial card (the publication's identity) carrying the latest
 * issue. Sits late in the page, after the testimonials, so it lends
 * credibility without interrupting the conversion narrative. Server
 * component; the latest issue comes straight from brief-data.
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
      className="relative px-5 md:px-10 py-14 lg:py-20"
    >
      <div className="mx-auto w-full max-w-[860px]">
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
          <div aria-hidden className="absolute inset-x-0 bottom-0 pointer-events-none">
            <Image
              src="/build-brief/masthead-art.jpg"
              alt=""
              width={1600}
              height={1041}
              className="w-full h-auto opacity-60 select-none"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, #0a1017 0%, rgba(10,16,23,0.2) 65%, rgba(10,16,23,0.4) 100%)",
              }}
            />
          </div>

          <div className="relative px-7 py-9 sm:px-11 sm:py-11">
            <p
              className="text-[10.5px] tracking-[0.3em] uppercase font-ui font-semibold"
              style={{ color: "rgba(86,196,187,0.95)" }}
            >
              The Build Brief · Issue {issueNo(issue)} · {issue.displayDate}
            </p>
            <p
              className="mt-4 max-w-[24ch] text-[clamp(1.6rem,2.4vw+0.8rem,2.5rem)] leading-[1.08] tracking-[-0.005em]"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {issue.title}
            </p>
            <p className="mt-4 max-w-[58ch] text-[14px] leading-[1.65] text-white/65">
              Five minutes on the economics of getting homes built in
              Australia. Plain, sourced, every Friday.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-[13px] font-ui font-semibold text-white group-hover:text-[#7fd1c9] transition-colors">
              Read the latest edition
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </p>
            <div aria-hidden className="h-8 sm:h-12" />
          </div>
        </Link>
      </div>
    </section>
  );
}
