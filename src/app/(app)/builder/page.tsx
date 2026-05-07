import Link from "next/link";
import {
  Compass,
  ArrowUpRight,
  Bookmark,
  Sparkles,
  TrendingUp,
  Unlock as UnlockIcon,
} from "lucide-react";

import { auth } from "@/modules/auth";
import {
  listForMarketplace,
  listByIds,
} from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import {
  countMyUnlocks,
  countMySaved,
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
} from "@/modules/unlocks";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/components/builder/project-card";

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
  ]);

  const recentUnlocks = await listByIds(unlockedIds.slice(0, 3));
  const savedRecent = await listByIds(savedIds.slice(0, 3));

  const unlockedSet = new Set(unlockedIds);
  const savedSet = new Set(savedIds);

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
            <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
              Builder console
            </span>

            <h1 className="mt-6 font-display uppercase tracking-[-0.018em] leading-[0.9] text-[clamp(3rem,5vw+1rem,5rem)]">
              Hi{" "}
              <span
                className="text-accent-light"
                style={{
                  textShadow:
                    "0 0 60px rgba(0,212,200,0.32), 0 0 120px rgba(0,212,200,0.12)",
                }}
              >
                {firstName}
              </span>
              .
            </h1>

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
        {/* ── KPIs ──────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Pipeline</SectionLabel>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              tone="teal"
              icon={<Sparkles className="size-3.5" />}
              label="Suggested for you"
              value={suggested.length}
              hint={
                matchedSuburbs.length > 0 || matchedCategories.length > 0
                  ? "Based on your service area"
                  : "Set service area in onboarding"
              }
            />
            <Kpi
              tone="blue"
              icon={<UnlockIcon className="size-3.5" />}
              label="Unlocked"
              value={unlockedCount}
              hint={unlockedCount === 0 ? "None yet" : "Lifetime"}
            />
            <Kpi
              tone="amber"
              icon={<Bookmark className="size-3.5" />}
              label="Saved"
              value={savedCount}
              hint={
                savedCount === 0
                  ? "Bookmark a project to compare later"
                  : "Bookmarked"
              }
            />
            <Kpi
              tone="rose"
              icon={<TrendingUp className="size-3.5" />}
              label="Submitted tenders"
              value={0}
              hint="Coming in Phase 3"
            />
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

type KpiTone = "teal" | "blue" | "amber" | "rose";

function Kpi({
  tone,
  icon,
  label,
  value,
  hint,
}: {
  tone: KpiTone;
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  const styles: Record<
    KpiTone,
    { bg: string; ring: string; num: string; iconBg: string; glow: string }
  > = {
    teal: {
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(6,18,30,0.6))",
      ring: "border-border-accent/40",
      num: "text-accent-light",
      iconBg:
        "border-border-accent bg-accent-muted text-accent-light",
      glow: "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
    },
    blue: {
      bg: "linear-gradient(180deg,rgba(26,95,212,0.07),rgba(6,18,30,0.6))",
      ring: "border-[rgba(120,180,255,0.20)]",
      num: "text-[#bfd6ff]",
      iconBg:
        "border-[rgba(120,180,255,0.30)] bg-[rgba(26,95,212,0.18)] text-[#bfd6ff]",
      glow: "radial-gradient(circle, rgba(26,95,212,0.20), transparent 70%)",
    },
    amber: {
      bg: "linear-gradient(180deg,rgba(251,184,64,0.06),rgba(6,18,30,0.6))",
      ring: "border-[rgba(251,184,64,0.22)]",
      num: "text-[#ffd887]",
      iconBg:
        "border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.10)] text-[#ffd887]",
      glow: "radial-gradient(circle, rgba(251,184,64,0.18), transparent 70%)",
    },
    rose: {
      bg: "linear-gradient(180deg,rgba(255,120,150,0.05),rgba(6,18,30,0.6))",
      ring: "border-[rgba(255,120,150,0.20)]",
      num: "text-[#ffc0cd]",
      iconBg:
        "border-[rgba(255,120,150,0.30)] bg-[rgba(255,120,150,0.10)] text-[#ffc0cd]",
      glow: "radial-gradient(circle, rgba(255,120,150,0.16), transparent 70%)",
    },
  };
  const s = styles[tone];

  return (
    <div
      className={cn(
        "relative rounded-md border p-5 overflow-hidden",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
        s.ring,
      )}
      style={{ background: s.bg }}
    >
      <span
        aria-hidden
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-40 pointer-events-none"
        style={{ background: s.glow }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <span
          className={cn(
            "size-7 rounded-md border flex items-center justify-center",
            s.iconBg,
          )}
        >
          {icon}
        </span>
        <span className="text-[9.5px] tracking-[0.2em] uppercase text-text-dim text-right">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "relative font-display tracking-[-0.01em] text-[40px] leading-none tabular-nums",
          s.num,
        )}
      >
        {value}
      </div>
      <div className="relative mt-2 text-[11.5px] text-text-dim">{hint}</div>
    </div>
  );
}
