import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/modules/auth";
import { getBuilderBySlug } from "@/modules/profiles";
import { getStatus as getFbaStatus } from "@/modules/credits";
import { presignDownload } from "@/modules/documents";
import { getLockState } from "@/modules/verification";
import { logger } from "@/lib/logger";

import { PublicBuilderProfile } from "./public-profile";

/**
 * /b/[slug] — public builder profile.
 *
 * Anyone can hit this (auth not required). Approved profiles are
 * visible to everyone; non-approved profiles are visible only to the
 * builder themselves (so they can preview before submitting for
 * review). Anything else 404s.
 *
 * Logo URLs are presigned at render time (5-minute TTL is fine —
 * cache headers + Next's RSC dedup keep this cheap).
 *
 * The page is `dynamic = "force-dynamic"` because we need the auth
 * session to decide visibility for own-profile preview. Caching
 * comes back when we wire role-aware ISR in a later phase.
 */
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  // We don't auth-gate metadata — even a logged-out crawler getting an
  // approved profile's page should pull the right OG tags.
  const bundle = await getBuilderBySlug(slug, null);
  if (!bundle) {
    return { title: "Builder profile" };
  }
  const { profile } = bundle;
  const title = profile.companyName;
  const desc =
    profile.bio?.slice(0, 160) ??
    `${profile.companyName} — residential builder on BuilderHQ.`;
  return {
    title,
    description: desc,
    openGraph: { title: `${title} · BuilderHQ`, description: desc },
  };
}

export default async function PublicBuilderRoute({ params }: RouteParams) {
  const { slug } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const bundle = await getBuilderBySlug(slug, viewerId);
  if (!bundle) notFound();

  const { profile } = bundle;
  const isOwnProfile = !!viewerId && profile.userId === viewerId;

  // Founding-member status — public signal. Best-effort lookup.
  let isFounding = false;
  try {
    const fba = await getFbaStatus(profile.userId);
    isFounding = fba.active;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      { event: "public_profile.fba_lookup_failed", slug, msg },
      "couldn't read FBA status for public profile",
    );
  }

  // Logo URL — presign on each render. Failure = no logo, page still
  // renders fine.
  let logoUrl: string | null = null;
  if (profile.logoR2Key) {
    try {
      logoUrl = await presignDownload({ key: profile.logoR2Key });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { event: "public_profile.logo_presign_failed", slug, msg },
        "couldn't presign builder logo URL",
      );
    }
  }

  // Verification snapshot for the public-facing trust signals. We
  // resolve the lock state for the OWNING builder (not the viewer)
  // so the chip shows up regardless of who's viewing.
  const lockState = await getLockState(profile.userId);

  // Public-safe projection — strip everything we don't want exposed.
  const publicProfile = {
    slug: profile.slug ?? slug,
    companyName: profile.companyName,
    tradingName: profile.tradingName,
    abn: profile.abn,
    yearsInOperation: profile.yearsInOperation,
    bio: profile.bio,
    website: profile.website,
    linkedinUrl: profile.linkedinUrl,
    instagramUrl: profile.instagramUrl,
    businessSuburb: profile.businessSuburb,
    businessState: profile.businessState,
    approvalStatus: profile.approvalStatus,
    logoUrl,
    isFounding,
    memberSince: profile.createdAt,
    abnVerified: lockState.abn,
  };

  return (
    <PublicBuilderProfile
      profile={publicProfile}
      categories={bundle.categories.map((c) => c.category)}
      serviceAreas={bundle.serviceAreas.map((s) => ({
        state: s.state,
        suburb: s.suburb ?? null,
        postcode: s.postcode ?? null,
      }))}
      licences={bundle.licences.map((l) => ({
        id: l.id,
        state: l.state,
        licenceType: l.licenceType,
        licenceNumber: l.licenceNumber,
        licenceHolderName: l.licenceHolderName,
        issuedAt: l.issuedAt,
        expiresAt: l.expiresAt,
        verified: !!lockState.licences[l.id],
      }))}
      isOwnProfile={isOwnProfile}
      viewerSignedIn={!!viewerId}
    />
  );
}
