import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BRIEF_PERSPECTIVES,
  getPerspective,
  type BriefPerspective,
  type PerspectiveBlock,
} from "../../brief-data";
import {
  BriefShell,
  JsonLd,
  MastheadPanel,
  SERIF,
  SITE,
} from "../../brief-ui";

/**
 * Perspectives — signed essays from the desk of BuilderHQ. Deliberately
 * simpler than an edition: one voice, one argument, a byline. The navy
 * masthead keeps it inside the journal's identity; the author band and
 * "Opinion" tag keep it unmistakably distinct from the weekly briefing.
 */

export function generateStaticParams() {
  return BRIEF_PERSPECTIVES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPerspective(slug);
  if (!p) return {};
  const title = `${p.title} ${p.titleAccent}`;
  return {
    title,
    description: p.lede,
    keywords: [
      "choosing a builder",
      "how to choose a builder australia",
      "builder selection",
      "construction procurement",
      "builder tender process",
      "compare builders australia",
      "residential construction australia",
      "builderhq",
      "moe akbulut",
    ],
    authors: [{ name: p.author.name }],
    alternates: { canonical: `/build-brief/perspectives/${p.slug}` },
    openGraph: {
      title,
      description: p.standfirst,
      url: `${SITE}/build-brief/perspectives/${p.slug}`,
      siteName: "BuilderHQ",
      type: "article",
      publishedTime: p.dateISO,
      authors: [p.author.name],
      section: "Perspectives",
      images: [
        {
          url: `/build-brief/og-perspective-${p.slug}.jpg`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: p.standfirst,
      images: [`/build-brief/og-perspective-${p.slug}.jpg`],
    },
  };
}

function perspectiveSchema(p: BriefPerspective) {
  const title = `${p.title} ${p.titleAccent}`;
  const url = `${SITE}/build-brief/perspectives/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OpinionNewsArticle",
        "@id": `${url}#article`,
        headline: title,
        description: p.lede,
        url,
        mainEntityOfPage: url,
        datePublished: p.dateISO,
        dateModified: p.dateISO,
        image: `${SITE}/build-brief/og-perspective-${p.slug}.jpg`,
        articleSection: "Perspectives",
        author: {
          "@type": "Person",
          name: p.author.name,
          jobTitle: "Founder",
          worksFor: { "@id": `${SITE}/#organization` },
          image: `${SITE}${p.author.portrait}`,
        },
        publisher: { "@id": `${SITE}/#organization` },
        isPartOf: { "@id": `${SITE}/build-brief#periodical` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "BuilderHQ",
        url: SITE,
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
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };
}

/* ── Body blocks ─────────────────────────────────────────────────────── */

function Block({ block, first }: { block: PerspectiveBlock; first: boolean }) {
  if (block.kind === "h2") {
    return (
      <div className="mt-12 first:mt-0">
        <span aria-hidden className="block h-[3px] w-10 bg-accent-light/70" />
        <h2
          className="mt-4 text-[clamp(1.55rem,2vw+0.9rem,2.1rem)] leading-[1.15] text-text"
          style={SERIF}
        >
          {block.text}
        </h2>
      </div>
    );
  }

  if (block.kind === "quote") {
    return (
      <blockquote className="my-10 border-l-[3px] border-accent-light pl-6 sm:pl-8">
        <p
          className="text-[clamp(1.35rem,1.8vw+0.8rem,1.8rem)] leading-[1.35] italic text-accent-light"
          style={SERIF}
        >
          {block.text}
        </p>
      </blockquote>
    );
  }

  if (block.kind === "table") {
    return (
      <div className="my-10 overflow-hidden rounded-xl border border-[#101820]/[0.09] bg-white">
        <div className="hidden sm:grid grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-x-8 border-b-2 border-[#101820]/80 px-6 py-3.5">
          <p className="text-[10.5px] tracking-[0.22em] uppercase font-ui font-semibold text-accent-light">
            {block.head[0]}
          </p>
          <p className="text-[10.5px] tracking-[0.22em] uppercase font-ui font-semibold text-accent-light">
            {block.head[1]}
          </p>
        </div>
        {block.rows.map((r, i) => (
          <div
            key={r.term}
            className={
              "grid grid-cols-1 sm:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-x-8 gap-y-1.5 px-6 py-5" +
              (i > 0 ? " border-t border-[#101820]/[0.07]" : "")
            }
          >
            <p className="text-[16.5px] leading-snug text-text" style={SERIF}>
              {r.term}
            </p>
            <p className="text-[14px] leading-[1.7] text-text-muted">
              {r.body}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p
      className={
        "mt-5 text-[15.5px] leading-[1.8] text-text-muted" +
        (first
          ? " first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[54px] first-letter:leading-[0.78] first-letter:text-accent-light first-letter:[font-family:var(--font-instrument-serif)]"
          : "")
      }
    >
      {block.text}
    </p>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default async function PerspectivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPerspective(slug);
  if (!p) notFound();

  return (
    <BriefShell>
      <JsonLd data={perspectiveSchema(p)} />

      <article className="mx-auto w-full max-w-[880px]">
        {/* Journal breadcrumb, quiet. */}
        <nav className="mb-6">
          <Link
            href="/build-brief"
            className="text-[12.5px] font-ui font-medium text-text-dim hover:text-text transition-colors"
          >
            ← The Build Brief
          </Link>
        </nav>

        {/* Masthead — the journal's navy, the essay's own voice. */}
        <MastheadPanel className="px-6 py-11 sm:px-12 sm:py-14">
          <p className="text-[10.5px] tracking-[0.3em] uppercase font-ui font-semibold text-white/45">
            A Founder Perspective
            <span aria-hidden className="mx-2.5 text-white/25">·</span>
            <span style={{ color: "rgba(86,196,187,0.95)" }}>{p.tag}</span>
          </p>
          <h1
            className="mt-5 max-w-[24ch] text-[clamp(2.2rem,4.6vw+0.8rem,3.9rem)] leading-[1.04] tracking-[-0.01em]"
            style={SERIF}
          >
            {p.title}{" "}
            <span style={{ color: "#7fd1c9" }}>{p.titleAccent}</span>
          </h1>
          <p
            className="mt-5 max-w-[46ch] text-[clamp(1.15rem,1.4vw+0.7rem,1.45rem)] leading-[1.4] italic text-white/70"
            style={SERIF}
          >
            {p.standfirst}
          </p>

          {/* Byline band. */}
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/12 pt-6">
            <span className="inline-flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.author.portrait}
                alt={p.author.name}
                className="size-11 rounded-full object-cover grayscale ring-1 ring-white/25"
              />
              <span className="leading-tight">
                <span className="block text-[13.5px] font-ui font-semibold text-white">
                  {p.author.name}
                </span>
                <span className="block text-[12px] text-white/55">
                  {p.author.role}
                </span>
              </span>
            </span>
            <span aria-hidden className="hidden sm:block h-6 w-px bg-white/15" />
            <span className="text-[12px] text-white/55">
              {p.displayDate}
              <span aria-hidden className="mx-2 text-white/25">·</span>
              {p.readingMins} min read
            </span>
          </div>
        </MastheadPanel>

        {/* Lede. */}
        <p className="mt-10 text-[clamp(1.05rem,1vw+0.85rem,1.25rem)] leading-[1.65] font-ui font-medium text-text max-w-[62ch]">
          {p.lede}
        </p>

        {/* Body. */}
        <div className="mt-8 max-w-[68ch]">
          {p.blocks.map((b, i) => (
            <Block key={i} block={b} first={i === 0} />
          ))}
        </div>

        {/* About the author. */}
        <aside className="mt-14 rounded-xl border-l-[3px] border-accent-light bg-white ring-1 ring-[#101820]/[0.06] card-elev px-6 py-6 sm:px-8 sm:py-7">
          <p className="text-[10.5px] tracking-[0.24em] uppercase font-ui font-semibold text-accent-light">
            About the author
          </p>
          <div className="mt-4 flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.author.portrait}
              alt={p.author.name}
              className="size-14 rounded-full object-cover grayscale ring-1 ring-[#101820]/10 shrink-0"
            />
            <p className="text-[14.5px] leading-[1.7] text-text-muted">
              {p.aboutAuthor}
            </p>
          </div>
        </aside>

        {/* Close — the journal's standing line. */}
        <div className="mt-10 rounded-2xl overflow-hidden text-white"
          style={{ background: "linear-gradient(180deg, #0d151e 0%, #090f16 100%)" }}
        >
          <div
            aria-hidden
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(86,196,187,0.55), transparent)",
            }}
          />
          <div className="px-7 py-9 sm:px-10 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <p
              className="text-[clamp(1.3rem,1.6vw+0.8rem,1.7rem)] leading-[1.25]"
              style={SERIF}
            >
              Rethinking how homes get built,{" "}
              <span className="italic" style={{ color: "#7fd1c9" }}>
                from the first decision.
              </span>
            </p>
            <span className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/#how"
                className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-ui font-semibold text-[#06231f] hover:brightness-105 transition"
              >
                See how BuilderHQ works
              </Link>
              <Link
                href="/build-brief"
                className="inline-flex items-center rounded-full ring-1 ring-white/20 px-5 py-2.5 text-[12.5px] font-ui font-semibold text-white/85 hover:bg-white/10 transition-colors"
              >
                The Build Brief
              </Link>
            </span>
          </div>
        </div>
      </article>
    </BriefShell>
  );
}
