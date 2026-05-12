import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { getBuilderProfile } from "@/modules/profiles";
import { Eyebrow } from "@/components/brand/section";

import { BuilderWizard } from "./wizard";

export const metadata = { title: "Builder onboarding", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BuilderOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bundle = await getBuilderProfile(session.user.id);

  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <header className="flex flex-col gap-3">
        <Eyebrow>Builder · setup</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[clamp(2.25rem,5vw+1rem,3.75rem)] leading-[0.95]">
          Welcome, {firstName}
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted max-w-[58ch]">
          Seven quick steps — company, address, project types, service areas,
          licences, and a short bio. We verify your ABN against the ABR and
          your builder licence against the state register live as you go, so
          owners can trust every builder they meet here. Editable later from
          settings.
        </p>
      </header>

      <BuilderWizard
        initial={{
          profile: bundle?.profile
            ? {
                companyName: bundle.profile.companyName,
                tradingName: bundle.profile.tradingName,
                abn: bundle.profile.abn,
                acn: bundle.profile.acn,
                yearsInOperation: bundle.profile.yearsInOperation,
                businessAddressLine1: bundle.profile.businessAddressLine1,
                businessSuburb: bundle.profile.businessSuburb,
                businessState: bundle.profile.businessState,
                businessPostcode: bundle.profile.businessPostcode,
                hasDifferentPostal: bundle.profile.hasDifferentPostal,
                postalAddressLine1: bundle.profile.postalAddressLine1,
                postalSuburb: bundle.profile.postalSuburb,
                postalState: bundle.profile.postalState,
                postalPostcode: bundle.profile.postalPostcode,
                bio: bundle.profile.bio,
                website: bundle.profile.website,
                linkedinUrl: bundle.profile.linkedinUrl,
                instagramUrl: bundle.profile.instagramUrl,
              }
            : null,
          categories: bundle?.categories.map((c) => c.category) ?? [],
          serviceAreas:
            bundle?.serviceAreas.map((a) => ({
              state: a.state,
              suburb: a.suburb,
              postcode: a.postcode,
              radiusKm: a.radiusKm,
            })) ?? [],
          licences:
            bundle?.licences.map((l) => ({
              id: l.id,
              state: l.state,
              licenceType: l.licenceType,
              licenceNumber: l.licenceNumber,
              licenceHolderName: l.licenceHolderName,
              issuedAt: l.issuedAt,
              expiresAt: l.expiresAt,
            })) ?? [],
        }}
      />
    </div>
  );
}
