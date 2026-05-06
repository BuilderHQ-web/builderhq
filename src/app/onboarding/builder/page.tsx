import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  addBuilderLicence,
  setBuilderProjectCategories,
  setBuilderServiceAreas,
  submitBuilderForApproval,
  upsertBuilderProfile,
} from "@/modules/profiles";
import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Builder onboarding", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Placeholder builder onboarding. The proper multi-step wizard
 * (company → location → service areas → categories → licences → review)
 * lands in step 1c and replaces this entire page.
 *
 * "Use defaults" creates a minimal stub: company name = user's name,
 * one project type, one statewide service area, one placeholder licence,
 * status = pending_review. Lets the user pass the gate; admin can clean
 * up later via /admin/builders.
 */
async function useDefaultsAction() {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // 1. profile
  const profile = await upsertBuilderProfile(userId, {
    companyName: session.user.name ?? "My Building Co",
    hasDifferentPostal: false,
  });
  if (!profile.ok) throw new Error(profile.error.message);

  // 2. one project type
  const cats = await setBuilderProjectCategories(userId, {
    categories: ["single_dwelling"],
  });
  if (!cats.ok) throw new Error(cats.error.message);

  // 3. one service area (statewide VIC by default)
  const areas = await setBuilderServiceAreas(userId, {
    areas: [{ state: "VIC" }],
  });
  if (!areas.ok) throw new Error(areas.error.message);

  // 4. one placeholder licence — admin will replace.
  const licence = await addBuilderLicence(userId, {
    state: "VIC",
    licenceType: "Pending verification",
    licenceNumber: `PLACEHOLDER-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
  });
  // addLicence may conflict on retry — that's fine, ignore conflicts on the
  // skip path so re-clicks don't throw.
  if (!licence.ok && licence.error.code !== "conflict") {
    throw new Error(licence.error.message);
  }

  // 5. submit for review (also flips onboarding_completed_at)
  const submit = await submitBuilderForApproval(userId);
  if (!submit.ok) throw new Error(submit.error.message);

  redirect("/builder");
}

export default function BuilderOnboardingPage() {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow>Builder · setup</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] leading-none">
            Tell us about your business
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            A few steps to capture your company details, ABN, service
            areas, project types, and licences. The proper wizard lands in
            the next push — for now you can continue with placeholder
            defaults and update everything later from your profile.
          </p>
        </div>

        <form action={useDefaultsAction}>
          <Button type="submit" size="md">
            Continue with defaults
          </Button>
        </form>

        <p className="text-[11px] text-text-dim">
          A profile created with defaults goes straight to&nbsp;
          <span className="text-text-muted">pending_review</span>. Admin
          approval (and the proper wizard) ship in step 1c.
        </p>

        <div>
          <Badge variant="accent">Phase 2 · step 1c next</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
