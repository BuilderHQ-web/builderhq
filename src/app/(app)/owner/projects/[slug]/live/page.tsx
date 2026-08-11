import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  FileSignature,
  MessageSquare,
  Users,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { projectsBase } from "@/lib/dashboard-route";
import { getBySlugForViewer } from "@/modules/projects";
import { getProjectSchedule, listAddenda } from "@/modules/scope-engine";
import { packSummary } from "@/modules/tenders/schedule";

export const metadata = { title: "Your round is live" };
export const dynamic = "force-dynamic";

/**
 * The moment the round opens.
 *
 * Publishing through the scope gate regenerates the project's slug, so
 * the page the client was standing on no longer exists. Rather than
 * bounce them somewhere generic, this is where they land: what just
 * happened, what the builders will do with it, and every onward door
 * they might want, in the order they might want it.
 */
export default async function RoundLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}/live`);

  const p = await getBySlugForViewer(session.user.id!, slug);
  if (!p.ok) notFound();
  const { project } = p.value;
  const base = projectsBase(session.user.role);

  // A draft never reached this page honestly; send them back to the
  // pack they still have to accept.
  if (project.status === "draft") {
    redirect(`${base}/projects/${slug}/scope`);
  }

  const [schedule, addenda] = await Promise.all([
    getProjectSchedule(project.id),
    listAddenda(project.id),
  ]);
  const pack = schedule ? packSummary(schedule) : null;
  const latest = addenda[0] ?? null;
  const isPrivate = project.tenderMode === "private";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      <div className="mx-auto max-w-[760px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-border-accent/50 bg-[rgba(0,212,200,0.06)] px-3 py-1.5 text-[10.5px] tracking-[0.16em] uppercase text-[#0a7d73] font-ui font-semibold">
          <Check className="size-3.5" />
          {latest
            ? `Addendum ${String(latest.number).padStart(2, "0")} issued`
            : "Live"}
        </span>

        <h1 className="mt-5 font-display uppercase tracking-[-0.018em] text-[34px] sm:text-[48px] leading-[0.95] text-text">
          {latest ? "The addendum is out" : "Your round is live"}
        </h1>
        <p className="mt-4 text-[14.5px] leading-[1.7] text-text-muted max-w-[60ch]">
          {latest
            ? "Every builder holding a spot has been told, and the revised schedule is the one they price against from this moment. Tenders already submitted are marked as priced on the earlier pack, so nothing is quietly compared against the wrong scope."
            : isPrivate
              ? "The builders you invite will see your project and price the schedule your documents produced. Every quote comes back answering the same lines, so you compare like with like."
              : "Builders can see your project now. Each one takes a spot, reads the pack, and prices the schedule your documents produced, line by line. Every quote comes back answering the same lines, so you compare like with like."}
        </p>

        {pack ? (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg overflow-hidden border border-border-subtle bg-border-subtle">
            {[
              { k: "Lines they price", v: String(pack.tenderable) },
              { k: "Divisions", v: String(pack.divisions.length) },
              {
                k: "Your provisional sums",
                v:
                  pack.ownerAllowances > 0
                    ? String(pack.ownerAllowances)
                    : "None",
              },
              { k: "Documents read", v: String(pack.evidenced) },
            ].map((s) => (
              <div key={s.k} className="bg-surface-1 px-4 py-3.5">
                <p className="text-[9.5px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
                  {s.k}
                </p>
                <p className="mt-1 font-display text-[20px] leading-none text-text tabular-nums">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-9">
          <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
            What happens from here
          </p>
          <ol className="mt-4 space-y-4">
            {[
              {
                icon: <Users className="size-4" />,
                title: isPrivate
                  ? "The builders you invite take their spots"
                  : "Builders take their spots",
                body: isPrivate
                  ? "Invite the builders you want. Each one takes a spot to open your documents and the full schedule."
                  : "Builders in your area see the round and take a spot to open your documents and the full schedule. You will see who holds a spot on your project page.",
              },
              {
                icon: <FileSignature className="size-4" />,
                title: "They answer your schedule, line by line",
                body: "Each builder states what their price does with every line: included as documented, carried as a provisional sum at a stated figure, excluded, or not applicable. No two quotes can drift apart on scope again.",
              },
              {
                icon: <MessageSquare className="size-4" />,
                title: "Tenders arrive, and we do the reading",
                body: "As each tender lands you get the analysis beside it: where the builders disagree, what a higher price actually buys, and the questions worth asking before you decide.",
              },
            ].map((step, i) => (
              <li key={step.title} className="flex items-start gap-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-1 text-accent-light">
                  {step.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-ui font-semibold text-text">
                    <span className="text-text-dim tabular-nums">
                      0{i + 1}
                    </span>{" "}
                    {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.65] text-text-muted max-w-[62ch]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-2.5">
          <Link
            href={`${base}/projects/${slug}`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-accent text-accent-contrast text-[13px] font-ui font-semibold hover:bg-accent-hover transition-colors shadow-[0_8px_24px_-8px_rgba(0,212,200,0.5)]"
          >
            Open your project
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={`${base}/projects/${slug}/scope`}
            className="inline-flex items-center gap-2 h-11 px-4.5 rounded-full border border-border-strong text-[13px] font-ui text-text hover:bg-bg-elev transition-colors"
          >
            <BookOpenCheck className="size-4" />
            Read the pack as builders see it
          </Link>
          {isPrivate ? (
            <Link
              href={`${base}/projects/${slug}?invite=1`}
              className="inline-flex items-center gap-2 h-11 px-4.5 rounded-full border border-border-strong text-[13px] font-ui text-text hover:bg-bg-elev transition-colors"
            >
              <Users className="size-4" />
              Invite builders
            </Link>
          ) : null}
          <Link
            href={`${base}/projects`}
            className="inline-flex items-center h-11 px-3 text-[12.5px] text-text-dim hover:text-text transition-colors"
          >
            All projects
          </Link>
        </div>

        <p className="mt-8 border-t border-border-subtle pt-4 text-[11.5px] leading-[1.6] text-text-dim max-w-[62ch]">
          Your pack stays exactly as you accepted it. If a document
          changes, ask for a re-read from the pack page and we will issue
          a numbered addendum so every builder prices the same scope.
        </p>
      </div>
    </div>
  );
}
