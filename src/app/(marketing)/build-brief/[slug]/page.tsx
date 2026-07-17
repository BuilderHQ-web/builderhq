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
import { BriefChart } from "../brief-charts";
import {
  BriefCard,
  BriefKicker,
  BriefShell,
  InlineText,
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
 *
 * Document outline: one h1 (the nameplate, with the issue number as a
 * sub-element), the issue headline and every section headline as h2,
 * feature sub-headings and end-block headings as h3.
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
  const title = issue.seoTitle
    ? { absolute: issue.seoTitle }
    : `The Build Brief ${issueNo(issue)} · ${issue.title}`;
  const ogTitle =
    issue.seoTitle ?? `The Build Brief ${issueNo(issue)} · ${issue.title}`;
  return {
    title,
    description: issue.seoDescription,
    keywords: issue.keywords,
    alternates: { canonical: `/build-brief/${issue.slug}` },
    openGraph: {
      title: ogTitle,
      description: issue.seoDescription,
      url: `${SITE}/build-brief/${issue.slug}`,
      siteName: "BuilderHQ",
      type: "article",
      publishedTime: issue.date,
      images: [{ url: issue.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
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
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
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

/* ── shared headline helpers ─────────────────────────────────────────── */

/** Section headline with an optional accent tail. */
function AccentHeadline({
  text,
  accent,
  className = "",
  dark = false,
  serif = false,
}: {
  text: string;
  accent?: string;
  className?: string;
  dark?: boolean;
  serif?: boolean;
}) {
  return (
    <h2 className={className} style={serif ? SERIF : undefined}>
      {text}
      {accent ? (
        <>
          {" "}
          <span
            className={dark ? undefined : "text-accent-light"}
            style={dark ? { color: "rgba(127,209,201,0.95)" } : undefined}
          >
            {accent}
          </span>
        </>
      ) : null}
    </h2>
  );
}

const SECTION_H2 =
  "font-ui font-semibold tracking-[-0.03em] leading-[1.12] text-[clamp(1.5rem,1.6vw+0.9rem,2.1rem)] text-text";

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
      <AccentHeadline
        text={signal.headline}
        accent={signal.headlineAccent}
        className={`mt-3 max-w-[26ch] ${SECTION_H2}`}
      />

      <div className="mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-center">
        <div>
          {/* the anchor of the card — serif, large, confident */}
          <p
            className="leading-none text-[clamp(3.4rem,3.8vw+1.8rem,5rem)] text-text"
            style={SERIF}
          >
            {signal.stat.value}
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.5] text-text-muted max-w-[30ch]">
            {signal.stat.label}
          </p>
          {signal.stat.sub ? (
            <p className="mt-3 inline-flex rounded-full bg-[#101820]/[0.05] px-3 py-1 text-[11.5px] tracking-[0.04em] text-text-muted">
              {signal.stat.sub}
            </p>
          ) : null}
        </div>

        {signal.chart ? (
          <BriefChart spec={signal.chart} />
        ) : signal.rows?.length ? (
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

      <div className="mt-7 flex flex-col gap-4 max-w-[68ch]">
        {signal.body.map((p, i) => (
          <p key={i} className="text-[15px] leading-[1.7] text-text-muted">
            <InlineText text={p} />
          </p>
        ))}
      </div>
      <TakesGrid takes={signal.takes} />
      <SourceLine>{signal.source}</SourceLine>
    </BriefCard>
  );
}

/** Subtle connector between the Market Watch cards — the three
 *  signals read as one argument, not three facts. */
function SignalJoin() {
  return (
    <div aria-hidden className="-my-5 flex justify-center">
      <span className="h-10 w-px bg-gradient-to-b from-transparent via-[#0a7d73]/45 to-transparent" />
    </div>
  );
}

function QuoteDoc({
  doc,
}: {
  doc: NonNullable<BriefIssue["feature"]["quoteDoc"]>;
}) {
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
            {": "}
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

  const pc = issue.partnerCorner;
  const partner = pc ? getPartner(pc.partnerSlug) : undefined;
  const issues = briefIssues();
  const idx = issues.findIndex((i) => i.slug === issue.slug);
  const newer = idx > 0 ? issues[idx - 1] : undefined;
  const older = idx < issues.length - 1 ? issues[idx + 1] : undefined;
  const signalCount = issue.signals.length;
  const project = issue.project;

  return (
    <BriefShell>
      <JsonLd data={issueSchema(issue)} />

      <div className="mx-auto w-full max-w-[980px]">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-[11.5px] tracking-[0.06em] text-text-dim">
          <Link href="/" className="hover:text-text transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/build-brief" className="hover:text-text transition-colors">
            The Build Brief
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text-muted">Issue {issueNo(issue)}</span>
        </nav>

        {/* dateline — the broadsheet furniture, in ink on the paper */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between gap-4 text-[10px] sm:text-[10.5px] tracking-[0.18em] uppercase font-ui font-semibold text-text-dim">
            <span>{issue.displayDate}</span>
            <span className="hidden sm:block">Melbourne, Australia</span>
            <span>Five minutes, sourced</span>
          </div>
          <div aria-hidden className="mt-3 border-t-2 border-[#101820]" />
          <div aria-hidden className="mt-[3px] border-t border-[#101820]/50" />
        </div>

        {/* masthead — the nameplate carries the h1; the issue headline
            follows as the deck */}
        <MastheadPanel className="px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex items-baseline justify-between gap-4">
            <MastheadKicker>The Friday Intelligence Briefing</MastheadKicker>
            <span className="hidden sm:block text-[10.5px] tracking-[0.22em] uppercase text-white/45 font-ui font-semibold">
              Plain · Sourced · Every Friday
            </span>
          </div>
          <h1 className="mt-5">
            <span
              className="block text-[clamp(2.5rem,4.4vw+1rem,4.4rem)] leading-[0.98] tracking-[-0.01em]"
              style={SERIF}
            >
              The Build Brief
            </span>
            <span
              className="mt-4 block text-[11px] tracking-[0.3em] uppercase font-ui font-semibold"
              style={{ color: "rgba(86,196,187,0.95)" }}
            >
              Issue {issueNo(issue)}
            </span>
          </h1>
          <h2
            className="mt-7 max-w-[26ch] text-[clamp(1.55rem,2.4vw+0.8rem,2.5rem)] leading-[1.14] text-white/95"
            style={SERIF}
          >
            {issue.title}
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.7] text-white/70">
            {issue.standfirst}
          </p>
          <p className="mt-7 text-[11px] tracking-[0.22em] uppercase text-white/45 font-ui font-semibold">
            By BuilderHQ, Melbourne
          </p>
          {/* breathing room above the wireframe art */}
          <div aria-hidden className="h-16 sm:h-24" />
        </MastheadPanel>

        {/* in this edition — the contents line */}
        <nav
          aria-label="In this edition"
          className="mt-5 overflow-x-auto border-y border-[#101820]/[0.12] py-3"
        >
          <div className="flex items-baseline gap-x-7 whitespace-nowrap text-[10px] sm:text-[10.5px] tracking-[0.18em] uppercase font-ui font-semibold">
            <span className="text-text-dim shrink-0">In this edition</span>
            {[
              { label: "The Note", href: "#the-note" },
              { label: "Market Watch", href: "#market-watch" },
              { label: "The Feature", href: "#the-feature" },
              ...(project
                ? [{ label: "Project of the Week", href: "#project" }]
                : []),
              { label: "Voices", href: "#voices" },
              ...(pc ? [{ label: "Partner Corner", href: "#partner-corner" }] : []),
              ...(issue.sourceGroups?.length
                ? [{ label: "Sources", href: "#sources" }]
                : []),
            ].map((it) => (
              <a
                key={it.href}
                href={it.href}
                className="text-text-muted hover:text-accent-light transition-colors"
              >
                {it.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-8 sm:mt-10 flex flex-col gap-8 sm:gap-10">
          {/* The Note */}
          <BriefCard id="the-note">
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              The Note
            </BriefKicker>
            {issue.note.eyebrow ? (
              <p className="text-[11px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
                {issue.note.eyebrow}
              </p>
            ) : null}
            <h2 className={`${issue.note.eyebrow ? "mt-3" : ""} max-w-[28ch] ${SECTION_H2}`}>
              {issue.note.heading}
            </h2>
            <div className="mt-5 flex flex-col gap-4 max-w-[70ch]">
              {issue.note.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`leading-[1.75] ${
                    i === 0
                      ? "text-[17px] font-ui font-medium text-text first-letter:float-left first-letter:mr-2.5 first-letter:mt-1.5 first-letter:text-[54px] first-letter:leading-[0.72] first-letter:text-text first-letter:[font-family:var(--font-instrument-serif)]"
                      : "text-[15px] text-text-muted"
                  }`}
                >
                  <InlineText text={p} />
                </p>
              ))}
            </div>
            <p className="mt-6 text-[13.5px] font-ui font-semibold text-text">
              {issue.note.signoff}
            </p>
          </BriefCard>

          {/* Market Watch */}
          <section
            id="market-watch"
            aria-label="Market Watch"
            className="scroll-mt-28 flex flex-col gap-8 sm:gap-10"
          >
            {issue.signalsIntro ? (
              <div className="flex flex-col items-center gap-2.5 text-center -mb-1">
                <span className="flex items-center gap-2.5 text-[11px] tracking-[0.28em] uppercase text-text-dim">
                  <span aria-hidden className="h-px w-6 bg-text-faint/40" />
                  Market Watch
                  <span aria-hidden className="h-px w-6 bg-text-faint/40" />
                </span>
                <p
                  className="text-[clamp(1.15rem,1vw+0.9rem,1.4rem)] italic text-text-muted"
                  style={SERIF}
                >
                  {issue.signalsIntro}
                </p>
              </div>
            ) : null}
            {issue.signals.map((s, i) => (
              <div key={s.n} className="contents">
                {issue.signalsIntro && i > 0 ? <SignalJoin /> : null}
                <Signal signal={s} count={signalCount} />
              </div>
            ))}
          </section>

          {/* The Feature */}
          <BriefCard id="the-feature">
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              {issue.feature.kicker}
            </BriefKicker>
            <AccentHeadline
              text={issue.feature.headline}
              accent={issue.feature.headlineAccent}
              className={`max-w-[28ch] ${SECTION_H2}`}
            />
            {issue.feature.standfirst ? (
              <p
                className="mt-4 max-w-[58ch] text-[clamp(1.1rem,0.8vw+0.9rem,1.3rem)] leading-[1.5] italic text-text-muted"
                style={SERIF}
              >
                {issue.feature.standfirst}
              </p>
            ) : null}

            {issue.feature.sections?.length ? (
              /* Long-form article layout (Issue 002 onward), with the
                 newspaper fact box riding beside the read */
              <div
                className={`mt-7 ${
                  issue.feature.factBox
                    ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_264px] gap-8 lg:gap-12 items-start"
                    : ""
                }`}
              >
                {issue.feature.factBox ? (
                  <aside
                    aria-label={issue.feature.factBox.title}
                    className="lg:order-2 lg:sticky lg:top-28 border-t-2 border-[#101820] bg-[#fbfaf7] ring-1 ring-[#101820]/[0.08] rounded-b-xl px-5 py-5"
                  >
                    <p className="text-[10.5px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                      {issue.feature.factBox.title}
                    </p>
                    <dl className="mt-4 flex flex-col divide-y divide-[#101820]/[0.06]">
                      {issue.feature.factBox.rows.map((r) => (
                        <div key={r.k} className="py-2.5 first:pt-0 last:pb-0">
                          <dt className="sr-only">{r.v}</dt>
                          <dd>
                            <span
                              className="block text-[21px] leading-[1.1] text-text"
                              style={SERIF}
                            >
                              {r.k}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-[1.5] text-text-muted">
                              {r.v}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </aside>
                ) : null}

                <div className="lg:order-1 max-w-[70ch]">
                <div className="flex flex-col gap-4">
                  {issue.feature.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-[16px] leading-[1.75] font-ui font-medium text-text"
                    >
                      <InlineText text={p} />
                    </p>
                  ))}
                </div>
                {issue.feature.sections.map((s) => (
                  <section key={s.heading} className="mt-8">
                    <h3 className="text-[17.5px] font-ui font-semibold tracking-[-0.01em] text-text">
                      {s.heading}
                    </h3>
                    <div className="mt-3 flex flex-col gap-4">
                      {s.paragraphs.map((p, i) => (
                        <p key={i} className="text-[15px] leading-[1.75] text-text-muted">
                          <InlineText text={p} />
                        </p>
                      ))}
                    </div>
                  </section>
                ))}

                {issue.feature.finePrint ? (
                  <details className="group mt-8 rounded-xl bg-[#fbfaf7] ring-1 ring-[#101820]/[0.08] open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                      <span className="text-[13px] font-ui font-semibold text-text">
                        {issue.feature.finePrint.title}
                        <span className="ml-2 text-[11px] tracking-[0.14em] uppercase text-text-dim font-semibold">
                          the fine print
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="text-[13px] text-text-dim transition-transform duration-200 group-open:rotate-90"
                      >
                        →
                      </span>
                    </summary>
                    <ul className="flex flex-col gap-3 px-5 pb-5">
                      {issue.feature.finePrint.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-[13.5px] leading-[1.65] text-text-muted">
                          <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-[#0a7d73]/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                </div>
              </div>
            ) : (
              /* Split layout with the annotated document (Issue 001) */
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
                <div className="flex flex-col gap-4">
                  {issue.feature.paragraphs.map((p, i) => (
                    <p key={i} className="text-[15px] leading-[1.75] text-text-muted">
                      <InlineText text={p} />
                    </p>
                  ))}
                </div>
                {issue.feature.quoteDoc ? <QuoteDoc doc={issue.feature.quoteDoc} /> : null}
              </div>
            )}

            <TakesGrid takes={issue.feature.takes} />
            {issue.feature.source ? (
              <SourceLine>{issue.feature.source}</SourceLine>
            ) : null}
          </BriefCard>

          {/* Project of the Week — renders only when an edition carries
              one. Editorial treatment; third-party photography only when
              supplied and licensed, otherwise the typographic card
              carries the outbound link. */}
          {project ? (
          <MastheadPanel id="project" className="px-6 py-10 sm:px-12 sm:py-12" art={false}>
            <div className="flex items-baseline justify-between gap-4">
              <MastheadKicker>{project.kicker}</MastheadKicker>
              <span className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-white/40">
                The Build Brief · Issue {issueNo(issue)}
              </span>
            </div>

            {project.headline ? (
              project.link ? (
                <a
                  href={project.link.href}
                  target="_blank"
                  rel="noopener"
                  className="group/headline block w-fit"
                >
                  <AccentHeadline
                    dark
                    serif
                    text={project.headline}
                    accent={project.headlineAccent}
                    className="mt-5 max-w-[22ch] text-[clamp(1.9rem,2.6vw+1rem,3rem)] leading-[1.1] decoration-white/30 underline-offset-4 group-hover/headline:underline"
                  />
                </a>
              ) : (
                <AccentHeadline
                  dark
                  serif
                  text={project.headline}
                  accent={project.headlineAccent}
                  className="mt-5 max-w-[22ch] text-[clamp(1.9rem,2.6vw+1rem,3rem)] leading-[1.1]"
                />
              )
            ) : (
              <h2
                className="mt-5 text-[clamp(1.9rem,2.6vw+1rem,3rem)] leading-[1.08]"
                style={SERIF}
              >
                {project.name}
                {project.studio ? (
                  <span className="text-white/55"> · {project.studio}</span>
                ) : null}
              </h2>
            )}
            {project.recognition ? (
              <p
                className="mt-2.5 text-[12.5px] tracking-[0.06em]"
                style={{ color: "rgba(224,178,92,0.92)" }}
              >
                {project.recognition}
              </p>
            ) : null}

            {project.image ? (
              <figure className="mt-7 overflow-hidden rounded-xl ring-1 ring-white/10">
                <Image
                  src={project.image.src}
                  alt={project.image.alt}
                  width={1600}
                  height={1000}
                  className="w-full h-auto"
                />
                <figcaption className="px-4 py-2.5 text-[11px] text-white/45">
                  {project.image.credit}
                </figcaption>
              </figure>
            ) : null}

            <div className="mt-6 flex flex-col gap-4 max-w-[64ch]">
              {project.body.map((p, i) => (
                <p key={i} className="text-[15px] leading-[1.75] text-white/75">
                  <InlineText dark text={p} />
                </p>
              ))}
            </div>
            <p
              className="mt-7 max-w-[34ch] text-[clamp(1.25rem,1.3vw+0.8rem,1.6rem)] leading-[1.3]"
              style={SERIF}
            >
              “{project.pullQuote}”
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              {project.link ? (
                <a
                  href={project.link.href}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-ui font-semibold text-[#06231f] hover:brightness-105 transition"
                >
                  {project.link.label} ↗
                </a>
              ) : null}
              {project.credit ? (
                <span className="text-[11.5px] text-white/40">{project.credit}</span>
              ) : null}
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <TakesGridOnDark takes={project.takes} />
            </div>
            {project.source ? (
              <p className="mt-6 text-[11.5px] tracking-[0.05em] text-white/40">
                Source: {project.source}.
              </p>
            ) : null}
          </MastheadPanel>
          ) : null}

          {/* Voices */}
          <BriefCard id="voices">
            <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
              {issue.voices.kicker}
            </BriefKicker>
            <h2 className={`max-w-[28ch] ${SECTION_H2}`}>{issue.voices.headline}</h2>
            <blockquote className="mt-8 relative pl-6 sm:pl-8 border-l-2 border-accent-light/50">
              <span
                aria-hidden
                className="absolute -top-5 left-4 sm:left-6 text-[64px] leading-none text-accent-light/25 select-none"
                style={SERIF}
              >
                “
              </span>
              <p
                className="max-w-[26ch] text-[clamp(1.7rem,2.4vw+0.9rem,2.7rem)] leading-[1.18] text-text"
                style={SERIF}
              >
                “{issue.voices.quote}”
              </p>
              <footer className="mt-5 text-[12.5px] text-text-dim">
                <span className="font-ui font-semibold tracking-[0.04em] text-text">
                  {issue.voices.attribution}
                </span>{" "}
                · <span className="text-text-muted">{issue.voices.role}</span>
              </footer>
            </blockquote>
            <div className="mt-6 flex flex-col gap-4 max-w-[68ch]">
              {issue.voices.body.map((p, i) => (
                <p key={i} className="text-[15px] leading-[1.75] text-text-muted">
                  <InlineText text={p} />
                </p>
              ))}
            </div>
            {issue.voices.takes ? <TakesGrid takes={issue.voices.takes} /> : null}
            {issue.voices.source ? (
              <SourceLine>{issue.voices.source}</SourceLine>
            ) : null}
          </BriefCard>

          {/* Partner Corner — renders only when an edition carries one;
              pulls the live partner record from the register. */}
          {pc ? (
            <BriefCard id="partner-corner">
              <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
                Partner Corner
              </BriefKicker>
              <h2 className={`max-w-[30ch] ${SECTION_H2}`}>{pc.headline}</h2>
              {pc.deck ? (
                <p
                  className="mt-3 max-w-[34ch] text-[clamp(1.3rem,1.4vw+0.9rem,1.75rem)] leading-[1.25] text-text"
                  style={SERIF}
                >
                  {pc.deck}
                </p>
              ) : null}
              {partner ? (
                <p className="mt-3 text-[12.5px] text-text-dim">
                  {partner.disciplines.slice(0, 2).join(" & ")} · {partner.suburb},{" "}
                  {partner.state} · In the network since {partner.joined}
                </p>
              ) : null}

              <div
                className={`mt-8 grid grid-cols-1 gap-8 lg:gap-12 items-start ${
                  pc.portrait ? "lg:grid-cols-[220px_minmax(0,1fr)]" : ""
                }`}
              >
                {pc.portrait ? (
                  <figure className="max-w-[220px]">
                    <div className="overflow-hidden rounded-xl ring-1 ring-[#101820]/[0.08]">
                      <Image
                        src={pc.portrait}
                        alt={`${pc.principal}, ${pc.principalRole}`}
                        width={440}
                        height={550}
                        className="w-full h-auto"
                      />
                    </div>
                    <figcaption className="mt-3">
                      <p className="text-[13.5px] font-ui font-semibold text-text">
                        {pc.principal}
                      </p>
                      <p className="text-[11.5px] text-text-dim">{pc.principalRole}</p>
                      {pc.principalQuote ? (
                        <p className="mt-2 text-[12.5px] italic leading-[1.5] text-text-muted">
                          “{pc.principalQuote}”
                        </p>
                      ) : null}
                    </figcaption>
                  </figure>
                ) : null}
                <div>
                  {!pc.portrait ? (
                    <p className="mb-5 text-[13.5px] text-text-muted">
                      <span className="font-ui font-semibold text-text">
                        {pc.principal}
                      </span>{" "}
                      · {pc.principalRole}
                      {pc.principalQuote ? (
                        <span className="block mt-1.5 italic">
                          “{pc.principalQuote}”
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {pc.stats?.length ? (
                    <div className="mb-6 grid grid-cols-3 gap-4 border-y border-[#101820]/[0.08] py-4">
                      {pc.stats.map((s) => (
                        <div key={s.label}>
                          <p className="text-[clamp(1.3rem,1.3vw+0.8rem,1.7rem)] leading-none text-text" style={SERIF}>
                            {s.value}
                            {s.star ? (
                              <span aria-hidden className="ml-1 align-[3px] text-[13px] text-[#e0b25c]">
                                ★
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1.5 text-[11px] leading-[1.4] tracking-[0.04em] text-text-dim">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                    Why we introduce them
                  </p>
                  <p className="mt-3 text-[15px] leading-[1.75] text-text-muted max-w-[62ch]">
                    {pc.why}
                  </p>
                  <p className="mt-5 text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                    The practice
                  </p>
                  <p className="mt-3 text-[15px] leading-[1.75] text-text-muted max-w-[62ch]">
                    {pc.practice}
                  </p>
                  <p className="mt-5 text-[13.5px] leading-[1.65] text-text-muted max-w-[62ch] border-l-2 border-accent/40 pl-4">
                    {pc.welcome}
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
                      Meet our Preferred Design Partners
                    </Link>
                  </div>
                </div>
              </div>
            </BriefCard>
          ) : null}

          {/* Sources — visible, grouped, linked. Credibility is the
              product. */}
          {issue.sourceGroups?.length ? (
            <BriefCard id="sources">
              <BriefKicker right={`The Build Brief · Issue ${issueNo(issue)}`}>
                Sources
              </BriefKicker>
              <h2 className={SECTION_H2}>Where this edition&apos;s numbers come from</h2>
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7">
                {issue.sourceGroups.map((g) => (
                  <section key={g.heading}>
                    <h3 className="text-[11px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                      {g.heading}
                    </h3>
                    <ul className="mt-2.5 flex flex-col gap-2">
                      {g.links.map((l) => (
                        <li key={l.href + l.label}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener"
                            className="text-[13px] leading-[1.55] text-text-muted underline decoration-[#101820]/20 underline-offset-[3px] hover:text-text transition-colors"
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              {issue.creditLine ? (
                <p className="mt-8 border-t border-[#101820]/[0.07] pt-5 text-[11.5px] leading-[1.7] text-text-dim max-w-[75ch]">
                  {issue.creditLine}
                </p>
              ) : null}
            </BriefCard>
          ) : null}

          {/* Over to you + end blocks */}
          <BriefCard>
            <BriefKicker>Over to you</BriefKicker>
            <h2 className="font-ui font-semibold tracking-[-0.02em] text-[clamp(1.2rem,1vw+0.9rem,1.5rem)] text-text max-w-[34ch]">
              {issue.overToYou.question}
            </h2>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-text-muted max-w-[60ch]">
              {issue.overToYou.body}
            </p>
            <a
              href={`mailto:info@builderhq.com.au?subject=The%20Build%20Brief%20%C2%B7%20Issue%20${issueNo(issue)}`}
              className="mt-6 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-ui font-semibold text-[#06231f] hover:brightness-105 transition"
            >
              Reply to the team
            </a>

            {issue.share || issue.subscribeLine ? (
              <div className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-7 border-t border-[#101820]/[0.07] pt-7">
                {issue.share ? (
                  <div>
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                      Share
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted">
                      {issue.share}
                    </p>
                  </div>
                ) : null}
                {issue.subscribeLine ? (
                  <div>
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                      Subscribe
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted">
                      {issue.subscribeLine}
                    </p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                      <a
                        href="mailto:info@builderhq.com.au?subject=Subscribe%20to%20The%20Build%20Brief"
                        className="font-ui font-semibold text-text hover:text-accent-light transition-colors"
                      >
                        Subscribe by email →
                      </a>
                      <a
                        href="/build-brief/feed.xml"
                        className="text-text-muted hover:text-text transition-colors"
                      >
                        RSS
                      </a>
                    </p>
                  </div>
                ) : null}
                <div>
                  <h3 className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                    Contact
                  </h3>
                  <ul className="mt-2.5 flex flex-col gap-1.5 text-[13.5px] text-text-muted">
                    <li>
                      Read online:{" "}
                      <Link
                        href="/build-brief"
                        className="font-ui font-medium text-text hover:text-accent-light transition-colors"
                      >
                        builderhq.com.au
                      </Link>
                    </li>
                    <li>
                      Instagram:{" "}
                      <a
                        href="https://www.instagram.com/builderhq_/"
                        target="_blank"
                        rel="noopener"
                        className="font-ui font-medium text-text hover:text-accent-light transition-colors"
                      >
                        @builderhq_
                      </a>
                    </li>
                    <li>
                      LinkedIn:{" "}
                      <a
                        href="https://www.linkedin.com/company/builderhq"
                        target="_blank"
                        rel="noopener"
                        className="font-ui font-medium text-text hover:text-accent-light transition-colors"
                      >
                        BuilderHQ
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="mt-8 border-t border-[#101820]/[0.07] pt-5">
              <p className="text-[11.5px] leading-[1.7] text-text-dim max-w-[75ch]">
                {!issue.sourceGroups?.length ? (
                  <>
                    This edition used data and reporting from{" "}
                    {issue.sources.join(", ")}.{" "}
                  </>
                ) : null}
                The Build Brief is compiled by{" "}
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

          {/* end mark */}
          <div
            aria-hidden
            className="flex items-center justify-center gap-3 text-[10px] tracking-[0.3em] uppercase text-text-dim font-ui font-semibold"
          >
            <span className="h-px w-10 bg-text-faint/40" />
            End of Issue {issueNo(issue)}
            <span className="h-px w-10 bg-text-faint/40" />
          </div>

          {/* further reading */}
          {issue.furtherReading?.length ? (
            <nav
              aria-label="Further reading"
              className="flex flex-wrap items-center justify-center gap-x-9 gap-y-2.5 text-[13.5px] font-ui font-semibold"
            >
              {issue.furtherReading.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="text-text hover:text-accent-light transition-colors"
                >
                  {f.label} →
                </Link>
              ))}
            </nav>
          ) : null}

          {/* issue navigation */}
          <nav
            aria-label="Issues"
            className="flex items-center justify-between gap-4 text-[13px] font-ui font-medium"
          >
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
function TakesGridOnDark({
  takes,
}: {
  takes: NonNullable<BriefIssue["project"]>["takes"];
}) {
  return (
    <div>
      <p className="text-[10.5px] tracking-[0.26em] uppercase text-white/45 font-ui font-semibold mb-4">
        What this means for you
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {BRIEF_AUDIENCES.map((a) => (
          <div
            key={a.key}
            className="rounded-r-xl rounded-l-[3px] border-l-[3px] bg-white/[0.05] px-5 py-4"
            style={{ borderColor: "rgba(127,209,201,0.6)" }}
          >
            <Link
              href={a.href}
              className="text-[11px] tracking-[0.14em] uppercase font-ui font-semibold text-white/60 hover:text-white transition-colors w-fit"
            >
              {a.label}
            </Link>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-white/70">
              <InlineText dark text={takes[a.key]} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
