import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, FileText, Files } from "lucide-react";

import { auth } from "@/modules/auth";
import { projectsBase } from "@/lib/dashboard-route";
import { getBuilderProfile } from "@/modules/profiles";
import { countUnlocksForProject } from "@/modules/unlocks";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ExampleRoundBanner } from "@/components/app/example-round-banner";
import { ExampleWalkthrough } from "@/components/app/example-walkthrough";
import { removeSampleAction } from "@/app/(app)/_actions/sample";
import { loadRound } from "./_lib/load-round";
import {
  TenderEvaluationSurface,
  type BuilderFacts,
} from "./evaluation-surface";

export const metadata = { title: "Tenders" };
export const dynamic = "force-dynamic";

export default async function ProjectTendersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}/tenders`);
  const base = projectsBase(session.user.role);
  const userId = session.user.id!;

  const r = await loadRound(userId, slug);
  if (!r.ok) {
    if (r.code === "not_found" || r.code === "forbidden") notFound();
    throw new Error(r.message);
  }
  const {
    project,
    access,
    sharedBy,
    preparedBy,
    tenders,
    analytics,
    summaries,
    round,
    schedule,
    addenda,
  } = r.value;
  const unlockCount = await countUnlocksForProject(project.id);
  const seatLine =
    access.kind === "participant"
      ? `Shared with you by ${sharedBy?.practiceName ?? sharedBy?.name ?? "the project runner"}. You hold a ${access.role === "decider" ? "Deciding" : "Following"} seat on this round.`
      : null;

  // Identity + compliance facts for "About the builders" — ABN,
  // licences, web presence, straight from the verified profiles.
  const uniqueBuilderIds = [...new Set(tenders.map((t) => t.builderId))];
  const bundles = await Promise.all(
    uniqueBuilderIds.map(async (id) => [id, await getBuilderProfile(id)] as const),
  );
  const bundleByBuilder = new Map(bundles);
  const builderFacts: Record<string, BuilderFacts | null> = {};
  for (const t of tenders) {
    const b = bundleByBuilder.get(t.builderId);
    builderFacts[t.id] = b
      ? {
          abn: b.profile.abn,
          suburb: b.profile.businessSuburb,
          state: b.profile.businessState,
          website: b.profile.website,
          linkedin: b.profile.linkedinUrl,
          instagram: b.profile.instagramUrl,
          licences: b.licences.map((l) => ({
            state: l.state,
            number: l.licenceNumber,
            type: l.licenceType,
            verified: l.verificationStatus === "verified",
          })),
        }
      : null;
  }

  const isSample = project.isSample === true;
  const role = base === "/architect" ? "architect" : "owner";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1400px]">
        <Link
          href={`${base}/projects/${project.slug}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4 sm:mb-5"
        >
          <ArrowLeft className="size-3.5" />
          Back to project
        </Link>

        {isSample ? (
          <>
            <ExampleRoundBanner removeAction={removeSampleAction} />
            <ExampleWalkthrough
              role={role}
              uploadHref={`${base}/projects/new`}
            />
          </>
        ) : null}

        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-7">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
              <Files className="size-3.5" />
              The tender evaluation
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[44px] leading-[0.95] text-text break-words">
              {project.title}
            </h1>
            <p className="mt-2 text-[13px] text-text-muted max-w-[58ch]">
              Every builder tendering here answered the same structured
              submission, under declaration. The analysis below is read
              entirely from what they disclosed. Nothing is estimated.
            </p>
            {preparedBy.practiceName ? (
              <p className="mt-2 text-[12px] tracking-[0.04em] text-text-dim">
                Prepared by{" "}
                <span className="text-text-muted font-medium">
                  {preparedBy.practiceName}
                </span>{" "}
                with BuilderHQ
              </p>
            ) : null}
            {seatLine ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-text-dim">
                <Eye className="size-3.5 text-accent-light" />
                {seatLine}
              </p>
            ) : null}
          </div>
        </div>

        {tenders.length === 0 ? (
          <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-1/40 px-6 py-14 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-56 rounded-full blur-3xl opacity-40"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,212,200,0.16), transparent 70%)",
              }}
            />
            <div className="relative">
              <span
                className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-border-accent text-accent-light"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,212,200,0.18), rgba(26,95,212,0.14))",
                }}
              >
                <FileText className="size-5" />
              </span>
              <h3 className="text-[16px] font-semibold text-text">
                {unlockCount > 0
                  ? "Tenders are on their way"
                  : "Your project is live"}
              </h3>
              <p className="mt-1.5 mx-auto max-w-[48ch] text-[13px] leading-[1.6] text-text-muted">
                {unlockCount > 0
                  ? `${unlockCount} builder${unlockCount === 1 ? "" : "s"} ${
                      unlockCount === 1 ? "has" : "have"
                    } unlocked your project and ${
                      unlockCount === 1 ? "is" : "are"
                    } preparing to tender. Priced tenders usually land within a few days — they'll appear here side-by-side.`
                  : "Verified builders are reviewing your project now. The first priced tenders usually arrive within 3–7 days of going live, and appear here for side-by-side comparison."}
              </p>
              <Link
                href={`${base}/projects/${project.slug}`}
                className={cn(
                  buttonVariants({ variant: "subtle", size: "md" }),
                  "mt-5 gap-1.5",
                )}
              >
                {unlockCount > 0 ? "Message your builders" : "Back to project"}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <TenderEvaluationSurface
            tenders={tenders}
            round={round}
            analytics={analytics}
            summaries={summaries}
            builderFacts={builderFacts}
            projectSlug={project.slug}
            canDecide={
              !isSample &&
              (access.kind === "runner" || access.role === "decider")
            }
            schedule={schedule}
            addenda={addenda}
          />
        )}
      </div>
    </div>
  );
}
