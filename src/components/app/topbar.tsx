"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Settings, User as UserIcon, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";

import { signOutAction } from "@/app/(app)/_actions/sign-out";

interface TopbarProps {
  user: {
    id: string;
    name: string | null;
    email: string | null | undefined;
    image: string | null | undefined;
    role: "project_owner" | "builder" | "admin" | null;
  };
}

const roleLabel: Record<NonNullable<TopbarProps["user"]["role"]>, string> = {
  project_owner: "Owner",
  builder: "Builder",
  admin: "Admin",
};

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const crumbs = pathToCrumbs(pathname);
  const initials = (user.name ?? user.email ?? "U")
    .split(/\s+|@/)
    .map((s) => s.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border-subtle bg-bg/80 backdrop-blur-xl">
      <div className="h-full flex items-center justify-between px-5 lg:px-6 gap-4">
        {/* Mobile: brand. Desktop: breadcrumbs. */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="lg:hidden">
            <Logo size={20} />
          </div>
          <Breadcrumbs crumbs={crumbs} />
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger — Cmd+K palette ships in Phase 2; for now just visual */}
          <button
            type="button"
            className={cn(
              "hidden md:inline-flex items-center gap-2.5 rounded-tight border border-border-subtle bg-surface-1 px-2.5 py-1.5",
              "text-[12px] text-text-faint",
              "hover:border-border-strong hover:text-text-muted",
              "transition-colors duration-[120ms] ease-[var(--ease-out)]",
            )}
            aria-label="Search (coming soon)"
            disabled
          >
            <Search className="size-3.5" />
            <span className="font-ui">Search</span>
            <span className="font-mono text-[10px] tracking-[0.04em] text-text-dim">⌘K</span>
          </button>

          {/* Account chip */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "group flex items-center gap-2 rounded-tight border border-transparent px-1.5 py-1",
                "hover:border-border-subtle hover:bg-surface-1",
                "data-[state=open]:border-border-subtle data-[state=open]:bg-surface-1",
                "transition-colors duration-[120ms] ease-[var(--ease-out)]",
                "focus:outline-none focus-visible:ring-focus",
              )}
              aria-label="Account menu"
            >
              <Avatar>
                <AvatarFallback>{initials || "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-[12px] font-medium text-text truncate max-w-[140px]">
                  {user.name ?? user.email ?? "Account"}
                </span>
                {user.role ? (
                  <span className="text-[10px] tracking-[0.12em] uppercase text-text-dim">
                    {roleLabel[user.role]}
                  </span>
                ) : null}
              </div>
              <ChevronDown className="size-3.5 text-text-faint group-data-[state=open]:rotate-180 transition-transform duration-[160ms]" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[240px]">
              <DropdownMenuLabel>
                <span className="block normal-case tracking-normal text-[11px] text-text-muted">
                  Signed in as
                </span>
                <span className="block text-[13px] text-text font-medium tracking-normal normal-case truncate">
                  {user.email ?? "—"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <UserIcon />
                Profile
                <DropdownMenuShortcut>Soon</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer w-full">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOutAction}>
                <DropdownMenuItem asChild destructive>
                  <button type="submit" className="w-full text-left cursor-pointer">
                    <LogOut />
                    Log out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: { label: string; href: string }[] }) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-[12px] tracking-[-0.005em] min-w-0">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href} className="flex items-center gap-2 min-w-0">
            {i > 0 ? <span aria-hidden className="text-text-dim">/</span> : null}
            <span
              className={cn(
                "truncate",
                last ? "text-text" : "text-text-muted",
              )}
            >
              {c.label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

const labelMap: Record<string, string> = {
  owner: "Owner",
  builder: "Builder",
  admin: "Admin",
  projects: "Projects",
  tenders: "Tenders",
  messages: "Messages",
  settings: "Settings",
  browse: "Browse projects",
  unlocked: "Unlocked",
  access: "Founding access",
  profile: "Profile",
  users: "Users",
  builders: "Builders",
  owners: "Owners",
  payments: "Payments",
  audit: "Audit log",
};

function pathToCrumbs(pathname: string): { label: string; href: string }[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [];
  const out: { label: string; href: string }[] = [];
  let acc = "";
  for (const s of segs) {
    acc += "/" + s;
    out.push({ label: labelMap[s] ?? humanise(s), href: acc });
  }
  return out;
}

function humanise(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
