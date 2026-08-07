import { redirect } from "next/navigation";
import { Unlock as UnlockIcon } from "lucide-react";

import { auth } from "@/modules/auth";
import { listByIds } from "@/modules/projects";
import {
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
  countMyUnlocks,
  countMySaved,
} from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { packStatsForProjects } from "@/modules/scope-engine";
import { listAcceptedInvitesForBuilder } from "@/modules/tenders";
import { ProjectCard } from "@/components/builder/project-card";
import { BuilderSectionTabs } from "@/components/builder/section-tabs";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";

export const metadata = { title: "Unlocked projects" };

export default async function UnlockedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/unlocked");
  const userId = session.user.id!;

  const [unlockedIds, savedIds, unlockedCount, savedCount, fbaStatus] =
    await Promise.all([
      listMyUnlockedProjectIds(userId),
      listMySavedProjectIds(userId),
      countMyUnlocks(userId),
      countMySaved(userId),
      getFbaStatus(userId),
    ]);
  const fetched = await listByIds(unlockedIds);
  // listByIds orders by publish date; restore unlock-recency order.
  const orderIndex = new Map(unlockedIds.map((id, i) => [id, i]));
  const projects = [...fetched].sort(
    (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
  );
  const savedSet = new Set(savedIds);
  const fbaActive = fbaStatus.active && fbaStatus.remainingThisCycle > 0;
  // The trust line travels with the card wherever it renders.
  const [packStats, acceptedInvites] = await Promise.all([
    packStatsForProjects(projects.map((p) => p.id)),
    listAcceptedInvitesForBuilder(userId),
  ]);
  const invitedProjectIds = new Set(acceptedInvites.map((a) => a.projectId));

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-7">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
              <UnlockIcon className="size-3.5" />
              Unlocked
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[44px] leading-[0.95] text-text">
              Your unlocked projects
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {projects.length} project{projects.length === 1 ? "" : "s"} unlocked.
              Full address, owner contact, and document downloads.
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
            icon={<UnlockIcon className="size-5" />}
            title="No unlocks yet"
            description="Every project you hold a spot on appears here with full access: the address, the contact, and the documents."
            primary={{ label: "Browse projects", href: "/builder/browse" }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((p, i) => (
              <Reveal key={p.id} immediate delay={Math.min(i * 0.04, 0.2)}>
                <ProjectCard
                  project={p}
                  isSaved={savedSet.has(p.id)}
                  isUnlocked={true}
                  fbaActive={fbaActive}
                  packStats={packStats[p.id] ?? null}
                  invited={invitedProjectIds.has(p.id)}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
