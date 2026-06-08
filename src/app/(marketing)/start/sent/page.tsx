/**
 * /start/sent — final funnel page. The user has submitted their
 * contact details (step 6) and either uploaded plans or skipped
 * (step 7). The magic link has been sent.
 *
 * Server-side, we read the soft-auth cookie to pull the user's
 * email + project title, so the client component can display the
 * exact email we sent to and run a resend without needing the
 * email in the URL.
 */

import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { Mail } from "lucide-react";

import { db } from "@/lib/db";
import { readAdsFunnelCookie } from "@/lib/ads-funnel-cookie";
import { projects } from "@/modules/projects";
import { users } from "@/modules/users";

import { SentBody } from "./sent-body";

export const metadata = {
  title: "Check your inbox · BuilderHQ",
};

interface PageProps {
  searchParams?: Promise<{ pid?: string; v?: string; plans?: string }>;
}

export default async function StartSentPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  // Resolve the user + project. Prefer cookie (most authoritative);
  // fall back to the pid query param if the cookie's gone (e.g. user
  // refreshed after returning to /start/sent later). Either way, the
  // page is informational — failure here is graceful.
  let email: string | null = null;
  let projectTitle: string | null = null;
  let projectId: string | null = params.pid ?? null;

  const cookie = await readAdsFunnelCookie();
  if (cookie.ok) {
    projectId = cookie.value.projectId;
    const [row] = await db
      .select({
        email: users.email,
        projectTitle: projects.title,
      })
      .from(users)
      .innerJoin(projects, eq(projects.ownerId, users.id))
      .where(eq(projects.id, cookie.value.projectId))
      .limit(1);
    if (row) {
      email = row.email;
      projectTitle = row.projectTitle;
    }
  } else if (params.pid) {
    // Fallback: pid in URL — look up purely from project ownership.
    // Doesn't auth the viewer (they could URL-guess), but the page
    // only reveals the email already known to anyone with the link.
    const [row] = await db
      .select({
        email: users.email,
        projectTitle: projects.title,
      })
      .from(projects)
      .innerJoin(users, eq(users.id, projects.ownerId))
      .where(eq(projects.id, params.pid))
      .limit(1);
    if (row) {
      email = row.email;
      projectTitle = row.projectTitle;
    }
  }

  // Conversion value from URL (set by /start/q/plans). Defaults safe.
  const conversionValue =
    params.v && !Number.isNaN(Number.parseInt(params.v, 10))
      ? Number.parseInt(params.v, 10)
      : 50;
  const plansOutcome =
    params.plans === "uploaded" || params.plans === "skipped"
      ? params.plans
      : "uploaded";

  return (
    <div className="min-h-svh px-5 md:px-10 pt-16 sm:pt-24 pb-16">
      <div className="mx-auto max-w-[640px]">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-accent-muted border border-border-accent">
          <Mail size={26} strokeWidth={1.6} className="text-accent-light" />
        </div>

        <h1 className="mt-7 font-display tracking-[-0.014em] leading-[0.95] text-[clamp(2.4rem,5vw+0.8rem,4rem)]">
          <span className="text-text">Check your</span>{" "}
          <span className="text-accent">inbox.</span>
        </h1>

        <Suspense fallback={<BodySkeleton />}>
          <SentBody
            email={email}
            projectId={projectId}
            projectTitle={projectTitle}
            conversionValue={conversionValue}
            plansOutcome={plansOutcome}
          />
        </Suspense>
      </div>
    </div>
  );
}

function BodySkeleton() {
  return (
    <div className="mt-6 space-y-3 animate-pulse">
      <div className="h-5 bg-surface-1 rounded w-3/4" />
      <div className="h-5 bg-surface-1 rounded w-1/2" />
    </div>
  );
}
