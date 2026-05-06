import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

/**
 * Authenticated app shell — owner / builder / admin all compose into here.
 *
 * Auth guard order:
 *   1. proxy.ts (Edge) blocks unauthenticated requests at the edge for /(app)/*
 *   2. This layout double-checks server-side. Belt + braces.
 *   3. Per-route role check happens via server-side session lookup in the
 *      page itself (e.g. /admin/* checks user.role === 'admin').
 *
 * This layout always runs Node-side because auth() reads from the DB-backed
 * session via Auth.js's adapter.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/owner");
  }

  // Suspended/banned: force back to /login. proxy will likely have already
  // intercepted, but defense-in-depth.
  if (session.user.status === "suspended" || session.user.status === "banned") {
    redirect("/login?error=suspended");
  }

  // role can be null for very new accounts that haven't picked a role —
  // shouldn't happen via signup (we require role), but guard anyway.
  const role = session.user.role ?? "project_owner";

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            id: session.user.id,
            name: session.user.name ?? null,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
          }}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
