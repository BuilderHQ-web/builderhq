/**
 * Builder public profile — the owner-facing trust-page payload.
 *
 * A project owner vetting a builder they received a tender from (or are
 * chatting with) gets a public-SAFE projection of the builder's profile:
 * identity, verification, experience, coverage, licences. Sensitive
 * fields — street/postal address, ACN, licence holder names, evidence
 * keys, internal scores, phone/email — are intentionally omitted.
 * Contact happens in-app via messaging, never by leaking details here.
 *
 * Visibility is gated by `canViewBuilderProfile`: approved builders are
 * public; anything else returns null (the route 404s).
 */

import "server-only";

import { getBuilderProfile, canViewBuilderProfile } from "@/modules/profiles";
import { getLockState } from "@/modules/verification";
import { countAwardedForBuilder } from "@/modules/tenders";

export interface MobileBuilderPublicLicence {
  id: string;
  state: string;
  licenceType: string;
  licenceNumber: string;
  verificationStatus: string;
  expiresAtIso: string | null;
}

export interface MobileBuilderPublicServiceArea {
  id: string;
  state: string;
  suburb: string | null;
  radiusKm: number;
}

export interface MobileBuilderPublicProfile {
  id: string;
  companyName: string;
  tradingName: string | null;
  bio: string | null;
  yearsInOperation: number | null;
  state: string | null;
  suburb: string | null;
  website: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  slug: string | null;
  memberSinceIso: string | null;
  abnVerified: boolean;
  licences: MobileBuilderPublicLicence[];
  serviceAreas: MobileBuilderPublicServiceArea[];
  categories: string[];
  stats: {
    awardedCount: number;
    licenceCount: number;
    verifiedLicenceCount: number;
    serviceAreaCount: number;
  };
}

interface Viewer {
  userId: string;
  role: "project_owner" | "builder" | "admin";
}

export async function buildBuilderPublicProfile(
  builderUserId: string,
  viewer: Viewer,
): Promise<MobileBuilderPublicProfile | null> {
  const bundle = await getBuilderProfile(builderUserId);
  if (!bundle?.profile) return null;
  const p = bundle.profile;

  const visible = canViewBuilderProfile(
    { id: viewer.userId, role: viewer.role, status: "active" },
    builderUserId,
    p.approvalStatus,
  );
  if (!visible) return null;

  const [lockState, awardedCount] = await Promise.all([
    getLockState(builderUserId),
    countAwardedForBuilder(builderUserId),
  ]);

  const licences: MobileBuilderPublicLicence[] = bundle.licences.map((l) => ({
    id: l.id,
    state: l.state,
    licenceType: l.licenceType,
    licenceNumber: l.licenceNumber,
    verificationStatus: l.verificationStatus,
    expiresAtIso: l.expiresAt ? l.expiresAt.toISOString() : null,
  }));

  return {
    id: p.userId,
    companyName: p.companyName,
    tradingName: p.tradingName ?? null,
    bio: p.bio ?? null,
    yearsInOperation: p.yearsInOperation ?? null,
    state: p.businessState ?? null,
    suburb: p.businessSuburb ?? null,
    website: p.website ?? null,
    linkedinUrl: p.linkedinUrl ?? null,
    instagramUrl: p.instagramUrl ?? null,
    slug: p.slug ?? null,
    memberSinceIso: p.createdAt ? p.createdAt.toISOString() : null,
    abnVerified: lockState.abn,
    licences,
    serviceAreas: bundle.serviceAreas.map((a) => ({
      id: a.id,
      state: a.state,
      suburb: a.suburb ?? null,
      radiusKm: a.radiusKm,
    })),
    categories: bundle.categories.map((c) => c.category),
    stats: {
      awardedCount,
      licenceCount: licences.length,
      verifiedLicenceCount: licences.filter(
        (l) => l.verificationStatus === "verified",
      ).length,
      serviceAreaCount: bundle.serviceAreas.length,
    },
  };
}
