import Link from "next/link";
import { redirect } from "next/navigation";
import { Unlock as UnlockIcon, Compass } from "lucide-react";

import { auth } from "@/modules/auth";
import { listByIds } from "@/modules/projects";
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
import { cn } from "@/lib/utils";

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
  const projects = await listByIds(unlockedIds);
  const savedSet = new Set(savedIds);
  const fbaActive = fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <UnlockIcon className="size-3.5" />
              Unlocked
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[36px] sm:text-[44px] leading-[0.95] text-text">
              Your unlocked projects
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {projects.length} project{projects.length === 1 ? "" : "s"} unlocked.
              Full address, owner contact, and document downloads.
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
          <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-16 text-center">
            <UnlockIcon className="mx-auto size-6 text-text-dim mb-3" />
            <h3 className="text-[15px] font-semibold text-text">
              No unlocks yet
            </h3>
            <p className="mt-1 text-[12.5px] text-text-dim mx-auto max-w-[44ch]">
              When you unlock a project, it appears here with full access — exact
              address, owner contact, and downloadable documents.
            </p>
            <Link
              href="/builder/browse"
              className={cn(
                "mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-full",
                "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
              )}
            >
              <Compass className="size-3.5" />
              Browse projects
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isSaved={savedSet.has(p.id)}
                isUnlocked={true}
                fbaActive={fbaActive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
