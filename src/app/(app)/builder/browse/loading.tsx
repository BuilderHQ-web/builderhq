import { ProjectGridSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed fallback for /builder/browse. The route does a marketplace
 * filter query that can be slow on cold starts; users see an exact
 * skeleton of the eventual layout instead of a blank pane.
 */
export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14 max-w-[1400px] mx-auto">
      {/* Header bones */}
      <div className="flex items-end justify-between gap-4 mb-6 sm:mb-7">
        <div className="flex flex-col gap-3 min-w-0">
          <Skeleton className="h-3 w-[80px] rounded-sm" />
          <Skeleton className="h-9 w-full max-w-[260px] rounded-sm" />
          <Skeleton className="h-3.5 w-full max-w-[440px] rounded-sm" />
        </div>
        <Skeleton className="h-9 w-[140px] rounded-full shrink-0" />
      </div>

      {/* Section tabs row */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <Skeleton className="h-9 w-[120px] rounded-full" />
        <Skeleton className="h-9 w-[100px] rounded-full" />
        <Skeleton className="h-9 w-[110px] rounded-full" />
      </div>

      {/* Filter bar */}
      <Skeleton className="h-12 w-full rounded-md mb-6 sm:mb-7" />

      {/* Result grid */}
      <ProjectGridSkeleton count={6} />
    </div>
  );
}
