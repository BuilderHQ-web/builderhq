"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folders,
  FileSpreadsheet,
  MessageSquare,
  Settings,
  Compass,
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

type Role = "project_owner" | "builder" | "admin";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Phase the route ships in. Items without it are live now. */
  soon?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const ownerNav: NavSection[] = [
  {
    items: [
      { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
      { href: "/owner/projects", label: "Projects", icon: Folders, soon: "Phase 2" },
      { href: "/owner/tenders", label: "Tenders", icon: FileSpreadsheet, soon: "Phase 3" },
      { href: "/owner/messages", label: "Messages", icon: MessageSquare, soon: "Phase 3" },
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
      { href: "/builder/tenders", label: "My tenders", icon: FileSpreadsheet, soon: "Phase 3" },
      { href: "/builder/messages", label: "Messages", icon: MessageSquare, soon: "Phase 3" },
    ],
  },
  {
    title: "Builder",
    items: [
      { href: "/builder/access", label: "Founding access", icon: Sparkles, soon: "Phase 3" },
      { href: "/builder/profile", label: "Public profile", icon: Hammer, soon: "Phase 1" },
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
      { href: "/admin/users", label: "Users", icon: UsersIcon, soon: "Phase 4" },
      { href: "/admin/builders", label: "Builders", icon: Hammer, soon: "Phase 4" },
      { href: "/admin/owners", label: "Owners", icon: House, soon: "Phase 4" },
      { href: "/admin/projects", label: "Projects", icon: Folders, soon: "Phase 4" },
      { href: "/admin/tenders", label: "Tenders", icon: FileSpreadsheet, soon: "Phase 4" },
      { href: "/admin/payments", label: "Payments", icon: Receipt, soon: "Phase 4" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/audit", label: "Audit log", icon: ShieldCheck, soon: "Phase 4" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const navByRole: Record<Role, NavSection[]> = {
  project_owner: ownerNav,
  builder: builderNav,
  admin: adminNav,
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const sections = navByRole[role];

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border-subtle bg-bg-deep/40 sticky top-0 h-screen self-start">
      {/* Brand row — sits flush with the topbar height. */}
      <div className="flex items-center h-14 px-6">
        <Link href="/" aria-label="BuilderHQ home">
          <Logo size={20} />
        </Link>
      </div>

      {/* Nav body — generous breathing between sections. */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {sections.map((section, i) => (
          <div key={i} className={cn(i > 0 && "mt-7")}>
            {section.title ? (
              <div className="px-3 pb-2 text-[10px] font-medium tracking-[0.18em] uppercase text-text-dim">
                {section.title}
              </div>
            ) : null}
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={isActive(pathname, item.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
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
          active ? "text-accent" : "text-text-faint group-hover:text-text-muted",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {/* Phase tags hidden for now — they cluttered the sidebar. The
          "soon" metadata stays in the data so we can surface it later
          (e.g. inside the page itself, or as a tooltip on hover). */}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/owner" || href === "/builder" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}
