import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Globe2,
  Lock,
  Blend,
  FileStack,
  Users,
  ClipboardCheck,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { getArchitectProfile } from "@/modules/profiles";
import { listMine, type Project } from "@/modules/projects";
import { countTendersForProject } from "@/modules/tenders";
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
import { cn } from "@/lib/utils";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

/**
 * The architect's studio dashboard — the desk, round 3: the hybrid.
 *
 * The greeting hero sits centred on the canvas under the teal glow,
 * with the practice letterhead line and a hairline stat strip. Below
 * it the white section boxes are gone: sections sit directly on the
 * greige canvas, each announced by a tinted icon chip + kicker +
 * display title (the letterhead convention), and white marks OBJECTS
 * only — every tender in the file is its own card. The tender file,
 * the architect's primary attention surface, carries the one toned
 * panel on the page.
 *
 * Data-side unchanged: same queries, same conditions, same routes.
 * Tender creation itself reuses the proven owner wizard
 * (ownership-gated, role-agnostic since the architect IS the
 * project's runner).
 */

const MODE_EXPLAINER = [
  {
    icon: Globe2,
    name: "Open",
    line: "List to our verified builder network. Builders come to you.",
  },
  {
    icon: Lock,
    name: "Private",
    line: "Hand-pick the builders. Yours, ours, or both. Nobody else sees it.",
  },
  {
    icon: Blend,
    name: "Hybrid",
    line: "Your builders take spots, the network fills the rest.",
  },
] as const;

const STEPS = [
  {
    icon: FileStack,
    title: "Upload the project",
    line: "Drop the drawings in and our reader pre-fills the details for you.",
  },
  {
    icon: Users,
    title: "Choose how it tenders",
    line: "Open, private or hybrid, 2 to 5 builders. Invite your client whenever you like.",
  },
  {
    icon: ClipboardCheck,
    title: "Compare like for like",
    line: "Every quote arrives structured against the same scope, ready to put side by side.",
  },
] as const;

export default async function ArchitectDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/architect");
  const role = session.user.role ?? null;
  if (role !== "architect") redirect(dashboardForRole(role));

  const userId = session.user.id;
  const [profile, projects] = await Promise.all([
    getArchitectProfile(userId),
    listMine(userId),
  ]);

  const active = projects.filter((p) =>
    ["published", "tendering"].includes(p.status),
  );
  const drafts = projects.filter((p) => p.status === "draft");
  const counts = await Promise.all(
    active.map((p) => countTendersForProject(p.id)),
  );
  const quotesReceived = counts.reduce((a, b) => a + b, 0);
  const tendersByProject = new Map(active.map((p, i) => [p.id, counts[i] ?? 0]));

  const firstName = (session.user.name ?? "").split(" ")[0] || "there";
  const isFirstTime = projects.length === 0;

  const dateline = new Intl.DateTimeFormat("en-AU", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date());

  const heroLine = isFirstTime
    ? "Upload a client's project, choose how it goes to market, and hand your client a structured comparison. You decide who you invite and when your client joins."
    : active.length > 0
      ? `Your practice has ${active.length} round${active.length === 1 ? "" : "s"} in the field and ${quotesReceived} quote${quotesReceived === 1 ? "" : "s"} on file. New quotes land here the moment builders lodge them.`
      : drafts.length > 0
        ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} waiting in the file. Publish when the drawings are ready, or start a new tender any time.`
        : "Your tender file, your builders and your client access, in one place. Start a new tender any time.";

  return (
    <div>
      {/* ── hero — the greeting, the letterhead, the way in ──────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,212,200,0.08), transparent 65%)",
          }}
        />
        <div className="relative px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-9 sm:pb-11">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center">
            <BuilderHeroIntro firstName={firstName} />
            <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-semibold">
              {profile?.practiceName
                ? `${profile.practiceName} · ${dateline}`
                : `Studio · ${dateline}`}
            </p>
            <p className="mt-5 max-w-[56ch] text-[14px] sm:text-[15px] leading-[1.7] text-text-subtle">
              {heroLine}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/architect/projects/new"
                className={cn(
                  "group inline-flex items-center justify-center gap-2.5 h-12 px-6 sm:px-7 rounded-full w-full sm:w-auto",
                  "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                  "transition-colors duration-[160ms] hover:bg-accent-hover",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]",
                )}
              >
                <FileStack className="size-4" />
                {isFirstTime ? "Start your first tender" : "New tender"}
                <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              {!isFirstTime ? (
                <Link
                  href="/architect/projects"
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
                >
                  All tenders
                </Link>
              ) : null}
            </div>

            {/* the ledger — hairline strip, no boxes */}
            {!isFirstTime ? (
              <div className="mt-9 flex items-stretch justify-center divide-x divide-border-subtle">
                <HeroStat
                  label="Live tenders"
                  value={String(active.length)}
                  sub={active.length > 0 ? "In the field now" : "None in the field"}
                />
                <HeroStat
                  label="Quotes received"
                  value={String(quotesReceived)}
                  sub="Across live rounds"
                />
                <HeroStat
                  label="Drafts"
                  value={String(drafts.length)}
                  sub={drafts.length > 0 ? "Awaiting publish" : "None waiting"}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Body — sections on the canvas ─────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[1200px]">
          {isFirstTime ? (
            <FirstTenderPrimer />
          ) : (
            <ProjectFile projects={projects} tendersByProject={tendersByProject} />
          )}
        </div>
      </section>
    </div>
  );
}

/* ── hero pieces ────────────────────────────────────────────────────── */

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="px-5 sm:px-8 text-center min-w-0">
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[24px] leading-none text-text tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[10.5px] text-text-dim">{sub}</p>
    </div>
  );
}

/* ── section headers ────────────────────────────────────────────────── */

const CHIP_TONES = {
  teal: "border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.09)] text-[#0a7d73]",
  blue: "border-[rgba(45,99,214,0.24)] bg-[rgba(45,99,214,0.07)] text-[#2d63d6]",
  amber:
    "border-[rgba(201,148,34,0.3)] bg-[rgba(201,148,34,0.09)] text-[#8a6414]",
  ink: "border-border-subtle bg-[rgba(24,34,44,0.04)] text-text-muted",
} as const;

const KICKER_TONES = {
  teal: "text-accent-light",
  blue: "text-[#2d63d6]",
  amber: "text-[#8a6414]",
  ink: "text-text-muted",
} as const;

function IconChip({
  tone,
  children,
}: {
  tone: keyof typeof CHIP_TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "size-9 rounded-lg border flex items-center justify-center shrink-0",
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Section header on the canvas: tinted icon chip + toned kicker +
 * display title + one plain sentence, with an optional hairline rule
 * running right from the header (the letterhead convention). Colour
 * does the wayfinding; no white box does the separating.
 */
function SectionHead({
  chip,
  kicker,
  kickerTone,
  title,
  sub,
  right,
  rule = false,
}: {
  chip: React.ReactNode;
  kicker: string;
  kickerTone: keyof typeof KICKER_TONES;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  rule?: boolean;
}) {
  return (
    <header className="flex items-start gap-3.5">
      {chip}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "text-[10px] tracking-[0.22em] uppercase font-ui font-semibold shrink-0",
              KICKER_TONES[kickerTone],
            )}
          >
            {kicker}
          </span>
          {rule ? (
            <span
              aria-hidden
              className="hidden sm:block h-px flex-1 bg-[rgba(24,34,44,0.10)]"
            />
          ) : null}
          {right ? <span className="ml-auto shrink-0">{right}</span> : null}
        </div>
        <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
          {title}
        </h2>
        {sub ? <p className="mt-1 text-[11.5px] text-text-dim">{sub}</p> : null}
      </div>
    </header>
  );
}

/** The pre-first-tender primer: three modes, three steps, zero fog. */
function FirstTenderPrimer() {
  return (
    <div className="flex flex-col gap-10">
      {/* the round modes — builder-facing, so the register's blue */}
      <section>
        <SectionHead
          chip={
            <IconChip tone="blue">
              <Blend className="size-4" />
            </IconChip>
          }
          kicker="Going to market"
          kickerTone="blue"
          title="Three ways to run it"
          sub="You choose per project, and you can invite your client at any stage."
          rule
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODE_EXPLAINER.map((m) => (
            <div
              key={m.name}
              className="rounded-lg border border-border-subtle bg-surface-1 card-elev p-4"
            >
              <m.icon className="size-4 text-accent-light" />
              <p className="mt-2.5 font-ui font-semibold text-[13.5px] text-text">
                {m.name}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-text-muted">
                {m.line}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* the steps — a ruled strip on the canvas, not boxes */}
      <section>
        <SectionHead
          chip={
            <IconChip tone="teal">
              <ClipboardCheck className="size-4" />
            </IconChip>
          }
          kicker="The process"
          kickerTone="teal"
          title="How it works"
          sub="From the drawings to a like for like comparison, in three steps."
          rule
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle border-y border-border-subtle">
          {STEPS.map((s, i) => (
            <div key={s.title} className="px-4 sm:px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] tracking-[0.18em] text-accent-light">
                  0{i + 1}
                </span>
                <s.icon className="size-4 text-text-faint" />
              </div>
              <p className="mt-2.5 font-ui font-semibold text-[13.5px] text-text">
                {s.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-text-muted">
                {s.line}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* the standing note — a quiet ruled line, no box */}
      <div className="border-y border-border-subtle py-4 flex items-start gap-3">
        <Building2 className="size-4 mt-0.5 text-accent-light shrink-0" />
        <p className="text-[13px] leading-[1.65] text-text-muted">
          Your client&apos;s details stay private until you invite them, and
          invited builders never pay to quote your project. Open spots are
          filled by our verified network.
        </p>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
};

const MODE_LABEL: Record<Project["tenderMode"], string> = {
  open: "Open",
  private: "Private",
  hybrid: "Hybrid",
};

/** The tender file — the architect's desk, the one toned panel. */
function ProjectFile({
  projects,
  tendersByProject,
}: {
  projects: Project[];
  tendersByProject: Map<string, number>;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.06),rgba(250,248,243,0.5)_65%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
        }}
      />
      <div className="relative px-4 sm:px-6 py-5 sm:py-6">
        <SectionHead
          chip={
            <IconChip tone="teal">
              <FileStack className="size-4" />
            </IconChip>
          }
          kicker="Your rounds"
          kickerTone="teal"
          title="The tender file"
          sub="Every tender your practice runs, with its round type and quotes to date."
          right={
            <Link
              href="/architect/projects"
              className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
            >
              All tenders
              <ArrowRight className="size-3" />
            </Link>
          }
        />
        <ul className="mt-5 flex flex-col gap-2">
          {projects.map((p) => {
            const quotes = tendersByProject.get(p.id);
            return (
              <li key={p.id}>
                <Link
                  href={`/architect/projects/${p.slug}`}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-lg border border-border-subtle bg-surface-1 card-elev transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui font-medium text-[13.5px] text-text">
                      {p.title}
                    </span>
                    <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
                      {[p.suburb, p.state].filter(Boolean).join(", ") ||
                        "Address to come"}
                      {" · "}
                      {MODE_LABEL[p.tenderMode]} round
                    </span>
                  </span>
                  {typeof quotes === "number" ? (
                    <span className="hidden sm:block text-[12px] tabular-nums text-text-muted shrink-0">
                      {quotes} {quotes === 1 ? "quote" : "quotes"}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold",
                      p.status === "tendering" || p.status === "published"
                        ? "bg-[rgba(0,212,200,0.1)] text-accent-light"
                        : p.status === "awarded"
                          ? "bg-[rgba(217,164,65,0.09)] text-[#8a6414]"
                          : "bg-[rgba(24,34,44,0.06)] text-text-muted",
                    )}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                  <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
