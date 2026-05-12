import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, Filter, X } from "lucide-react";

import { auth } from "@/modules/auth";
import {
  listForMarketplace,
  type MarketplacePreview,
} from "@/modules/projects";
import {
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
  countMyUnlocks,
  countMySaved,
} from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { ProjectCard } from "@/components/builder/project-card";
import { BuilderSectionTabs } from "@/components/builder/section-tabs";
import { FbaQuotaPill } from "@/components/builder/fba-quota-pill";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata = { title: "Browse projects" };

const TYPE_OPTIONS: Array<{ id: MarketplacePreview["type"]; label: string }> = [
  { id: "single_dwelling", label: "Single dwelling" },
  { id: "multi_dwelling", label: "Multi-dwelling" },
  { id: "renovation", label: "Renovation" },
  { id: "extension", label: "Extension" },
];

const STATE_OPTIONS = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const BUDGET_OPTIONS: Array<{ id: NonNullable<MarketplacePreview["budgetBand"]>; label: string }> = [
  { id: "under_500k", label: "Under $500k" },
  { id: "500k_1m", label: "$500k–$1M" },
  { id: "1m_1_5m", label: "$1M–$1.5M" },
  { id: "1_5m_2m", label: "$1.5M–$2M" },
  { id: "2m_3m", label: "$2M–$3M" },
  { id: "3m_5m", label: "$3M–$5M" },
  { id: "over_5m", label: "Over $5M" },
];

type SearchParams = {
  q?: string;
  type?: string;
  state?: string;
  postcode?: string;
  budget?: string;
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/browse");

  const filters = parseFilters(params);
  const projects = await listForMarketplace(filters);

  const userId = session.user.id!;
  const [unlockedIds, savedIds, unlockedCount, savedCount, fbaStatus] =
    await Promise.all([
      listMyUnlockedProjectIds(userId),
      listMySavedProjectIds(userId),
      countMyUnlocks(userId),
      countMySaved(userId),
      getFbaStatus(userId),
    ]);
  const unlockedSet = new Set(unlockedIds);
  const savedSet = new Set(savedIds);
  const fbaActive = fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  const activeFilterCount =
    [filters.q, filters.type, filters.state, filters.postcode, filters.budgets?.[0]].filter(
      Boolean,
    ).length;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-7">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <Compass className="size-3.5" />
              Browse
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[44px] leading-[0.95] text-text">
              Find tender-ready work
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {projects.length} project{projects.length === 1 ? "" : "s"} live across Australia.
              {activeFilterCount > 0 ? ` ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied.` : ""}
            </p>
          </div>
        </div>

        {/* Section tabs — Browse / Saved / Unlocked + FBA quota pill */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <BuilderSectionTabs
            counts={{ saved: savedCount, unlocked: unlockedCount }}
          />
          <FbaQuotaPill status={fbaStatus} />
        </div>

        {/* Filter bar — server form, GET-style */}
        <FilterBar params={params} />

        {/* Results */}
        {projects.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<Filter className="size-5" />}
              title="No projects match"
              description="Try widening the filters, or jump back to all projects."
              primary={{ label: "Clear all filters", href: "/builder/browse" }}
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3">
            {projects.map((p, i) => (
              <Reveal
                key={p.id}
                immediate
                delay={Math.min(i * 0.04, 0.24)}
                className="h-full"
              >
                <ProjectCard
                  project={p}
                  isSaved={savedSet.has(p.id)}
                  isUnlocked={unlockedSet.has(p.id)}
                  fbaActive={fbaActive}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function parseFilters(params: SearchParams) {
  const out: Parameters<typeof listForMarketplace>[0] = {};
  if (params.q?.trim()) out.q = params.q.trim();
  if (params.type && TYPE_OPTIONS.some((t) => t.id === params.type)) {
    out.type = params.type as MarketplacePreview["type"];
  }
  if (params.state && (STATE_OPTIONS as readonly string[]).includes(params.state)) {
    out.state = params.state as (typeof STATE_OPTIONS)[number];
  }
  if (params.postcode && /^\d{4}$/.test(params.postcode)) {
    out.postcode = params.postcode;
  }
  if (params.budget && BUDGET_OPTIONS.some((b) => b.id === params.budget)) {
    out.budgets = [params.budget as NonNullable<MarketplacePreview["budgetBand"]>];
  }
  return out;
}

function FilterBar({ params }: { params: SearchParams }) {
  const hasAny = Boolean(
    params.q || params.type || params.state || params.postcode || params.budget,
  );
  return (
    <form
      method="get"
      className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] p-3 sm:p-4 lg:p-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_140px_120px_140px_180px_auto] gap-2.5">
        <Input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by title…"
          className="sm:col-span-2 lg:col-span-1"
        />
        <Select name="type" defaultValue={params.type ?? ""}>
          <option value="">Any type</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select name="state" defaultValue={params.state ?? ""}>
          <option value="">Any state</option>
          {STATE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input
          type="text"
          name="postcode"
          defaultValue={params.postcode ?? ""}
          inputMode="numeric"
          maxLength={4}
          placeholder="Postcode"
          className="font-mono tabular-nums"
        />
        <Select name="budget" defaultValue={params.budget ?? ""}>
          <option value="">Any budget</option>
          {BUDGET_OPTIONS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-md flex-1 lg:flex-initial",
              "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
              "hover:bg-accent-hover transition-colors duration-[140ms]",
              "active:scale-[0.985] active:duration-[80ms]",
              "shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_4px_14px_-6px_rgba(0,212,200,0.45)]",
            )}
          >
            Apply
          </button>
          {hasAny ? (
            <Link
              href="/builder/browse"
              className="inline-flex items-center justify-center gap-1 h-11 px-3 rounded-md border border-border-subtle text-[11px] text-text-dim hover:text-text hover:border-border transition-colors"
            >
              <X className="size-3" />
              Clear
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
