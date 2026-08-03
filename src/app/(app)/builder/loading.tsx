import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed fallback for /builder dashboard. Mirrors the hybrid desk —
 * centered greeting hero with CTAs and the hairline stat strip, then
 * the two-column working area (toned desk panel + canvas sections
 * left, rail groups right) — so the swap to live content lands
 * without a layout jump.
 */
export default function Loading() {
  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-9 sm:pb-11">
          <div className="mx-auto max-w-[860px] flex flex-col items-center gap-5">
            <Skeleton className="h-3 w-[120px] rounded-sm" />
            <Skeleton className="h-14 w-full max-w-[380px] rounded-sm" />
            <Skeleton className="h-3.5 w-full max-w-[300px] rounded-sm" />
            <div className="mt-2 flex items-center gap-3">
              <Skeleton className="h-12 w-[190px] rounded-full" />
              <Skeleton className="h-11 w-[110px] rounded-full" />
              <Skeleton className="h-11 w-[100px] rounded-full" />
            </div>
            <div className="mt-4 flex items-center gap-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-2.5 w-[70px] rounded-sm" />
                  <Skeleton className="h-6 w-12 rounded-sm" />
                  <Skeleton className="h-2.5 w-[60px] rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* working area */}
      <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-x-10 gap-y-10">
          {/* left column */}
          <div className="min-w-0 flex flex-col gap-10">
            {/* desk panel */}
            <div className="rounded-xl border border-border-subtle p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <Skeleton className="size-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-3 w-[100px] rounded-sm" />
                  <Skeleton className="h-5 w-[260px] max-w-full rounded-sm" />
                  <Skeleton className="h-3 w-[220px] max-w-full rounded-sm" />
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[62px] w-full rounded-lg" />
                ))}
              </div>
            </div>
            {/* register section */}
            <div>
              <div className="flex items-start gap-3.5">
                <Skeleton className="size-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-3 w-[90px] rounded-sm" />
                  <Skeleton className="h-5 w-[240px] max-w-full rounded-sm" />
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[58px] w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* rail */}
          <div className="min-w-0 flex flex-col gap-9">
            <Skeleton className="h-[130px] w-full rounded-xl" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="h-3 w-[110px] rounded-sm" />
                <Skeleton className="h-3.5 w-full rounded-sm" />
                <Skeleton className="h-3.5 w-[80%] rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
