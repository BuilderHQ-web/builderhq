/**
 * Composite skeletons matching the actual content shape.
 *
 * Loading states feel cheap when they show "Loading…" or a spinner —
 * skeletons that match the eventual layout's exact shape and rhythm
 * make the wait feel purposeful. Primitive Skeleton (in
 * `components/ui/skeleton.tsx`) gives us the shimmering surface; this
 * file composes it into the full card outlines for the major list
 * views.
 *
 * Each skeleton is a server component (no "use client") so it can
 * render synchronously inside React's <Suspense> fallbacks.
 */

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ── Project card grid (browse, dashboards, saved, unlocked) ────────────

export function ProjectCardSkeleton() {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-md border border-border-subtle overflow-hidden",
        "bg-surface-1 card-elev",
      )}
    >
      {/* Cover band — matches the type-icon hero strip */}
      <div className="relative h-[140px] bg-[rgba(24,34,44,0.03)] overflow-hidden">
        <Skeleton className="absolute top-3 left-3 h-5 w-[110px] rounded-sm" />
        <Skeleton className="absolute top-3 right-3 size-7 rounded-md" />
      </div>
      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-[70%] rounded-sm" />
        <Skeleton className="h-3.5 w-[45%] rounded-sm" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-3.5 w-12 rounded-sm" />
          <Skeleton className="h-3.5 w-12 rounded-sm" />
          <Skeleton className="h-3.5 w-12 rounded-sm" />
        </div>
        <div className="pt-3 mt-1 border-t border-border-subtle/60 flex items-center justify-between">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-7 w-[88px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Conversation list rows (messaging inbox) ───────────────────────────

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-stretch gap-3 px-4 py-3.5 border-b border-border-subtle/40">
      <span className="w-[3px]" />
      <Skeleton className="size-9 rounded-full shrink-0" />
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-[55%] rounded-sm" />
          <Skeleton className="h-2.5 w-8 rounded-sm" />
        </div>
        <Skeleton className="h-3 w-[80%] rounded-sm" />
        <Skeleton className="h-2.5 w-[40%] rounded-sm mt-0.5" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Tender row (builder tenders, owner tenders) ────────────────────────

export function TenderRowSkeleton() {
  return (
    <div
      className={cn(
        "rounded-md border border-border-subtle px-5 py-4",
        "bg-surface-2",
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 rounded-md shrink-0" />
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-[45%] rounded-sm" />
          <Skeleton className="h-3 w-[28%] rounded-sm" />
        </div>
        <Skeleton className="h-6 w-20 rounded-sm shrink-0" />
        <Skeleton className="h-7 w-24 rounded-full shrink-0" />
      </div>
    </div>
  );
}

export function TenderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <TenderRowSkeleton key={i} />
      ))}
    </div>
  );
}
