import { redirect } from "next/navigation";
import { Users, Hammer, Folders, FileSpreadsheet, ShieldCheck } from "lucide-react";

import { auth } from "@/modules/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/app/page-header";

export const metadata = { title: "Admin overview", robots: { index: false, follow: false } };

export default async function AdminDashboard() {
  // Defense-in-depth: proxy.ts gates this, layout double-checks, and we
  // explicitly assert role here too. Three layers, by design.
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/owner");

  return (
    <>
      <PageHeader
        eyebrow="Admin · overview"
        title="Platform metrics"
        description="Live counts and signals across users, builders, projects, tenders, and revenue. Hardened access — every action is audit-logged."
      />

      <div className="px-6 lg:px-8 py-7 flex flex-col gap-7">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total users" value="—" hint="Phase 1+ live" />
          <StatCard label="Active builders" value="—" hint="Status = active" />
          <StatCard label="Published projects" value="—" hint="Phase 2+" />
          <StatCard label="Tenders this week" value="—" hint="Phase 3+" />
        </div>

        <section className="rounded-md border border-border-subtle bg-surface-1">
          <header className="px-5 py-4 border-b border-border-subtle">
            <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">Surfaces</h2>
            <p className="text-[12px] text-text-dim mt-0.5">Admin areas, by phase.</p>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle [&>*]:lg:[&:nth-child(3n)]:border-r-0">
            <Surface icon={<Users className="size-3.5" />} title="Users" body="View, suspend, ban, impersonate. Audit-trailed." soon="Phase 4" />
            <Surface icon={<Hammer className="size-3.5" />} title="Builders" body="Approve / reject builder profiles, manage Founding access." soon="Phase 4" />
            <Surface icon={<Folders className="size-3.5" />} title="Projects" body="Moderate uploads, override status, archive disputes." soon="Phase 4" />
            <Surface icon={<FileSpreadsheet className="size-3.5" />} title="Tenders" body="View tender history, intervene on disputes." soon="Phase 4" />
            <Surface icon={<ShieldCheck className="size-3.5" />} title="Audit log" body="Every admin action with before/after JSON." soon="Phase 4" />
            <Surface icon={<Users className="size-3.5" />} title="Settings" body="Platform-wide config, fees, FBA defaults." soon="Phase 4" />
          </div>
        </section>

        <EmptyState
          title="Nothing to moderate yet"
          description="Once users sign up and start uploading, this view fills with signal — flagged content, disputes, payment exceptions, and FBA grants."
        />
      </div>
    </>
  );
}

function Surface({
  icon,
  title,
  body,
  soon,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  soon: string;
}) {
  return (
    <div className="px-5 py-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-text-faint">{icon}<span className="font-ui font-semibold text-[13px] text-text">{title}</span></span>
        <span className="text-[9px] tracking-[0.14em] uppercase text-text-dim">{soon}</span>
      </div>
      <p className="text-[12px] leading-[20px] text-text-muted">{body}</p>
    </div>
  );
}
