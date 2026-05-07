import Link from "next/link";
import {
  Plus,
  ArrowUpRight,
  FileSpreadsheet,
  MessageSquare,
  Folders,
  Sparkles,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { listMine, type Project } from "@/modules/projects";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const TYPE_LABEL: Record<Project["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * Owner dashboard — premium feel.
 *
 * Visual rhythm:
 *   1. Hero — centred greeting + the single most important CTA.
 *   2. KPI cards — animated number panels with their own colour
 *      personality (teal / blue / amber / rose).
 *   3. Recent projects — list view with hover lift.
 *   4. Shortcuts strip — icons + actions, soft accent panel.
 *
 * Each section uses a different background treatment so they read
 * as distinct moments, not a wall of identical cards.
 */
export default async function OwnerDashboard() {
  const session = await auth();
  const firstName =
    (session?.user?.name ?? "").split(" ")[0] || "there";
  const projects = session?.user
    ? await listMine(session.user.id!)
    : [];

  const activeCount = projects.filter(
    (p) => p.status === "published" || p.status === "tendering",
  ).length;
  const draftCount = projects.filter((p) => p.status === "draft").length;
  const recent = projects.slice(0, 5);
  const isFirstTime = projects.length === 0;

  return (
    <div className="min-h-dvh">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        {/* Ambient gradient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,200,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(26,95,212,0.06), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(120,200,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,255,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent 80%)",
          }}
        />

        <div className="relative px-6 lg:px-10 pt-16 lg:pt-20 pb-14 lg:pb-16">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
                <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
              </span>
              {isFirstTime ? "Welcome to BuilderHQ" : "Project hub"}
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
              {isFirstTime
                ? "Upload a residential project once. Verified Australian builders match, unlock, and tender. You compare side-by-side and decide."
                : "Pick up where you left off, or upload a new residential project to put in front of matched Australian builders."}
            </p>

            <Link
              href="/owner/projects/new"
              className={cn(
                "group mt-9 inline-flex items-center gap-2.5 h-12 px-7 rounded-full",
                "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
                "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_12px_36px_-8px_rgba(0,212,200,0.55)]",
              )}
            >
              <Plus className="size-4" />
              Upload a new project
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            {!isFirstTime ? (
              <Link
                href="/owner/projects"
                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-text-muted hover:text-text transition-colors"
              >
                View all projects
                <ArrowUpRight className="size-3.5 opacity-60" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="px-6 lg:px-10 py-10 lg:py-14 flex flex-col gap-10">
        {/* ── KPI cards ─────────────────────────────────────────────── */}
        <section>
          <SectionLabel>At a glance</SectionLabel>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              tone="teal"
              label="Active projects"
              value={activeCount}
              hint={
                activeCount === 0
                  ? draftCount > 0
                    ? `${draftCount} draft${draftCount === 1 ? "" : "s"} in progress`
                    : "Upload your first to start"
                  : "Visible to matched builders"
              }
            />
            <Kpi
              tone="blue"
              label="Builder unlocks"
              value={0}
              hint="Coming in step 4"
            />
            <Kpi
              tone="amber"
              label="Tenders received"
              value={0}
              hint="Compare side-by-side"
            />
            <Kpi
              tone="rose"
              label="Unread messages"
              value={0}
              hint="Builder conversations"
            />
          </div>
        </section>

        {/* ── Recent projects + Shortcuts ───────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Panel
            tone="default"
            title="Recent projects"
            description="Drafts and published work in your account."
            action={
              projects.length > 0 ? (
                <Link
                  href="/owner/projects"
                  className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                >
                  View all
                </Link>
              ) : null
            }
            className="lg:col-span-2"
          >
            {isFirstTime ? (
              <div className="px-6 py-12 text-center">
                <div
                  aria-hidden
                  className="mx-auto size-12 rounded-full bg-accent-muted/40 border border-border-accent flex items-center justify-center text-accent-light mb-5"
                  style={{ boxShadow: "0 0 32px rgba(0,212,200,0.18)" }}
                >
                  <Folders className="size-5" />
                </div>
                <h3 className="font-ui font-semibold text-[15px] text-text">
                  Your first project is one upload away
                </h3>
                <p className="mt-2 mx-auto max-w-[44ch] text-[12.5px] leading-[1.6] text-text-dim">
                  Drag in your architectural plans, fill three short sections,
                  and publish to start receiving tenders.
                </p>
                <Link
                  href="/owner/projects/new"
                  className={cn(
                    "mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-full",
                    "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
                    "transition-colors duration-[160ms] hover:bg-accent-hover",
                  )}
                >
                  <Plus className="size-3.5" />
                  Upload your first project
                </Link>
              </div>
            ) : (
              <div className="border-t border-border-subtle/60">
                {recent.map((p, i, arr) => (
                  <Link
                    key={p.id}
                    href={
                      p.status === "draft"
                        ? `/owner/projects/${p.slug}/edit`
                        : `/owner/projects/${p.slug}`
                    }
                    className={cn(
                      "grid grid-cols-[1fr_auto_auto] gap-4 items-center px-6 py-4 transition-colors hover:bg-[rgba(0,212,200,0.025)]",
                      i === arr.length - 1
                        ? ""
                        : "border-b border-border-subtle/60",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-text truncate">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-text-dim truncate">
                        {TYPE_LABEL[p.type]}
                        {p.suburb ? ` · ${p.suburb}, ${p.state}` : ""}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
                        p.status === "draft"
                          ? "border-border-subtle text-text-dim"
                          : "border-border-accent text-accent-light",
                      )}
                    >
                      {p.status}
                    </span>
                    <ArrowUpRight className="size-3.5 text-text-faint" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel tone="accent" title="Shortcuts" description="Common actions.">
            <ul className="px-3 py-2 flex flex-col gap-1">
              <Shortcut
                icon={<Plus className="size-4" />}
                title="New project"
                sub="Start a draft"
                href="/owner/projects/new"
                primary
              />
              <Shortcut
                icon={<Folders className="size-4" />}
                title="My projects"
                sub="Drafts and published"
                href="/owner/projects"
              />
              <Shortcut
                icon={<FileSpreadsheet className="size-4" />}
                title="Tender comparison"
                sub="Side-by-side review"
                href="/owner/tenders"
                soon
              />
              <Shortcut
                icon={<MessageSquare className="size-4" />}
                title="Messages"
                sub="Builder conversations"
                href="/owner/messages"
                soon
              />
            </ul>
          </Panel>
        </section>

        {/* ── What's next ───────────────────────────────────────────── */}
        <section>
          <Panel
            tone="muted"
            title="What ships next"
            description="Live roadmap from BuilderHQ."
          >
            <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <RoadmapItem
                phase="Step 4"
                title="Builder browse + match filtering"
                imminent
              />
              <RoadmapItem
                phase="Step 5"
                title="Stripe unlocks + Founding Builder credits"
              />
              <RoadmapItem phase="Phase 3" title="Tender submission + comparison" />
              <RoadmapItem phase="Phase 3" title="Owner ↔ builder messaging" />
            </div>
          </Panel>
        </section>
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

type PanelTone = "default" | "accent" | "muted";

function Panel({
  tone = "default",
  title,
  description,
  action,
  className,
  children,
}: {
  tone?: PanelTone;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "accent"
      ? "border-border-accent/40 bg-[linear-gradient(180deg,rgba(0,212,200,0.04),rgba(6,18,30,0.6))]"
      : tone === "muted"
      ? "border-border-subtle bg-[linear-gradient(180deg,rgba(8,22,36,0.55),rgba(4,14,24,0.75))]"
      : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]";

  return (
    <section
      className={cn(
        "rounded-md border overflow-hidden",
        "shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]",
        toneCls,
        className,
      )}
    >
      <header className="px-6 py-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
            {title}
          </h2>
          {description ? (
            <p className="text-[12px] text-text-dim">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

type KpiTone = "teal" | "blue" | "amber" | "rose";

function Kpi({
  tone,
  label,
  value,
  hint,
}: {
  tone: KpiTone;
  label: string;
  value: number;
  hint: string;
}) {
  const toneStyles: Record<
    KpiTone,
    { bg: string; ring: string; dot: string; num: string }
  > = {
    teal: {
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(6,18,30,0.6))",
      ring: "border-border-accent/40",
      dot: "bg-accent shadow-[0_0_10px_rgba(0,212,200,0.6)]",
      num: "text-accent-light",
    },
    blue: {
      bg: "linear-gradient(180deg,rgba(26,95,212,0.07),rgba(6,18,30,0.6))",
      ring: "border-[rgba(120,180,255,0.20)]",
      dot: "bg-[#7eb4ff] shadow-[0_0_10px_rgba(120,180,255,0.55)]",
      num: "text-[#bfd6ff]",
    },
    amber: {
      bg: "linear-gradient(180deg,rgba(251,184,64,0.06),rgba(6,18,30,0.6))",
      ring: "border-[rgba(251,184,64,0.22)]",
      dot: "bg-[#fbb840] shadow-[0_0_10px_rgba(251,184,64,0.55)]",
      num: "text-[#ffd887]",
    },
    rose: {
      bg: "linear-gradient(180deg,rgba(255,120,150,0.05),rgba(6,18,30,0.6))",
      ring: "border-[rgba(255,120,150,0.20)]",
      dot: "bg-[#ff7892] shadow-[0_0_10px_rgba(255,120,150,0.55)]",
      num: "text-[#ffc0cd]",
    },
  };
  const t = toneStyles[tone];

  return (
    <div
      className={cn(
        "relative rounded-md border p-5 overflow-hidden",
        "shadow-[0_20px_48px_-24px_rgba(0,0,0,0.55)]",
        t.ring,
      )}
      style={{ background: t.bg }}
    >
      {/* corner glow */}
      <span
        aria-hidden
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-40 pointer-events-none"
        style={{
          background:
            tone === "teal"
              ? "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)"
              : tone === "blue"
              ? "radial-gradient(circle, rgba(26,95,212,0.20), transparent 70%)"
              : tone === "amber"
              ? "radial-gradient(circle, rgba(251,184,64,0.18), transparent 70%)"
              : "radial-gradient(circle, rgba(255,120,150,0.16), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-[9.5px] tracking-[0.2em] uppercase text-text-dim">
          <span className={cn("size-1 rounded-full", t.dot)} />
          {label}
        </div>
        <div
          className={cn(
            "mt-3 font-display tracking-[-0.01em] text-[44px] leading-none tabular-nums",
            t.num,
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-[11.5px] text-text-dim">{hint}</div>
      </div>
    </div>
  );
}

function Shortcut({
  icon,
  title,
  sub,
  href,
  soon,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string;
  soon?: boolean;
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        href={soon ? "#" : href}
        aria-disabled={soon}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors duration-[160ms]",
          primary
            ? "bg-accent-muted/40 border border-border-accent text-accent-light hover:bg-accent-muted/70"
            : "hover:bg-[rgba(255,255,255,0.022)]",
          soon && "pointer-events-none opacity-50",
        )}
      >
        <span
          className={cn(
            "size-8 rounded-md flex items-center justify-center shrink-0",
            primary
              ? "bg-accent-muted border border-border-accent text-accent-light"
              : "border border-border-subtle bg-[rgba(255,255,255,0.018)] text-text-muted",
          )}
        >
          {icon}
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span
            className={cn(
              "font-medium truncate",
              primary ? "text-accent-light" : "text-text",
            )}
          >
            {title}
          </span>
          <span className="text-[11px] text-text-dim truncate">{sub}</span>
        </div>
        {soon ? (
          <span className="text-[8.5px] tracking-[0.16em] uppercase text-text-dim/70 shrink-0">
            Soon
          </span>
        ) : (
          <ArrowUpRight className="size-3.5 text-text-faint shrink-0" />
        )}
      </Link>
    </li>
  );
}

function RoadmapItem({
  phase,
  title,
  imminent,
}: {
  phase: string;
  title: string;
  imminent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-border-subtle/40 last:border-b-0">
      <span
        className={cn(
          "text-[9px] tracking-[0.18em] uppercase font-mono shrink-0",
          imminent ? "text-accent" : "text-text-dim",
        )}
      >
        {phase}
      </span>
      <span className="text-[13px] text-text-muted flex items-center gap-2">
        {title}
        {imminent ? (
          <span className="px-1.5 py-0.5 border border-border-accent/60 bg-accent-muted/30 rounded-sm text-[8px] tracking-[0.14em] uppercase text-accent-light">
            Up next
          </span>
        ) : null}
      </span>
    </div>
  );
}
