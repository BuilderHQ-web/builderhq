import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Compass } from "lucide-react";

import { auth } from "@/modules/auth";
import { listByIds } from "@/modules/projects";
import {
  listMySavedProjectIds,
  listMyUnlockedProjectIds,
} from "@/modules/unlocks";
import { ProjectCard } from "@/components/builder/project-card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Saved projects" };

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/saved");
  const userId = session.user.id!;

  const [savedIds, unlockedIds] = await Promise.all([
    listMySavedProjectIds(userId),
    listMyUnlockedProjectIds(userId),
  ]);
  const projects = await listByIds(savedIds);
  const unlockedSet = new Set(unlockedIds);

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

        {projects.length === 0 ? (
          <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-16 text-center">
            <Bookmark className="mx-auto size-6 text-text-dim mb-3" />
            <h3 className="text-[15px] font-semibold text-text">
              Nothing saved yet
            </h3>
            <p className="mt-1 text-[12.5px] text-text-dim mx-auto max-w-[44ch]">
              Click the bookmark icon on any project to save it for later.
              Saved projects sit here so you can compare without committing.
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
                isSaved={true}
                isUnlocked={unlockedSet.has(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
