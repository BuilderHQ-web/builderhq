import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { hasCompletedOnboarding } from "@/modules/profiles";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { countUnread as countUnreadNotifications } from "@/modules/notifications";
import { countUnreadForUser as countUnreadMessages } from "@/modules/messaging";
import { logger } from "@/lib/logger";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

/**
 * Best-effort wrapper around an awaited query — if it throws (DB
 * blip, missing column, etc.) we log the failure and return a safe
 * fallback rather than blowing up the entire layout for every route
 * underneath. The layout is on the hot path for every authenticated
 * page, so a 500 here cascades into a "site is down" experience.
 */
async function safe<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "app_layout.query_failed", label, msg },
      "app layout query failed — using fallback",
    );
    return fallback;
  }
}

/**
 * Authenticated app shell — owner / builder / admin compose into here.
 *
 * Auth + onboarding guard order:
 *   1. proxy.ts (Edge) blocks unauth'd requests at the edge for /(app)/*.
 *   2. This layout double-checks server-side. Belt + braces.
 *   3. If the user hasn't finished onboarding, redirect to /onboarding.
 *      Admins skip onboarding entirely.
 *   4. Per-route role check happens via server-side session lookup in
 *      the page itself (e.g. /admin/* asserts user.role === 'admin').
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/owner");
  }

  if (session.user.status === "suspended" || session.user.status === "banned") {
    redirect("/login?error=suspended");
  }

  // Onboarding gate. Settings is exempt — users may need to update their
  // password mid-onboarding, and admins can settings without onboarding.
  const role = session.user.role ?? "project_owner";
  const onboarded = await hasCompletedOnboarding(session.user.id, role);
  if (!onboarded) {
    redirect("/onboarding");
  }

  // Builders may have an active Founding Builder Access grant —
  // surface that to the topbar so it can render the badge.
  // Run alongside the unread-count fetch so we don't double up the
  // round-trip latency before render.
  // Each of these is wrapped in `safe(...)` so a single flaky query
  // doesn't blow up the entire shell. The fallbacks render the UI in a
  // "no badge / not founding" state rather than 500-ing the whole app.
  const [isFounding, initialUnreadCount, initialUnreadMessages] =
    await Promise.all([
      role === "builder"
        ? safe(
            "fba_status",
            getFbaStatus(session.user.id).then((s) => s.active),
            false,
          )
        : Promise.resolve(false),
      safe("unread_notifications", countUnreadNotifications(session.user.id), 0),
      safe("unread_messages", countUnreadMessages(session.user.id), 0),
    ]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={role} initialUnreadMessages={initialUnreadMessages} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            id: session.user.id,
            name: session.user.name ?? null,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
          }}
          isFounding={isFounding}
          initialUnreadCount={initialUnreadCount}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
