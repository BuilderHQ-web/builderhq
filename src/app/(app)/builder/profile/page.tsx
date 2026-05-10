import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { getBuilderProfile } from "@/modules/profiles";
import { presignDownload } from "@/modules/documents";
import {
  getLatestForBuilder,
  getLatestForLicence,
  getLockState,
} from "@/modules/verification";
import { logger } from "@/lib/logger";

import { BuilderProfileEditor } from "./profile-editor";

export const metadata = { title: "Public profile" };
export const dynamic = "force-dynamic";

/**
 * Builder public profile editor.
 *
 * Loads the full profile bundle (identity, address, bio, socials,
 * categories, service areas, licences) plus a signed logo URL when
 * one's set, and hands the lot to the editor. The save actions live
 * in `/onboarding/builder/actions` (originally written for the
 * wizard, intentionally reusable) plus the new logo helpers in
 * `_actions/builder-profile`.
 */
export default async function BuilderProfileRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/builder/profile");
  if (session.user.role !== "builder") redirect("/builder");

  const userId = session.user.id;
  const bundle = await getBuilderProfile(userId);

  // First-time edit: bundle null means they haven't set the profile up
  // yet. Bounce to onboarding so they don't get a half-empty editor.
  if (!bundle) redirect("/onboarding/builder");

  const profile = bundle.profile;

  // Sign the logo URL if one's stored. Failure is non-fatal — we just
  // render the placeholder.
  let logoUrl: string | null = null;
  if (profile.logoR2Key) {
    try {
      logoUrl = await presignDownload({ key: profile.logoR2Key });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        { event: "builder_profile.logo_presign_failed", userId, msg },
        "couldn't presign builder logo URL",
      );
    }
  }

  // Verification snapshots — lock state for the UI + the latest
  // verification per licence (for chips with expiry / status).
  const lockState = await getLockState(userId);
  const abnVerification = await getLatestForBuilder(userId, "abn");
  const licenceVerifications = await Promise.all(
    bundle.licences.map(async (l) => {
      const v = await getLatestForLicence(userId, l.id);
      return [l.id, v] as const;
    }),
  );
  const licenceVerificationMap = Object.fromEntries(
    licenceVerifications.map(([id, v]) => [
      id,
      v
        ? {
            status: v.status,
            provider: v.provider,
            matchedName: v.matchedName,
            expiresAt: v.expiresAt,
            reason: v.reason,
          }
        : null,
    ]),
  );

  return (
    <BuilderProfileEditor
      lockState={lockState}
      abnVerification={
        abnVerification
          ? {
              status: abnVerification.status,
              provider: abnVerification.provider,
              matchedName: abnVerification.matchedName,
              reason: abnVerification.reason,
              subjectValue: abnVerification.subjectValue,
            }
          : null
      }
      licenceVerifications={licenceVerificationMap}
      initial={{
        companyName: profile.companyName ?? "",
        tradingName: profile.tradingName ?? "",
        abn: profile.abn ?? "",
        acn: profile.acn ?? "",
        yearsInOperation: profile.yearsInOperation,
        businessAddressLine1: profile.businessAddressLine1 ?? "",
        businessSuburb: profile.businessSuburb ?? "",
        businessState: profile.businessState ?? null,
        businessPostcode: profile.businessPostcode ?? "",
        hasDifferentPostal: profile.hasDifferentPostal,
        postalAddressLine1: profile.postalAddressLine1 ?? "",
        postalSuburb: profile.postalSuburb ?? "",
        postalState: profile.postalState ?? null,
        postalPostcode: profile.postalPostcode ?? "",
        bio: profile.bio ?? "",
        website: profile.website ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        instagramUrl: profile.instagramUrl ?? "",
        slug: profile.slug ?? null,
        approvalStatus: profile.approvalStatus,
        logoUrl,
      }}
      categories={bundle.categories.map((c) => c.category)}
      serviceAreas={bundle.serviceAreas.map((s) => ({
        state: s.state,
        suburb: s.suburb ?? null,
        postcode: s.postcode ?? null,
        radiusKm: s.radiusKm,
      }))}
      licences={bundle.licences.map((l) => ({
        id: l.id,
        state: l.state,
        licenceType: l.licenceType,
        licenceNumber: l.licenceNumber,
        licenceHolderName: l.licenceHolderName,
        issuedAt: l.issuedAt,
        expiresAt: l.expiresAt,
      }))}
    />
  );
}
