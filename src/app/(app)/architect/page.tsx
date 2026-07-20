import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Globe2,
  Lock,
  Blend,
  FileStack,
  Users,
  ClipboardCheck,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { getArchitectProfile } from "@/modules/profiles";
import { listMine, type Project } from "@/modules/projects";
import { countTendersForProject } from "@/modules/tenders";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

/**
 * The architect's studio dashboard. First surface an architect sees
 * after onboarding: their tender file, or — before the first project —
 * a clear map of how running a tender here works. Tender creation
 * itself reuses the proven owner wizard (ownership-gated, role-agnostic
 * since the architect IS the project's runner).
 */

const MODE_EXPLAINER = [
  {
    icon: Globe2,
    name: "Open",
    line: "List to our verified builder network. Builders come to you.",
  },
  {
    icon: Lock,
    name: "Private",
    line: "Hand-pick the builders. Yours, ours, or both. Nobody else sees it.",
  },
  {
    icon: Blend,
    name: "Hybrid",
    line: "Your builders take spots, the network fills the rest.",
  },
] as const;

const STEPS = [
  {
    icon: FileStack,
    title: "Upload the project",
    line: "Drop the drawings in and our reader pre-fills the details for you.",
  },
  {
    icon: Users,
    title: "Choose how it tenders",
    line: "Open, private or hybrid, 2 to 5 builders. Invite your client whenever you like.",
  },
  {
    icon: ClipboardCheck,
    title: "Compare like for like",
    line: "Every quote arrives structured against the same scope, ready to put side by side.",
  },
] as const;

export default async function ArchitectDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/architect");
  const role = session.user.role ?? null;
  if (role !== "architect") redirect(dashboardForRole(role));

  const userId = session.user.id;
  const [profile, projects] = await Promise.all([
    getArchitectProfile(userId),
    listMine(userId),
  ]);

  const active = projects.filter((p) =>
    ["published", "tendering"].includes(p.status),
  );
  const drafts = projects.filter((p) => p.status === "draft");
  const counts = await Promise.all(
    active.map((p) => countTendersForProject(p.id)),
  );
  const quotesReceived = counts.reduce((a, b) => a + b, 0);
  const tendersByProject = new Map(active.map((p, i) => [p.id, counts[i] ?? 0]));

  const firstName = (session.user.name ?? "").split(" ")[0] || "there";
  const isFirstTime = projects.length === 0;

  const dateline = new Intl.DateTimeFormat("en-AU", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date());

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,212,200,0.08), transparent 65%)",
          }}
        />
        <div className="relative px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-10 sm:pb-12">
          <div className="mx-auto max-w-[980px]">
            <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium">
              Studio · {dateline}
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] leading-[0.95] text-[30px] sm:text-[42px] text-text break-words">
              {profile?.practiceName ?? firstName}
            </h1>
            <p className="mt-4 max-w-[56ch] text-[13px] sm:text-[14px] leading-[1.7] text-text-muted">
              {isFirstTime
                ? "Upload a client's project, choose how it goes to market, and hand your client a structured comparison. You decide who you invite and when your client joins."
                : "Your tender file, your builders and your client access, in one place. Start a new tender any time."}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/architect/projects/new"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-ui font-semibold text-accent-contrast hover:brightness-105 transition"
              >
                {isFirstTime ? "Start your first tender" : "New tender"}
                <ArrowRight className="size-4" />
              </Link>
              {!isFirstTime ? (
                <Link
                  href="/architect/projects"
                  className="inline-flex items-center rounded-full border border-border-subtle px-5 py-2.5 text-[13px] font-ui font-medium text-text-muted hover:text-text hover:border-border transition"
                >
                  All tenders
                </Link>
              ) : null}
            </div>

            {!isFirstTime ? (
              <div className="mt-9 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle max-w-[560px]">
                <Stat label="Live tenders" value={active.length} />
                <Stat label="Quotes received" value={quotesReceived} />
                <Stat label="Drafts" value={drafts.length} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[980px]">
          {isFirstTime ? (
            <FirstTenderPrimer />
          ) : (
            <ProjectFile projects={projects} tendersByProject={tendersByProject} />
          )}
        </div>
      </section>
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg-raised px-4 py-3.5">
      <p className="font-ui font-semibold tabular-nums text-[22px] leading-none text-text">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] tracking-[0.06em] text-text-dim">{label}</p>
    </div>
  );
}

/** The pre-first-tender primer: three modes, three steps, zero fog. */
function FirstTenderPrimer() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text">
          Three ways to run it
        </h2>
        <p className="mt-1 text-[13px] text-text-dim">
          You choose per project, and you can invite your client at any stage.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODE_EXPLAINER.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-border-subtle bg-bg-raised p-4"
            >
              <m.icon className="size-4 text-accent-light" />
              <p className="mt-2.5 font-ui font-semibold text-[13.5px] text-text">
                {m.name}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-text-muted">
                {m.line}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text">
          How it works
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-border-subtle bg-bg-raised p-4"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] tracking-[0.18em] text-accent">
                  0{i + 1}
                </span>
                <s.icon className="size-4 text-text-faint" />
              </div>
              <p className="mt-2.5 font-ui font-semibold text-[13.5px] text-text">
                {s.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-text-muted">
                {s.line}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elev px-5 py-4 flex items-start gap-3">
        <Building2 className="size-4 mt-0.5 text-accent-light shrink-0" />
        <p className="text-[13px] leading-[1.65] text-text-muted">
          Your client&apos;s details stay private until you invite them, and
          invited builders never pay to quote your project. Open spots are
          filled by our verified network.
        </p>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
};

const MODE_LABEL: Record<Project["tenderMode"], string> = {
  open: "Open",
  private: "Private",
  hybrid: "Hybrid",
};

function ProjectFile({
  projects,
  tendersByProject,
}: {
  projects: Project[];
  tendersByProject: Map<string, number>;
}) {
  return (
    <div>
      <h2 className="font-ui font-semibold text-[15px] tracking-[-0.01em] text-text">
        The tender file
      </h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle divide-y divide-border-subtle bg-bg-raised">
        {projects.map((p) => {
          const quotes = tendersByProject.get(p.id);
          return (
            <Link
              key={p.id}
              href={`/architect/projects/${p.slug}`}
              className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-bg-elev transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-ui font-medium text-[13.5px] text-text">
                  {p.title}
                </p>
                <p className="mt-0.5 text-[12px] text-text-dim">
                  {[p.suburb, p.state].filter(Boolean).join(", ") || "Address to come"}
                  {" · "}
                  {MODE_LABEL[p.tenderMode]} round
                </p>
              </div>
              {typeof quotes === "number" ? (
                <span className="hidden sm:block text-[12px] tabular-nums text-text-muted">
                  {quotes} {quotes === 1 ? "quote" : "quotes"}
                </span>
              ) : null}
              <span
                className={
                  "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold " +
                  (p.status === "tendering" || p.status === "published"
                    ? "bg-[rgba(0,212,200,0.1)] text-accent-light"
                    : p.status === "awarded"
                      ? "bg-[rgba(224,178,92,0.12)] text-[#8a6a2f]"
                      : "bg-[rgba(24,34,44,0.06)] text-text-muted")
                }
              >
                {STATUS_LABEL[p.status]}
              </span>
              <ArrowRight className="size-4 text-text-faint shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
