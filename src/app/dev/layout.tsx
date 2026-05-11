/**
 * /dev/* gate.
 *
 * These routes are developer / design-review surfaces — never meant
 * for end users. Two locks before anything renders:
 *
 *   1. Production hard-block. NODE_ENV !== "production" — pre-deploy
 *      previews and local dev work, the live site 404s. This is the
 *      simplest possible kill-switch; nothing else matters if this
 *      bites.
 *   2. Admin-only. Even in preview / dev environments we still gate
 *      on role === "admin" so a non-admin who somehow lands here
 *      doesn't get the design system / R2 upload surface.
 *
 * Why this matters: /dev/storage lets you upload arbitrary files to
 * R2 via a presigned URL. If a logged-in regular user reached this
 * page on production, they could burn R2 storage for free. The
 * NODE_ENV check below is the primary defense; the admin check is
 * belt + braces for previews.
 */

import { notFound } from "next/navigation";

import { auth } from "@/modules/auth";
import { env } from "@/lib/env";

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hard kill-switch: never serve /dev/* on production.
  if (env.NODE_ENV === "production") {
    notFound();
  }

  // Secondary gate: admin role even in preview / dev.
  const session = await auth();
  if (session?.user?.role !== "admin") {
    notFound();
  }

  return <>{children}</>;
}
