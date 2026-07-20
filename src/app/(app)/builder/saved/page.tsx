import { redirect } from "next/navigation";
import { Bookmark, Compass } from "lucide-react";

import { auth } from "@/modules/auth";
import { listByIds } from "@/modules/projects";
import {
  listMySavedProjectIds,
  listMyUnlockedProjectIds,
  countMyUnlocks,
  countMySaved,
} from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { ProjectCard } from "@/components/builder/project-card";
import { BuilderSectionTabs } from "@/components/builder/section-tabs";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";

export const metadata = { title: "Saved projects" };

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/saved");
  const userId = session.user.id!;

  const [savedIds, unlockedIds, savedCount, unlockedCount, fbaStatus] =
    await Promise.all([
      listMySavedProjectIds(userId),
      listMyUnlockedProjectIds(userId),
      countMySaved(userId),
      countMyUnlocks(userId),
      getFbaStatus(userId),
    ]);
  const fetched = await listByIds(savedIds);
  // listByIds orders by publish date; restore save-recency order.
  const orderIndex = new Map(savedIds.map((id, i) => [id, i]));
  const projects = [...fetched].sort(
    (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
  );
  const unlockedSet = new Set(unlockedIds);
  const fbaActive = fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-7">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <Bookmark className="size-3.5" />
              Saved
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[44px] leading-[0.95] text-text">
              Your saved projects
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {projects.length} bookmarked for a closer look.
            </p>
          </div>
        </div>

        <div className="mb-6 sm:mb-7 flex flex-wrap items-center gap-3">
          <BuilderSectionTabs
            counts={{ saved: savedCount, unlocked: unlockedCount }}
          />
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="size-5" />}
            title="Nothing saved yet"
            description="Bookmark any open round to keep it here while you weigh it up."
            primary={{ label: "Browse projects", href: "/builder/browse" }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3">
            {projects.map((p, i) => (
              <Reveal
                key={p.id}
                immediate
                delay={Math.min(i * 0.04, 0.2)}
                className="h-full"
              >
                <ProjectCard
                  project={p}
                  isSaved={true}
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
