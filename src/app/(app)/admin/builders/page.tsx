/**
 * Admin · builders list.
 *
 * Filter pills across the top (All / Pending review / Approved /
 * Rejected / Suspended / Incomplete) plus a free-text search across
 * company name, email, and ABN. Each row exposes inline approve
 * actions and links into the detail page for the heavier reject /
 * suspend / reinstate flow.
 *
 * Filters live in the URL — `?status=...&q=...` — so admins can
 * bookmark/share "all pending builders in WA" by copying the URL.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search,
  Hammer,
  CheckCircle2,
  XCircle,
  Clock,
  AlertOctagon,
  Inbox,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { listBuilders, type BuilderListFilters } from "@/modules/admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import {
  ApprovalStatusBadge,
  UserStatusBadge,
} from "@/components/admin/badges";
import { BuilderInlineActions } from "@/components/admin/builder-actions";

export const metadata = {
  title: "Admin · builders",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type FilterKey = NonNullable<BuilderListFilters["status"]>;

const FILTERS: Array<{
  key: FilterKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "all", label: "All", icon: Hammer },
  { key: "pending_review", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
  { key: "suspended", label: "Suspended", icon: AlertOctagon },
  { key: "incomplete", label: "Incomplete", icon: Inbox },
];

function parseFilter(raw: string | undefined): FilterKey {
  if (!raw) return "all";
  return FILTERS.some((f) => f.key === raw) ? (raw as FilterKey) : "all";
}

export default async function AdminBuildersPage(props: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/owner");

  const sp = await props.searchParams;
  const status = parseFilter(sp.status);
  const q = (sp.q ?? "").trim();

  const builders = await listBuilders({
    status,
    search: q.length > 0 ? q : undefined,
    limit: 200,
    order: status === "pending_review" ? "oldest" : "newest",
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin · builders"
        title="Builders"
        description="Approve new submissions, audit existing builders, and suspend abuse. Filters & search are reflected in the URL — share the link to share the view."
      />

      <div className="px-4 sm:px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-6">
        {/* ── Filter pills + search ────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const active = f.key === status;
              const params = new URLSearchParams();
              if (f.key !== "all") params.set("status", f.key);
              if (q) params.set("q", q);
              const href =
                params.toString().length > 0
                  ? `/admin/builders?${params.toString()}`
                  : "/admin/builders";
              return (
                <Link
                  key={f.key}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9",
                    "text-[12px] font-ui tracking-[-0.005em] border transition-[background,border-color,color] duration-[140ms]",
                    active
                      ? "bg-accent text-accent-contrast border-accent"
                      : "bg-surface-1/40 text-text-muted border-border-subtle hover:border-border hover:text-text",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{f.label}</span>
                </Link>
              );
            })}
          </nav>

          <form
            action="/admin/builders"
            method="get"
            className="relative flex items-center gap-2 w-full lg:w-[320px]"
          >
            {status !== "all" ? (
              <input type="hidden" name="status" value={status} />
            ) : null}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint pointer-events-none" />
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Company, email, or ABN"
                className="pl-9 h-10 text-[12.5px]"
              />
            </div>
          </form>
        </div>

        {/* ── Table ────────────────────────────────────────────────── */}
        {builders.length === 0 ? (
          <EmptyState
            icon={<Hammer className="size-4" />}
            title="No builders match"
            description={
              q.length > 0
                ? `Nothing matched "${q}". Try a different filter or clear the search.`
                : "There are no builders in this state right now."
            }
          />
        ) : (
          <div className="rounded-md border border-border-subtle overflow-hidden bg-surface-2">
            <div className="hidden lg:grid grid-cols-[2fr_1.4fr_1fr_1.6fr_1.4fr] gap-4 px-6 py-3 bg-[rgba(24,34,44,0.03)] border-b border-border-subtle text-[9.5px] tracking-[0.16em] uppercase text-text-dim">
              <span>Builder</span>
              <span>Identity</span>
              <span>Status</span>
              <span>Signals</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-border-subtle">
              {builders.map((b) => (
                <li
                  key={b.userId}
                  className="grid grid-cols-1 lg:grid-cols-[2fr_1.4fr_1fr_1.6fr_1.4fr] gap-3 lg:gap-4 px-4 sm:px-6 py-4 items-start lg:items-center"
                >
                  <Link
                    href={`/admin/builders/${b.userId}`}
                    className="flex flex-col gap-0.5 min-w-0 group"
                  >
                    <span className="font-ui text-[13.5px] text-text truncate group-hover:text-accent-light transition-colors">
                      {b.companyName ?? b.name ?? b.email}
                    </span>
                    <span className="text-[12px] text-text-dim truncate">
                      {b.email}
                    </span>
                  </Link>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[12.5px] text-text-muted truncate">
                      {b.abn ? `ABN ${b.abn}` : "No ABN"}
                    </span>
                    <span className="text-[11.5px] text-text-dim truncate">
                      {b.state ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 items-start">
                    <ApprovalStatusBadge status={b.approvalStatus} />
                    {b.userStatus !== "active" ? (
                      <UserStatusBadge status={b.userStatus} />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={b.abnVerified ? "success" : "outline"}
                      className="!normal-case tracking-normal"
                    >
                      {b.abnVerified ? "ABN ✓" : "ABN ✗"}
                    </Badge>
                    <Badge
                      variant={b.anyLicenceVerified ? "success" : "outline"}
                      className="!normal-case tracking-normal"
                    >
                      {b.anyLicenceVerified ? "Licence ✓" : "Licence ✗"}
                    </Badge>
                    {b.awardedCount > 0 ? (
                      <Badge variant="info" className="!normal-case tracking-normal">
                        {b.awardedCount} won
                      </Badge>
                    ) : null}
                  </div>
                  <div className="lg:justify-self-end">
                    <BuilderInlineActions
                      builderId={b.userId}
                      status={b.approvalStatus}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 sm:px-6 py-3 border-t border-border-subtle text-[11px] text-text-dim">
              {builders.length} builder{builders.length === 1 ? "" : "s"}
              {builders.length === 200 ? " (max page size)" : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
