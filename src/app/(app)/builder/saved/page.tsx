import Link from "next/link";
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
import { FbaQuotaPill } from "@/components/builder/fba-quota-pill";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";
import { cn } from "@/lib/utils";

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
  const projects = await listByIds(savedIds);
  const unlockedSet = new Set(unlockedIds);
  const fbaActive = fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <Bookmark className="size-3.5" />
              Saved
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[36px] sm:text-[44px] leading-[0.95] text-text">
              Your saved projects
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {projects.length} bookmarked. Save the ones you&apos;re weighing
              up — unlock when you&apos;re ready to commit.
            </p>
          </div>
        </div>

        <div className="mb-7 flex flex-wrap items-center gap-3">
          <BuilderSectionTabs
            counts={{ saved: savedCount, unlocked: unlockedCount }}
          />
          <FbaQuotaPill status={fbaStatus} />
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="size-5" />}
            title="Nothing saved yet"
            description="Click the bookmark icon on any project to keep it here. Saved projects sit close so you can compare without committing."
            primary={{ label: "Browse projects", href: "/builder/browse" }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p, i) => (
              <Reveal key={p.id} immediate delay={Math.min(i * 0.04, 0.2)}>
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
