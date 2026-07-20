import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";

export const metadata = { title: "Get set up", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * /onboarding — dispatcher. Routes the authenticated user to their
 * role-specific wizard. Auth + onboarding-done guards are in the layout
 * above, so by the time we get here we know the user needs onboarding.
 */
export default async function OnboardingDispatcher() {
  const session = await auth();
  const role = session?.user?.role ?? null;
  if (role === "builder") redirect("/onboarding/builder");
  if (role === "architect") redirect("/onboarding/architect");
  redirect("/onboarding/owner");
}
