import { Skeleton } from "@/components/ui/skeleton";

/** Streamed fallback for /owner dashboard. */
export default function Loading() {
  return (
    <div>
      <section className="border-b border-border-subtle">
        <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-9 lg:py-12 flex items-end justify-between gap-4 sm:gap-6">
          <div className="flex flex-col gap-3 min-w-0">
            <Skeleton className="h-3 w-[80px] rounded-sm" />
            <Skeleton className="h-12 w-full max-w-[400px] rounded-sm" />
            <Skeleton className="h-3.5 w-full max-w-[460px] rounded-sm" />
          </div>
          <Skeleton className="h-10 w-[140px] rounded-full shrink-0" />
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14 flex flex-col gap-8 sm:gap-10">
        <section>
          <Skeleton className="h-3 w-[90px] rounded-sm mb-5" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-[110px] rounded-md" />
            <Skeleton className="h-[110px] rounded-md" />
            <Skeleton className="h-[110px] rounded-md" />
            <Skeleton className="h-[110px] rounded-md" />
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="lg:col-span-2 h-[280px] rounded-md" />
          <Skeleton className="h-[280px] rounded-md" />
        </section>
      </div>
    </div>
  );
}
