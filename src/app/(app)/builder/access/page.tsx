import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  FOUNDING_CAP,
  FOUNDING_CUTOFF,
  foundingSeatsAvailable,
  getStatus as getFbaStatus,
  recentCycleHistory,
} from "@/modules/credits";
import { getBuilderProfile } from "@/modules/profiles";
import { logger } from "@/lib/logger";

import { FoundingAccessPage } from "./founding-access-page";

export const metadata = { title: "Founding access" };

/**
 * /builder/access — the founding-builder marquee.
 *
 * Renders a full-page treatment of the FBA grant: hero, big-arc
 * status, cycle timeline, cohort meter, benefits manifesto. Gated
 * to builders only; unauthenticated users land on /login.
 *
 * Each query is wrapped in `safe()` so a single flaky read never
 * 500s the whole page — same pattern we standardised in the layout.
 * Anything that fails degrades to a sensible default rather than
 * crashing the route.
 */
async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "founding_access.query_failed", label, msg },
      "founding access query failed — using fallback",
    );
    return fallback;
  }
}

export default async function FoundingAccessRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/builder/access");
  const userId = session.user.id;

  const [status, history, cohort, profile] = await Promise.all([
    safe(
      "fba_status",
      getFbaStatus(userId),
      { active: false, reason: "no_grant" } as const,
    ),
    safe("fba_history", recentCycleHistory(userId), []),
    safe(
      "fba_cohort",
      foundingSeatsAvailable(),
      { taken: 0, cap: FOUNDING_CAP, remaining: FOUNDING_CAP },
    ),
    safe("builder_profile", getBuilderProfile(userId), null),
  ]);

  const companyName =
    profile?.profile?.companyName ?? session.user.name ?? "Founding builder";

  return (
    <FoundingAccessPage
      companyName={companyName}
      status={status}
      history={history}
      cohort={cohort}
      cutoff={FOUNDING_CUTOFF.toISOString()}
    />
  );
}
