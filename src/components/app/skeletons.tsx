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

// ── Project register rows (browse, saved, unlocked) ────────────────────

export function ProjectRowSkeleton() {
  return (
    <div className="relative rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <div className="flex items-center gap-4 sm:gap-5 pl-4 sm:pl-5 pr-14 lg:pr-5 py-4">
        {/* type tile */}
        <Skeleton className="hidden sm:block size-11 rounded-lg shrink-0" />
        {/* identity */}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-[55%] rounded-sm" />
          <Skeleton className="h-3.5 w-[70%] rounded-sm" />
        </div>
        {/* spec figures */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-1.5",
                i === 3 ? "w-[76px]" : "w-[52px]",
              )}
            >
              <Skeleton className="h-4 w-6 rounded-sm" />
              <Skeleton className="h-2 w-9 rounded-sm" />
            </div>
          ))}
        </div>
        {/* round state */}
        <div className="hidden lg:flex flex-col items-end gap-1.5 w-[168px] shrink-0">
          <Skeleton className="h-3.5 w-[110px] rounded-sm" />
          <Skeleton className="h-3 w-[70px] rounded-sm" />
        </div>
        {/* save */}
        <Skeleton className="absolute top-3.5 right-3.5 lg:static size-8 rounded-md shrink-0" />
      </div>
      {/* below-lg footer strip */}
      <div className="lg:hidden border-t border-border-subtle/60 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        <Skeleton className="h-3.5 w-[45%] rounded-sm" />
        <Skeleton className="h-3.5 w-[90px] rounded-sm" />
      </div>
    </div>
  );
}

export function ProjectRegisterSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectRowSkeleton key={i} />
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
