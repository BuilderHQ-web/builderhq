import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPartner } from "@/app/(marketing)/partners/partners-data";

import {
  BRIEF_AUDIENCES,
  briefIssues,
  getIssue,
  issueNo,
  type BriefIssue,
  type BriefSignal,
} from "../brief-data";
import {
  BriefCard,
  BriefKicker,
  BriefShell,
  JsonLd,
  MastheadKicker,
  MastheadPanel,
  SERIF,
  SITE,
  SourceLine,
  TakesGrid,
  periodicalSchema,
} from "../brief-ui";

/**
 * The Build Brief · one issue. Everything renders from brief-data — a
 * new edition is a data entry, not a new page. Server-rendered, fully
 * static, structured data for Article + PublicationIssue.
 */

export function generateStaticParams() {
  return briefIssues().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return {};
  const title = `The Build Brief ${issueNo(issue)} · ${issue.title}`;
  return {
    title,
    description: issue.seoDescription,
    keywords: issue.keywords,
    alternates: { canonical: `/build-brief/${issue.slug}` },
    openGraph: {
      title,
      description: issue.seoDescription,
      url: `${SITE}/build-brief/${issue.slug}`,
      siteName: "BuilderHQ",
      type: "article",
      publishedTime: issue.date,
      images: [{ url: issue.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: issue.seoDescription,
      images: [issue.ogImage],
    },
  };
}

function issueSchema(issue: BriefIssue) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      periodicalSchema(),
      {
        "@type": "PublicationIssue",
        "@id": `${SITE}/build-brief/${issue.slug}#issue`,
        issueNumber: issue.number,
        datePublished: issue.date,
        isPartOf: { "@id": `${SITE}/build-brief#periodical` },
        url: `${SITE}/build-brief/${issue.slug}`,
      },
      {
        "@type": "Article",
        "@id": `${SITE}/build-brief/${issue.slug}#article`,
        headline: issue.title,
        description: issue.seoDescription,
        image: `${SITE}${issue.ogImage}`,
        datePublished: issue.date,
        dateModified: issue.date,
        inLanguage: "en-AU",
        author: { "@id": `${SITE}/#organization` },
        publisher: { "@id": `${SITE}/#organization` },
        isPartOf: { "@id": `${SITE}/build-brief/${issue.slug}#issue` },
        mainEntityOfPage: `${SITE}/build-brief/${issue.slug}`,
        keywords: issue.keywords.join(", "),
        about: [
          { "@type": "Thing", name: "Residential construction in Australia" },
          { "@type": "Thing", name: "Australian housing market" },
        ],
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
          {
            "@type": "ListItem",
            position: 3,
            name: `Issue ${issueNo(issue)}`,
            item: `${SITE}/build-brief/${issue.slug}`,
          },
        ],
      },
    ],
  };
}

/* ── section renderers ───────────────────────────────────────────────── */

function Signal({ signal, count }: { signal: BriefSignal; count: number }) {
  return (
    <BriefCard>
      <BriefKicker right="For everyone in the build">
        Market Watch · Signal {Number(signal.n)} of {count}
      </BriefKicker>
      <p className="text-[11px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {signal.n} · {signal.kicker}
      </p>
      <h3 className="mt-3 font-ui font-semibold tracking-[-0.03em] leading-[1.12] text-[clamp(1.5rem,1.6vw+0.9rem,2.1rem)] text-text max-w-[26ch]">
        {signal.headline}
      </h3>

      <div className="mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-start">
        <div>
          <p className="font-ui font-semibold tracking-[-0.03em] leading-none text-[clamp(3rem,3.4vw+1.6rem,4.4rem)] text-text tabular-nums">
            {signal.stat.value}
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.5] text-text-muted max-w-[30ch]">
            {signal.stat.label}
          </p>
          {signal.stat.sub ? (
            <p className="mt-2 inline-flex rounded-full bg-[#101820]/[0.05] px-3 py-1 text-[11.5px] tracking-[0.04em] text-text-muted">
              {signal.stat.sub}
            </p>
          ) : null}
        </div>

        {signal.rows?.length ? (
          <div>
            {signal.rowsTitle ? (
              <p className="text-[11px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold mb-3">
                {signal.rowsTitle}
              </p>
            ) : null}
            <ul className="divide-y divide-[#101820]/[0.06] border-y border-[#101820]/[0.08]">
              {signal.rows.map((r) => (
                <li
                  key={r.label}
                  className="flex items-baseline justify-between gap-6 py-2.5"
                >
                  <span className="text-[13.5px] text-text-muted">{r.label}</span>
                  <span
                    className={`font-ui font-semibold tabular-nums text-[15px] ${
                      r.accent ? "text-accent-light" : "text-text"
                    }`}
                  >
                    {r.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="mt-7 text-[15px] leading-[1.7] text-text-muted max-w-[68ch]">
        {signal.body}
      </p>
      <SourceLine>{signal.source}</SourceLine>
      <TakesGrid takes={signal.takes} />
    </BriefCard>
  );
}

function QuoteDoc({ doc }: { doc: BriefIssue["feature"]["quoteDoc"] }) {
  return (
    <div className="rounded-xl bg-[#fbfaf7] ring-1 ring-[#101820]/[0.08] p-5 sm:p-6">
      <p className="text-[11px] tracking-[0.2em] uppercase font-ui font-semibold text-text">
        {doc.docTitle}
      </p>
      <p className="mt-1 text-[12px] text-text-dim">{doc.docSubtitle}</p>
      <ul className="mt-4 divide-y divide-[#101820]/[0.05]">
        {doc.rows.map((r) => (
          <li key={r.item} className="flex items-baseline justify-between gap-4 py-[7px]">
            <span className="text-[12.5px] text-text-muted">
              {r.item}
              {r.flag && r.flag !== "Excluded" ? (
                <span className="ml-2 rounded-sm bg-accent/10 px-1.5 py-0.5 text-[10px] font-ui font-semibold tracking-[0.08em] text-accent-light align-middle">
                  {r.flag}
                </span>
              ) : null}
            </span>
            <span
              className={`text-[12.5px] tabular-nums ${
                r.flag === "Excluded"
                  ? "text-text-dim italic"
                  : "font-ui font-medium text-text"
              }`}
            >
              {r.amount}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-[#101820]/[0.12] pt-3">
        <span className="text-[12.5px] font-ui font-semibold text-text">
          {doc.total.label}
        </span>
        <span className="text-[14px] font-ui font-semibold tabular-nums text-text">
          {doc.total.amount}
        </span>
      </div>
      <p className="mt-3 text-[11px] text-text-dim">
        {doc.footnotes.join(" · ")}
      </p>
      <div className="mt-5 border-t border-[#101820]/[0.07] pt-4 grid grid-cols-1 gap-2.5">
        {doc.annotations.map((a) => (
          <p key={a.n} className="text-[12.5px] leading-[1.5] text-text-muted">
            <span className="mr-2 inline-flex size-[18px] items-center justify-center rounded-full bg-[#101820]/[0.06] text-[10px] font-ui font-semibold text-text align-middle">
              {a.n.replace(/^0/, "")}
            </span>
            <span className="font-ui font-semibold text-text">{a.term}</span>
            {" — "}
            {a.def}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────── */

export default async function BriefIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const partner = getPartner(issue.partnerCorner.partnerSlug);
  const issues = briefIssues();
  const idx = issues.findIndex((i) => i.slug === issue.slug);
  const newer = idx > 0 ? issues[idx - 1] : undefined;
  const older = idx < issues.length - 1 ? issues[idx + 1] : undefined;
  const signalCount = issue.signals.length;

  return (
    <BriefShell>
      <JsonLd data={issueSchema(issue)} />

      <div className="mx-auto w-full max-w-[980px]">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-[11.5px] tracking-[0.06em] text-text-dim">
          <Link href="/build-brief" className="hover:text-text transition-colors">
            The Build Brief
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text-muted">Issue {issueNo(issue)}</span>
        </nav>

        {/* masthead */}
        <MastheadPanel className="px-6 py-10 sm:px-12 sm:py-14">
          <MastheadKicker>
            The Build Brief · Issue {issueNo(issue)} · {issue.displayDate}
          </MastheadKicker>
          <h1
            className="mt-5 max-w-[19ch] text-[clamp(2.2rem,4vw+1rem,3.9rem)] leading-[1.04] tracking-[-0.01em]"
            style={SERIF}
          >
            {issue.title}
          </h1>
          <p className="mt-5 max-w-[62ch] text-[15.5px] leading-[1.7] text-white/70">
            {issue.standfirst}
          </p>
          <p className="mt-7 text-[11px] tracking-[0.22em] uppercase text-white/45 font-ui font-semibold">
            By BuilderHQ · Plain · Sourced · Every Friday
          </p>
          {/* breathing room above the wireframe art */}
          <div aria-hidden className="h-16 sm:h-24" />
        </MastheadPanel>

        <div className="mt-8 sm:mt-10 flex flex-col gap-8 sm:gap-10">
          {/* The Note */}
          <BriefCard>
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              The Note
            </BriefKicker>
            <p className="text-[13px] text-text-dim mb-5">{issue.note.heading}</p>
            <div className="flex flex-col gap-4 max-w-[70ch]">
              {issue.note.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`leading-[1.75] ${
                    i === 0
                      ? "text-[17px] font-ui font-medium text-text"
                      : "text-[15px] text-text-muted"
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
            <p className="mt-6 text-[13.5px] font-ui font-semibold text-text">
              {issue.note.signoff}
            </p>
          </BriefCard>

          {/* Market Watch */}
          {issue.signals.map((s) => (
            <Signal key={s.n} signal={s} count={signalCount} />
          ))}

          {/* The Feature */}
          <BriefCard>
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              {issue.feature.kicker}
            </BriefKicker>
            <h3 className="font-ui font-semibold tracking-[-0.03em] leading-[1.12] text-[clamp(1.5rem,1.6vw+0.9rem,2.1rem)] text-text max-w-[28ch]">
              {issue.feature.headline}
            </h3>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
              <div className="flex flex-col gap-4">
                {issue.feature.paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.75] text-text-muted">
                    {p}
                  </p>
                ))}
              </div>
              <QuoteDoc doc={issue.feature.quoteDoc} />
            </div>
            <TakesGrid takes={issue.feature.takes} />
          </BriefCard>

          {/* Project of the Week — no third-party photography republished;
              an editorial treatment linking to the original coverage. */}
          <MastheadPanel className="px-6 py-10 sm:px-12 sm:py-12" art={false}>
            <div className="flex items-baseline justify-between gap-4">
              <MastheadKicker>{issue.project.kicker}</MastheadKicker>
              <span className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-white/40">
                The Build Brief · Issue {issueNo(issue)}
              </span>
            </div>
            <h3
              className="mt-5 text-[clamp(1.9rem,2.6vw+1rem,3rem)] leading-[1.08]"
              style={SERIF}
            >
              {issue.project.name}
              <span className="text-white/55"> · {issue.project.studio}</span>
            </h3>
            <p
              className="mt-2.5 text-[12.5px] tracking-[0.06em]"
              style={{ color: "rgba(224,178,92,0.92)" }}
            >
              {issue.project.recognition}
            </p>
            <p className="mt-6 max-w-[64ch] text-[15px] leading-[1.75] text-white/75">
              {issue.project.body}
            </p>
            <p
              className="mt-7 max-w-[30ch] text-[clamp(1.25rem,1.3vw+0.8rem,1.6rem)] leading-[1.3]"
              style={SERIF}
            >
              “{issue.project.pullQuote}”
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              {issue.project.link ? (
                <a
                  href={issue.project.link.href}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-4.5 py-2 text-[12.5px] font-ui font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  {issue.project.link.label} ↗
                </a>
              ) : null}
              <span className="text-[11.5px] text-white/40">
                {issue.project.credit}
              </span>
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <TakesGridOnDark takes={issue.project.takes} />
            </div>
          </MastheadPanel>

          {/* Voices */}
          <BriefCard>
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              {issue.voices.kicker}
            </BriefKicker>
            <p className="text-[13px] text-text-dim">{issue.voices.headline}</p>
            <blockquote className="mt-6">
              <p
                className="max-w-[24ch] text-[clamp(1.7rem,2.4vw+0.9rem,2.7rem)] leading-[1.15] text-text"
                style={SERIF}
              >
                “{issue.voices.quote}”
              </p>
              <footer className="mt-5 text-[12.5px] text-text-dim">
                {issue.voices.attribution} ·{" "}
                <span className="text-text-muted">{issue.voices.role}</span>
              </footer>
            </blockquote>
            <p className="mt-6 max-w-[68ch] text-[15px] leading-[1.75] text-text-muted">
              {issue.voices.body}
            </p>
            <TakesGrid takes={issue.voices.takes} />
          </BriefCard>

          {/* Partner Corner — pulls the live partner record */}
          <BriefCard>
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              Partner Corner
            </BriefKicker>
            <h3 className="font-ui font-semibold tracking-[-0.03em] leading-[1.15] text-[clamp(1.5rem,1.6vw+0.9rem,2.1rem)] text-text max-w-[30ch]">
              {issue.partnerCorner.headline}
            </h3>
            {partner ? (
              <p className="mt-3 text-[12.5px] text-text-dim">
                {partner.disciplines.slice(0, 2).join(" & ")} · {partner.suburb},{" "}
                {partner.state} · In the network since {partner.joined}
              </p>
            ) : null}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
              {issue.partnerCorner.portrait ? (
                <figure className="max-w-[220px]">
                  <div className="overflow-hidden rounded-xl ring-1 ring-[#101820]/[0.08]">
                    <Image
                      src={issue.partnerCorner.portrait}
                      alt={issue.partnerCorner.principal}
                      width={440}
                      height={550}
                      className="w-full h-auto"
                    />
                  </div>
                  <figcaption className="mt-3">
                    <p className="text-[13.5px] font-ui font-semibold text-text">
                      {issue.partnerCorner.principal}
                    </p>
                    <p className="text-[11.5px] text-text-dim">
                      {issue.partnerCorner.principalRole}
                    </p>
                    <p className="mt-2 text-[12.5px] italic leading-[1.5] text-text-muted">
                      “{issue.partnerCorner.principalQuote}”
                    </p>
                  </figcaption>
                </figure>
              ) : null}
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                  Why we introduce them
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-text-muted max-w-[62ch]">
                  {issue.partnerCorner.why}
                </p>
                <p className="mt-5 text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                  The practice
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-text-muted max-w-[62ch]">
                  {issue.partnerCorner.practice}
                </p>
                <p className="mt-5 text-[13.5px] leading-[1.65] text-text-muted max-w-[62ch] border-l-2 border-accent/40 pl-4">
                  {issue.partnerCorner.welcome}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {partner ? (
                    <Link
                      href={`/partners/${partner.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#101820] px-5 py-2.5 text-[12.5px] font-ui font-semibold text-white hover:bg-[#1b2733] transition-colors"
                    >
                      View {partner.name}&apos;s partner profile
                    </Link>
                  ) : null}
                  <Link
                    href="/partners"
                    className="inline-flex items-center gap-2 rounded-full ring-1 ring-[#101820]/[0.14] px-5 py-2.5 text-[12.5px] font-ui font-semibold text-text hover:bg-[#101820]/[0.04] transition-colors"
                  >
                    Explore the Preferred Partner register
                  </Link>
                </div>
              </div>
            </div>
          </BriefCard>

          {/* Over to you + colophon */}
          <BriefCard>
            <BriefKicker>Over to you</BriefKicker>
            <p className="font-ui font-semibold tracking-[-0.02em] text-[clamp(1.2rem,1vw+0.9rem,1.5rem)] text-text max-w-[34ch]">
              {issue.overToYou.question}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-text-muted max-w-[60ch]">
              {issue.overToYou.body}
            </p>
            <a
              href={`mailto:info@builderhq.com.au?subject=The%20Build%20Brief%20%C2%B7%20Issue%20${issueNo(issue)}`}
              className="mt-6 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-ui font-semibold text-[#06231f] hover:brightness-105 transition"
            >
              Reply to the team
            </a>
            <div className="mt-8 border-t border-[#101820]/[0.07] pt-5">
              <p className="text-[11.5px] leading-[1.7] text-text-dim max-w-[75ch]">
                This edition used data and reporting from{" "}
                {issue.sources.join(", ")}. The Build Brief is compiled by{" "}
                <Link href="/about" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">
                  BuilderHQ
                </Link>
                , Melbourne. Read past editions at{" "}
                <Link href="/build-brief" className="underline decoration-[#101820]/20 underline-offset-2 hover:text-text transition-colors">
                  builderhq.com.au/build-brief
                </Link>
                .
              </p>
            </div>
          </BriefCard>

          {/* issue navigation */}
          <nav className="flex items-center justify-between gap-4 text-[13px] font-ui font-medium">
            {older ? (
              <Link
                href={`/build-brief/${older.slug}`}
                className="text-text-muted hover:text-text transition-colors"
              >
                ← Issue {issueNo(older)}
              </Link>
            ) : (
              <span className="text-text-dim">The first edition</span>
            )}
            <Link
              href="/build-brief"
              className="text-text-muted hover:text-text transition-colors"
            >
              All editions
            </Link>
            {newer ? (
              <Link
                href={`/build-brief/${newer.slug}`}
                className="text-text-muted hover:text-text transition-colors"
              >
                Issue {issueNo(newer)} →
              </Link>
            ) : (
              <span className="text-text-dim">The latest edition</span>
            )}
          </nav>
        </div>
      </div>
    </BriefShell>
  );
}

/** TakesGrid variant for the navy Project of the Week panel. */
function TakesGridOnDark({ takes }: { takes: BriefIssue["project"]["takes"] }) {
  return (
    <div>
      <p className="text-[10.5px] tracking-[0.26em] uppercase text-white/45 font-ui font-semibold mb-4">
        What this means for you
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {BRIEF_AUDIENCES.map((a) => (
          <div key={a.key} className="flex flex-col gap-1">
            <Link
              href={a.href}
              className="text-[11px] tracking-[0.14em] uppercase font-ui font-semibold text-white/60 hover:text-white transition-colors w-fit"
            >
              {a.label}
            </Link>
            <p className="text-[14px] leading-[1.55] text-white/70">
              {takes[a.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
