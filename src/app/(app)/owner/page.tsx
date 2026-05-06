import Link from "next/link";
import { Plus, Folders, Inbox, FileSpreadsheet, ArrowUpRight } from "lucide-react";

import { auth } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard, EmptyState } from "@/components/app/page-header";

export const metadata = { title: "Dashboard" };

export default async function OwnerDashboard() {
  const session = await auth();
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Your project hub"
        description="Upload a residential project once and let suitable Australian builders come to you."
        actions={
          <Link
            href="/owner/projects/new"
            className={cn(buttonVariants({ size: "md" }), "gap-2")}
            aria-disabled
          >
            <Plus className="size-4" />
            Upload project
          </Link>
        }
      />

      <div className="px-6 lg:px-8 py-7 flex flex-col gap-7">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active projects" value="0" hint="No projects uploaded yet" />
          <StatCard label="Builder unlocks" value="0" hint="Awaiting first upload" />
          <StatCard label="Tenders received" value="0" hint="Compare side-by-side" />
          <StatCard label="Unread messages" value="0" hint="From builders & support" />
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <section className="lg:col-span-2 rounded-md border border-border-subtle bg-surface-1">
            <header className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">Recent projects</h2>
                <p className="text-[12px] text-text-dim mt-0.5">Drafts and published work in your account.</p>
              </div>
              <Link
                href="/owner/projects"
                className="text-[11px] tracking-[0.16em] uppercase text-text-dim hover:text-accent-light"
              >
                View all
              </Link>
            </header>
            <EmptyState
              icon={<Folders className="size-4" />}
              title="No projects yet"
              description="Upload your first project — drawings, scope, timeline. Suitable builders unlock and tender."
              action={
                <Link
                  href="/owner/projects/new"
                  className={cn(buttonVariants({ size: "sm" }), "gap-2")}
                  aria-disabled
                >
                  <Plus className="size-3.5" />
                  Upload your first project
                </Link>
              }
            />
          </section>

          <aside className="rounded-md border border-border-subtle bg-surface-1">
            <header className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">What ships next</h2>
              <p className="text-[12px] text-text-dim mt-0.5">Live roadmap from BuilderHQ.</p>
            </header>
            <ul className="px-5 py-4 flex flex-col gap-3 text-[13px] leading-[20px]">
              <RoadmapItem phase="Phase 2" title="Project upload + builder browse" />
              <RoadmapItem phase="Phase 2" title="Stripe unlocks + Founding Builder credits" />
              <RoadmapItem phase="Phase 3" title="Tender submission + comparison" />
              <RoadmapItem phase="Phase 3" title="Owner ↔ builder messaging" />
            </ul>
          </aside>
        </div>

        {/* Activity strip */}
        <section className="rounded-md border border-border-subtle bg-surface-1">
          <header className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <div>
              <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">Activity</h2>
              <p className="text-[12px] text-text-dim mt-0.5">Recent actions across your account.</p>
            </div>
          </header>
          <div className="px-5 py-7 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <ActivityCol icon={<Inbox className="size-3.5" />} label="Inbox" value="0 new" />
            <ActivityCol icon={<FileSpreadsheet className="size-3.5" />} label="Pending decisions" value="0" />
            <ActivityCol icon={<ArrowUpRight className="size-3.5" />} label="Last login" value="Just now" />
          </div>
        </section>
      </div>
    </>
  );
}

function RoadmapItem({ phase, title }: { phase: string; title: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 items-center px-1.5 rounded-tight border border-border bg-surface-2 text-[9px] tracking-[0.14em] uppercase text-text-dim font-ui">
        {phase}
      </span>
      <span className="text-text-muted">{title}</span>
    </li>
  );
}

function ActivityCol({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 items-center">
      <div className="text-text-faint">{icon}</div>
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">{label}</div>
      <div className="font-ui font-semibold text-[15px] text-text tabular-nums">{value}</div>
    </div>
  );
}
