"use server";

import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { removeSampleRound } from "@/modules/sample";
import { dashboardForRole } from "@/lib/dashboard-route";

/** Remove the caller's example round and land them back on the desk. */
export async function removeSampleAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await removeSampleRound(session.user.id);
  redirect(dashboardForRole(session.user.role));
}
