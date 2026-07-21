"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Bookmark, Unlock, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Three-tab strip used at the top of /builder/browse, /builder/saved
 * and /builder/unlocked so the builder can switch between the lists
 * without going back to the sidebar. Counts are optional — pass them
 * when the parent already has them (browse doesn't, dashboard does).
 */
type TabId = "browse" | "saved" | "unlocked";

const TABS: Array<{
  id: TabId;
  label: string;
  href: string;
  Icon: LucideIcon;
}> = [
  { id: "browse", label: "Browse", href: "/builder/browse", Icon: Compass },
  { id: "saved", label: "Saved", href: "/builder/saved", Icon: Bookmark },
  { id: "unlocked", label: "Unlocked", href: "/builder/unlocked", Icon: Unlock },
];

export function BuilderSectionTabs({
  counts,
}: {
  counts?: Partial<Record<TabId, number>>;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1.5 w-fit">
      {TABS.map((t) => {
        const isActive =
          t.href === "/builder/browse"
            ? pathname.startsWith(t.href)
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        const count = counts?.[t.id];
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] tracking-[0.04em] transition-colors",
              isActive
                ? "bg-accent-muted/60 border border-border-accent text-accent-light"
                : "border border-transparent text-text-muted hover:text-text hover:bg-[rgba(24,34,44,0.04)]",
            )}
          >
            <t.Icon className="size-3.5" />
            {t.label}
            {typeof count === "number" ? (
              <span
                className={cn(
                  "tabular-nums text-[10.5px] font-mono",
                  isActive ? "text-accent-light" : "text-text-dim",
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
