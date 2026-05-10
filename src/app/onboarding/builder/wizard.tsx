"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Hammer,
  House,
  Layers,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PostcodeSuburb } from "@/components/app/postcode-suburb";

import {
  addLicenceAction,
  removeLicenceAction,
  saveBuilderCategoriesAction,
  saveBuilderProfileAction,
  saveBuilderServiceAreasAction,
  submitForApprovalAction,
  type ActionState,
} from "./actions";
import {
  verifyAbnAction,
  verifyLicenceAction,
} from "@/app/(app)/_actions/verification";
import { isValidAbnFormat } from "@/lib/abn";

// ── types ────────────────────────────────────────────────────────────────

type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
type ProjectType = "single_dwelling" | "multi_dwelling" | "renovation" | "extension";

const AU_STATES: AustralianState[] = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

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

interface InitialBundle {
  profile: {
    companyName: string;
    tradingName: string | null;
    abn: string | null;
    acn: string | null;
    yearsInOperation: number | null;
    businessAddressLine1: string | null;
    businessSuburb: string | null;
    businessState: AustralianState | null;
    businessPostcode: string | null;
    hasDifferentPostal: boolean;
    postalAddressLine1: string | null;
    postalSuburb: string | null;
    postalState: AustralianState | null;
    postalPostcode: string | null;
    bio: string | null;
    website: string | null;
    linkedinUrl: string | null;
    instagramUrl: string | null;
  } | null;
  categories: ProjectType[];
  serviceAreas: ServiceArea[];
  licences: Licence[];
}

const STEPS = [
  { idx: 1, title: "Company", icon: Building2 },
  { idx: 2, title: "Address", icon: MapPin },
  { idx: 3, title: "Project types", icon: Layers },
  { idx: 4, title: "Service areas", icon: House },
  { idx: 5, title: "Licences", icon: ShieldCheck },
  { idx: 6, title: "About", icon: Wrench },
  { idx: 7, title: "Review", icon: Check },
] as const;

// ── main wizard ──────────────────────────────────────────────────────────

export function BuilderWizard({ initial }: { initial: InitialBundle }) {
  const [step, setStep] = useState<number>(() => {
    // Resume on the lowest incomplete step.
    if (!initial.profile) return 1;
    if (initial.categories.length === 0) return 3;
    if (initial.serviceAreas.length === 0) return 4;
    if (initial.licences.length === 0) return 5;
    return 7;
  });

  const [companyState, setCompanyState] = useState({
    companyName: initial.profile?.companyName ?? "",
    tradingName: initial.profile?.tradingName ?? "",
    abn: initial.profile?.abn ?? "",
    acn: initial.profile?.acn ?? "",
    yearsInOperation: initial.profile?.yearsInOperation?.toString() ?? "",
  });

  /**
   * Apply ABR-derived autofill — writes to BOTH companyState (legal
   * name + ACN) and addressState (business state + postcode), since
   * those live in separate state buckets at the wizard level.
   * Trading name defaults to the legal name only if the user hadn't
   * already set their own.
   */
  function applyAbrAutofill(autofill: {
    legalEntityName: string;
    acn: string | null;
    state: AustralianState | null;
    postcode: string | null;
  }) {
    setCompanyState((s) => ({
      ...s,
      companyName: autofill.legalEntityName,
      tradingName: s.tradingName || autofill.legalEntityName,
      acn: autofill.acn ?? "",
    }));
    setAddressState((s) => ({
      ...s,
      businessState: autofill.state ?? s.businessState,
      businessPostcode: autofill.postcode ?? s.businessPostcode,
    }));
  }

  const [addressState, setAddressState] = useState({
    businessAddressLine1: initial.profile?.businessAddressLine1 ?? "",
    businessSuburb: initial.profile?.businessSuburb ?? "",
    businessState: initial.profile?.businessState ?? null,
    businessPostcode: initial.profile?.businessPostcode ?? "",
    hasDifferentPostal: initial.profile?.hasDifferentPostal ?? false,
    postalAddressLine1: initial.profile?.postalAddressLine1 ?? "",
    postalSuburb: initial.profile?.postalSuburb ?? "",
    postalState: initial.profile?.postalState ?? null,
    postalPostcode: initial.profile?.postalPostcode ?? "",
  });

  const [categories, setCategories] = useState<ProjectType[]>(initial.categories);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>(initial.serviceAreas);
  const [licences, setLicences] = useState<Licence[]>(initial.licences);
  const [aboutState, setAboutState] = useState({
    bio: initial.profile?.bio ?? "",
    website: initial.profile?.website ?? "",
    linkedinUrl: initial.profile?.linkedinUrl ?? "",
    instagramUrl: initial.profile?.instagramUrl ?? "",
  });

  return (
    <div className="flex flex-col gap-8">
      <Stepper current={step} onJump={setStep} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.2, 0.65, 0.3, 0.9] }}
        >
          {step === 1 && (
            <CompanyStep
              values={companyState}
              onChange={setCompanyState}
              onApplyAbrAutofill={applyAbrAutofill}
              onNext={() => setStep(2)}
              getProfileFormFields={() => ({ ...companyState, ...addressState, ...aboutState })}
            />
          )}
          {step === 2 && (
            <AddressStep
              values={addressState}
              onChange={setAddressState}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              getProfileFormFields={() => ({ ...companyState, ...addressState, ...aboutState })}
            />
          )}
          {step === 3 && (
            <CategoriesStep
              values={categories}
              onChange={setCategories}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <ServiceAreasStep
              values={serviceAreas}
              onChange={setServiceAreas}
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <LicencesStep
              values={licences}
              onChange={setLicences}
              onBack={() => setStep(4)}
              onNext={() => setStep(6)}
            />
          )}
          {step === 6 && (
            <AboutStep
              values={aboutState}
              onChange={setAboutState}
              onBack={() => setStep(5)}
              onNext={() => setStep(7)}
              getProfileFormFields={() => ({ ...companyState, ...addressState, ...aboutState })}
            />
          )}
          {step === 7 && (
            <ReviewStep
              company={companyState}
              address={addressState}
              categories={categories}
              serviceAreas={serviceAreas}
              licences={licences}
              about={aboutState}
              onBack={() => setStep(6)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── stepper ──────────────────────────────────────────────────────────────

/**
 * Premium step indicator: numbered nodes connected by an animated
 * accent line. Past steps fill in solid + show a check; the current
 * step glows; upcoming steps stay dim.
 *
 * Past steps are clickable so users can jump back to revise without
 * losing forward progress.
 */
function Stepper({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: number) => void;
}) {
  const next = STEPS[current];
  const progress = ((current - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="flex flex-col gap-5">
      {/* Top label row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[10px] tracking-[0.18em] text-accent">
            STEP {String(current).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
          <span className="text-text-dim/60 hidden sm:inline">·</span>
          <span className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text truncate">
            {STEPS[current - 1]?.title}
          </span>
        </div>
        {next ? (
          <span className="text-[11px] text-text-dim shrink-0 hidden sm:inline">
            Next · {next.title}
          </span>
        ) : null}
      </div>

      {/* Node row + connecting line */}
      <div className="relative pt-1">
        {/* Connector — sits behind the nodes */}
        <div
          aria-hidden
          className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-px bg-border-subtle"
        />
        <motion.div
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 h-px bg-accent shadow-[0_0_8px_rgba(0,212,200,0.45)]"
          initial={false}
          animate={{ width: `calc((100% - 1.5rem) * ${progress / 100})` }}
          transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 0.9] }}
        />

        <ol className="relative flex items-center justify-between">
          {STEPS.map(({ idx, title, icon: Icon }) => {
            const isPast = idx < current;
            const isCurrent = idx === current;
            const isClickable = isPast;
            return (
              <li key={idx} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onJump(idx)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${idx} — ${title}${
                    isPast ? " (completed)" : isCurrent ? " (current)" : " (upcoming)"
                  }`}
                  className={cn(
                    "relative size-6 rounded-full flex items-center justify-center",
                    "transition-[background-color,border-color,box-shadow,transform] duration-[200ms] ease-[cubic-bezier(0.2,0.65,0.3,0.9)]",
                    "border",
                    isPast
                      ? "bg-accent border-accent text-accent-contrast hover:scale-[1.08] cursor-pointer"
                      : isCurrent
                        ? "bg-bg-deep border-accent text-accent shadow-[0_0_0_4px_rgba(0,212,200,0.10),0_0_18px_rgba(0,212,200,0.45)]"
                        : "bg-bg-deep border-border-subtle text-text-faint cursor-default",
                  )}
                >
                  {isPast ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : isCurrent ? (
                    <Icon className="size-3" />
                  ) : (
                    <span className="text-[10px] font-mono tabular-nums">
                      {idx}
                    </span>
                  )}
                </button>
                <span
                  className={cn(
                    "hidden sm:block text-[10px] tracking-[0.10em] uppercase font-medium transition-colors",
                    isCurrent
                      ? "text-text"
                      : isPast
                        ? "text-text-muted"
                        : "text-text-faint",
                  )}
                >
                  {title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// ── shared step shell ────────────────────────────────────────────────────

function StepShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="font-display uppercase tracking-[-0.02em] text-[clamp(2rem,4vw+1rem,3rem)] leading-[1.0]">
          {title}
        </h2>
        {description ? (
          <p className="text-[14px] leading-[22px] text-text-muted max-w-[56ch]">{description}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-5">{children}</div>
      <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-6">
        {footer}
      </div>
    </section>
  );
}

// ── Step 1: Company ──────────────────────────────────────────────────────

type CompanyValues = {
  companyName: string;
  tradingName: string;
  abn: string;
  acn: string;
  yearsInOperation: string;
};

function CompanyStep({
  values,
  onChange,
  onApplyAbrAutofill,
  onNext,
  getProfileFormFields,
}: {
  values: CompanyValues;
  onChange: (v: CompanyValues) => void;
  onApplyAbrAutofill: (autofill: {
    legalEntityName: string;
    acn: string | null;
    state: AustralianState | null;
    postcode: string | null;
  }) => void;
  onNext: () => void;
  getProfileFormFields: () => Record<string, string | boolean | null>;
}) {
  const [savePending, startSave] = useTransition();
  const [verifying, startVerify] = useTransition();
  const [verifyResult, setVerifyResult] = useState<
    | { kind: "verified"; matchedName: string }
    | { kind: "inactive"; reason: string }
    | { kind: "not_found"; reason: string }
    | { kind: "error"; reason: string }
    | null
  >(null);
  const [state, setState] = React.useState<ActionState>({});

  // The ABN field is "verified-locked" once we have a verified result
  // for the current ABN value. Switching the ABN clears the result.
  const isAbnVerified = verifyResult?.kind === "verified";

  function abnValid(): boolean {
    return /^\d{11}$/.test(values.abn) && isValidAbnFormat(values.abn);
  }

  function onVerify() {
    if (!abnValid() || verifying) return;
    setVerifyResult(null);
    startVerify(async () => {
      const r = await verifyAbnAction(values.abn);
      if (!r.ok) {
        setVerifyResult({ kind: "error", reason: r.error.message });
        return;
      }
      const v = r.value;
      if (v.status === "verified") {
        setVerifyResult({ kind: "verified", matchedName: v.matchedName });
        onApplyAbrAutofill({
          legalEntityName: v.autofill.legalEntityName,
          acn: v.autofill.acn,
          state: v.autofill.state,
          postcode: v.autofill.postcode,
        });
      } else if (v.status === "inactive") {
        setVerifyResult({ kind: "inactive", reason: v.reason });
      } else if (v.status === "not_found") {
        setVerifyResult({ kind: "not_found", reason: v.reason });
      } else {
        setVerifyResult({ kind: "error", reason: v.reason });
      }
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!values.companyName.trim()) errors.companyName = "Legal entity name is required";
    if (!values.abn) {
      errors.abn = "ABN is required";
    } else if (!/^\d{11}$/.test(values.abn)) {
      errors.abn = "ABN must be exactly 11 digits";
    }
    if (Object.keys(errors).length) {
      setState({ fieldErrors: errors });
      return;
    }
    startSave(async () => {
      const fd = profileFormData({ ...getProfileFormFields(), ...values });
      const res = await saveBuilderProfileAction({}, fd);
      setState(res);
      if (res.ok) onNext();
    });
  }

  const abnDigits = values.abn.length;
  const abnLooksWrong = values.abn !== "" && abnDigits !== 11;
  const canContinue =
    !savePending &&
    abnValid() &&
    values.companyName.trim().length > 0 &&
    verifyResult !== null;

  // Continue-anyway available when verification ran but didn't pass —
  // they go through with limited (viewer) access. We let the UI pass
  // through but make the consequence very clear.
  const verificationFailed =
    verifyResult !== null && verifyResult.kind !== "verified";

  return (
    <form onSubmit={submit}>
      <StepShell
        title="Tell us about your business"
        description="We verify every builder's ABN against the Australian Business Register at sign-up. Owners trust the badge — that's how we keep the marketplace honest."
        footer={
          <>
            <span className="text-[12px] text-text-dim">
              {!verifyResult ? (
                "Verify your ABN to continue"
              ) : verifyResult.kind === "verified" ? (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <ShieldCheck className="size-3.5" />
                  Verified — ready to continue
                </span>
              ) : (
                <span className="text-warning">
                  Continuing in viewer mode — unlocks unlock when verified
                </span>
              )}
            </span>
            <Button
              type="submit"
              size="lg"
              disabled={!canContinue}
              className="gap-2"
            >
              {savePending ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!savePending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </>
        }
      >
        {/* ABN — primary verification anchor */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="abn" className="flex items-center gap-2">
            ABN
            {isAbnVerified ? (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase text-accent font-medium">
                <ShieldCheck className="size-3" />
                Verified · ABR
              </span>
            ) : null}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <Input
              id="abn"
              value={values.abn}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 11);
                onChange({ ...values, abn: next });
                // Clear verification result if ABN changes after verification.
                if (verifyResult) setVerifyResult(null);
              }}
              inputMode="numeric"
              placeholder="11 digits"
              maxLength={11}
              required
              disabled={isAbnVerified}
              aria-invalid={
                abnLooksWrong || Boolean(state.fieldErrors?.abn) || undefined
              }
              className="font-mono tabular-nums"
            />
            {isAbnVerified ? (
              <span className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-[12px] tracking-[0.04em] text-accent">
                <ShieldCheck className="size-3.5" />
                Verified
              </span>
            ) : (
              <Button
                type="button"
                size="md"
                onClick={onVerify}
                disabled={!abnValid() || verifying}
                className="gap-1.5"
              >
                {verifying ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                {verifying ? "Checking ABR…" : "Verify with ABR"}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className={cn(abnLooksWrong ? "text-warning" : "text-text-dim")}>
              {state.fieldErrors?.abn ??
                (abnLooksWrong
                  ? "ABN must be 11 digits"
                  : isAbnVerified
                    ? "Locked — verified by ABR. To change, contact support."
                    : "11 digits, no spaces.")}
            </span>
            <span className="font-mono text-text-dim tabular-nums">{abnDigits}/11</span>
          </div>
        </div>

        {/* Verification result panels */}
        {verifyResult?.kind === "verified" ? (
          <VerifyResultPanel
            tone="success"
            title="ABN verified"
            body={
              <>
                ABR matched{" "}
                <span className="text-text font-medium">{verifyResult.matchedName}</span>
                . We&apos;ve auto-filled your legal entity name, ACN, and registered
                state below — adjust the trading name if you market under
                something different.
              </>
            }
          />
        ) : null}
        {verifyResult?.kind === "not_found" ? (
          <VerifyResultPanel
            tone="warning"
            title="No record found in ABR"
            body={
              <>
                Double-check the ABN above and try again. If you&apos;re sure it&apos;s
                right (newly registered, perhaps), continue — your account
                will sit in <strong>viewer mode</strong>: you can browse
                projects but unlocks pause until verification clears.
              </>
            }
          />
        ) : null}
        {verifyResult?.kind === "inactive" ? (
          <VerifyResultPanel
            tone="warning"
            title="ABN is not active"
            body={
              <>
                ABR shows this ABN as <em>not currently active</em>. Sort that
                out with the ATO and verify here once it&apos;s active. You can
                continue in <strong>viewer mode</strong> in the meantime —
                browse only, no unlocks.
              </>
            }
          />
        ) : null}
        {verifyResult?.kind === "error" ? (
          <VerifyResultPanel
            tone="warning"
            title="Couldn't reach the ABR"
            body={
              <>
                {verifyResult.reason} Try again in a moment. You can continue
                in <strong>viewer mode</strong> and re-verify from your
                profile later.
              </>
            }
          />
        ) : null}

        {/* Trading name + legal name pair (revealed after first verification attempt) */}
        {verifyResult ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tradingName">
                Trading name{" "}
                <span className="text-text-dim font-normal">· optional</span>
              </Label>
              <Input
                id="tradingName"
                value={values.tradingName}
                onChange={(e) => onChange({ ...values, tradingName: e.target.value })}
                placeholder={values.companyName || "How owners see you"}
                autoComplete="organization"
                maxLength={120}
              />
              <p className="text-[11px] text-text-dim">
                Marketing label shown across the marketplace. Defaults to legal name.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                Legal entity name
                {isAbnVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase text-accent font-medium">
                    <ShieldCheck className="size-3" />
                    Verified · ABR
                  </span>
                ) : null}
              </Label>
              <Input
                id="companyName"
                value={values.companyName}
                onChange={(e) => onChange({ ...values, companyName: e.target.value })}
                autoComplete="organization"
                maxLength={120}
                required
                disabled={isAbnVerified}
              />
              {state.fieldErrors?.companyName ? (
                <p className="text-[11px] text-danger">{state.fieldErrors.companyName}</p>
              ) : (
                <p className="text-[11px] text-text-dim">
                  {isAbnVerified
                    ? "Locked — pulled from ABR."
                    : "As registered with ABR."}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* ACN + years (visible once verification has been attempted, since they
            need the ABR context to make sense) */}
        {verifyResult ? (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acn">
                ACN <span className="text-text-dim font-normal">· optional</span>
              </Label>
              <Input
                id="acn"
                value={values.acn}
                onChange={(e) =>
                  onChange({ ...values, acn: e.target.value.replace(/\D/g, "").slice(0, 9) })
                }
                inputMode="numeric"
                placeholder="9 digits"
                maxLength={9}
                disabled={isAbnVerified && !!values.acn}
                className="font-mono tabular-nums"
              />
              <p className="text-[11px] text-text-dim">
                {isAbnVerified && values.acn
                  ? "Locked — pulled from ABR."
                  : "Auto-filled from ABR if your business has one."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="yearsInOperation">Years in operation</Label>
              <Input
                id="yearsInOperation"
                type="number"
                min={0}
                max={150}
                value={values.yearsInOperation}
                onChange={(e) => onChange({ ...values, yearsInOperation: e.target.value })}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
          </div>
        ) : null}

        {/* Continue-anyway hint when verification has failed */}
        {verificationFailed ? (
          <div className="rounded-md border border-warning/35 bg-[rgba(255,181,71,0.05)] p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-3.5 text-warning shrink-0 mt-0.5" />
              <div className="text-[12px] leading-[1.6] text-text-muted">
                <p>
                  We couldn&apos;t verify your ABN. You can continue setup in
                  viewer mode — sign in, browse projects, message owners — but{" "}
                  <strong>unlocks stay paused</strong> until verification
                  clears. Re-verify any time from your profile.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

/**
 * Result-of-last-verify panel — tone-aware, reused below for licences.
 */
function VerifyResultPanel({
  tone,
  title,
  body,
}: {
  tone: "success" | "warning";
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        tone === "success"
          ? "border-border-accent/45 bg-[rgba(0,212,200,0.06)]"
          : "border-warning/35 bg-[rgba(255,181,71,0.05)]",
      )}
    >
      <div className="flex items-start gap-2.5">
        {tone === "success" ? (
          <ShieldCheck className="size-3.5 text-accent shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="size-3.5 text-warning shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] tracking-[0.16em] uppercase font-medium mb-1",
              tone === "success" ? "text-accent" : "text-warning",
            )}
          >
            {title}
          </p>
          <p className="text-[12.5px] leading-[1.6] text-text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Address ──────────────────────────────────────────────────────

function AddressStep({
  values,
  onChange,
  onBack,
  onNext,
  getProfileFormFields,
}: {
  values: typeof initialAddressType;
  onChange: (v: typeof initialAddressType) => void;
  onBack: () => void;
  onNext: () => void;
  getProfileFormFields: () => Record<string, string | boolean | null>;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = React.useState<ActionState>({});

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = profileFormData(getProfileFormFields());
      const res = await saveBuilderProfileAction({}, fd);
      setState(res);
      if (res.ok) onNext();
    });
  }

  return (
    <form onSubmit={submit}>
      <StepShell
        title="Where's your business based?"
        description="Used to pre-fill addresses on quotes. Postal address only matters if it differs from your business address."
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!pending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
            Business address
          </span>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessAddressLine1">Street address</Label>
            <Input
              id="businessAddressLine1"
              value={values.businessAddressLine1}
              onChange={(e) => onChange({ ...values, businessAddressLine1: e.target.value })}
              autoComplete="address-line1"
              placeholder="123 Builder St"
            />
          </div>
          <PostcodeSuburb
            postcodeName="businessPostcode"
            suburbName="businessSuburb"
            stateName="businessState"
            defaultPostcode={values.businessPostcode}
            defaultSuburb={values.businessSuburb}
            defaultState={values.businessState}
          />
        </div>

        <div className="flex items-start gap-2 mt-2">
          <input
            id="hasDifferentPostal"
            name="hasDifferentPostal"
            type="checkbox"
            checked={values.hasDifferentPostal}
            onChange={(e) => onChange({ ...values, hasDifferentPostal: e.target.checked })}
            className="mt-1 accent-accent"
          />
          <Label htmlFor="hasDifferentPostal" className="cursor-pointer">
            Postal address is different
          </Label>
        </div>

        {values.hasDifferentPostal ? (
          <div className="flex flex-col gap-4 border-t border-border-subtle pt-5 mt-2">
            <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
              Postal address
            </span>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postalAddressLine1">Street address</Label>
              <Input
                id="postalAddressLine1"
                value={values.postalAddressLine1}
                onChange={(e) => onChange({ ...values, postalAddressLine1: e.target.value })}
                autoComplete="address-line1"
                placeholder="PO Box 1234"
              />
            </div>
            <PostcodeSuburb
              postcodeName="postalPostcode"
              suburbName="postalSuburb"
              stateName="postalState"
              defaultPostcode={values.postalPostcode}
              defaultSuburb={values.postalSuburb}
              defaultState={values.postalState}
            />
          </div>
        ) : null}

        {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

const initialAddressType = {
  businessAddressLine1: "",
  businessSuburb: "" as string,
  businessState: null as AustralianState | null,
  businessPostcode: "",
  hasDifferentPostal: false,
  postalAddressLine1: "",
  postalSuburb: "" as string,
  postalState: null as AustralianState | null,
  postalPostcode: "",
};

// ── Step 3: Project types ────────────────────────────────────────────────

function CategoriesStep({
  values,
  onChange,
  onBack,
  onNext,
}: {
  values: ProjectType[];
  onChange: (v: ProjectType[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = React.useState<ActionState>({});

  function toggle(c: ProjectType) {
    onChange(values.includes(c) ? values.filter((v) => v !== c) : [...values, c]);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (values.length === 0) {
      setState({ error: "Pick at least one project type." });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      values.forEach((v) => fd.append("categories", v));
      const res = await saveBuilderCategoriesAction({}, fd);
      setState(res);
      if (res.ok) onNext();
    });
  }

  const options: Array<{ value: ProjectType; label: string; description: string; icon: LucideIcon }> = [
    { value: "single_dwelling", label: "Single dwelling", description: "New custom homes, knock-down rebuilds", icon: House },
    { value: "multi_dwelling", label: "Multi-dwelling", description: "Duplexes, townhouses, multi-unit", icon: Building2 },
    { value: "renovation", label: "Renovation", description: "Full or partial rooms, fixtures, kitchens, baths", icon: Wrench },
    { value: "extension", label: "Extension", description: "Additions, second storey, granny flats", icon: Hammer },
  ];

  return (
    <form onSubmit={submit}>
      <StepShell
        title="What kind of work do you take on?"
        description="Pick all that apply. Used to match you with relevant projects."
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={pending || values.length === 0} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!pending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((o) => (
            <CheckCard
              key={o.value}
              icon={o.icon}
              label={o.label}
              description={o.description}
              active={values.includes(o.value)}
              onToggle={() => toggle(o.value)}
            />
          ))}
        </div>
        {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

// ── Step 4: Service areas ────────────────────────────────────────────────

function ServiceAreasStep({
  values,
  onChange,
  onBack,
  onNext,
}: {
  values: ServiceArea[];
  onChange: (v: ServiceArea[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = React.useState<ActionState>({});
  const [draftPostcode, setDraftPostcode] = useState("");
  const [draftSuburb, setDraftSuburb] = useState("");
  const [draftState, setDraftState] = useState("");
  // Force PostcodeSuburb to remount on add so it resets cleanly.
  const [pickerKey, setPickerKey] = useState(0);

  function add() {
    if (!draftSuburb || !draftState) return;
    const candidate: ServiceArea = {
      state: draftState as AustralianState,
      suburb: draftSuburb,
      postcode: draftPostcode || null,
    };
    if (
      values.some(
        (a) => a.state === candidate.state && a.suburb === candidate.suburb,
      )
    ) {
      // already added
      setPickerKey((k) => k + 1);
      return;
    }
    onChange([...values, candidate]);
    setPickerKey((k) => k + 1);
    setDraftPostcode("");
    setDraftSuburb("");
    setDraftState("");
  }

  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (values.length === 0) {
      setState({ error: "Add at least one service area." });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("areasJson", JSON.stringify(values));
      const res = await saveBuilderServiceAreasAction({}, fd);
      setState(res);
      if (res.ok) onNext();
    });
  }

  return (
    <form onSubmit={submit}>
      <StepShell
        title="Where do you cover?"
        description="Add the suburbs you take projects in. We use this to match you to relevant uploads. Type a postcode and pick the suburb."
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={pending || values.length === 0} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!pending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </>
        }
      >
        {values.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {values.map((a, i) => (
              <li
                key={`${a.state}-${a.suburb}-${i}`}
                className="flex items-center gap-3 rounded-tight border border-border-subtle bg-surface-1 px-3.5 py-2"
              >
                <MapPin className="size-3.5 text-accent shrink-0" />
                <span className="text-[13px] text-text">
                  {a.suburb ?? "Statewide"}
                </span>
                <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-text-dim font-mono">
                  {a.state}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-text-faint hover:text-danger transition-colors"
                  aria-label="Remove area"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-tight border border-dashed border-border-subtle px-4 py-6 text-center text-[12px] text-text-dim">
            No service areas yet — add your first below.
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 mt-1">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
            Add a service area
          </span>

          <PostcodeSuburb
            key={pickerKey}
            postcodeName="draftPostcode"
            suburbName="draftSuburb"
            stateName="draftState"
            onChange={({ postcode, suburb, state: st }) => {
              setDraftPostcode(postcode);
              setDraftSuburb(suburb ?? "");
              setDraftState(st ?? "");
            }}
          />

          <div>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={add}
              disabled={!draftSuburb || !draftState}
              className="gap-2"
            >
              <Plus className="size-3.5" />
              Add area
            </Button>
          </div>
        </div>

        {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

// ── Step 5: Licences ─────────────────────────────────────────────────────

/**
 * Per-licence verification snapshot tracked in local wizard state.
 * Distinct from the BuilderVerificationRow audit log — this is just
 * "what did the latest verify call say for this row" for UI purposes.
 */
type LicenceVerifyState =
  | { status: "verified"; classLabel: string; expiresAt: Date | null }
  | { status: "inactive"; reason: string }
  | { status: "not_found"; reason: string }
  | { status: "mismatch"; reason: string }
  | { status: "manual_review"; reason: string }
  | { status: "error"; reason: string };

function LicencesStep({
  values,
  onChange,
  onBack,
  onNext,
}: {
  values: Licence[];
  onChange: (v: Licence[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [adding, setAdding] = useState(values.length === 0);
  const [draft, setDraft] = useState({
    state: "" as "" | AustralianState,
    licenceType: "",
    licenceNumber: "",
    licenceHolderName: "",
    issuedAt: "",
    expiresAt: "",
  });
  const [pending, startTransition] = useTransition();
  const [state, setState] = React.useState<ActionState>({});
  /** Verification results keyed by licence id. */
  const [verifications, setVerifications] = useState<
    Record<string, LicenceVerifyState>
  >({});

  function add() {
    if (!draft.state || !draft.licenceType.trim() || !draft.licenceNumber.trim()) {
      setState({ error: "Fill state, type, and number." });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("state", draft.state);
      fd.set("licenceType", draft.licenceType);
      fd.set("licenceNumber", draft.licenceNumber);
      fd.set("licenceHolderName", draft.licenceHolderName);
      fd.set("issuedAt", draft.issuedAt);
      fd.set("expiresAt", draft.expiresAt);
      const res = await addLicenceAction({}, fd);
      setState(res);
      if (!res.ok || !res.licence) return;

      const created: Licence = {
        id: res.licence.id,
        state: res.licence.state as AustralianState,
        licenceType: res.licence.licenceType,
        licenceNumber: res.licence.licenceNumber,
        licenceHolderName: res.licence.licenceHolderName,
        issuedAt: res.licence.issuedAt,
        expiresAt: res.licence.expiresAt,
      };
      onChange([...values, created]);
      setDraft({
        state: "",
        licenceType: "",
        licenceNumber: "",
        licenceHolderName: "",
        issuedAt: "",
        expiresAt: "",
      });
      setAdding(false);

      // Auto-verify against the relevant register. VIC → VBA, others
      // → "manual_review" sentinel from the action's error path.
      const vr = await verifyLicenceAction(created.id);
      if (!vr.ok) {
        setVerifications((m) => ({
          ...m,
          [created.id]: {
            status: "error",
            reason: vr.error.message,
          },
        }));
        return;
      }
      const v = vr.value;
      if (v.status === "verified") {
        setVerifications((m) => ({
          ...m,
          [created.id]: {
            status: "verified",
            classLabel: v.classLabel,
            expiresAt: v.expiresAt,
          },
        }));
      } else if (v.status === "inactive") {
        setVerifications((m) => ({
          ...m,
          [created.id]: { status: "inactive", reason: v.reason },
        }));
      } else if (v.status === "not_found") {
        setVerifications((m) => ({
          ...m,
          [created.id]: { status: "not_found", reason: v.reason },
        }));
      } else if (v.status === "mismatch") {
        setVerifications((m) => ({
          ...m,
          [created.id]: { status: "mismatch", reason: v.reason },
        }));
      } else {
        // "error" — typically the no-adapter-yet path for non-VIC.
        const isNonVic = v.provider.startsWith("state:");
        setVerifications((m) => ({
          ...m,
          [created.id]: {
            status: isNonVic ? "manual_review" : "error",
            reason: v.reason,
          },
        }));
      }
    });
  }

  function remove(licence: Licence) {
    startTransition(async () => {
      try {
        await removeLicenceAction(licence.id);
        onChange(values.filter((l) => l.id !== licence.id));
      } catch (err) {
        setState({ error: err instanceof Error ? err.message : "Couldn't remove." });
      }
    });
  }

  function next(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (values.length === 0) {
      setState({ error: "Add at least one licence." });
      return;
    }
    onNext();
  }

  return (
    <form onSubmit={next}>
      <StepShell
        title="Add your builder licences"
        description="At least one. Add one row per state if you're licensed in multiple. The licence type wording varies by state — use the wording on your licence."
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={pending || values.length === 0} className="gap-2">
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </>
        }
      >
        {values.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {values.map((l) => {
              const v = verifications[l.id];
              return (
                <li
                  key={l.id}
                  className={cn(
                    "rounded-md border px-4 py-3 transition-colors",
                    v?.status === "verified"
                      ? "border-border-accent/45 bg-[rgba(0,212,200,0.05)]"
                      : v
                        ? "border-warning/35 bg-[rgba(255,181,71,0.04)]"
                        : "border-border-subtle bg-surface-1",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-ui font-semibold text-[13px] text-text">
                          {l.licenceType}
                        </span>
                        <Badge variant="default">{l.state}</Badge>
                        <LicenceVerifyChip state={l.state} v={v} />
                      </div>
                      <span className="font-mono text-[12px] text-text-muted">
                        {l.licenceNumber}
                      </span>
                      {l.licenceHolderName ? (
                        <span className="text-[11px] text-text-dim">
                          held by {l.licenceHolderName}
                        </span>
                      ) : null}
                      {v?.status === "verified" && v.expiresAt ? (
                        <span className="text-[11px] text-text-dim">
                          expires{" "}
                          {v.expiresAt.toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : l.expiresAt ? (
                        <span className="text-[11px] text-text-dim">
                          expires {l.expiresAt.toLocaleDateString("en-AU")}
                        </span>
                      ) : null}
                      {v && v.status !== "verified" ? (
                        <span className="text-[11px] text-warning mt-1 leading-[1.5]">
                          {v.status === "manual_review"
                            ? "Auto-verification for this state isn't live yet — our team will review manually."
                            : v.status === "not_found"
                              ? "No record found in the register. Edit & re-add if it's a typo, otherwise we'll review manually."
                              : v.status === "inactive"
                                ? `Register shows this as ${v.reason.toLowerCase()}.`
                                : v.status === "mismatch"
                                  ? v.reason
                                  : v.reason}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(l)}
                      className="text-text-faint hover:text-danger transition-colors"
                      disabled={pending}
                      aria-label="Remove licence"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {adding ? (
          <div className="flex flex-col gap-4 border-t border-border-subtle pt-5">
            <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
              {values.length === 0 ? "Add your first licence" : "Add another licence"}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licenceState">State</Label>
                <select
                  id="licenceState"
                  value={draft.state}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value as AustralianState })}
                  className={cn(
                    "h-10 rounded-tight border border-border bg-surface-1 px-3 text-[13px] text-text",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]",
                    "focus:outline-none focus:border-border-accent-strong",
                  )}
                >
                  <option value="">Select state…</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="licenceNumber">Licence number</Label>
                <Input
                  id="licenceNumber"
                  value={draft.licenceNumber}
                  onChange={(e) => setDraft({ ...draft, licenceNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="licenceType">Licence type / class</Label>
              <Input
                id="licenceType"
                value={draft.licenceType}
                onChange={(e) => setDraft({ ...draft, licenceType: e.target.value })}
                placeholder='e.g. "Domestic Builder Unlimited"'
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="licenceHolderName">Licence holder name <span className="text-text-dim font-normal">· optional</span></Label>
              <Input
                id="licenceHolderName"
                value={draft.licenceHolderName}
                onChange={(e) => setDraft({ ...draft, licenceHolderName: e.target.value })}
                placeholder="If different from the company"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="issuedAt">Issued <span className="text-text-dim font-normal">· optional</span></Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={draft.issuedAt}
                  onChange={(e) => setDraft({ ...draft, issuedAt: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expiresAt">Expires <span className="text-text-dim font-normal">· optional</span></Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={draft.expiresAt}
                  onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" size="md" onClick={add} disabled={pending} className="gap-2">
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Save licence
              </Button>
              {values.length > 0 ? (
                <Button type="button" variant="ghost" size="md" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <Button type="button" variant="outline" size="md" onClick={() => setAdding(true)} className="gap-2">
              <Plus className="size-3.5" />
              Add another licence
            </Button>
          </div>
        )}

        {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

/**
 * Inline chip for a licence row's verification state. Driven by the
 * local LicenceVerifyState map; falls back to a soft "verifying…"
 * label while the post-add VBA call is in flight.
 */
function LicenceVerifyChip({
  state,
  v,
}: {
  state: AustralianState;
  v: LicenceVerifyState | undefined;
}) {
  if (!v) {
    // No result yet (still in flight, or just added pre-verify)
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)] text-[9.5px] tracking-[0.16em] uppercase text-text-dim font-medium">
        <Loader2 className="size-2.5 animate-spin" />
        Verifying…
      </span>
    );
  }
  if (v.status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-sm border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-[9.5px] tracking-[0.16em] uppercase text-accent font-medium">
        <ShieldCheck className="size-2.5" />
        Verified · {state === "VIC" ? "VBA" : "register"}
      </span>
    );
  }
  if (v.status === "manual_review") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-sm border border-warning/45 bg-[rgba(255,181,71,0.08)] text-[9.5px] tracking-[0.16em] uppercase text-warning font-medium">
        <AlertTriangle className="size-2.5" />
        Manual review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-sm border border-warning/45 bg-[rgba(255,181,71,0.08)] text-[9.5px] tracking-[0.16em] uppercase text-warning font-medium">
      <AlertTriangle className="size-2.5" />
      {v.status === "not_found"
        ? "Not found"
        : v.status === "inactive"
          ? "Inactive"
          : v.status === "mismatch"
            ? "Mismatch"
            : "Couldn't verify"}
    </span>
  );
}

// ── Step 6: About ────────────────────────────────────────────────────────

function AboutStep({
  values,
  onChange,
  onBack,
  onNext,
  getProfileFormFields,
}: {
  values: { bio: string; website: string; linkedinUrl: string; instagramUrl: string };
  onChange: (v: typeof values) => void;
  onBack: () => void;
  onNext: () => void;
  getProfileFormFields: () => Record<string, string | boolean | null>;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = React.useState<ActionState>({});

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = profileFormData(getProfileFormFields());
      const res = await saveBuilderProfileAction({}, fd);
      setState(res);
      if (res.ok) onNext();
    });
  }

  return (
    <form onSubmit={submit}>
      <StepShell
        title="A little about your business"
        description="Optional, but a strong bio + socials make a real difference for project owners deciding whether to unlock you. You can edit anytime."
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!pending ? <ArrowRight className="size-4" /> : null}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            value={values.bio}
            onChange={(e) => onChange({ ...values, bio: e.target.value })}
            rows={5}
            maxLength={2000}
            placeholder="What you build, who you build for, and what makes your work different."
          />
          <p className="text-[11px] text-text-dim text-right">{values.bio.length}/2000</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={values.website}
              onChange={(e) => onChange({ ...values, website: e.target.value })}
              placeholder="https://yourbuild.com.au"
              autoComplete="url"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="linkedinUrl">LinkedIn</Label>
            <Input
              id="linkedinUrl"
              type="url"
              value={values.linkedinUrl}
              onChange={(e) => onChange({ ...values, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 max-w-[400px]">
          <Label htmlFor="instagramUrl">Instagram</Label>
          <Input
            id="instagramUrl"
            type="url"
            value={values.instagramUrl}
            onChange={(e) => onChange({ ...values, instagramUrl: e.target.value })}
            placeholder="https://instagram.com/…"
          />
        </div>

        {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

// ── Step 7: Review ───────────────────────────────────────────────────────

function ReviewStep({
  company,
  address,
  categories,
  serviceAreas,
  licences,
  about,
  onBack,
}: {
  company: { companyName: string; abn: string; acn: string; yearsInOperation: string };
  address: typeof initialAddressType;
  categories: ProjectType[];
  serviceAreas: ServiceArea[];
  licences: Licence[];
  about: { bio: string; website: string; linkedinUrl: string; instagramUrl: string };
  onBack: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitForApprovalAction();
      if (res?.error) setError(res.error);
    });
  }

  const projectTypeLabel: Record<ProjectType, string> = {
    single_dwelling: "Single dwelling",
    multi_dwelling: "Multi-dwelling",
    renovation: "Renovation",
    extension: "Extension",
  };

  return (
    <form onSubmit={submit}>
      <StepShell
        title="Review and submit"
        description="A quick check before we send your profile to BuilderHQ for review. Everything's editable later from your settings."
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? "Submitting…" : "Submit for review"}
            </Button>
          </>
        }
      >
        <ReviewSection title="Company">
          <ReviewRow label="Name" value={company.companyName} />
          <ReviewRow label="ABN" value={company.abn || "—"} />
          {company.acn ? <ReviewRow label="ACN" value={company.acn} /> : null}
          {company.yearsInOperation ? (
            <ReviewRow label="Years in operation" value={company.yearsInOperation} />
          ) : null}
        </ReviewSection>

        <ReviewSection title="Business address">
          <ReviewRow
            label="Address"
            value={
              [
                address.businessAddressLine1,
                address.businessSuburb,
                address.businessState,
                address.businessPostcode,
              ]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          {address.hasDifferentPostal ? (
            <ReviewRow
              label="Postal"
              value={
                [
                  address.postalAddressLine1,
                  address.postalSuburb,
                  address.postalState,
                  address.postalPostcode,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
          ) : null}
        </ReviewSection>

        <ReviewSection title="Project types">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Badge key={c} variant="accent">{projectTypeLabel[c]}</Badge>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection title="Service areas">
          <div className="flex flex-wrap gap-1.5">
            {serviceAreas.map((a, i) => (
              <Badge key={i} variant="default">
                {a.suburb ?? "Statewide"} · {a.state}
              </Badge>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection title="Licences">
          <ul className="flex flex-col gap-1">
            {licences.map((l) => (
              <li key={l.id} className="text-[13px] text-text-muted">
                <span className="text-text">{l.licenceType}</span> ·{" "}
                <span className="font-mono">{l.licenceNumber}</span> · {l.state}
              </li>
            ))}
          </ul>
        </ReviewSection>

        {about.bio || about.website || about.linkedinUrl || about.instagramUrl ? (
          <ReviewSection title="About">
            {about.bio ? <ReviewRow label="Bio" value={about.bio} /> : null}
            {about.website ? <ReviewRow label="Website" value={about.website} /> : null}
            {about.linkedinUrl ? <ReviewRow label="LinkedIn" value={about.linkedinUrl} /> : null}
            {about.instagramUrl ? <ReviewRow label="Instagram" value={about.instagramUrl} /> : null}
          </ReviewSection>
        ) : null}

        <p className="text-[12px] leading-[20px] text-text-dim">
          We&apos;ll review your profile within 1–2 business days. You can use
          your dashboard immediately — full unlock access opens once approved.
        </p>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </StepShell>
    </form>
  );
}

// ── shared little components ─────────────────────────────────────────────

function CheckCard({
  icon: Icon,
  label,
  description,
  active,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "group relative flex items-start gap-3 rounded-md border px-4 py-3 text-left",
        "transition-[background,border-color] duration-[160ms] ease-[var(--ease-out)]",
        active
          ? "border-accent bg-accent-muted/60"
          : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "mt-0.5 size-6 flex items-center justify-center shrink-0 transition-colors",
          active ? "text-accent" : "text-text-faint",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className={cn("font-ui font-semibold text-[13px]", active ? "text-text" : "text-text-muted")}>
          {label}
        </span>
        <span className="text-[11px] leading-[16px] text-text-dim">{description}</span>
      </div>
      <span
        className={cn(
          "size-4 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
          active ? "bg-accent border-accent text-bg" : "border-border-strong",
        )}
      >
        {active ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-1 px-5 py-4 flex flex-col gap-2">
      <h3 className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-[13px]">
      <span className="text-text-dim">{label}</span>
      <span className="text-text break-words">{value}</span>
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
    >
      {children}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

/** Build FormData for the profile-upsert action from the wizard's spread state. */
function profileFormData(values: Record<string, string | boolean | null | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      if (v) fd.set(k, "on");
      continue;
    }
    fd.set(k, String(v));
  }
  return fd;
}
