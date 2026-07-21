import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed fallback for /builder dashboard. Mirrors the desk layout —
 * masthead (identity + ledger), then the two-column working area
 * (desk queue + open rounds left, rail cards right) — so the swap to
 * live content lands without a layout jump.
 */
export default function Loading() {
  return (
    <div>
      {/* Masthead band */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-bg-deep/30">
        <div className="px-4 sm:px-6 lg:px-10 py-7 sm:py-9">
          <div className="mx-auto max-w-[1200px] flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
            <div className="min-w-0 flex flex-col gap-3">
              <Skeleton className="h-3 w-[170px] rounded-sm" />
              <Skeleton className="h-10 w-[320px] max-w-full rounded-sm" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-[130px] rounded-full" />
                <Skeleton className="h-7 w-[100px] rounded-full" />
                <Skeleton className="h-7 w-[110px] rounded-full" />
              </div>
            </div>
            {/* the ledger */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle w-full lg:w-auto lg:shrink-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-bg-raised px-3 sm:px-5 py-3.5 min-w-0 lg:min-w-[118px] flex flex-col gap-2"
                >
                  <Skeleton className="h-2.5 w-[70px] rounded-sm" />
                  <Skeleton className="h-6 w-10 rounded-sm" />
                  <Skeleton className="h-2.5 w-[60px] rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Working area */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
          {/* left column */}
          <div className="space-y-6 min-w-0">
            {[4, 3].map((rows, s) => (
              <section
                key={s}
                className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-4 border-b border-border-subtle/60 flex flex-col gap-2">
                  <Skeleton className="h-3 w-[110px] rounded-sm" />
                  <Skeleton className="h-5 w-[220px] rounded-sm" />
                  <Skeleton className="h-3 w-[280px] max-w-full rounded-sm" />
                </div>
                <div className="divide-y divide-border-subtle/50">
                  {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3.5 px-4 sm:px-6 py-3.5">
                      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-[55%] rounded-sm" />
                        <Skeleton className="h-3 w-[75%] rounded-sm" />
                      </div>
                      <Skeleton className="h-3.5 w-12 rounded-sm shrink-0" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* right rail */}
          <div className="space-y-6 min-w-0">
            {[3, 2].map((rows, s) => (
              <section
                key={s}
                className="rounded-xl border border-border-subtle bg-bg-raised p-4 flex flex-col gap-3"
              >
                <Skeleton className="h-3 w-[110px] rounded-sm" />
                {Array.from({ length: rows }).map((_, i) => (
                  <Skeleton key={i} className="h-3.5 w-full rounded-sm" />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
