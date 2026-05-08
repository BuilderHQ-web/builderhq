import Link from "next/link";
import { Compass, ArrowUpRight, Bookmark } from "lucide-react";

import { auth } from "@/modules/auth";
import { listForMarketplace, listByIds } from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import {
  countMyUnlocks,
  countMySaved,
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
} from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/components/builder/project-card";
import { AnimatedKpis, type AnimatedKpi } from "@/components/builder/animated-kpis";
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
import { FbaCard } from "@/components/builder/fba-card";

export const metadata = { title: "Dashboard" };

export default async function BuilderDashboard() {
  const session = await auth();
  const userId = session?.user?.id;
  const firstName =
    (session?.user?.name ?? "").split(" ")[0] || "there";

  const profile = userId ? await getBuilderProfile(userId) : null;
  const matchedSuburbs =
    profile?.serviceAreas
      .map((s) => s.suburb)
      .filter((s): s is string => Boolean(s)) ?? [];
  const matchedCategories =
    profile?.categories.map((c) => c.category) ?? [];

  // ── parallel data load ────────────────────────────────────────────
  const [
    unlockedCount,
    savedCount,
    unlockedIds,
    savedIds,
    suggested,
    fbaStatus,
  ] = await Promise.all([
    userId ? countMyUnlocks(userId) : 0,
    userId ? countMySaved(userId) : 0,
    userId ? listMyUnlockedProjectIds(userId) : [],
    userId ? listMySavedProjectIds(userId) : [],
    listForMarketplace({
      ...(matchedCategories.length === 1
        ? { type: matchedCategories[0]! }
        : {}),
      ...(matchedSuburbs.length > 0
        ? { suburbsIn: matchedSuburbs }
        : {}),
      limit: 6,
    }),
    userId
      ? getFbaStatus(userId)
      : Promise.resolve({ active: false, reason: "no_grant" } as const),
  ]);

  const recentUnlocks = await listByIds(unlockedIds.slice(0, 3));
  const savedRecent = await listByIds(savedIds.slice(0, 3));

  const unlockedSet = new Set(unlockedIds);
  const savedSet = new Set(savedIds);

  const kpis: AnimatedKpi[] = [
    {
      tone: "teal",
      icon: "sparkles",
      label: "Suggested for you",
      value: suggested.length,
      hint:
        matchedSuburbs.length > 0 || matchedCategories.length > 0
          ? "Based on your service area"
          : "Set service area in Settings",
    },
    {
      tone: "blue",
      icon: "unlock",
      label: "Unlocked",
      value: unlockedCount,
      hint: unlockedCount === 0 ? "None yet" : "Lifetime",
    },
    {
      tone: "amber",
      icon: "bookmark",
      label: "Saved",
      value: savedCount,
      hint:
        savedCount === 0 ? "Bookmark a project to compare later" : "Bookmarked",
    },
    {
      tone: "rose",
      icon: "trending",
      label: "Submitted tenders",
      value: 0,
      hint: "Coming in Phase 3",
    },
  ];

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,212,200,0.08), transparent 65%)",
          }}
        />

        <div className="relative px-6 lg:px-10 pt-16 lg:pt-20 pb-14 lg:pb-16">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center">
            <BuilderHeroIntro firstName={firstName} />

            <p className="mt-5 max-w-[52ch] text-[15px] leading-[1.7] text-text-subtle">
              Browse residential projects matched to your service area and
              specialties. Unlock the ones that fit, tender with confidence.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/builder/browse"
                className={cn(
                  "group inline-flex items-center gap-2.5 h-12 px-7 rounded-full",
                  "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                  "transition-colors duration-[160ms] hover:bg-accent-hover",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]",
                )}
              >
                <Compass className="size-4" />
                Browse projects
                <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/builder/saved"
                className="inline-flex items-center gap-1.5 h-12 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
              >
                <Bookmark className="size-3.5" />
                Saved
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 lg:px-10 py-10 lg:py-14 flex flex-col gap-10">
        {/* ── FBA panel — prominent when active ─────────────────────── */}
        <section>
          <SectionLabel>
            {fbaStatus.active ? "Founding access" : "Access"}
          </SectionLabel>
          <div className="mt-5">
            <FbaCard status={fbaStatus} />
          </div>
        </section>

        {/* ── KPIs ──────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Pipeline</SectionLabel>
          <div className="mt-5">
            <AnimatedKpis items={kpis} />
          </div>
        </section>

        {/* ── Suggested ───────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Suggested for you"
            description={
              matchedCategories.length > 0 || matchedSuburbs.length > 0
                ? "Projects in your service area + categories."
                : "Recent published projects."
            }
            action={
              <Link
                href="/builder/browse"
                className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
              >
                Browse all
              </Link>
            }
          />
          {suggested.length === 0 ? (
            <EmptyHint message="No projects yet — check back soon, or tweak your service area in Settings." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggested.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isSaved={savedSet.has(p.id)}
                  isUnlocked={unlockedSet.has(p.id)}
                  fbaActive={
                    fbaStatus.active && fbaStatus.remainingThisCycle > 0
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Recent unlocks ─────────────────────────────────────── */}
        {recentUnlocks.length > 0 ? (
          <section>
            <SectionHeader
              title="Recently unlocked"
              description="Projects you've committed to."
              action={
                unlockedCount > recentUnlocks.length ? (
                  <Link
                    href="/builder/browse"
                    className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                  >
                    See all {unlockedCount}
                  </Link>
                ) : null
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentUnlocks.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isSaved={savedSet.has(p.id)}
                  isUnlocked={true}
                  fbaActive={
                    fbaStatus.active && fbaStatus.remainingThisCycle > 0
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Saved ──────────────────────────────────────────────── */}
        {savedRecent.length > 0 ? (
          <section>
            <SectionHeader
              title="Your saved list"
              description="Projects you've bookmarked to revisit."
              action={
                savedCount > savedRecent.length ? (
                  <Link
                    href="/builder/saved"
                    className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                  >
                    See all {savedCount}
                  </Link>
                ) : null
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedRecent.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isSaved={true}
                  isUnlocked={unlockedSet.has(p.id)}
                  fbaActive={
                    fbaStatus.active && fbaStatus.remainingThisCycle > 0
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
      <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
      {children}
    </span>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-ui font-semibold text-[16px] tracking-[-0.005em] text-text">
          {title}
        </h2>
        {description ? (
          <p className="text-[12.5px] text-text-dim mt-0.5">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-10 text-center text-[13px] text-text-dim">
      {message}
    </div>
  );
}

