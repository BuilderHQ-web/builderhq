"use client";

/**
 * PublicBuilderProfile — `/b/[slug]`, the builder's public register entry.
 *
 * Read-only consumer of everything the builder edits at /builder/profile.
 * Set as a letterhead document: the page an owner reads when deciding
 * whether this builder belongs on their round. Facts in ledgers, claims
 * only where earned (verification chips render only when verified).
 *
 *   ┌─ MASTHEAD ─────────────────────────────────────────────┐
 *   │  BUILDERHQ · BUILDER REGISTER                          │
 *   │  [logo plate]  APPROVED BUILDER · SUBURB, STATE        │
 *   │                TRADING NAME (display scale)            │
 *   │                Registered entity · ABN · verified chip │
 *   │                [Website] [LinkedIn] [Instagram]        │
 *   └────────────────────────────────────────────────────────┘
 *   ledger strip → about → project types → service areas →
 *   licences → owner CTA → footer
 *
 * No auth required to view (handled by the server entry — this
 * component just receives data + renders).
 */

import Link from "next/link";
import { motion } from "motion/react";
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  Hammer,
  House,
  Layers,
  MapPin,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Brand icons aren't in this lucide version. Inline SVG keeps them on-
// brand (24×24 stroke convention) without pulling another icon pack.
const Linkedin: LucideIcon = (({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)) as LucideIcon;

const Instagram: LucideIcon = (({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)) as LucideIcon;

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/app/reveal";

// ── types ───────────────────────────────────────────────────────────────

type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
type ProjectType = "single_dwelling" | "multi_dwelling" | "renovation" | "extension";
type ApprovalStatus =
  | "incomplete"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

interface PublicProfile {
  slug: string;
  /** Legal entity name from ABR. */
  companyName: string;
  /** Marketing label — what owners see most prominently. Falls back
   *  to legal entity name when blank. */
  tradingName: string | null;
  abn: string | null;
  yearsInOperation: number | null;
  bio: string | null;
  website: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  businessSuburb: string | null;
  businessState: AustralianState | null;
  approvalStatus: ApprovalStatus;
  logoUrl: string | null;
  memberSince: Date;
  /** True when ABN has been verified by ABR (and hasn't been changed since). */
  abnVerified: boolean;
}

interface ServiceArea {
  state: AustralianState;
  suburb: string | null;
  postcode: string | null;
}

interface Licence {
  id: string;
  state: AustralianState;
  licenceType: string;
  licenceNumber: string;
  licenceHolderName: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  /** True when this licence has been verified against the relevant
   *  state register. Drives the "Verified" chip. */
  verified: boolean;
}

interface Props {
  profile: PublicProfile;
  categories: ProjectType[];
  serviceAreas: ServiceArea[];
  licences: Licence[];
  isOwnProfile: boolean;
  viewerSignedIn: boolean;
}

// ── public component ────────────────────────────────────────────────────

export function PublicBuilderProfile({
  profile,
  categories,
  serviceAreas,
  licences,
  isOwnProfile,
  viewerSignedIn,
}: Props) {
  const displayName =
    profile.tradingName && profile.tradingName.trim().length > 0
      ? profile.tradingName
      : profile.companyName;

  return (
    <div className="relative min-h-dvh bg-bg">
      {isOwnProfile && profile.approvalStatus !== "approved" ? (
        <PreviewBanner status={profile.approvalStatus} />
      ) : null}

      <Masthead profile={profile} displayName={displayName} />

      <main className="relative px-4 sm:px-6 lg:px-10 mx-auto max-w-[1100px] flex flex-col gap-10 lg:gap-14 py-8 sm:py-10 lg:py-14">
        <Reveal immediate delay={0.06}>
          <LedgerStrip
            profile={profile}
            categories={categories}
            serviceAreas={serviceAreas}
            licences={licences}
          />
        </Reveal>

        {profile.bio ? (
          <Reveal>
            <AboutSection bio={profile.bio} />
          </Reveal>
        ) : null}

        {categories.length > 0 ? (
          <Reveal>
            <CategoriesSection categories={categories} />
          </Reveal>
        ) : null}

        {serviceAreas.length > 0 ? (
          <Reveal>
            <ServiceAreasSection areas={serviceAreas} />
          </Reveal>
        ) : null}

        {licences.length > 0 ? (
          <Reveal>
            <LicencesSection licences={licences} />
          </Reveal>
        ) : null}

        <Reveal>
          <CallToAction
            companyName={displayName}
            viewerSignedIn={viewerSignedIn}
          />
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}

// ── Preview banner (for owners viewing their own pre-approval) ──────────

function PreviewBanner({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_META[status];
  return (
    <div
      className={cn(
        "border-b text-[12px]",
        status === "rejected" || status === "suspended"
          ? "border-danger/35 bg-[rgba(194,85,80,0.06)] text-[#a8433e]"
          : "border-warning/35 bg-[rgba(201,148,34,0.06)] text-[#8a6414]",
      )}
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="inline-flex items-center gap-2">
            <Eye className="size-3.5" />
            <strong className="font-medium">Preview</strong>
          </span>
          <span className="opacity-80">
            · This profile is {meta.label.toLowerCase()}. Only you can see it.
          </span>
        </span>
        <Link
          href="/builder/profile"
          className="text-[11.5px] tracking-[0.04em] underline-offset-4 hover:underline shrink-0"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}

// ── Masthead ────────────────────────────────────────────────────────────

function Masthead({
  profile,
  displayName,
}: {
  profile: PublicProfile;
  displayName: string;
}) {
  const initials = initialsOf(displayName);
  const tagline = composeTagline(profile);
  const showLegalLine =
    !!profile.tradingName &&
    profile.tradingName.trim().length > 0 &&
    profile.tradingName.trim().toLowerCase() !==
      profile.companyName.trim().toLowerCase();

  return (
    <section className="border-b border-border-subtle bg-surface-1">
      {/* register rule */}
      <div className="border-b border-border-subtle/60">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-[10px] tracking-[0.24em] uppercase text-text-dim font-ui font-semibold hover:text-text transition-colors"
          >
            BuilderHQ · Builder register
          </Link>
          {profile.approvalStatus === "approved" ? (
            <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim tabular-nums">
              On the register since{" "}
              {profile.memberSince.toLocaleDateString("en-AU", {
                month: "long",
                year: "numeric",
              })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10 pt-10 sm:pt-12 lg:pt-14 pb-9 sm:pb-10 lg:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-9 items-start"
        >
          {/* Logo plate */}
          <div className="size-[128px] sm:size-[168px] rounded-lg overflow-hidden border border-border-subtle bg-white card-elev flex items-center justify-center">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt={`${displayName} logo`}
                className="size-full object-contain p-3"
              />
            ) : (
              <span className="font-display text-[44px] sm:text-[56px] tracking-[0.02em] text-text-dim leading-none">
                {initials}
              </span>
            )}
          </div>

          {/* Identity block */}
          <div className="min-w-0 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <ApprovalChip status={profile.approvalStatus} />
              {profile.businessState ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border border-border-subtle bg-[rgba(24,34,44,0.03)] text-[10px] tracking-[0.16em] uppercase text-text-muted">
                  <MapPin className="size-3" />
                  {profile.businessSuburb
                    ? `${profile.businessSuburb}, ${profile.businessState}`
                    : profile.businessState}
                </span>
              ) : null}
              {profile.yearsInOperation != null ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border border-border-subtle bg-[rgba(24,34,44,0.03)] text-[10px] tracking-[0.16em] uppercase text-text-muted tabular-nums">
                  <Calendar className="size-3" />
                  {profile.yearsInOperation}{" "}
                  {profile.yearsInOperation === 1 ? "year" : "years"} in operation
                </span>
              ) : null}
            </div>

            <h1 className="font-display uppercase tracking-[-0.018em] text-[clamp(2rem,4.5vw+1rem,4.4rem)] leading-[0.95] text-text break-words">
              {displayName}
            </h1>

            {/* Registered-entity line — legal name and ABN belong
                together; the verified chip renders only when earned. */}
            {showLegalLine || profile.abn || profile.abnVerified ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {showLegalLine ? (
                  <span className="text-[12px] tracking-[0.02em] text-text-dim">
                    Registered entity{" "}
                    <span className="text-text-muted font-medium">
                      {profile.companyName}
                    </span>
                  </span>
                ) : null}
                {profile.abn ? (
                  <span className="font-mono tabular-nums text-[10.5px] text-text-dim">
                    ABN {formatAbn(profile.abn)}
                  </span>
                ) : null}
                {profile.abnVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-sm border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-[9.5px] tracking-[0.16em] uppercase text-[#0a7d73] font-semibold">
                    <ShieldCheck className="size-3" />
                    ABN verified
                  </span>
                ) : null}
              </div>
            ) : null}

            {tagline ? (
              <p className="text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
                {tagline}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {profile.website ? (
                <ExternalLinkButton
                  href={profile.website}
                  icon={Globe}
                  label="Website"
                  primary
                />
              ) : null}
              {profile.linkedinUrl ? (
                <ExternalLinkButton
                  href={profile.linkedinUrl}
                  icon={Linkedin}
                  label="LinkedIn"
                />
              ) : null}
              {profile.instagramUrl ? (
                <ExternalLinkButton
                  href={profile.instagramUrl}
                  icon={Instagram}
                  label="Instagram"
                />
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const APPROVAL_META: Record<
  ApprovalStatus,
  { label: string; cls: string; icon: LucideIcon }
> = {
  incomplete: {
    label: "Draft",
    cls: "border-border-subtle text-text-dim bg-[rgba(24,34,44,0.025)]",
    icon: Eye,
  },
  pending_review: {
    label: "Pending review",
    cls: "border-warning/35 text-[#8a6414] bg-[rgba(201,148,34,0.06)]",
    icon: Eye,
  },
  approved: {
    label: "Approved builder",
    cls: "border-border-accent/45 text-[#0a7d73] bg-[rgba(0,212,200,0.06)]",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    cls: "border-danger/35 text-[#a8433e] bg-[rgba(194,85,80,0.06)]",
    icon: Eye,
  },
  suspended: {
    label: "Suspended",
    cls: "border-danger/35 text-[#a8433e] bg-[rgba(194,85,80,0.06)]",
    icon: Eye,
  },
};

function ApprovalChip({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border text-[10px] tracking-[0.16em] uppercase font-semibold",
        meta.cls,
      )}
    >
      <meta.icon className="size-3" />
      {meta.label}
    </span>
  );
}

function ExternalLinkButton({
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2 h-9 px-4 rounded-full",
        "text-[12px] font-medium tracking-[0.04em] transition-colors duration-[140ms]",
        "active:scale-[0.985] active:duration-[80ms]",
        primary
          ? "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_8px_18px_-12px_rgba(15,23,32,0.4)]"
          : "border border-border-subtle text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="size-3.5" />
      {label}
      <ExternalLink className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// ── Ledger strip ────────────────────────────────────────────────────────

function LedgerStrip({
  profile,
  categories,
  serviceAreas,
  licences,
}: {
  profile: PublicProfile;
  categories: ProjectType[];
  serviceAreas: ServiceArea[];
  licences: Licence[];
}) {
  const stateCount = new Set(serviceAreas.map((a) => a.state)).size;
  const verifiedLicences = licences.filter((l) => l.verified).length;

  const items: Array<{ label: string; value: string; sub: string }> = [
    {
      label: "Years in operation",
      value:
        profile.yearsInOperation != null ? String(profile.yearsInOperation) : "—",
      sub: "as stated by the builder",
    },
    {
      label: "Project types",
      value: String(categories.length),
      sub: categories.length === 1 ? "specialty" : "covered",
    },
    {
      label: "Service areas",
      value: String(serviceAreas.length),
      sub:
        serviceAreas.length === 0
          ? "none recorded"
          : `across ${stateCount} ${stateCount === 1 ? "state" : "states"}`,
    },
    {
      label: "Licences on file",
      value: String(licences.length),
      sub:
        licences.length === 0
          ? "none recorded"
          : verifiedLicences > 0
            ? `${verifiedLicences} verified`
            : "verification pending",
    },
  ];

  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden card-elev">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle">
        {items.map((it) => (
          <div key={it.label} className="bg-surface-1 p-4 sm:p-5">
            <div className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
              {it.label}
            </div>
            <div className="mt-2.5 font-display tabular-nums leading-none text-text text-[30px] sm:text-[36px]">
              {it.value}
            </div>
            <div className="mt-1.5 text-[11px] text-text-dim leading-[1.45]">
              {it.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── About ───────────────────────────────────────────────────────────────

function AboutSection({ bio }: { bio: string }) {
  return (
    <section>
      <Header kicker="About" icon={Building2} title="The company" />
      <div className="mt-5 max-w-[68ch]">
        <p className="text-[15px] leading-[1.75] text-text-muted whitespace-pre-line">
          {bio}
        </p>
      </div>
    </section>
  );
}

// ── Categories ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  ProjectType,
  { label: string; description: string; icon: LucideIcon }
> = {
  single_dwelling: {
    label: "Single dwelling",
    description: "New homes and knock-down rebuilds.",
    icon: House,
  },
  multi_dwelling: {
    label: "Multi dwelling",
    description: "Townhouses, dual occupancy, multi-units.",
    icon: Building2,
  },
  renovation: {
    label: "Renovation",
    description: "Internal and external scope.",
    icon: Wrench,
  },
  extension: {
    label: "Extension",
    description: "Ground and first floor additions.",
    icon: Layers,
  },
};

function CategoriesSection({ categories }: { categories: ProjectType[] }) {
  return (
    <section>
      <Header kicker="What they build" icon={Hammer} title="Project types" />
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {categories.map((c) => {
          const meta = CATEGORY_META[c];
          return (
            <div
              key={c}
              className="rounded-lg border border-border-subtle p-4 sm:p-5 bg-surface-1 card-elev"
            >
              <span className="inline-flex size-8 rounded-md items-center justify-center mb-3 border border-border-subtle bg-[rgba(24,34,44,0.03)] text-accent-light">
                <meta.icon className="size-4" />
              </span>
              <h3 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
                {meta.label}
              </h3>
              <p className="mt-1 text-[12px] leading-[1.55] text-text-muted">
                {meta.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Service areas ───────────────────────────────────────────────────────

function ServiceAreasSection({ areas }: { areas: ServiceArea[] }) {
  // Group by state for cleaner visual grouping.
  const byState = new Map<AustralianState, ServiceArea[]>();
  for (const a of areas) {
    const arr = byState.get(a.state) ?? [];
    arr.push(a);
    byState.set(a.state, arr);
  }
  const ordered = (
    ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const
  ).filter((s) => byState.has(s));

  return (
    <section>
      <Header
        kicker="Where they work"
        icon={MapPin}
        title="Service areas"
        sub={`${areas.length} ${areas.length === 1 ? "area" : "areas"} across ${ordered.length} ${ordered.length === 1 ? "state" : "states"}.`}
      />
      <div className="mt-5 rounded-lg border border-border-subtle overflow-hidden card-elev">
        <div className="flex flex-col gap-px bg-border-subtle">
          {ordered.map((state) => {
            const inState = byState.get(state)!;
            const stateOnly = inState.find((a) => !a.suburb);
            const suburbs = inState.filter((a) => a.suburb);
            return (
              <div key={state} className="bg-surface-1 p-4 sm:p-5">
                <div className="flex items-baseline gap-3 mb-2.5">
                  <span className="font-display text-[22px] tracking-[0.02em] text-text leading-none">
                    {state}
                  </span>
                  {stateOnly ? (
                    <span className="text-[10px] tracking-[0.18em] uppercase text-[#0a7d73] font-semibold">
                      Statewide coverage
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-dim tabular-nums">
                      {suburbs.length} {suburbs.length === 1 ? "suburb" : "suburbs"}
                    </span>
                  )}
                </div>
                {suburbs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {suburbs.map((a, i) => (
                      <span
                        key={`${a.suburb}-${a.postcode ?? "x"}-${i}`}
                        className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border border-border-subtle bg-[rgba(24,34,44,0.03)] text-[12px] text-text-muted"
                      >
                        {a.suburb}
                        {a.postcode ? (
                          <span className="font-mono tabular-nums text-[10.5px] text-text-dim">
                            {a.postcode}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Licences ────────────────────────────────────────────────────────────

function LicencesSection({ licences }: { licences: Licence[] }) {
  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  return (
    <section>
      <Header
        kicker="Licences"
        icon={Award}
        title="Credentials"
        sub="Licences on record, with verification status."
      />
      <div className="mt-5 rounded-lg border border-border-subtle overflow-hidden card-elev">
        <div className="flex flex-col gap-px bg-border-subtle">
          {licences.map((l) => (
            <div key={l.id} className="bg-surface-1 p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <span className="size-9 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] text-accent-light flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-ui font-semibold text-[14px] text-text">
                      {l.licenceType}
                    </span>
                    <span className="text-[9.5px] tracking-[0.16em] uppercase px-1.5 h-5 inline-flex items-center rounded-sm border border-border-subtle text-text-dim">
                      {l.state}
                    </span>
                    {l.verified ? (
                      <span className="text-[9.5px] tracking-[0.16em] uppercase px-1.5 h-5 inline-flex items-center gap-1 rounded-sm border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-[#0a7d73] font-semibold">
                        <CheckCircle2 className="size-2.5" />
                        Verified · {l.state === "VIC" ? "VBA" : "BuilderHQ review"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[12px] text-text-muted font-mono tabular-nums break-all">
                    {l.licenceNumber}
                  </div>
                  {l.licenceHolderName ? (
                    <div className="mt-0.5 text-[12px] text-text-dim break-words">
                      Held by {l.licenceHolderName}
                    </div>
                  ) : null}
                  <div className="mt-2.5 flex items-center gap-3 text-[10.5px] tracking-[0.04em] text-text-dim">
                    {fmt(l.issuedAt) ? (
                      <span>
                        <span className="text-text-faint mr-1">Issued</span>
                        {fmt(l.issuedAt)}
                      </span>
                    ) : null}
                    {fmt(l.expiresAt) ? (
                      <span>
                        <span className="text-text-faint mr-1">Expires</span>
                        {fmt(l.expiresAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ─────────────────────────────────────────────────────────────────

function CallToAction({
  companyName,
  viewerSignedIn,
}: {
  companyName: string;
  viewerSignedIn: boolean;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <div className="px-5 sm:px-7 lg:px-10 py-8 sm:py-9 lg:py-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-6">
        <div>
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
            Have a project?
          </span>
          <h3 className="mt-2 font-display uppercase tracking-[-0.012em] text-[24px] sm:text-[28px] leading-[1.05] text-text break-words">
            Put your project to tender
          </h3>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
            Upload your drawings, scope, and timing once on BuilderHQ.
            Verified builders take a spot on your round and tender, and{" "}
            {companyName} can be one of them.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center gap-2 shrink-0">
          <Link
            href={viewerSignedIn ? "/owner/projects/new" : "/signup?role=project_owner"}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full",
              "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
              "hover:bg-accent-hover transition-colors duration-[140ms]",
              "active:scale-[0.985] active:duration-[80ms]",
              "shadow-[0_10px_24px_-14px_rgba(15,23,32,0.4)]",
              "max-sm:w-full",
            )}
          >
            {viewerSignedIn ? "Upload a project" : "Get started"}
            <ExternalLink className="size-3.5" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-subtle text-[12.5px] tracking-[0.04em] text-text-muted hover:text-text hover:bg-surface-2 transition-colors max-sm:w-full"
          >
            How BuilderHQ works
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-1 mt-6">
      <div className="px-4 sm:px-6 lg:px-10 mx-auto max-w-[1100px] py-7 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.04em] text-text-dim">
        <span>BuilderHQ · Australia&apos;s residential tender platform</span>
        <Link
          href="/"
          className="hover:text-text transition-colors inline-flex items-center gap-1"
        >
          builderhq.com.au
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </footer>
  );
}

// ── shared header ─────────────────────────────────────────────────────────

function Header({
  kicker,
  icon: Icon,
  title,
  sub,
}: {
  kicker: string;
  icon: LucideIcon;
  title: string;
  sub?: string;
}) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div>
        <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-ui font-semibold text-accent-light">
          <Icon className="size-3" />
          {kicker}
        </span>
        <h2 className="mt-1.5 font-display uppercase tracking-[-0.012em] text-[clamp(1.5rem,1.8vw+0.8rem,2rem)] leading-[1.0] text-text">
          {title}
        </h2>
        {sub ? (
          <p className="mt-2 text-[12.5px] text-text-dim leading-[1.6] max-w-[58ch]">
            {sub}
          </p>
        ) : null}
      </div>
    </header>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "··"
  );
}

function composeTagline(p: PublicProfile): string | null {
  const parts: string[] = ["Residential builder"];
  if (p.businessSuburb && p.businessState) {
    parts.push(`based in ${p.businessSuburb}, ${p.businessState}`);
  } else if (p.businessState) {
    parts.push(`based in ${p.businessState}`);
  }
  return parts.join(", ") + ".";
}

/** Format ABN with the canonical AU spacing: 00 000 000 000. */
function formatAbn(abn: string): string {
  const d = abn.replace(/\D/g, "");
  if (d.length !== 11) return abn;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`;
}
