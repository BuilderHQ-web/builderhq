import Link from "next/link";
import {
  Compass,
  Sparkles,
  FileSpreadsheet,
  MessageSquare,
  ArrowUpRight,
  ClipboardList,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard, EmptyState } from "@/components/app/page-header";

export const metadata = { title: "Dashboard" };

export default async function BuilderDashboard() {
  const session = await auth();
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Find tender-ready work"
        description="Browse residential projects, unlock the ones that fit, and submit serious tenders."
        actions={
          <Link
            href="/builder/browse"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "gap-2")}
            aria-disabled
          >
            <Compass className="size-4" />
            Browse projects
          </Link>
        }
      />

      <div className="px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-10">
        <section>
          <SectionLabel>Pipeline</SectionLabel>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Free unlocks" value="—" hint="Founding access" />
            <StatCard label="Unlocked" value="0" hint="Currently active" />
            <StatCard label="Submitted tenders" value="0" hint="Awaiting decision" />
            <StatCard label="Awarded" value="0" hint="Lifetime" />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-md border border-border-subtle bg-surface-1/40">
            <SectionHeader
              title="Matched projects"
              description="Residential work in your service areas."
              action={
                <Link
                  href="/builder/browse"
                  className="text-[11px] tracking-[0.16em] uppercase text-text-dim hover:text-accent-light transition-colors"
                >
                  Browse all
                </Link>
              }
            />
            <EmptyState
              icon={<Compass className="size-4" />}
              title="No matches yet"
              description="As soon as a project owner uploads work in your service areas and project types, it appears here."
              action={
                <Link
                  href="/builder/browse"
                  className={cn(buttonVariants({ size: "lg", variant: "outline" }), "gap-2")}
                  aria-disabled
                >
                  Open browse view
                </Link>
              }
            />
          </div>

          <div className="rounded-md border border-border-subtle bg-surface-1/40 flex flex-col">
            <SectionHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="size-3.5 text-accent" />
                  Founding access
                </span>
              }
              description="Launch-period perks."
            />
            <div className="px-7 pb-7 flex flex-col gap-3 text-[13.5px] leading-[22px] text-text-muted">
              <p>
                Qualified builders unlock projects with complimentary credits — no Stripe charge during the founding window.
              </p>
              <p className="text-[12px] text-text-dim">
                Eligibility, allowance, and refresh schedule arrive in Phase 3.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border-subtle bg-surface-1/40">
          <SectionHeader title="Shortcuts" description="Common builder actions." />
          <ul className="px-2 pb-2">
            <ShortcutRow icon={Compass} title="Browse projects" sub="Postcode + project-type filters" href="/builder/browse" soon />
            <ShortcutRow icon={ClipboardList} title="Unlocked projects" sub="Full-detail access" href="/builder/unlocked" soon />
            <ShortcutRow icon={FileSpreadsheet} title="My tenders" sub="Drafts and submissions" href="/builder/tenders" soon />
            <ShortcutRow icon={MessageSquare} title="Messages" sub="Owner conversations" href="/builder/messages" soon />
            <ShortcutRow icon={Settings} title="Settings" sub="Profile + licences" href="/settings" />
          </ul>
        </section>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
      {children}
    </span>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="px-7 py-5 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">{title}</h2>
        {description ? <p className="text-[12.5px] text-text-dim">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function ShortcutRow({
  icon: Icon,
  title,
  sub,
  href,
  soon,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  href: string;
  soon?: boolean;
}) {
  return (
    <li>
      <Link
        href={soon ? "#" : href}
        aria-disabled={soon}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px]",
          "transition-colors duration-[120ms] hover:bg-surface-1",
          soon && "pointer-events-none opacity-60",
        )}
      >
        <span className="size-7 rounded-md flex items-center justify-center text-text-faint">
          <Icon className="size-3.5" />
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium text-text truncate">{title}</span>
          <span className="text-[11px] text-text-dim truncate">{sub}</span>
        </div>
        <ArrowUpRight className="size-3.5 text-text-faint" />
      </Link>
    </li>
  );
}
