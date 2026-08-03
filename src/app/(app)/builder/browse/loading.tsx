import { ProjectRegisterSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed fallback for /builder/browse. The route does a marketplace
 * filter query that can be slow on cold starts; users see an exact
 * skeleton of the eventual layout (masthead, tab pill, filter bar,
 * register rows) instead of a blank pane.
 */
export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        {/* Header bones */}
        <div className="flex items-end justify-between gap-4 mb-6 sm:mb-7">
          <div className="flex flex-col gap-3 min-w-0">
            <Skeleton className="h-3 w-[80px] rounded-sm" />
            <Skeleton className="h-9 w-full max-w-[340px] rounded-sm" />
            <Skeleton className="h-3.5 w-full max-w-[240px] rounded-sm" />
          </div>
        </div>

        {/* Section tabs pill */}
        <div className="mb-5">
          <Skeleton className="h-12 w-[320px] max-w-full rounded-full" />
        </div>

        {/* Filter bar */}
        <Skeleton className="h-[76px] w-full rounded-md" />

        {/* The register */}
        <div className="mt-8">
          <ProjectRegisterSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
