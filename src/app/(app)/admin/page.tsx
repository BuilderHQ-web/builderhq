import { redirect } from "next/navigation";
import {
  Users,
  Hammer,
  Folders,
  FileSpreadsheet,
  ShieldCheck,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/app/page-header";

export const metadata = { title: "Admin overview", robots: { index: false, follow: false } };

export default async function AdminDashboard() {
  // Three layers of access enforcement: proxy → app layout → page.
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/owner");

  return (
    <>
      <PageHeader
        eyebrow="Admin · overview"
        title="Platform metrics"
        description="Live counts and signals across users, builders, projects, tenders, and revenue. Every action is audit-logged."
      />

      <div className="px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-10">
        <section>
          <SectionLabel>At a glance</SectionLabel>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total users" value="—" hint="Phase 1+ live" />
            <StatCard label="Active builders" value="—" hint="Status active" />
            <StatCard label="Published projects" value="—" hint="Phase 2+" />
            <StatCard label="Tenders this week" value="—" hint="Phase 3+" />
          </div>
        </section>

        <section>
          <SectionLabel>Surfaces</SectionLabel>
          <p className="mt-2 text-[13px] text-text-dim">Six admin areas, each shipping in Phase 4.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SurfaceCard icon={Users} title="Users" body="View, suspend, ban, impersonate." />
            <SurfaceCard icon={Hammer} title="Builders" body="Approve / reject builder profiles, manage Founding access." />
            <SurfaceCard icon={Folders} title="Projects" body="Moderate uploads, override status, archive disputes." />
            <SurfaceCard icon={FileSpreadsheet} title="Tenders" body="View tender history, intervene on disputes." />
            <SurfaceCard icon={Receipt} title="Payments" body="Stripe transactions, refunds, manual adjustments." />
            <SurfaceCard icon={ShieldCheck} title="Audit log" body="Every admin action with before/after JSON." />
          </div>
        </section>

        <section className="rounded-md border border-border-subtle bg-surface-1/40">
          <header className="px-7 py-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
                <span className="inline-flex items-center gap-2">
                  <Settings className="size-3.5 text-text-faint" />
                  Nothing to moderate yet
                </span>
              </h2>
              <p className="text-[12.5px] text-text-dim">
                Once users sign up and start uploading, this view fills with signal — flagged content,
                disputes, payment exceptions, and FBA grants.
              </p>
            </div>
          </header>
          <EmptyState
            title=""
            description="Quiet platform is a healthy platform. Real signal lands here automatically."
          />
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

function SurfaceCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-1/40 p-5 flex flex-col gap-2 transition-[border-color,background] duration-[160ms] hover:border-border hover:bg-surface-1">
      <span className="inline-flex items-center gap-2 text-text-faint">
        <Icon className="size-3.5" />
        <span className="font-ui font-semibold text-[13px] text-text">{title}</span>
      </span>
      <p className="text-[12.5px] leading-[20px] text-text-muted">{body}</p>
      <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim mt-1">Phase 4</span>
    </div>
  );
}
