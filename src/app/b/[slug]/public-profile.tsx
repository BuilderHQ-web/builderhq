"use client";

/**
 * PublicBuilderProfile — `/b/[slug]`, the builder's public register entry.
 *
 * Set in the Preferred Partner letterhead language (the layout owners
 * already meet at /partners/[slug]): an open-canvas hero with a glowing
 * kicker, sentence-case Geist name and tracked-caps meta line; the
 * avatar beside three headline figures; then eyebrow-labelled sections
 * ruled with hairlines. The honest mapping — builders have no Google
 * rating, portrait or awards, so the figures come from the register
 * itself (years, licences, service areas) and verification chips play
 * the trust role a star rating plays for partners. Claims render only
 * where earned.
 *
 *   register rule bar
 *   HERO   · Builder Register · Approved builder
 *          Company Name (Geist, hero scale)
 *          SUBURB, STATE · ON THE REGISTER SINCE 2026
 *          [Website] [LinkedIn] [Instagram]
 *   [avatar]  YEARS · LICENCES · SERVICE AREAS
 *   registered-entity strip (legal name · ABN · verified chip)
 *   ABOUT THE COMPANY ────────────────
 *   WHAT THEY BUILD ──────────────────
 *   WHERE THEY WORK ──────────────────
 *   LICENCES AND VERIFICATION ────────
 *   HOW TENDERING WORKS ──────────────
 *   CTA
 *
 * No auth required to view (handled by the server entry — this
 * component just receives data + renders).
 */

import Link from "next/link";
import { motion } from "motion/react";
import {
  Building2,
  CheckCircle2,
  Eye,
  ExternalLink,
  Globe,
  House,
  Landmark,
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
    <div className="relative min-h-dvh bg-bg overflow-x-clip">
      {/* letterhead canvas — teal bloom + drafting grid, top of page only */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% -12%, rgba(0,212,200,0.10), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,34,44,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,44,0.045) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 90% 70% at 50% 0%, black, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 70% at 50% 0%, black, transparent 85%)",
          }}
        />
      </div>

      {isOwnProfile && profile.approvalStatus !== "approved" ? (
        <PreviewBanner status={profile.approvalStatus} />
      ) : null}

      {/* register rule */}
      <div className="relative border-b border-border-subtle/70">
        <div className="mx-auto max-w-[860px] px-5 md:px-8 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-[10px] tracking-[0.24em] uppercase text-text-dim font-ui font-semibold hover:text-text transition-colors"
          >
            BuilderHQ · Builder register
          </Link>
          {isOwnProfile ? (
            <Link
              href="/builder/profile"
              className="text-[10px] tracking-[0.16em] uppercase text-text-dim hover:text-text transition-colors"
            >
              Edit profile
            </Link>
          ) : null}
        </div>
      </div>

      <main className="relative mx-auto max-w-[860px] px-5 md:px-8 pt-14 sm:pt-18 lg:pt-20 pb-20">
        {/* ── hero ───────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="mb-10 lg:mb-12"
        >
          <span className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.7)]" />
            Builder Register · {STATUS_KICKER[profile.approvalStatus]}
          </span>
          <h1 className="mt-5 font-ui font-semibold tracking-[-0.04em] leading-[1.04] text-[clamp(2.3rem,4.2vw+1rem,4.2rem)] text-text break-words">
            {displayName}
          </h1>
          <p className="mt-5 text-[11px] tracking-[0.18em] uppercase text-text-dim">
            {[
              profile.businessSuburb && profile.businessState
                ? `${profile.businessSuburb}, ${profile.businessState}`
                : (profile.businessState ?? null),
              profile.approvalStatus === "approved"
                ? `On the register since ${profile.memberSince.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {profile.website || profile.linkedinUrl || profile.instagramUrl ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
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
          ) : null}
        </motion.header>

        {/* ── identity figures — avatar beside the headline numbers ── */}
        <Reveal immediate delay={0.06}>
          <IdentityBand
            profile={profile}
            displayName={displayName}
            serviceAreas={serviceAreas}
            licences={licences}
          />
        </Reveal>

        {/* ── registered entity — the legal line as a credential strip ── */}
        {profile.abn || legalDiffers(profile) ? (
          <Reveal>
            <section className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border-subtle bg-white card-elev px-6 sm:px-7 py-5">
              <span className="size-9 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] text-accent-light flex items-center justify-center shrink-0">
                <Landmark className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
                  Registered entity
                </p>
                <p className="mt-0.5 text-[14px] font-ui font-semibold text-text break-words">
                  {profile.companyName}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {profile.abn ? (
                  <span className="font-mono tabular-nums text-[11px] text-text-dim">
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
            </section>
          </Reveal>
        ) : null}

        <div className="mt-14 lg:mt-16 flex flex-col gap-14 lg:gap-16">
          {profile.bio ? (
            <Reveal>
              <section>
                <SectionLabel>About the company</SectionLabel>
                <div className="mt-5 max-w-[62ch] space-y-4">
                  {profile.bio.split(/\n\n+/).map((para, i) => (
                    <p
                      key={i}
                      className="text-[15px] leading-[1.8] text-text-subtle whitespace-pre-line"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            </Reveal>
          ) : null}

          {categories.length > 0 ? (
            <Reveal>
              <section>
                <SectionLabel>What they build</SectionLabel>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories.map((c) => {
                    const meta = CATEGORY_META[c];
                    return (
                      <li
                        key={c}
                        className="flex items-start gap-3 rounded-xl border border-border-subtle bg-white card-elev px-5 py-4"
                      >
                        <span className="mt-0.5 size-7 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] text-accent-light flex items-center justify-center shrink-0">
                          <meta.icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
                            {meta.label}
                          </span>
                          <span className="block mt-0.5 text-[12px] leading-[1.55] text-text-muted">
                            {meta.description}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
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
            <section>
              <SectionLabel>How tendering works</SectionLabel>
              <ol className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                <IntroStep n="01" title="Post your project">
                  Upload your drawings, scope and timing once. Two minutes to
                  start, no obligation.
                </IntroStep>
                <IntroStep n="02" title="Builders take their spots">
                  A limited number of builders take spots on your round and
                  price the same scope. {displayName} can be one of them.
                </IntroStep>
                <IntroStep n="03" title="Compare and decide">
                  Read every tender side by side and award on the facts. The
                  decision is always yours.
                </IntroStep>
              </ol>
            </section>
          </Reveal>

          <Reveal>
            <CallToAction
              companyName={displayName}
              viewerSignedIn={viewerSignedIn}
            />
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ── Preview banner (for owners viewing their own pre-approval) ──────────

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  incomplete: "a draft",
  pending_review: "pending review",
  approved: "live",
  rejected: "not approved",
  suspended: "suspended",
};

const STATUS_KICKER: Record<ApprovalStatus, string> = {
  incomplete: "Profile in progress",
  pending_review: "Registration under review",
  approved: "Approved builder",
  rejected: "Registration declined",
  suspended: "Registration suspended",
};

function PreviewBanner({ status }: { status: ApprovalStatus }) {
  return (
    <div
      className={cn(
        "relative border-b text-[12px]",
        status === "rejected" || status === "suspended"
          ? "border-danger/35 bg-[rgba(194,85,80,0.06)] text-[#a8433e]"
          : "border-warning/35 bg-[rgba(201,148,34,0.06)] text-[#8a6414]",
      )}
    >
      <div className="max-w-[860px] mx-auto px-5 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="inline-flex items-center gap-2">
            <Eye className="size-3.5" />
            <strong className="font-medium">Preview</strong>
          </span>
          <span className="opacity-80">
            · This profile is {APPROVAL_LABEL[status]}. Only you can see it.
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

// ── Identity band — avatar + headline figures ───────────────────────────

function IdentityBand({
  profile,
  displayName,
  serviceAreas,
  licences,
}: {
  profile: PublicProfile;
  displayName: string;
  serviceAreas: ServiceArea[];
  licences: Licence[];
}) {
  const stateCount = new Set(serviceAreas.map((a) => a.state)).size;
  const verifiedLicences = licences.filter((l) => l.verified).length;

  // Three headline figures max, from the register's own facts — never
  // invented. The band reads as a considered set, like the partner
  // pages, with the honesty subs the register requires.
  const figures: Array<{ label: string; value: string; sub: string }> = [];
  if (profile.yearsInOperation != null) {
    figures.push({
      label: "Years in operation",
      value: `${profile.yearsInOperation}`,
      sub: "as stated by the builder",
    });
  }
  if (licences.length > 0) {
    figures.push({
      label: "Licences on file",
      value: String(licences.length),
      sub:
        verifiedLicences > 0
          ? `${verifiedLicences} verified`
          : "verification pending",
    });
  }
  if (serviceAreas.length > 0) {
    figures.push({
      label: "Service areas",
      value: String(serviceAreas.length),
      sub: `across ${stateCount} ${stateCount === 1 ? "state" : "states"}`,
    });
  }

  return (
    <section className="flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:gap-12 lg:gap-16">
      <div className="relative shrink-0">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-8"
          style={{
            background:
              "radial-gradient(closest-side, rgba(0,212,200,0.14), transparent 72%)",
          }}
        />
        <div className="relative size-[168px] rounded-2xl overflow-hidden border border-border-subtle bg-white card-elev flex items-center justify-center">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logoUrl}
              alt={`${displayName} logo`}
              className="size-full object-contain p-4"
            />
          ) : (
            <span className="font-ui font-semibold text-[52px] tracking-[-0.02em] text-text-dim leading-none">
              {initialsOf(displayName)}
            </span>
          )}
        </div>
      </div>

      {figures.length > 0 ? (
        <dl
          className="grid w-full gap-x-6 sm:w-auto sm:flex-1"
          style={{
            gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))`,
            gridTemplateRows: "auto auto auto",
          }}
        >
          {figures.map((f, i) => (
            <dt
              key={`label-${f.label}`}
              className="text-[10.5px] tracking-[0.16em] uppercase text-text-dim font-medium text-center self-end"
              style={{ gridColumn: i + 1, gridRow: 1 }}
            >
              {f.label}
            </dt>
          ))}
          {figures.map((f, i) => (
            <dd
              key={`value-${f.label}`}
              className="mt-2.5 font-ui font-semibold tracking-[-0.02em] leading-none text-text tabular-nums text-[clamp(2.1rem,1.6vw+1.4rem,2.9rem)] text-center"
              style={{ gridColumn: i + 1, gridRow: 2 }}
            >
              {f.value}
            </dd>
          ))}
          {figures.map((f, i) => (
            <p
              key={`sub-${f.label}`}
              className="mt-2 text-[11px] leading-none text-text-dim text-center"
              style={{ gridColumn: i + 1, gridRow: 3 }}
            >
              {f.sub}
            </p>
          ))}
        </dl>
      ) : (
        <p className="text-[13px] leading-[1.7] text-text-muted max-w-[46ch]">
          {displayName} is listed on the BuilderHQ builder register.
        </p>
      )}
    </section>
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
          : "border border-border-subtle bg-white/60 text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="size-3.5" />
      {label}
      <ExternalLink className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// ── Categories meta ─────────────────────────────────────────────────────

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
      <SectionLabel>Where they work</SectionLabel>
      <div className="mt-5 rounded-xl border border-border-subtle overflow-hidden card-elev">
        <div className="flex flex-col gap-px bg-border-subtle">
          {ordered.map((state) => {
            const inState = byState.get(state)!;
            const stateOnly = inState.find((a) => !a.suburb);
            const suburbs = inState.filter((a) => a.suburb);
            return (
              <div key={state} className="bg-white p-4 sm:p-5">
                <div className="flex items-baseline gap-3 mb-2.5">
                  <span className="font-ui font-semibold text-[17px] tracking-[-0.01em] text-text leading-none">
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
      <SectionLabel>Licences and verification</SectionLabel>
      <div className="mt-5 rounded-xl border border-border-subtle overflow-hidden card-elev">
        <div className="flex flex-col gap-px bg-border-subtle">
          {licences.map((l) => (
            <div key={l.id} className="bg-white p-4 sm:p-5">
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
    <section className="rounded-2xl border border-border-subtle bg-white card-elev overflow-hidden">
      <div className="px-6 sm:px-8 lg:px-10 py-8 sm:py-9 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-6">
        <div>
          <span className="text-[11px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold">
            Work with {companyName}
          </span>
          <h3 className="mt-2.5 font-ui font-semibold tracking-[-0.03em] text-[24px] sm:text-[28px] leading-[1.1] text-text break-words">
            Put your project to tender.
          </h3>
          <p className="mt-2.5 text-[13.5px] leading-[1.7] text-text-muted max-w-[56ch]">
            Upload your drawings, scope and timing once on BuilderHQ. Verified
            builders take a spot on your round and tender, and {companyName}{" "}
            can be one of them.
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
    <footer className="relative border-t border-border-subtle bg-surface-1">
      <div className="px-5 md:px-8 mx-auto max-w-[860px] py-7 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.04em] text-text-dim">
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

// ── section label — the partner letterhead's eyebrow + hairline ─────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="text-[12px] tracking-[0.22em] uppercase font-ui font-semibold shrink-0 text-accent-light">
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
    </div>
  );
}

function IntroStep({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <p className="flex items-baseline gap-2.5">
        <span className="font-mono text-[12px] tabular-nums text-text-dim">
          {n}
        </span>
        <span className="text-[14px] font-semibold text-text">{title}</span>
      </p>
      <p className="text-[13px] leading-[1.6] text-text-muted pl-[30px]">
        {children}
      </p>
    </li>
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

function legalDiffers(p: PublicProfile): boolean {
  return (
    !!p.tradingName &&
    p.tradingName.trim().length > 0 &&
    p.tradingName.trim().toLowerCase() !== p.companyName.trim().toLowerCase()
  );
}

/** Format ABN with the canonical AU spacing: 00 000 000 000. */
function formatAbn(abn: string): string {
  const d = abn.replace(/\D/g, "");
  if (d.length !== 11) return abn;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`;
}
