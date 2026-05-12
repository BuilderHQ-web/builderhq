/**
 * Admin · users list.
 *
 * Every account on the platform regardless of role. Filters: role
 * pill row (All / Owners / Builders / Admins) + a status select +
 * free-text search on email or name.
 *
 * For builder rows the "View" link drops into the builder detail page
 * (which has the full verification + approval surface). For owners
 * the link is `mailto:` for now — the owner moderation surface lands
 * next.
 *
 * Filters live in the URL so views are shareable.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search,
  Users as UsersIcon,
  ShieldCheck,
  House,
  Hammer,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { listUsers, type UserListFilters } from "@/modules/admin";
import { Input, Select } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import { RoleBadge, UserStatusBadge } from "@/components/admin/badges";
import { UserAccountActions } from "@/components/admin/user-actions";

export const metadata = {
  title: "Admin · users",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type RoleFilter = NonNullable<UserListFilters["role"]>;
type StatusFilter = NonNullable<UserListFilters["status"]>;

const ROLE_FILTERS: Array<{
  key: RoleFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "all", label: "All", icon: UsersIcon },
  { key: "project_owner", label: "Owners", icon: House },
  { key: "builder", label: "Builders", icon: Hammer },
  { key: "admin", label: "Admins", icon: ShieldCheck },
];

function parseRole(raw: string | undefined): RoleFilter {
  if (!raw) return "all";
  return ROLE_FILTERS.some((r) => r.key === raw) ? (raw as RoleFilter) : "all";
}

function parseStatus(raw: string | undefined): StatusFilter {
  const valid: StatusFilter[] = [
    "all",
    "pending_verification",
    "active",
    "suspended",
    "banned",
  ];
  return raw && valid.includes(raw as StatusFilter)
    ? (raw as StatusFilter)
    : "all";
}

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/owner");

  const sp = await props.searchParams;
  const role = parseRole(sp.role);
  const status = parseStatus(sp.status);
  const q = (sp.q ?? "").trim();

  const users = await listUsers({
    role,
    status,
    search: q.length > 0 ? q : undefined,
    limit: 200,
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin · users"
        title="Users"
        description="Every account on the platform. Suspend or ban from here — admin accounts are protected. The builder column links into the full review surface."
      />

      <div className="px-4 sm:px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-6">
        {/* ── Filters ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5">
            {ROLE_FILTERS.map((f) => {
              const Icon = f.icon;
              const active = f.key === role;
              const params = new URLSearchParams();
              if (f.key !== "all") params.set("role", f.key);
              if (status !== "all") params.set("status", status);
              if (q) params.set("q", q);
              const href =
                params.toString().length > 0
                  ? `/admin/users?${params.toString()}`
                  : "/admin/users";
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
            action="/admin/users"
            method="get"
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-[480px]"
          >
            {role !== "all" ? (
              <input type="hidden" name="role" value={role} />
            ) : null}
            <Select
              name="status"
              defaultValue={status}
              className="h-10 sm:w-[180px] text-[12.5px]"
            >
              <option value="all">All statuses</option>
              <option value="pending_verification">Pending email</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint pointer-events-none" />
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name or email"
                className="pl-9 h-10 text-[12.5px]"
              />
            </div>
          </form>
        </div>

        {/* ── Table ────────────────────────────────────────────────── */}
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="size-4" />}
            title="No users match"
            description={
              q.length > 0
                ? `Nothing matched "${q}". Try adjusting filters.`
                : "No accounts in this view yet."
            }
          />
        ) : (
          <div className="rounded-md border border-border-subtle overflow-hidden bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))]">
            <div className="hidden lg:grid grid-cols-[2.2fr_1fr_1.2fr_1fr_1.6fr] gap-4 px-6 py-3 bg-[rgba(255,255,255,0.018)] border-b border-border-subtle text-[9.5px] tracking-[0.16em] uppercase text-text-dim">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Joined</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-border-subtle">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr_1.2fr_1fr_1.6fr] gap-3 lg:gap-4 px-4 sm:px-6 py-4 items-start lg:items-center"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {u.role === "builder" ? (
                      <Link
                        href={`/admin/builders/${u.id}`}
                        className="font-ui text-[13.5px] text-text truncate hover:text-accent transition-colors"
                      >
                        {u.name ?? u.email}
                      </Link>
                    ) : (
                      <span className="font-ui text-[13.5px] text-text truncate">
                        {u.name ?? u.email}
                      </span>
                    )}
                    <span className="text-[12px] text-text-dim truncate">
                      {u.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap lg:block">
                    <RoleBadge role={u.role} />
                    <span className="lg:hidden">
                      <UserStatusBadge status={u.status} />
                    </span>
                    <span className="lg:hidden text-[11.5px] text-text-dim tabular-nums">
                      {u.createdAt.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="hidden lg:block">
                    <UserStatusBadge status={u.status} />
                  </div>
                  <div className="hidden lg:block text-[12px] text-text-dim tabular-nums">
                    {u.createdAt.toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="lg:justify-self-end">
                    <UserAccountActions
                      userId={u.id}
                      status={u.status}
                      role={u.role}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 sm:px-6 py-3 border-t border-border-subtle text-[11px] text-text-dim">
              {users.length} user{users.length === 1 ? "" : "s"}
              {users.length === 200 ? " (max page size)" : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
