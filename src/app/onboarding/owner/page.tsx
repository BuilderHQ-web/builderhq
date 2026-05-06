import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  completeOwnerOnboarding,
  upsertOwnerProfile,
} from "@/modules/profiles";
import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Owner onboarding", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Placeholder owner onboarding page. The actual single-page wizard
 * (entity type, default location, contact pref) lands in step 1c.
 *
 * Until then, "Use defaults" creates a minimal profile so the user can
 * pass the (app) onboarding gate and use the dashboard.
 */
async function useDefaultsAction() {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const upsert = await upsertOwnerProfile(session.user.id, {
    entityType: "homeowner",
    contactPref: "email",
  });
  if (!upsert.ok) throw new Error(upsert.error.message);

  const complete = await completeOwnerOnboarding(session.user.id);
  if (!complete.ok) throw new Error(complete.error.message);

  redirect("/owner");
}

export default function OwnerOnboardingPage() {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow>Project owner · setup</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] leading-none">
            Almost ready
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            A short form to set your default location, entity type, and
            contact preference. The proper wizard lands in the next push —
            for now you can continue with sensible defaults and update
            anything later in Settings.
          </p>
        </div>

        <form action={useDefaultsAction}>
          <Button type="submit" size="md">
            Continue with defaults
          </Button>
        </form>

        <div>
          <Badge variant="accent">Phase 2 · step 1c next</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
