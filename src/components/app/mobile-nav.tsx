"use client";

/**
 * Mobile nav drawer — the touch-device counterpart to <Sidebar />.
 *
 * Rendered always (no `hidden lg:flex` gate) but only made visible
 * when the user taps the hamburger in <Topbar />. Communication is
 * via a `window`-level custom event ("builderhq:mobile-nav") so the
 * topbar trigger and the drawer don't have to share a React parent.
 *
 * Why a custom event and not Context: the trigger lives inside
 * <Topbar /> (already a client component) and the drawer is mounted
 * once at the (app) layout root. Wrapping both in a provider would
 * mean threading the role prop in two places. The event keeps the
 * coupling loose.
 *
 * Mirrors the sidebar's nav shape exactly — same sections, same
 * badge wiring — so users get a consistent IA whether they're on a
 * phone or a laptop.
 */

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
  ShieldCheck,
  Users as UsersIcon,
  Receipt,
  Sparkles,
  Hammer,
  House,
  ClipboardList,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { countMyUnreadMessagesAction } from "@/app/(app)/_actions/messaging";
import { signOutAction } from "@/app/(app)/_actions/sign-out";

type Role = "project_owner" | "builder" | "admin" | "architect";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: string;
  badgeKey?: "messages";
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
  architect: architectNav,
  admin: adminNav,
};

interface MobileNavProps {
  role: Role;
  initialUnreadMessages?: number;
}

/** Topbar imperatively opens us via this event name. */
export const MOBILE_NAV_OPEN_EVENT = "builderhq:mobile-nav";

/** Trigger from anywhere in the client tree. */
export function openMobileNav() {
  window.dispatchEvent(new Event(MOBILE_NAV_OPEN_EVENT));
}

const POLL_MS = 30_000;

export function MobileNav({ role, initialUnreadMessages = 0 }: MobileNavProps) {
  const pathname = usePathname();
  const sections = navByRole[role];
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnreadMessages);

  // Subscribe to the open-event so the topbar can poke us without a
  // shared parent component.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(MOBILE_NAV_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(MOBILE_NAV_OPEN_EVENT, onOpen);
  }, []);

  // Soft-poll the unread-messages count so the badge stays current
  // while the drawer is closed. Same cadence as the desktop sidebar.
  useEffect(() => {
    const tick = async () => {
      const r = await countMyUnreadMessagesAction();
      if (r.ok) setUnread(r.value);
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Close on route change so navigating from a link inside the drawer
  // doesn't leave it stuck open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open — feels native, prevents background
  // accidental scrolling on iOS Safari.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc key closes the drawer — courtesy for tablet users with a
  // physical keyboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const badges = { messages: unread };

  return (
    <>
      {/* Backdrop — soft fade, click-to-close. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]",
          "transition-opacity duration-[180ms] ease-[var(--ease-out)]",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Drawer panel — slides in from the left. */}
      <aside
        aria-label="Site navigation"
        aria-hidden={!open}
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[284px] max-w-[86vw]",
          "flex flex-col border-r border-border-subtle bg-bg-deep",
          "transition-transform duration-[220ms] ease-[var(--ease-out)] will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          // Use safe-area inset so iOS notch doesn't crop the panel.
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Header — brand + close. Same 56px height as the topbar. */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-border-subtle">
          <Link
            href="/"
            aria-label="BuilderHQ home"
            onClick={() => setOpen(false)}
          >
            <Logo size={20} tone="dark" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className={cn(
              "inline-flex items-center justify-center size-9 rounded-full",
              "text-text-muted hover:text-text hover:bg-surface-1",
              "transition-colors duration-[120ms]",
              "focus:outline-none focus-visible:ring-focus",
            )}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable nav body. */}
        <nav
          data-lenis-prevent
          className="flex-1 overflow-y-auto py-4 px-3"
        >
          {sections.map((section, i) => (
            <div key={i} className={cn(i > 0 && "mt-6")}>
              {section.title ? (
                <div className="px-3 pb-2 text-[10px] font-medium tracking-[0.18em] uppercase text-text-dim">
                  {section.title}
                </div>
              ) : null}
              <ul className="flex flex-col gap-px">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <DrawerLink
                      item={item}
                      active={isActive(pathname, item.href)}
                      badge={item.badgeKey ? badges[item.badgeKey] : 0}
                      onNavigate={() => setOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer — sign out. Sticky at bottom of drawer. */}
        <div className="border-t border-border-subtle p-3">
          <form action={signOutAction}>
            <button
              type="submit"
              className={cn(
                "w-full flex items-center gap-2.5 rounded-md px-3 py-2.5",
                "font-ui text-[13px] text-text-muted hover:text-text hover:bg-surface-1",
                "transition-colors duration-[120ms]",
              )}
            >
              <LogOut className="size-4 shrink-0 text-text-faint" />
              <span>Log out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function DrawerLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  // 44px+ tap target per HIG / Material guidance.
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-3",
        "font-ui text-[14px] tracking-[-0.005em]",
        "transition-[background,color] duration-[120ms] ease-[var(--ease-out)]",
        active
          ? "bg-surface-2 text-text"
          : "text-text-muted active:bg-surface-1 active:text-text",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-accent" : "text-text-faint",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon ? (
        <span className="text-[10px] tracking-[0.12em] uppercase text-text-dim font-medium">
          {item.soon}
        </span>
      ) : badge > 0 ? (
        <span
          className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums shadow-[0_0_8px_rgba(0,212,200,0.35)]"
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
