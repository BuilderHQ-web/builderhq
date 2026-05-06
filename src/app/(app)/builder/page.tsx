import Link from "next/link";
import { Compass, Sparkles, FileSpreadsheet, MessageSquare, ArrowUpRight } from "lucide-react";

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
            className={cn(buttonVariants({ size: "md", variant: "outline" }), "gap-2")}
            aria-disabled
          >
            <Compass className="size-4" />
            Browse projects
          </Link>
        }
      />

      <div className="px-6 lg:px-8 py-7 flex flex-col gap-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Free unlocks left" value="—" hint="Founding Builder Access" />
          <StatCard label="Unlocked projects" value="0" hint="Currently active" />
          <StatCard label="Submitted tenders" value="0" hint="Awaiting decision" />
          <StatCard label="Awarded" value="0" hint="Lifetime" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <section className="lg:col-span-2 rounded-md border border-border-subtle bg-surface-1">
            <header className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">Matched projects</h2>
                <p className="text-[12px] text-text-dim mt-0.5">Residential work in your service areas.</p>
              </div>
              <Link
                href="/builder/browse"
                className="text-[11px] tracking-[0.16em] uppercase text-text-dim hover:text-accent-light"
              >
                Browse all
              </Link>
            </header>
            <EmptyState
              icon={<Compass className="size-4" />}
              title="No matched projects yet"
              description="Project owners are uploading. As soon as a residential project matches your service areas and types, it appears here."
              action={
                <Link
                  href="/builder/browse"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-2")}
                  aria-disabled
                >
                  Open browse view
                </Link>
              }
            />
          </section>

          <aside className="rounded-md border border-border-subtle bg-surface-1">
            <header className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
              <Sparkles className="size-3.5 text-accent" />
              <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">Founding access</h2>
            </header>
            <div className="px-5 py-4 flex flex-col gap-3 text-[13px] leading-[20px] text-text-muted">
              <p>
                During launch, qualified builders unlock projects with complimentary
                credits — no Stripe charge.
              </p>
              <p className="text-text-dim text-[12px]">
                Eligibility, allowance, and refresh schedule are managed by BuilderHQ
                and shipped in Phase 3.
              </p>
            </div>
          </aside>
        </div>

        <section className="rounded-md border border-border-subtle bg-surface-1">
          <header className="px-5 py-4 border-b border-border-subtle">
            <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">Pipeline</h2>
            <p className="text-[12px] text-text-dim mt-0.5">Where every project you touch sits.</p>
          </header>
          <div className="px-5 py-7 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <PipelineCol icon={<Compass className="size-3.5" />} label="Matched" value="0" />
            <PipelineCol icon={<ArrowUpRight className="size-3.5" />} label="Unlocked" value="0" />
            <PipelineCol icon={<FileSpreadsheet className="size-3.5" />} label="Submitted" value="0" />
            <PipelineCol icon={<MessageSquare className="size-3.5" />} label="In conversation" value="0" />
          </div>
        </section>
      </div>
    </>
  );
}

function PipelineCol({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 items-center">
      <div className="text-text-faint">{icon}</div>
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">{label}</div>
      <div className="font-display tracking-[-0.01em] text-[28px] leading-none text-text tabular-nums">{value}</div>
    </div>
  );
}
