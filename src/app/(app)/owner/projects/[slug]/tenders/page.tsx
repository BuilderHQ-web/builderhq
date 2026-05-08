import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Files } from "lucide-react";

import { auth } from "@/modules/auth";
import { getBySlugForOwner } from "@/modules/projects";
import { listTendersForOwner } from "@/modules/tenders";
import { TendersComparison } from "./comparison";

export const metadata = { title: "Tenders" };

export default async function ProjectTendersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}/tenders`);
  const userId = session.user.id!;

  const r = await getBySlugForOwner(userId, slug);
  if (!r.ok) {
    if (r.error.code === "not_found" || r.error.code === "forbidden") notFound();
    throw new Error(r.error.message);
  }
  const project = r.value;

  const tenders = await listTendersForOwner(project.id);

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10">
      <div className="mx-auto max-w-[1400px]">
        <Link
          href={`/owner/projects/${project.slug}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-5"
        >
          <ArrowLeft className="size-3.5" />
          Back to project
        </Link>

        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <Files className="size-3.5" />
              Tenders
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[36px] sm:text-[44px] leading-[0.95] text-text">
              {project.title}
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {tenders.length} tender{tenders.length === 1 ? "" : "s"} received ·
              compare side-by-side, decide in minutes
            </p>
          </div>
        </div>

        {tenders.length === 0 ? (
          <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-16 text-center">
            <FileText className="mx-auto size-6 text-text-dim mb-3" />
            <h3 className="text-[15px] font-semibold text-text">
              No tenders yet
            </h3>
            <p className="mt-1 text-[12.5px] text-text-dim mx-auto max-w-[44ch]">
              Builders who unlock this project can submit tenders. They&apos;ll
              appear here for side-by-side comparison.
            </p>
          </div>
        ) : (
          <TendersComparison tenders={tenders} />
        )}
      </div>
    </div>
  );
}
