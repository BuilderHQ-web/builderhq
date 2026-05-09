"use client";

/**
 * BuilderProfileEditor — full public-profile editor.
 *
 * Six sections, each with its own save:
 *
 *   1. Identity        — logo upload + company name (immediate save)
 *   2. Business        — ABN / ACN / years + business + postal address
 *   3. About           — bio + website + socials
 *   4. What you build  — project category toggles
 *   5. Where you build — service area list
 *   6. Licences        — licence list with add/remove
 *
 * Reuses the existing wizard actions (`saveBuilderProfileAction`,
 * `saveBuilderCategoriesAction`, `saveBuilderServiceAreasAction`,
 * `addLicenceAction`, `removeLicenceAction`) plus the new
 * `uploadBuilderLogoAction` / `clearBuilderLogoAction`.
 *
 * Profile-level fields (sections 1-3) all flow through the same
 * `saveBuilderProfileAction`, so each section's save sends the
 * full current profile state — preserves fields the user didn't
 * touch in this session.
 */

import { useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  Hammer,
  House,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Reveal } from "@/components/app/reveal";
import { PageHeader } from "@/components/app/page-header";
import { PostcodeSuburb } from "@/components/app/postcode-suburb";
import { FoundingBadge } from "@/components/builder/fba-card";
import { toast } from "@/components/ui/toast";

import {
  addLicenceAction,
  removeLicenceAction,
  saveBuilderCategoriesAction,
  saveBuilderProfileAction,
  saveBuilderServiceAreasAction,
  type ActionState,
} from "@/app/onboarding/builder/actions";
import {
  clearBuilderLogoAction,
  uploadBuilderLogoAction,
} from "@/app/(app)/_actions/builder-profile";

// ── shared types ────────────────────────────────────────────────────────

type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
const AU_STATES: AustralianState[] = [
  "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT",
];

type ProjectType = "single_dwelling" | "multi_dwelling" | "renovation" | "extension";
type ApprovalStatus =
  | "incomplete"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

interface ProfileShape {
  companyName: string;
  abn: string;
  acn: string;
  yearsInOperation: number | null;
  businessAddressLine1: string;
  businessSuburb: string;
  businessState: AustralianState | null;
  businessPostcode: string;
  hasDifferentPostal: boolean;
  postalAddressLine1: string;
  postalSuburb: string;
  postalState: AustralianState | null;
  postalPostcode: string;
  bio: string;
  website: string;
  linkedinUrl: string;
  instagramUrl: string;
  slug: string | null;
  approvalStatus: ApprovalStatus;
  logoUrl: string | null;
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
  initial: ProfileShape;
  categories: ProjectType[];
  serviceAreas: ServiceArea[];
  licences: Licence[];
}

// ── public component ────────────────────────────────────────────────────

export function BuilderProfileEditor({
  initial,
  categories: initialCategories,
  serviceAreas: initialAreas,
  licences: initialLicences,
}: Props) {
  // The full profile shape lives at the top so any section's save can
  // re-emit the whole thing (saveBuilderProfileAction is an upsert of
  // the entire row).
  const [profile, setProfile] = useState<ProfileShape>(initial);
  const setField = <K extends keyof ProfileShape>(k: K, v: ProfileShape[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  return (
    <>
      <ProfileHero profile={profile} />

      <div className="px-6 lg:px-10 py-8 lg:py-10 mx-auto max-w-[1100px] flex flex-col gap-5">
        <Reveal immediate delay={0.04}>
          <IdentitySection profile={profile} setField={setField} />
        </Reveal>

        <Reveal immediate delay={0.10}>
          <BusinessSection profile={profile} setField={setField} />
        </Reveal>

        <Reveal immediate delay={0.16}>
          <AboutSection profile={profile} setField={setField} />
        </Reveal>

        <Reveal>
          <CategoriesSection initial={initialCategories} />
        </Reveal>

        <Reveal>
          <ServiceAreasSection initial={initialAreas} />
        </Reveal>

        <Reveal>
          <LicencesSection initial={initialLicences} />
        </Reveal>
      </div>
    </>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────

function ProfileHero({ profile }: { profile: ProfileShape }) {
  const statusMeta = APPROVAL_META[profile.approvalStatus];
  return (
    <PageHeader
      eyebrow="Public profile"
      title="What owners see"
      description="Your company, address, licences, service areas, and bio — composed into your public BuilderHQ presence. Each section saves on its own; nothing's lost between cards."
      actions={
        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm border text-[10px] tracking-[0.16em] uppercase font-medium",
              statusMeta.cls,
            )}
          >
            <statusMeta.icon className="size-3" />
            {statusMeta.label}
          </span>
          {profile.slug ? (
            <span className="font-mono text-[11px] text-text-dim tabular-nums">
              builderhq.com.au/b/{profile.slug}
            </span>
          ) : null}
        </div>
      }
    />
  );
}

const APPROVAL_META: Record<
  ApprovalStatus,
  { label: string; icon: LucideIcon; cls: string }
> = {
  incomplete: {
    label: "Draft",
    icon: AlertTriangle,
    cls: "border-border-subtle text-text-dim bg-[rgba(255,255,255,0.012)]",
  },
  pending_review: {
    label: "Pending review",
    icon: Eye,
    cls: "border-warning/35 text-warning bg-[rgba(255,181,71,0.06)]",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    cls: "border-border-accent/45 text-accent bg-[rgba(0,212,200,0.06)]",
  },
  rejected: {
    label: "Rejected",
    icon: AlertTriangle,
    cls: "border-danger/35 text-danger bg-[rgba(255,80,80,0.06)]",
  },
  suspended: {
    label: "Suspended",
    icon: AlertTriangle,
    cls: "border-danger/35 text-danger bg-[rgba(255,80,80,0.06)]",
  },
};

// ── shared SectionCard ──────────────────────────────────────────────────

function SectionCard({
  kicker,
  icon: Icon,
  title,
  description,
  children,
  trailing,
}: {
  kicker: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle overflow-hidden bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))]">
      <header className="px-7 py-5 flex items-start justify-between gap-3 border-b border-border-subtle/60">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-ui font-medium text-accent">
            <Icon className="size-3.5" />
            {kicker}
          </span>
          <h2 className="mt-1.5 font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-[12.5px] leading-[1.6] text-text-dim max-w-prose">
              {description}
            </p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0 mt-1">{trailing}</div> : null}
      </header>
      <div className="px-7 py-6">{children}</div>
    </section>
  );
}

// ── shared save-row ────────────────────────────────────────────────────

function SaveRow({
  pending,
  saved,
  error,
  label = "Save changes",
  onSubmit,
}: {
  pending: boolean;
  saved: boolean;
  error?: string | null;
  label?: string;
  onSubmit?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border-subtle/60">
      <Button type="submit" size="md" disabled={pending} onClick={onSubmit}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {pending ? "Saving…" : label}
      </Button>
      {saved ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-success">
          <CheckCircle2 className="size-3.5" />
          Saved
        </span>
      ) : null}
      {error ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="size-3.5" />
          {error}
        </span>
      ) : null}
    </div>
  );
}

// ── Identity (logo + company) ───────────────────────────────────────────

function IdentitySection({
  profile,
  setField,
}: {
  profile: ProfileShape;
  setField: <K extends keyof ProfileShape>(k: K, v: ProfileShape[K]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = profileFormData(profile);
    startTransition(async () => {
      const r = await saveBuilderProfileAction({}, fd);
      if (r.ok) {
        setSaved(true);
        toast.success("Identity saved");
      } else if (r.fieldErrors) {
        setError(Object.values(r.fieldErrors)[0] ?? "Couldn't save.");
      } else {
        setError(r.error ?? "Couldn't save.");
      }
    });
  };

  return (
    <SectionCard
      kicker="Identity"
      icon={Sparkles}
      title="Logo & company name"
      description="The logo is the first thing owners see when your card lands in their feed. Square works best — PNG, JPEG, WebP, or SVG, under 2 MB."
      trailing={
        profile.approvalStatus === "approved" ? <FoundingBadge size="sm" /> : null
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 items-start">
          <LogoUpload
            url={profile.logoUrl}
            companyName={profile.companyName}
            onChange={(url) => setField("logoUrl", url)}
          />
          <div className="flex flex-col gap-5">
            <Field
              label="Company name"
              required
              hint="Shown to owners across the marketplace and on every project card."
            >
              <Input
                value={profile.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="e.g. Synergy Building"
                autoComplete="organization"
                required
              />
            </Field>
            {profile.slug ? (
              <Field
                label="Public URL"
                hint="Auto-generated from your company name. Stays stable so links don't break."
              >
                <Input
                  value={`builderhq.com.au/b/${profile.slug}`}
                  disabled
                  className="font-mono text-[12.5px]"
                />
              </Field>
            ) : null}
          </div>
        </div>
        <SaveRow pending={pending} saved={saved} error={error} />
      </form>
    </SectionCard>
  );
}

function LogoUpload({
  url,
  companyName,
  onChange,
}: {
  url: string | null;
  companyName: string;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials =
    companyName
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "··";

  const onPick = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const r = await uploadBuilderLogoAction(fd);
    setPending(false);
    if (r.ok) {
      onChange(r.value.url);
      toast.success("Logo uploaded");
    } else {
      setError(r.error.message);
      toast.error("Upload failed", r.error.message);
    }
  };

  const onRemove = async () => {
    if (!confirm("Remove your logo?")) return;
    setPending(true);
    const r = await clearBuilderLogoAction();
    setPending(false);
    if (r.ok) {
      onChange(null);
      toast.message("Logo removed");
    } else {
      toast.error("Couldn't remove", r.error.message);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          "relative size-[160px] rounded-md overflow-hidden border border-border-subtle",
          "bg-[linear-gradient(180deg,rgba(0,212,200,0.06),rgba(6,18,30,0.55))]",
          "flex items-center justify-center",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Builder logo"
            className="size-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-text-faint">
            <ImageIcon className="size-7" />
            <span className="font-display text-[28px] tracking-[0.04em] text-accent-light/80">
              {initials}
            </span>
          </div>
        )}
        {pending ? (
          <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-accent" />
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPick}
          disabled={pending}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm",
            "border border-border-subtle bg-surface-1 text-[11.5px] text-text-muted",
            "hover:border-border-strong hover:text-text transition-colors duration-[140ms]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <Upload className="size-3" />
          {url ? "Replace" : "Upload"}
        </button>
        {url ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            aria-label="Remove logo"
            className={cn(
              "size-8 rounded-sm border border-border-subtle bg-surface-1",
              "text-text-faint hover:text-danger hover:border-danger/40",
              "transition-colors duration-[140ms]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center",
            )}
          >
            <Trash2 className="size-3" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-[10.5px] text-danger leading-[1.4]">{error}</p>
      ) : null}
    </div>
  );
}

// ── Business (ABN, ACN, years, addresses) ───────────────────────────────

function BusinessSection({
  profile,
  setField,
}: {
  profile: ProfileShape;
  setField: <K extends keyof ProfileShape>(k: K, v: ProfileShape[K]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = profileFormData(profile);
    startTransition(async () => {
      const r = await saveBuilderProfileAction({}, fd);
      if (r.ok) {
        setSaved(true);
        toast.success("Business details saved");
      } else if (r.fieldErrors) {
        setError(Object.values(r.fieldErrors)[0] ?? "Couldn't save.");
      } else {
        setError(r.error ?? "Couldn't save.");
      }
    });
  };

  return (
    <SectionCard
      kicker="Business"
      icon={Building2}
      title="Credentials & address"
      description="ABN unlocks faster admin approval. Address fields back the service-area match score and feed the contact card after a tender is awarded."
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="ABN" required hint="11 digits, no spaces">
            <Input
              value={profile.abn}
              onChange={(e) => setField("abn", e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              maxLength={11}
              placeholder="12345678901"
              className="font-mono tabular-nums"
            />
          </Field>
          <Field label="ACN" badge="Optional" hint="9 digits if registered">
            <Input
              value={profile.acn}
              onChange={(e) => setField("acn", e.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              maxLength={9}
              placeholder="123456789"
              className="font-mono tabular-nums"
            />
          </Field>
          <Field label="Years in operation" badge="Optional">
            <Input
              type="number"
              min={0}
              max={150}
              value={profile.yearsInOperation ?? ""}
              onChange={(e) =>
                setField(
                  "yearsInOperation",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              placeholder="0"
              className="tabular-nums"
            />
          </Field>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.04em] text-text-muted font-medium mb-2">
            Business address
          </p>
          <div className="flex flex-col gap-3">
            <Field label="Street" badge="Optional">
              <Input
                value={profile.businessAddressLine1}
                onChange={(e) => setField("businessAddressLine1", e.target.value)}
                placeholder="14 Main Street"
                autoComplete="address-line1"
              />
            </Field>
            <PostcodeSuburb
              postcodeName="businessPostcode"
              suburbName="businessSuburb"
              stateName="businessState"
              defaultPostcode={profile.businessPostcode}
              defaultSuburb={profile.businessSuburb}
              defaultState={profile.businessState}
            />
          </div>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={profile.hasDifferentPostal}
              onChange={(e) => setField("hasDifferentPostal", e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            <span>Postal address differs from business</span>
          </label>
        </div>

        {profile.hasDifferentPostal ? (
          <div>
            <p className="text-[11px] tracking-[0.04em] text-text-muted font-medium mb-2">
              Postal address
            </p>
            <div className="flex flex-col gap-3">
              <Field label="Street" badge="Optional">
                <Input
                  value={profile.postalAddressLine1}
                  onChange={(e) => setField("postalAddressLine1", e.target.value)}
                  placeholder="PO Box 123"
                />
              </Field>
              <PostcodeSuburb
                postcodeName="postalPostcode"
                suburbName="postalSuburb"
                stateName="postalState"
                defaultPostcode={profile.postalPostcode}
                defaultSuburb={profile.postalSuburb}
                defaultState={profile.postalState}
              />
            </div>
          </div>
        ) : null}

        <SaveRow pending={pending} saved={saved} error={error} />
      </form>
    </SectionCard>
  );
}

// ── About (bio + socials) ───────────────────────────────────────────────

function AboutSection({
  profile,
  setField,
}: {
  profile: ProfileShape;
  setField: <K extends keyof ProfileShape>(k: K, v: ProfileShape[K]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bioCount = profile.bio.length;
  const bioLimit = 2000;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = profileFormData(profile);
    startTransition(async () => {
      const r = await saveBuilderProfileAction({}, fd);
      if (r.ok) {
        setSaved(true);
        toast.success("About saved");
      } else if (r.fieldErrors) {
        setError(Object.values(r.fieldErrors)[0] ?? "Couldn't save.");
      } else {
        setError(r.error ?? "Couldn't save.");
      }
    });
  };

  return (
    <SectionCard
      kicker="About"
      icon={Hammer}
      title="Bio & links"
      description="Owners read this when comparing tenders. Talk about the kind of work you love, your team, what makes you different. Keep it human."
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field
          label="Bio"
          badge="Optional"
          trailing={
            <span
              className={cn(
                "tabular-nums",
                bioCount > bioLimit ? "text-danger" : "text-text-faint",
              )}
            >
              {bioCount} / {bioLimit}
            </span>
          }
        >
          <Textarea
            value={profile.bio}
            onChange={(e) => setField("bio", e.target.value)}
            placeholder="Family-run residential builder based in Melbourne since 2015. We focus on knock-down rebuilds and full renovations on heritage sites."
            rows={5}
            className="min-h-[120px]"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Website" badge="Optional">
            <Input
              type="url"
              value={profile.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="https://yourcompany.com.au"
              autoComplete="url"
            />
          </Field>
          <Field label="LinkedIn" badge="Optional">
            <Input
              type="url"
              value={profile.linkedinUrl}
              onChange={(e) => setField("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/company/…"
            />
          </Field>
          <Field label="Instagram" badge="Optional">
            <Input
              type="url"
              value={profile.instagramUrl}
              onChange={(e) => setField("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
        </div>

        <SaveRow pending={pending} saved={saved} error={error} />
      </form>
    </SectionCard>
  );
}

// ── Categories ──────────────────────────────────────────────────────────

const CATEGORY_META: Array<{
  value: ProjectType;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: "single_dwelling", label: "Single dwelling", description: "Houses, knock-down rebuilds", icon: House },
  { value: "multi_dwelling", label: "Multi-dwelling", description: "Townhouses, multi-units", icon: Building2 },
  { value: "renovation", label: "Renovation", description: "Internal + external renos", icon: Wrench },
  { value: "extension", label: "Extension", description: "Ground or first-floor adds", icon: Layers },
];

function CategoriesSection({ initial }: { initial: ProjectType[] }) {
  const [selected, setSelected] = useState<Set<ProjectType>>(new Set(initial));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (v: ProjectType) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
    setSaved(false);
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    if (selected.size === 0) {
      setError("Pick at least one project type.");
      return;
    }
    const fd = new FormData();
    for (const v of selected) fd.append("categories", v);
    startTransition(async () => {
      const r = await saveBuilderCategoriesAction({}, fd);
      if (r.ok) {
        setSaved(true);
        toast.success("Project types saved");
      } else {
        setError(r.error ?? "Couldn't save.");
      }
    });
  };

  return (
    <SectionCard
      kicker="What you build"
      icon={Layers}
      title="Project types"
      description="Pick everything that matches what you take on. Owners filter the marketplace by type, so this drives whether they ever see your card."
    >
      <form onSubmit={submit}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {CATEGORY_META.map((c) => {
            const isOn = selected.has(c.value);
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle(c.value)}
                className={cn(
                  "group cursor-pointer rounded-md border p-4 text-left",
                  "transition-[border-color,background-color,transform] duration-[160ms]",
                  "active:scale-[0.99]",
                  isOn
                    ? "border-border-accent/55 bg-[rgba(0,212,200,0.06)]"
                    : "border-border-subtle hover:border-border-strong hover:bg-surface-1",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Icon
                    className={cn(
                      "size-4 mt-0.5 shrink-0",
                      isOn
                        ? "text-accent"
                        : "text-text-faint group-hover:text-text-muted",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-text">
                      {c.label}
                    </div>
                    <div className="text-[11px] text-text-dim mt-0.5 leading-[1.4]">
                      {c.description}
                    </div>
                  </div>
                  {isOn ? (
                    <Check className="size-3.5 text-accent ml-auto shrink-0" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
        <SaveRow pending={pending} saved={saved} error={error} />
      </form>
    </SectionCard>
  );
}

// ── Service areas ───────────────────────────────────────────────────────

function ServiceAreasSection({ initial }: { initial: ServiceArea[] }) {
  const [areas, setAreas] = useState<ServiceArea[]>(initial);
  const [draftState, setDraftState] = useState<AustralianState | "">("");
  const [draftPostcode, setDraftPostcode] = useState("");
  const [draftSuburb, setDraftSuburb] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PostcodeSuburb emits via hidden inputs not state — read them out
  // when the user clicks Add.
  const formRef = useRef<HTMLFormElement>(null);

  const add = () => {
    setError(null);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const state = String(fd.get("areaState") ?? "") as AustralianState | "";
    const postcode = String(fd.get("areaPostcode") ?? "");
    const suburb = String(fd.get("areaSuburb") ?? "");
    if (!state) {
      setError("Pick a state.");
      return;
    }
    setAreas((arr) => [
      ...arr,
      {
        state: state as AustralianState,
        suburb: suburb || null,
        postcode: postcode || null,
      },
    ]);
    setSaved(false);
    setDraftState("");
    setDraftPostcode("");
    setDraftSuburb("");
    // Reset the postcode/suburb component
    form.reset();
  };

  const remove = (i: number) => {
    setAreas((arr) => arr.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const save = () => {
    setSaved(false);
    setError(null);
    if (areas.length === 0) {
      setError("Add at least one service area.");
      return;
    }
    const fd = new FormData();
    fd.set("areasJson", JSON.stringify(areas));
    startTransition(async () => {
      const r = await saveBuilderServiceAreasAction({}, fd);
      if (r.ok) {
        setSaved(true);
        toast.success("Service areas saved");
      } else {
        setError(r.error ?? "Couldn't save.");
      }
    });
  };

  // Suppress unused-state warnings — these mirror the inputs but the
  // canonical values come via FormData on add().
  void draftState; void draftPostcode; void draftSuburb;

  return (
    <SectionCard
      kicker="Where you build"
      icon={MapPin}
      title="Service areas"
      description="Add the suburbs, postcodes, or whole states you'll travel to. State-only entries (no suburb) match every project in that state."
    >
      <div className="flex flex-col gap-5">
        {/* Existing areas */}
        {areas.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {areas.map((a, i) => (
              <li
                key={`${a.state}-${a.suburb ?? "all"}-${a.postcode ?? "any"}-${i}`}
                className="flex items-center gap-3 px-3 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)]"
              >
                <MapPin className="size-3.5 text-text-faint shrink-0" />
                <span className="text-[12.5px] text-text">
                  {a.suburb ? a.suburb : "All of "}
                  <span className="font-mono tabular-nums text-text-muted">
                    {a.state}
                  </span>
                  {a.postcode ? (
                    <span className="text-text-dim ml-1.5 font-mono tabular-nums">
                      {a.postcode}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${a.suburb ?? a.state}`}
                  className="ml-auto size-6 rounded-sm text-text-faint hover:text-danger transition-colors flex items-center justify-center"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-text-dim">No service areas yet.</p>
        )}

        {/* Add row */}
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="grid grid-cols-1 lg:grid-cols-[120px_1fr_auto] gap-3 items-end"
        >
          <Field label="State">
            <Select
              name="areaState"
              defaultValue=""
              onChange={(e) => setDraftState(e.target.value as AustralianState | "")}
            >
              <option value="">—</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <PostcodeSuburb
            postcodeName="areaPostcode"
            suburbName="areaSuburb"
            stateName="areaStateInner"
          />
          <Button type="submit" size="md" variant="secondary" className="gap-1.5">
            <Plus className="size-3.5" />
            Add
          </Button>
        </form>

        <SaveRow
          pending={pending}
          saved={saved}
          error={error}
          label="Save service areas"
          onSubmit={save}
        />
      </div>
    </SectionCard>
  );
}

// ── Licences ────────────────────────────────────────────────────────────

function LicencesSection({ initial }: { initial: Licence[] }) {
  const [licences, setLicences] = useState<Licence[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const add = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await addLicenceAction({}, fd);
      if (r.ok && r.licence) {
        setLicences((arr) => [
          ...arr,
          {
            id: r.licence!.id,
            state: r.licence!.state as AustralianState,
            licenceType: r.licence!.licenceType,
            licenceNumber: r.licence!.licenceNumber,
            licenceHolderName: r.licence!.licenceHolderName,
            issuedAt: r.licence!.issuedAt,
            expiresAt: r.licence!.expiresAt,
          },
        ]);
        toast.success("Licence added");
        form.reset();
      } else if (r.fieldErrors) {
        setError(Object.values(r.fieldErrors)[0] ?? "Couldn't add.");
      } else {
        setError(r.error ?? "Couldn't add.");
      }
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this licence?")) return;
    try {
      await removeLicenceAction(id);
      setLicences((arr) => arr.filter((l) => l.id !== id));
      toast.message("Licence removed");
    } catch (err) {
      toast.error(
        "Couldn't remove",
        err instanceof Error ? err.message : "Try again.",
      );
    }
  };

  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
      : "—";

  return (
    <SectionCard
      kicker="Licences"
      icon={ShieldCheck}
      title="Builder licences"
      description="Add every state where you hold a current licence. Owners filter on this — without a licence in their state, your card won't surface for their projects."
    >
      <div className="flex flex-col gap-5">
        {licences.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {licences.map((l) => (
              <li
                key={l.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)]"
              >
                <span className="size-7 rounded-sm border border-border-subtle bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-text">
                      {l.licenceType}
                    </span>
                    <span className="text-[10px] tracking-[0.16em] uppercase px-1.5 h-5 inline-flex items-center rounded-sm border border-border-subtle text-text-dim">
                      {l.state}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-text-dim">
                    <span className="font-mono tabular-nums">
                      #{l.licenceNumber}
                    </span>
                    {l.licenceHolderName ? (
                      <span>· {l.licenceHolderName}</span>
                    ) : null}
                    <span>· Issued {fmtDate(l.issuedAt)}</span>
                    <span>· Expires {fmtDate(l.expiresAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(l.id)}
                  aria-label="Remove licence"
                  className="size-7 rounded-sm text-text-faint hover:text-danger transition-colors flex items-center justify-center shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-text-dim">No licences yet.</p>
        )}

        {/* Add form */}
        <form
          ref={formRef}
          onSubmit={add}
          className="border-t border-border-subtle/60 pt-5 flex flex-col gap-4"
        >
          <p className="text-[11px] tracking-[0.04em] text-text-muted font-medium">
            Add a licence
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] gap-3">
            <Field label="State" required>
              <Select name="state" defaultValue="" required>
                <option value="" disabled>
                  —
                </option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Licence type" required>
              <Input
                name="licenceType"
                placeholder="e.g. Domestic Builder Unlimited"
                required
              />
            </Field>
            <Field label="Licence number" required>
              <Input
                name="licenceNumber"
                placeholder="e.g. CDB-U 12345"
                className="font-mono"
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px] gap-3">
            <Field label="Holder name" badge="Optional">
              <Input
                name="licenceHolderName"
                placeholder="Leave blank if same as company"
              />
            </Field>
            <Field label="Issued" badge="Optional">
              <Input type="date" name="issuedAt" />
            </Field>
            <Field label="Expires" badge="Optional">
              <Input type="date" name="expiresAt" />
            </Field>
          </div>
          {error ? (
            <p className="text-[11.5px] text-danger inline-flex items-center gap-1.5">
              <AlertTriangle className="size-3" />
              {error}
            </p>
          ) : null}
          <div>
            <Button type="submit" size="md" disabled={pending} className="gap-1.5">
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {pending ? "Adding…" : "Add licence"}
            </Button>
          </div>
        </form>
      </div>
    </SectionCard>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

/** Build the FormData that saveBuilderProfileAction expects from our
 *  in-memory profile state. Keeps every field present so the upsert
 *  doesn't accidentally null one out. */
function profileFormData(p: ProfileShape): FormData {
  const fd = new FormData();
  fd.set("companyName", p.companyName);
  fd.set("abn", p.abn);
  fd.set("acn", p.acn);
  fd.set("yearsInOperation", p.yearsInOperation == null ? "" : String(p.yearsInOperation));
  fd.set("businessAddressLine1", p.businessAddressLine1);
  fd.set("businessSuburb", p.businessSuburb);
  fd.set("businessState", p.businessState ?? "");
  fd.set("businessPostcode", p.businessPostcode);
  if (p.hasDifferentPostal) fd.set("hasDifferentPostal", "on");
  fd.set("postalAddressLine1", p.postalAddressLine1);
  fd.set("postalSuburb", p.postalSuburb);
  fd.set("postalState", p.postalState ?? "");
  fd.set("postalPostcode", p.postalPostcode);
  fd.set("bio", p.bio);
  fd.set("website", p.website);
  fd.set("linkedinUrl", p.linkedinUrl);
  fd.set("instagramUrl", p.instagramUrl);
  return fd;
}

