"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folders,
  FileSpreadsheet,
  MessageSquare,
  Settings,
  Compass,
  Mail,
  ShieldCheck,
  Users as UsersIcon,
  Receipt,
  Sparkles,
  Hammer,
  House,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { countMyUnreadMessagesAction } from "@/app/(app)/_actions/messaging";

type Role = "project_owner" | "builder" | "admin" | "architect";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Phase the route ships in. Items without it are live now. */
  soon?: string;
  /** Render as a dimmed, non-clickable stub (feature being retired). */
  disabled?: boolean;
  /** Symbolic badge key — sidebar resolves to a live number. */
  badgeKey?: "messages" | "invitations";
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const ownerNav: NavSection[] = [
  {
    items: [
      { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
      { href: "/owner/projects", label: "Projects", icon: Folders },
      { href: "/owner/tenders", label: "Tenders", icon: FileSpreadsheet },
      { href: "/owner/messages", label: "Messages", icon: MessageSquare, badgeKey: "messages" },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const architectNav: NavSection[] = [
  {
    items: [
      { href: "/architect", label: "Dashboard", icon: LayoutDashboard },
      { href: "/architect/projects", label: "Tenders", icon: Folders },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const builderNav: NavSection[] = [
  {
    items: [
      { href: "/builder", label: "Dashboard", icon: LayoutDashboard },
      { href: "/builder/browse", label: "Browse projects", icon: Compass },
      { href: "/builder/saved", label: "Saved", icon: ClipboardList },
      { href: "/builder/unlocked", label: "Unlocked", icon: ShieldCheck },
      { href: "/builder/tenders", label: "My tenders", icon: FileSpreadsheet },
      { href: "/builder/messages", label: "Messages", icon: MessageSquare, badgeKey: "messages" },
    ],
  },
  {
    title: "Builder",
    items: [
      { href: "/builder/access", label: "Founding access", icon: Sparkles },
      { href: "/builder/profile", label: "Public profile", icon: Hammer },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const adminNav: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/builders", label: "Builders", icon: Hammer },
      { href: "/admin/owners", label: "Owners", icon: House, soon: "Later" },
      { href: "/admin/projects", label: "Projects", icon: Folders, soon: "Later" },
      { href: "/admin/tenders", label: "Tenders", icon: FileSpreadsheet, soon: "Later" },
      { href: "/admin/payments", label: "Payments", icon: Receipt, soon: "Later" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/audit", label: "Audit log", icon: ShieldCheck, soon: "Later" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const navByRole: Record<Role, NavSection[]> = {
  project_owner: ownerNav,
  builder: builderNav,
  admin: adminNav,
  architect: architectNav,
};

/**
 * The Invitations tab is earned, not standard furniture: it appears
 * only once a builder has ever been invited to a round, and then
 * stays (an empty invitations page is still their record). Injected
 * after "My tenders" so the section reads browse → hold → tender →
 * invited → talk.
 */
export function withInvitationsTab(
  sections: NavSection[],
  role: Role,
  totalInvites: number,
): NavSection[] {
  if (role !== "builder" || totalInvites <= 0) return sections;
  return sections.map((section, i) => {
    if (i !== 0) return section;
    const items = [...section.items];
    const at = items.findIndex((it) => it.href === "/builder/messages");
    items.splice(at === -1 ? items.length : at, 0, {
      href: "/builder/invitations",
      label: "Invitations",
      icon: Mail,
      badgeKey: "invitations",
    });
    return { ...section, items };
  });
}

interface SidebarProps {
  role: Role;
  /** Server-rendered unread message count so the badge is correct
   *  on first paint. The component soft-polls from there. */
  initialUnreadMessages?: number;
  /** Builder invitation tallies. The Invitations tab exists once a
   *  builder has EVER been invited (total > 0); the badge shows the
   *  pending count. Server-rendered, not polled — a new invitation
   *  lands with an email, so freshness-on-navigation is enough. */
  invitations?: { total: number; pending: number };
  /** Builder holds an active Founding Builder Access grant. FBA is being
   *  retired: the "Founding access" link stays live for grant-holders and
   *  is a dimmed stub for everyone else (new builders never had it). */
  fbaActive?: boolean;
}

const SIDEBAR_POLL_MS = 30_000;

export function Sidebar({
  role,
  initialUnreadMessages = 0,
  fbaActive = false,
  invitations = { total: 0, pending: 0 },
}: SidebarProps) {
  const pathname = usePathname();
  const sections = withInvitationsTab(navByRole[role], role, invitations.total);

  // Live message-unread count — initialised from server, polled gently.
  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages);
  useEffect(() => {
    const tick = async () => {
      const r = await countMyUnreadMessagesAction();
      if (r.ok) setUnreadMessages(r.value);
    };
    const id = setInterval(tick, SIDEBAR_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const badges: Record<NonNullable<NavItem["badgeKey"]>, number> = {
    messages: unreadMessages,
    invitations: invitations.pending,
  };

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border-subtle bg-bg-deep/40 sticky top-0 h-screen self-start">
      {/* Brand row — sits flush with the topbar height. */}
      <div className="flex items-center h-14 px-6">
        <Link href="/" aria-label="BuilderHQ home">
          <Logo size={20} tone="dark" />
        </Link>
      </div>

      {/* Nav body — generous breathing between sections. */}
      <nav
        data-lenis-prevent
        className="flex-1 overflow-y-auto py-4 px-3"
      >
        {sections.map((section, i) => (
          <div key={i} className={cn(i > 0 && "mt-7")}>
            {section.title ? (
              <div className="px-3 pb-2 text-[10px] font-medium tracking-[0.18em] uppercase text-text-dim">
                {section.title}
              </div>
            ) : null}
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => {
                // "Founding access" is being retired: live for builders who
                // still hold an active grant, a dimmed stub for everyone else.
                const navItem =
                  item.href === "/builder/access"
                    ? { ...item, disabled: !fbaActive }
                    : item;
                return (
                  <li key={navItem.href}>
                    <NavLink
                      item={navItem}
                      active={isActive(pathname, navItem.href)}
                      badge={navItem.badgeKey ? badges[navItem.badgeKey] : 0}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
}) {
  const Icon = item.icon;
  if (item.disabled) {
    // Dimmed, non-interactive stub — feature being retired.
    return (
      <div
        aria-disabled="true"
        title="Founding access is winding down"
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md px-3 py-2",
          "font-ui text-[13px] tracking-[-0.005em] select-none cursor-not-allowed",
          "text-text-faint/55",
        )}
      >
        <Icon className="size-4 shrink-0 text-text-faint/45" />
        <span className="flex-1 truncate">{item.label}</span>
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-3 py-2",
        "font-ui text-[13px] tracking-[-0.005em]",
        "transition-[background,color] duration-[120ms] ease-[var(--ease-out)]",
        active
          ? "bg-surface-2 text-text"
          : "text-text-muted hover:bg-surface-1 hover:text-text",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-accent-light" : "text-text-faint group-hover:text-text-muted",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 ? (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums shadow-[0_0_8px_rgba(0,212,200,0.35)]"
          aria-label={`${badge} unread`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (
    href === "/owner" ||
    href === "/builder" ||
    href === "/admin" ||
    href === "/architect"
  ) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}
