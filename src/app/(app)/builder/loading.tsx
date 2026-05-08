import { ProjectGridSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed fallback for /builder dashboard. Mirrors the hero +
 * FBA + KPI + suggested-grid rhythm so the user sees a skeleton of
 * the exact eventual layout while the server hydrates.
 */
export default function Loading() {
  return (
    <div>
      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="px-6 lg:px-10 pt-16 lg:pt-20 pb-14 lg:pb-16">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center gap-4">
            <Skeleton className="h-3 w-[100px] rounded-sm" />
            <Skeleton className="h-12 w-[420px] rounded-sm" />
            <Skeleton className="h-3.5 w-[320px] rounded-sm" />
            <div className="flex items-center gap-3 mt-4">
              <Skeleton className="h-12 w-[180px] rounded-full" />
              <Skeleton className="h-12 w-[110px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 lg:px-10 py-10 lg:py-14 flex flex-col gap-10">
        {/* FBA panel */}
        <section>
          <Skeleton className="h-3 w-[90px] rounded-sm mb-5" />
          <Skeleton className="h-[180px] w-full rounded-md" />
        </section>

        {/* KPIs */}
        <section>
          <Skeleton className="h-3 w-[70px] rounded-sm mb-5" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-[110px] w-full rounded-md" />
            <Skeleton className="h-[110px] w-full rounded-md" />
            <Skeleton className="h-[110px] w-full rounded-md" />
            <Skeleton className="h-[110px] w-full rounded-md" />
          </div>
        </section>

        {/* Suggested grid */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-[140px] rounded-sm" />
              <Skeleton className="h-3 w-[200px] rounded-sm" />
            </div>
            <Skeleton className="h-3 w-[60px] rounded-sm" />
          </div>
          <ProjectGridSkeleton count={6} />
        </section>
      </div>
    </div>
  );
}
