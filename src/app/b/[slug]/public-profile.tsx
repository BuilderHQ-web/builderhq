"use client";

/**
 * PublicBuilderProfile — `/b/[slug]` cinematic public profile.
 *
 * Read-only consumer of everything the builder edits at /builder/profile.
 * Designed as a portfolio-grade landing for the company:
 *
 *   ┌─ HERO ──────────────────────────────────────────────┐
 *   │  logo        BUILDER · APPROVED · FOUNDING MEMBER   │
 *   │  (200px)    COMPANY NAME (Bebas, hero scale)        │
 *   │              tagline · location · years             │
 *   │              [Website] [LinkedIn] [Instagram]       │
 *   └─────────────────────────────────────────────────────┘
 *
 *   ┌─ STATS STRIP ───────────────────────────────────────┐
 *
 *   ┌─ ABOUT ────────────────────────────┐
 *   ┌─ WHAT WE BUILD ─ categories grid ──┐
 *   ┌─ WHERE WE WORK ─ areas grouped ────┐
 *   ┌─ LICENCES ──────────────────────────┐
 *   ┌─ CTA ───────────────────────────────┐
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
  Sparkles,
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
import { FoundingBadge } from "@/components/builder/fba-card";

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
  companyName: string;
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
  isFounding: boolean;
  memberSince: Date;
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
  return (
    <div className="relative min-h-dvh bg-bg">
      {isOwnProfile && profile.approvalStatus !== "approved" ? (
        <PreviewBanner status={profile.approvalStatus} />
      ) : null}

      <Hero profile={profile} />

      <main className="relative px-6 lg:px-10 mx-auto max-w-[1100px] flex flex-col gap-12 lg:gap-16 py-12 lg:py-16">
        <Reveal immediate delay={0.06}>
          <StatsStrip
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
            companyName={profile.companyName}
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
          ? "border-danger/35 bg-[rgba(255,80,80,0.06)] text-danger"
          : "border-warning/35 bg-[rgba(255,181,71,0.06)] text-warning",
      )}
    >
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-2.5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <Eye className="size-3.5" />
          <strong className="font-medium">Preview mode</strong>
          <span className="opacity-80">
            · This profile is {meta.label.toLowerCase()} — only visible to you.
          </span>
        </span>
        <Link
          href="/builder/profile"
          className="text-[11.5px] tracking-[0.04em] underline-offset-4 hover:underline"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────

function Hero({ profile }: { profile: PublicProfile }) {
  const initials = initialsOf(profile.companyName);
  const tagline = composeTagline(profile);
  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      {/* Ambient gradient + grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,200,0.14), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 0%, rgba(26,95,212,0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(142,252,244,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 80%)",
        }}
      />
      {/* Light sweep on mount */}
      <motion.span
        aria-hidden
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: "120%", opacity: [0, 0.4, 0.4, 0] }}
        transition={{
          duration: 1.8,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.25,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute inset-y-0 w-[35%] rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.18), transparent)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative px-6 lg:px-10 pt-14 lg:pt-20 pb-12 lg:pb-16 mx-auto max-w-[1100px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-accent font-ui font-medium mb-7 hover:opacity-80 transition-opacity"
        >
          <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
          BuilderHQ
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-7 sm:gap-10 items-start"
        >
          {/* Logo */}
          <div className="relative">
            <div
              className={cn(
                "relative size-[180px] sm:size-[200px] rounded-md overflow-hidden border border-border-accent/40",
                "bg-[linear-gradient(180deg,rgba(0,212,200,0.10),rgba(6,18,30,0.78))]",
                "shadow-[0_24px_60px_-24px_rgba(0,212,200,0.40),0_0_0_1px_rgba(0,212,200,0.18)]",
                "flex items-center justify-center",
              )}
            >
              {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoUrl}
                  alt={`${profile.companyName} logo`}
                  className="size-full object-contain p-3"
                />
              ) : (
                <span className="font-display text-[68px] tracking-[0.04em] text-accent-light/85 leading-none">
                  {initials}
                </span>
              )}
            </div>
            {profile.isFounding ? (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                <FoundingBadge size="sm" />
              </div>
            ) : null}
          </div>

          {/* Identity block */}
          <div className="min-w-0 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <ApprovalChip status={profile.approvalStatus} />
              {profile.businessState ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[10px] tracking-[0.16em] uppercase text-text-muted">
                  <MapPin className="size-3" />
                  {profile.businessSuburb
                    ? `${profile.businessSuburb}, ${profile.businessState}`
                    : profile.businessState}
                </span>
              ) : null}
              {profile.yearsInOperation != null ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[10px] tracking-[0.16em] uppercase text-text-muted">
                  <Calendar className="size-3" />
                  {profile.yearsInOperation}{" "}
                  {profile.yearsInOperation === 1 ? "year" : "years"}
                </span>
              ) : null}
            </div>

            <h1 className="font-display uppercase tracking-[-0.02em] text-[clamp(2.4rem,5.5vw+1rem,5.5rem)] leading-[0.92] text-text">
              {profile.companyName}
            </h1>

            {tagline ? (
              <p className="text-[14.5px] leading-[1.7] text-text-muted max-w-[58ch]">
                {tagline}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 mt-1">
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
    cls: "border-border-subtle text-text-dim bg-[rgba(255,255,255,0.012)]",
    icon: Eye,
  },
  pending_review: {
    label: "Pending review",
    cls: "border-warning/35 text-warning bg-[rgba(255,181,71,0.06)]",
    icon: Eye,
  },
  approved: {
    label: "Approved builder",
    cls: "border-border-accent/45 text-accent bg-[rgba(0,212,200,0.08)]",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    cls: "border-danger/35 text-danger bg-[rgba(255,80,80,0.06)]",
    icon: Eye,
  },
  suspended: {
    label: "Suspended",
    cls: "border-danger/35 text-danger bg-[rgba(255,80,80,0.06)]",
    icon: Eye,
  },
};

function ApprovalChip({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border text-[10px] tracking-[0.16em] uppercase font-medium",
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
          ? "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_6px_18px_-8px_rgba(0,212,200,0.45)]"
          : "border border-border-subtle text-text-muted hover:bg-surface-1 hover:text-text",
      )}
    >
      <Icon className="size-3.5" />
      {label}
      <ExternalLink className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// ── Stats strip ─────────────────────────────────────────────────────────

function StatsStrip({
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
  const memberSince = profile.memberSince.toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

  const items: Array<{
    label: string;
    value: string;
    sub?: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Years in operation",
      value:
        profile.yearsInOperation != null ? String(profile.yearsInOperation) : "—",
      sub: "since founding",
      icon: Calendar,
    },
    {
      label: "Project types",
      value: String(categories.length),
      sub: categories.length === 1 ? "specialty" : "covered",
      icon: Layers,
    },
    {
      label: "States covered",
      value: String(stateCount),
      sub: serviceAreas.length === 1 ? "service area" : "service areas",
      icon: MapPin,
    },
    {
      label: "Active licences",
      value: String(licences.length),
      sub: profile.isFounding ? "+ founding member" : `member since ${memberSince}`,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {items.map((it) => (
        <StatCard key={it.label} {...it} />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))] p-5">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-text-dim">
        <Icon className="size-3 text-accent-light" />
        {label}
      </div>
      <div className="mt-3 font-display tabular-nums leading-none text-text" style={{ fontSize: 38 }}>
        {value}
      </div>
      {sub ? (
        <div className="mt-2 text-[11px] text-text-dim leading-[1.45]">{sub}</div>
      ) : null}
    </div>
  );
}

// ── About ───────────────────────────────────────────────────────────────

function AboutSection({ bio }: { bio: string }) {
  return (
    <section>
      <Header
        kicker="About"
        icon={Sparkles}
        title="The story so far"
      />
      <div className="mt-6 max-w-[68ch]">
        <p className="text-[16px] leading-[1.75] text-text-muted whitespace-pre-line">
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
    description: "New homes, knock-down rebuilds.",
    icon: House,
  },
  multi_dwelling: {
    label: "Multi-dwelling",
    description: "Townhouses, dual occupancy, multi-units.",
    icon: Building2,
  },
  renovation: {
    label: "Renovation",
    description: "Internal + external scope.",
    icon: Wrench,
  },
  extension: {
    label: "Extension",
    description: "Ground or first-floor adds.",
    icon: Layers,
  },
};

function CategoriesSection({ categories }: { categories: ProjectType[] }) {
  return (
    <section>
      <Header kicker="What we build" icon={Hammer} title="Project types" />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {categories.map((c) => {
          const meta = CATEGORY_META[c];
          return (
            <div
              key={c}
              className={cn(
                "group relative rounded-md border border-border-subtle p-5",
                "bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
                "transition-[border-color,box-shadow,transform] duration-[220ms] ease-[cubic-bezier(0.2,0.65,0.3,0.9)]",
                "hover:border-border-accent/55 hover:-translate-y-0.5",
                "hover:shadow-[0_18px_44px_-18px_rgba(0,212,200,0.30)]",
              )}
            >
              <span className="inline-flex size-9 rounded-md items-center justify-center mb-3 border border-border-subtle bg-[rgba(0,212,200,0.06)] text-accent-light group-hover:border-accent/40 group-hover:text-accent transition-colors duration-[140ms]">
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
        kicker="Where we work"
        icon={MapPin}
        title="Service areas"
        sub={`${areas.length} ${areas.length === 1 ? "area" : "areas"} across ${ordered.length} ${ordered.length === 1 ? "state" : "states"}`}
      />
      <div className="mt-6 flex flex-col gap-3">
        {ordered.map((state) => {
          const inState = byState.get(state)!;
          const stateOnly = inState.find((a) => !a.suburb);
          const suburbs = inState.filter((a) => a.suburb);
          return (
            <div
              key={state}
              className={cn(
                "rounded-md border border-border-subtle p-5",
                "bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))]",
              )}
            >
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-display text-[24px] tracking-[0.04em] text-text leading-none">
                  {state}
                </span>
                {stateOnly ? (
                  <span className="text-[10.5px] tracking-[0.18em] uppercase text-accent">
                    Statewide coverage
                  </span>
                ) : (
                  <span className="text-[11px] text-text-dim">
                    {suburbs.length} {suburbs.length === 1 ? "suburb" : "suburbs"}
                  </span>
                )}
              </div>
              {suburbs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {suburbs.map((a, i) => (
                    <span
                      key={`${a.suburb}-${a.postcode ?? "x"}-${i}`}
                      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[12px] text-text-muted"
                    >
                      <MapPin className="size-3 text-text-faint" />
                      {a.suburb}
                      {a.postcode ? (
                        <span className="font-mono tabular-nums text-text-dim ml-0.5">
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
        sub="Active builder licences across registered states."
      />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {licences.map((l) => (
          <div
            key={l.id}
            className={cn(
              "rounded-md border border-border-subtle p-5",
              "bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="size-9 rounded-md border border-border-accent/35 bg-[rgba(0,212,200,0.08)] text-accent-light flex items-center justify-center shrink-0">
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
                </div>
                <div className="mt-1 text-[12px] text-text-muted font-mono tabular-nums">
                  #{l.licenceNumber}
                </div>
                {l.licenceHolderName ? (
                  <div className="mt-0.5 text-[12px] text-text-dim">
                    Held by {l.licenceHolderName}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center gap-3 text-[10.5px] tracking-[0.04em] text-text-dim">
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
    <section
      className={cn(
        "relative overflow-hidden rounded-md border border-border-accent/35",
        "bg-[linear-gradient(140deg,rgba(0,212,200,0.10)_0%,rgba(26,95,212,0.08)_55%,rgba(6,18,30,0.6)_100%)]",
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,212,200,0.10), transparent 70%), radial-gradient(ellipse 60% 80% at 100% 50%, rgba(26,95,212,0.10), transparent 70%)",
        }}
      />
      <div className="relative px-7 lg:px-10 py-10 lg:py-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-6">
        <div>
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
            <Sparkles className="size-3" />
            Have a project?
          </span>
          <h3 className="mt-2 font-display uppercase tracking-[-0.012em] text-[28px] leading-[1.05] text-text">
            Tender it to {companyName}
          </h3>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
            Upload your project once on BuilderHQ — drawings, scope, timing.
            Suitable builders unlock and tender. {companyName} sees it the
            moment it lands in their feed.
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
              "shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_8px_24px_-8px_rgba(0,212,200,0.5)]",
            )}
          >
            {viewerSignedIn ? "Upload a project" : "Get started — free"}
            <ExternalLink className="size-3.5" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-subtle text-[12.5px] tracking-[0.04em] text-text-muted hover:text-text hover:bg-surface-1 transition-colors"
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
    <footer className="border-t border-border-subtle bg-bg-deep/40 mt-8">
      <div className="px-6 lg:px-10 mx-auto max-w-[1100px] py-8 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.04em] text-text-dim">
        <span className="inline-flex items-center gap-2">
          <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
          BuilderHQ · Australia&apos;s residential tender platform
        </span>
        <Link
          href="/"
          className="hover:text-accent-light transition-colors inline-flex items-center gap-1"
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
        <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-ui font-medium text-accent">
          <Icon className="size-3.5" />
          {kicker}
        </span>
        <h2 className="mt-2 font-display uppercase tracking-[-0.012em] text-[clamp(1.6rem,2vw+0.8rem,2.2rem)] leading-[1.0] text-text">
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
  const parts: string[] = [];
  if (p.yearsInOperation && p.yearsInOperation > 0) {
    parts.push(`${p.yearsInOperation}-year-old residential builder`);
  } else {
    parts.push("Residential builder");
  }
  if (p.businessSuburb && p.businessState) {
    parts.push(`based in ${p.businessSuburb}, ${p.businessState}`);
  } else if (p.businessState) {
    parts.push(`based in ${p.businessState}`);
  }
  if (p.isFounding) parts.push("Founding member of BuilderHQ");
  return parts.length > 0 ? parts.join(" · ") : null;
}
