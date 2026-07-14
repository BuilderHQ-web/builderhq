import type { Metadata } from "next";
import Link from "next/link";

import {
  briefIssues,
  briefPerspectives,
  issueNo,
  latestIssue,
} from "./brief-data";
import {
  BriefCard,
  BriefKicker,
  BriefShell,
  JsonLd,
  MastheadKicker,
  MastheadPanel,
  SERIF,
  SITE,
  periodicalSchema,
} from "./brief-ui";

/**
 * The Build Brief · hub. The publication's front door: masthead, what
 * it is, every edition. New issues appear automatically from
 * brief-data.
 */

export const metadata: Metadata = {
  title: "The Build Brief · Australia's weekly residential construction briefing",
  description:
    "Five minutes on the economics of getting homes built in Australia. Housing starts, building approvals, construction costs and the decisions that matter, set out plainly for homeowners, designers, builders and brokers. Every Friday, by BuilderHQ.",
  keywords: [
    "australian construction news",
    "residential construction news australia",
    "home building news",
    "housing market australia",
    "building approvals",
    "construction costs",
    "housing starts",
    "property development news",
    "the build brief",
    "builderhq",
  ],
  alternates: {
    canonical: "/build-brief",
    types: { "application/rss+xml": "/build-brief/feed.xml" },
  },
  openGraph: {
    title: "The Build Brief · by BuilderHQ",
    description:
      "Five minutes on the economics of getting homes built in Australia. Plain, sourced, every Friday.",
    url: `${SITE}/build-brief`,
    siteName: "BuilderHQ",
    type: "website",
    images: [{ url: "/build-brief/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Build Brief · by BuilderHQ",
    description:
      "Five minutes on the economics of getting homes built in Australia. Plain, sourced, every Friday.",
    images: ["/build-brief/og.jpg"],
  },
};

const FORMAT: Array<{ label: string; body: string }> = [
  {
    label: "Market Watch",
    body: "Three signals from the week's data: housing starts, building approvals, construction costs and lending. Every number attributed to its source.",
  },
  {
    label: "The Feature",
    body: "One practical topic taken apart properly, from comparing builder quotes to contracts, allowances and approvals.",
  },
  {
    label: "Project of the Week",
    body: "A recognised Australian home worth studying, and what makes it work.",
  },
  {
    label: "Voices",
    body: "What economists, industry bodies and practitioners are actually saying about the market.",
  },
  {
    label: "Partner Corner",
    body: "A design or finance partner from the BuilderHQ register, and why we would put our name behind them.",
  },
];

function hubSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      periodicalSchema(),
      {
        "@type": "CollectionPage",
        "@id": `${SITE}/build-brief#page`,
        name: "The Build Brief",
        description:
          "Five minutes on the economics of getting homes built in Australia. Plain, sourced, every Friday, by BuilderHQ.",
        url: `${SITE}/build-brief`,
        isPartOf: { "@id": `${SITE}/#organization` },
        mainEntity: { "@id": `${SITE}/build-brief#periodical` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BuilderHQ", item: SITE },
          {
            "@type": "ListItem",
            position: 2,
            name: "The Build Brief",
            item: `${SITE}/build-brief`,
          },
        ],
      },
    ],
  };
}

export default function BuildBriefHub() {
  const issues = briefIssues();
  const latest = latestIssue();
  const perspectives = briefPerspectives();

  return (
    <BriefShell>
      <JsonLd data={hubSchema()} />

      <div className="mx-auto w-full max-w-[980px]">
        {/* masthead */}
        <MastheadPanel className="px-6 py-12 sm:px-12 sm:py-16">
          <MastheadKicker>The Friday Intelligence Briefing · by BuilderHQ</MastheadKicker>
          <h1
            className="mt-5 text-[clamp(3rem,6vw+1rem,5.4rem)] leading-[0.98] tracking-[-0.01em]"
            style={SERIF}
          >
            The Build Brief
          </h1>
          <p className="mt-5 max-w-[54ch] text-[16px] leading-[1.7] text-white/75">
            Five minutes on the economics of getting homes built in Australia.
            The numbers, the decisions and the shifts that matter, set out
            plainly enough to act on.
          </p>
          <p className="mt-7 text-[11px] tracking-[0.24em] uppercase text-white/45 font-ui font-semibold">
            Plain · Sourced · Every Friday
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/build-brief/${latest.slug}`}
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-[13px] font-ui font-semibold text-[#06231f] hover:brightness-105 transition"
            >
              Read the latest edition
            </Link>
            <a
              href="#editions"
              className="inline-flex items-center rounded-full ring-1 ring-white/20 px-6 py-3 text-[13px] font-ui font-semibold text-white/85 hover:bg-white/10 transition-colors"
            >
              All editions
            </a>
          </div>
          <div aria-hidden className="h-14 sm:h-20" />
        </MastheadPanel>

        {/* mission line */}
        <p className="mt-10 mx-auto max-w-[68ch] text-center text-[15.5px] leading-[1.75] text-text-muted">
          Building a home asks a great deal of the people who take it on, and
          the information around it is often scattered, technical, or quietly
          out of date. Each Friday, The Build Brief takes the week in
          residential construction and reads it through four windows at once:
          the <Link href="/" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">homeowners and developers</Link> taking projects on, the{" "}
          <Link href="/for/architects" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">designers</Link> shaping them, the{" "}
          <Link href="/for/builders" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">builders</Link> pricing and delivering them, and the{" "}
          <Link href="/for/finance-brokers" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">brokers</Link> financing them.
        </p>

        {/* editions */}
        <div id="editions" className="mt-12 sm:mt-16 scroll-mt-28">
          <div className="flex items-center justify-center gap-2.5 mb-8 text-[11px] tracking-[0.28em] uppercase text-text-dim">
            <span aria-hidden className="h-px w-6 bg-text-faint/40" />
            All editions
            <span aria-hidden className="h-px w-6 bg-text-faint/40" />
          </div>

          <div className="flex flex-col gap-6">
            {issues.map((issue) => (
              <Link
                key={issue.slug}
                href={`/build-brief/${issue.slug}`}
                className="group block rounded-2xl bg-white ring-1 ring-[#101820]/[0.06] card-elev px-6 py-7 sm:px-10 sm:py-9 transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#101820]/[0.12]"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
                    Issue {issueNo(issue)}
                  </p>
                  <p className="text-[11.5px] tracking-[0.08em] text-text-dim">
                    {issue.displayDate}
                  </p>
                </div>
                <h2 className="mt-3 font-ui font-semibold tracking-[-0.03em] leading-[1.15] text-[clamp(1.4rem,1.6vw+0.8rem,2rem)] text-text max-w-[30ch]">
                  {issue.title}
                </h2>
                <p className="mt-3 text-[14.5px] leading-[1.65] text-text-muted max-w-[74ch]">
                  {issue.standfirst}
                </p>
                <p className="mt-5 text-[13px] font-ui font-semibold text-text group-hover:text-accent-light transition-colors">
                  Read the edition →
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* perspectives — signed essays, unnumbered, beside the editions */}
        {perspectives.length > 0 ? (
          <div className="mt-12 sm:mt-16">
            <div className="flex items-center justify-center gap-2.5 mb-8 text-[11px] tracking-[0.28em] uppercase text-text-dim">
              <span aria-hidden className="h-px w-6 bg-text-faint/40" />
              Perspectives
              <span aria-hidden className="h-px w-6 bg-text-faint/40" />
            </div>
            <div className="flex flex-col gap-6">
              {perspectives.map((p) => (
                <Link
                  key={p.slug}
                  href={`/build-brief/perspectives/${p.slug}`}
                  className="group block rounded-2xl bg-white border-l-[3px] border-accent-light ring-1 ring-[#101820]/[0.06] card-elev px-6 py-7 sm:px-10 sm:py-9 transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#101820]/[0.12]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                    <p className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
                      A Founder Perspective · Opinion
                    </p>
                    <p className="text-[11.5px] tracking-[0.08em] text-text-dim">
                      {p.displayDate}
                    </p>
                  </div>
                  <h2
                    className="mt-3 leading-[1.12] text-[clamp(1.5rem,1.8vw+0.8rem,2.15rem)] text-text max-w-[30ch]"
                    style={SERIF}
                  >
                    {p.title} {p.titleAccent}
                  </h2>
                  <p className="mt-3 text-[14.5px] leading-[1.65] text-text-muted max-w-[74ch] italic" style={SERIF}>
                    {p.standfirst}
                  </p>
                  <p className="mt-5 flex items-center gap-3">
                    {p.author.portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.author.portrait}
                        alt={p.author.name}
                        className="size-9 rounded-full object-cover grayscale ring-1 ring-[#101820]/10"
                      />
                    ) : null}
                    <span className="text-[12.5px] text-text-dim leading-tight">
                      <span className="font-ui font-semibold text-text">
                        {p.author.name}
                      </span>{" "}
                      · {p.author.role}
                      <span aria-hidden className="mx-1.5 text-text-faint">·</span>
                      {p.readingMins} min read
                    </span>
                    <span className="ml-auto hidden sm:inline text-[13px] font-ui font-semibold text-text group-hover:text-accent-light transition-colors">
                      Read the essay →
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* inside every edition */}
        <BriefCard className="mt-12 sm:mt-16">
          <BriefKicker>Inside every edition</BriefKicker>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
            {FORMAT.map((f, i) => (
              <div key={f.label} className={i === 0 ? "sm:col-span-2" : undefined}>
                <p className="text-[13.5px] font-ui font-semibold text-text">
                  {f.label}
                </p>
                <p className="mt-1.5 text-[14px] leading-[1.65] text-text-muted max-w-[64ch]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-[#101820]/[0.07] pt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-text-muted">
            <span>
              Follow along:{" "}
              <a
                href="https://www.linkedin.com/company/builderhq"
                target="_blank"
                rel="noopener"
                className="font-ui font-medium text-text hover:text-accent-light transition-colors"
              >
                LinkedIn
              </a>{" "}
              ·{" "}
              <a
                href="https://www.instagram.com/builderhq_/"
                target="_blank"
                rel="noopener"
                className="font-ui font-medium text-text hover:text-accent-light transition-colors"
              >
                Instagram
              </a>
            </span>
            <span className="text-text-dim">
              Compiled by{" "}
              <Link href="/about" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">
                BuilderHQ
              </Link>
              , Melbourne · Meet our{" "}
              <Link href="/partners" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">
                Preferred Partners
              </Link>
            </span>
          </div>
        </BriefCard>
      </div>
    </BriefShell>
  );
}
