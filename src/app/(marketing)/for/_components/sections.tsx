/**
 * Section primitives for the three audience pages under /for.
 *
 * One rhythm, three readers. Every page runs: hero (kicker, title and
 * sub carried by MarketingPageShell), the action row, one product
 * scene, then hairline-separated sections on a single measure, and a
 * close with one primary action. The pages hold the words; this file
 * holds none.
 *
 * The design rules these encode (85a-docs/repositioning-plan.md, Part
 * 6) are not preferences:
 *   · one brand hue. Teal as type is --color-accent-light. The bright
 *     --color-accent is a fill only, and only under ink text.
 *   · body and UI copy 16px minimum, 17px for ledes, leading 1.65.
 *     Kickers are the single exception: 11px uppercase, never dim.
 *   · display is sentence case, font-ui semibold, never past 3.5rem,
 *     tracking never tighter than -0.03em.
 *   · one primary button per viewport. No glow, no ring, no inner
 *     highlight. card-elev and card-elev-lg are the only elevations.
 *   · sections are content-height.
 */

import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";

import { AppScene, type SceneKey } from "@/components/landing/v2/app-scenes";
import { Reveal } from "@/components/landing/reveal";

export interface Cta {
  label: string;
  href: string;
}

/* ── Actions ────────────────────────────────────────────────────────── */

export function PrimaryButton({ cta }: { cta: Cta }) {
  return (
    <Link
      href={cta.href}
      className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-8 text-[16px] font-semibold tracking-[0.01em] text-accent-contrast transition-colors duration-[180ms] hover:bg-accent-hover"
    >
      {cta.label}
      <ArrowUpRight
        className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={2.2}
      />
    </Link>
  );
}

export function SecondaryButton({ cta }: { cta: Cta }) {
  return (
    <Link
      href={cta.href}
      className="inline-flex h-[52px] items-center justify-center rounded-full border border-border-strong px-7 text-[16px] font-semibold text-text transition-colors duration-[180ms] hover:bg-surface-2"
    >
      {cta.label}
    </Link>
  );
}

/**
 * The hero picks up here: the shell has already set the kicker, the
 * heading and the sub, so this is the action row and, where a page has
 * them, the three facts that answer the first questions.
 */
export function HeroActions({
  primary,
  secondary,
  facts,
}: {
  primary: Cta;
  secondary?: Cta;
  facts?: string[];
}) {
  return (
    <div className="mb-14 lg:mb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <PrimaryButton cta={primary} />
        {secondary ? <SecondaryButton cta={secondary} /> : null}
      </div>
      {facts?.length ? (
        <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
          {facts.map((f) => (
            <li
              key={f}
              className="inline-flex items-center gap-2 text-[16px] leading-[1.6] text-text-muted"
            >
              <span aria-hidden className="size-[5px] rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ── The product scene ──────────────────────────────────────────────── */

/**
 * One screen of the product doing its job, in browser chrome. The scene
 * stays dark because it is a screenshot, not a panel. On a phone it is
 * top-aligned behind a soft fade so nothing chops mid-row.
 */
export function SceneFigure({ scene, caption }: { scene: SceneKey; caption: string }) {
  return (
    <Reveal className="mb-14 lg:mb-20">
      <figure className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 card-elev-lg">
        <div className="relative flex h-11 items-center border-b border-border-subtle bg-surface-2 px-4">
          <span aria-hidden className="flex items-center gap-1.5 opacity-50">
            <span className="size-[9px] rounded-full bg-border-strong" />
            <span className="size-[9px] rounded-full bg-border-strong" />
            <span className="size-[9px] rounded-full bg-border-strong" />
          </span>
          <span className="absolute left-1/2 inline-flex h-6 -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-[11px] text-text-muted">
            <Lock className="size-2.5" aria-hidden />
            builderhq.com.au
          </span>
        </div>
        <div className="relative h-[300px] overflow-hidden bg-navy-raised sm:h-[440px] lg:h-[470px]">
          <div className="absolute inset-x-0 top-0 sm:static sm:h-full">
            <AppScene scene={scene} />
          </div>
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16 sm:hidden"
            style={{
              background: "linear-gradient(180deg, transparent, var(--color-navy-raised))",
            }}
          />
        </div>
        <figcaption className="border-t border-border-subtle px-5 py-4 text-[16px] leading-[1.6] text-text-muted sm:px-6">
          {caption}
        </figcaption>
      </figure>
    </Reveal>
  );
}

/* ── Sections ───────────────────────────────────────────────────────── */

export function Section({
  id,
  title,
  lede,
  children,
}: {
  id?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-14 scroll-mt-28 border-t border-border-subtle pt-12 lg:mb-20 lg:pt-16"
    >
      <Reveal>
        <h2 className="max-w-[24ch] font-ui text-[clamp(1.75rem,2.4vw+0.9rem,2.5rem)] font-semibold leading-[1.14] tracking-[-0.03em] text-text">
          {title}
        </h2>
        {lede ? (
          <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.65] text-text-muted">
            {lede}
          </p>
        ) : null}
      </Reveal>
      {children ? <div className="mt-8 lg:mt-10">{children}</div> : null}
    </section>
  );
}

/** Running prose under a section heading. */
export function ProseBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <Reveal>
      <div className="max-w-[64ch] space-y-5">
        {paragraphs.map((p) => (
          <p key={p} className="text-[17px] leading-[1.65] text-text-muted">
            {p}
          </p>
        ))}
      </div>
    </Reveal>
  );
}

/** Two or three statements, each with a line under it. */
export function CardGrid({
  items,
  columns = 3,
}: {
  items: Array<{ title: string; body: string }>;
  columns?: 2 | 3;
}) {
  return (
    <Reveal>
      <div
        className={
          "grid gap-3 sm:gap-4 " + (columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")
        }
      >
        {items.map((c) => (
          <article
            key={c.title}
            className="rounded-xl border border-border-subtle bg-surface-1 px-6 py-6 card-elev"
          >
            <h3 className="font-ui text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] text-text">
              {c.title}
            </h3>
            <p className="mt-3 text-[16px] leading-[1.65] text-text-muted">{c.body}</p>
          </article>
        ))}
      </div>
    </Reveal>
  );
}

/** The manifesto device: a numbered hairline list. */
export function NumberedList({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <Reveal>
      <ol className="border-t border-border-subtle">
        {items.map((r, i) => (
          <li
            key={r.title}
            className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-border-subtle py-6 sm:grid-cols-[4rem_1fr] lg:py-7"
          >
            <span className="pt-[3px] font-mono text-[13px] tabular-nums text-accent-light">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-ui text-[17px] font-semibold leading-[1.35] text-text">
                {r.title}
              </h3>
              <p className="mt-2.5 max-w-[62ch] text-[16px] leading-[1.65] text-text-muted">
                {r.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

/** The four steps of a round, in time order. */
export function StepList({
  steps,
}: {
  steps: Array<{ n: string; step: string; headline: string; body: string }>;
}) {
  return (
    <Reveal>
      <ol className="border-t border-border-subtle">
        {steps.map((s) => (
          <li
            key={s.n}
            className="grid gap-x-8 gap-y-3 border-b border-border-subtle py-8 sm:grid-cols-[9rem_1fr] lg:py-10"
          >
            <div>
              <span className="font-mono text-[13px] tabular-nums text-accent-light">
                {s.n}
              </span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {s.step}
              </span>
            </div>
            <div>
              <h3 className="font-ui text-[20px] font-semibold leading-[1.3] tracking-[-0.015em] text-text">
                {s.headline}
              </h3>
              <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.7] text-text-muted">
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

/** Questions and answers, open on the page. No accordion, nothing to
 *  click before you can read it. */
export function FaqList({ items }: { items: Array<{ q: string; a: React.ReactNode }> }) {
  return (
    <Reveal>
      <ul className="border-t border-border-subtle">
        {items.map((qa) => (
          <li key={qa.q} className="border-b border-border-subtle py-7">
            <h3 className="font-ui text-[18px] font-medium leading-[1.35] tracking-[-0.015em] text-text">
              {qa.q}
            </h3>
            <p className="mt-3 max-w-[64ch] text-[16px] leading-[1.7] text-text-muted">
              {qa.a}
            </p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/* ── Close ──────────────────────────────────────────────────────────── */

export function PageClose({ title, sub, cta }: { title: string; sub?: string; cta: Cta }) {
  return (
    <section className="border-t border-border-subtle pt-14 text-center lg:pt-20">
      <Reveal>
        <h2 className="mx-auto max-w-[20ch] font-ui text-[clamp(2rem,3vw+1rem,3.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-text">
          {title}
        </h2>
        {sub ? (
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-[1.65] text-text-muted">
            {sub}
          </p>
        ) : null}
        <div className="mt-9 flex justify-center">
          <PrimaryButton cta={cta} />
        </div>
      </Reveal>
    </section>
  );
}
