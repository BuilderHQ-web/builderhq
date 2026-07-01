"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Home,
  Building,
  Wrench,
  Layers,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Check,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Trash2,
  Download,
  Upload,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Compass,
  Hammer,
  Folder,
  Drill,
  TreePine,
  Mountain,
  Zap,
  Landmark,
  FileQuestion,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  updateProjectAction,
  publishProjectAction,
  checkPublishabilityAction,
  softDeleteProjectAction,
} from "@/app/(app)/_actions/projects";
import {
  initUploadAction,
  completeUploadAction,
  getDownloadUrlAction,
  listProjectDocumentsAction,
  softDeleteAction as softDeleteDocAction,
} from "@/app/(app)/_actions/documents";
import { lookupPostcodeAction } from "@/lib/postcodes-action";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type {
  Project,
  PublishabilityReport,
  UpdateProjectInput,
} from "@/modules/projects";
import type { Document, DocumentCategory } from "@/modules/documents";

// ── meta ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  Project["type"],
  { label: string; icon: React.ReactNode }
> = {
  single_dwelling: { label: "Single dwelling", icon: <Home className="size-4" /> },
  multi_dwelling: { label: "Multi-dwelling", icon: <Building className="size-4" /> },
  renovation: { label: "Renovation", icon: <Wrench className="size-4" /> },
  extension: { label: "Extension", icon: <Layers className="size-4" /> },
};

const BUDGET_BANDS: Array<{ id: NonNullable<Project["budgetBand"]>; label: string }> = [
  { id: "under_500k", label: "Under $500k" },
  { id: "500k_1m", label: "$500k – $1M" },
  { id: "1m_1_5m", label: "$1M – $1.5M" },
  { id: "1_5m_2m", label: "$1.5M – $2M" },
  { id: "2m_3m", label: "$2M – $3M" },
  { id: "3m_5m", label: "$3M – $5M" },
  { id: "over_5m", label: "Over $5M" },
];

const RENO_SCOPES: Array<{ id: NonNullable<Project["renovationScope"]>; label: string }> = [
  { id: "kitchen", label: "Kitchen" },
  { id: "bathroom", label: "Bathroom" },
  { id: "kitchen_and_bathroom", label: "Kitchen + bathroom" },
  { id: "full_internal", label: "Full internal" },
  { id: "full_internal_and_external", label: "Internal + external" },
  { id: "structural", label: "Structural" },
];

const EXTENSION_TYPES: Array<{ id: NonNullable<Project["extensionType"]>; label: string }> = [
  { id: "ground_floor", label: "Ground floor" },
  { id: "first_floor", label: "First floor" },
  { id: "ground_and_first", label: "Ground + first" },
  { id: "rear", label: "Rear" },
  { id: "side", label: "Side" },
];

const LAND_BANDS: Array<{ id: NonNullable<Project["landSizeBand"]>; label: string }> = [
  { id: "under_200", label: "Under 200 m²" },
  { id: "200_400", label: "200 – 400 m²" },
  { id: "400_600", label: "400 – 600 m²" },
  { id: "600_800", label: "600 – 800 m²" },
  { id: "800_1000", label: "800 – 1000 m²" },
  { id: "over_1000", label: "1000 m²+" },
];

const BUILD_BANDS: Array<{ id: NonNullable<Project["buildSizeBand"]>; label: string }> = [
  { id: "under_100", label: "Under 100 m²" },
  { id: "100_150", label: "100 – 150 m²" },
  { id: "150_200", label: "150 – 200 m²" },
  { id: "200_250", label: "200 – 250 m²" },
  { id: "250_300", label: "250 – 300 m²" },
  { id: "300_400", label: "300 – 400 m²" },
  { id: "over_400", label: "400 m²+" },
];

const EXTENSION_BANDS: Array<{ id: NonNullable<Project["extensionSizeBand"]>; label: string }> = [
  { id: "under_50", label: "Under 50 m²" },
  { id: "50_100", label: "50 – 100 m²" },
  { id: "100_150", label: "100 – 150 m²" },
  { id: "150_200", label: "150 – 200 m²" },
  { id: "200_250", label: "200 – 250 m²" },
  { id: "250_300", label: "250 – 300 m²" },
  { id: "over_300", label: "300 m²+" },
];

const AGE_BANDS: Array<{ id: NonNullable<Project["existingAgeBand"]>; label: string }> = [
  { id: "under_10", label: "Under 10 yrs" },
  { id: "10_25", label: "10 – 25 yrs" },
  { id: "25_50", label: "25 – 50 yrs" },
  { id: "50_75", label: "50 – 75 yrs" },
  { id: "over_75", label: "Over 75 yrs" },
];

const COUNT_OPTIONS = [
  { id: 1, label: "1" },
  { id: 2, label: "2" },
  { id: 3, label: "3" },
  { id: 4, label: "4" },
  { id: 5, label: "5" },
  { id: 6, label: "6" },
  { id: 7, label: "7" },
  { id: 8, label: "8+" },
];

const FLOOR_OPTIONS = [
  { id: 1, label: "1 storey" },
  { id: 2, label: "2 storeys" },
  { id: 3, label: "3 storeys" },
  { id: 4, label: "4+ storeys" },
];

const DWELLING_OPTIONS = [
  { id: 2, label: "2" },
  { id: 3, label: "3" },
  { id: 4, label: "4" },
  { id: 5, label: "5" },
  { id: 6, label: "6" },
  { id: 7, label: "7" },
  { id: 8, label: "8+" },
];

type DocCatMeta = {
  id: DocumentCategory;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  required?: boolean;
  hint: string;
};

const DOC_CATEGORIES: DocCatMeta[] = [
  {
    id: "architectural",
    label: "Architectural plans",
    shortLabel: "Architectural",
    icon: Compass,
    required: true,
    hint: "Floor plans, elevations, sections.",
  },
  {
    id: "structural_engineering",
    label: "Structural engineering",
    shortLabel: "Structural",
    icon: Hammer,
    hint: "Beams, footings, slab, framing.",
  },
  {
    id: "civil_engineering",
    label: "Civil engineering",
    shortLabel: "Civil",
    icon: Drill,
    hint: "Stormwater, sewerage, retaining.",
  },
  {
    id: "specifications",
    label: "Project specifications",
    shortLabel: "Specs",
    icon: FileText,
    hint: "Materials, finishes, inclusions.",
  },
  {
    id: "land_report",
    label: "Land report",
    shortLabel: "Land",
    icon: TreePine,
    hint: "Title, boundaries, easements.",
  },
  {
    id: "soil_report",
    label: "Soil report",
    shortLabel: "Soil",
    icon: Mountain,
    hint: "Geotech, classification, bores.",
  },
  {
    id: "energy_rating",
    label: "Energy efficiency",
    shortLabel: "Energy",
    icon: Zap,
    hint: "NatHERS, BASIX, thermal.",
  },
  {
    id: "town_planning",
    label: "Town planning",
    shortLabel: "Planning",
    icon: Landmark,
    hint: "Permits, DA, council reports.",
  },
  {
    id: "other",
    label: "Other docs",
    shortLabel: "Other",
    icon: FileQuestion,
    hint: "Anything else useful.",
  },
];

const MISSING_LABEL: Record<PublishabilityReport["missing"][number], string> = {
  title: "Project title",
  type: "Project type",
  address: "Address",
  type_specific_fields: "Build details",
  architectural_plan: "Architectural plan",
};

// ── component ────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

/** Quietly retry this many *transient* save failures before surfacing a
 *  scary red "Save failed". A momentary network/DB hiccup shouldn't alarm
 *  the owner mid-edit when the next attempt just succeeds — which is why the
 *  status used to flicker save-failed → autosaved even though data persisted. */
const MAX_SAVE_RETRIES = 4;
type Step = 1 | 2 | 3;

export function ProjectWizard({
  initialProject,
  initialDocs,
  initialReport,
  flagMissingRequired = false,
}: {
  initialProject: Project;
  initialDocs: Document[];
  initialReport: PublishabilityReport | null;
  /**
   * When true (arrived here via ads-funnel magic link without a
   * publishable project), each unfilled required field renders with
   * a red error state on first paint so the user instantly sees what
   * to add. The flag clears as soon as they edit any field.
   */
  flagMissingRequired?: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project>(initialProject);
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [report, setReport] = useState<PublishabilityReport | null>(initialReport);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState<Step>(1);
  // Latches true once the owner reaches the final (Documents) step. Publish
  // stays disabled until then, so they review every section — and discover
  // where to add more plans — instead of publishing straight from step 1.
  const [reachedLast, setReachedLast] = useState(false);

  const goStep = useCallback((target: Step) => {
    setStep(target);
    if (target >= 3) setReachedLast(true);
  }, []);

  const isPublished = project.status !== "draft";

  // ── autosave (debounced patch sender) ────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<UpdateProjectInput>({});
  const inflight = useRef(false);
  const saveRetries = useRef(0);

  const flush = useCallback(async () => {
    if (inflight.current) return;
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};
    inflight.current = true;
    setSaveState("saving");
    setSaveError(null);
    try {
      const r = await updateProjectAction(project.id, patch);
      if (!r.ok) {
        if (r.error.code === "validation") {
          // Deterministic — retrying the same value would just fail again.
          // Surface it (the optimistic value stays in the form); the next
          // edit re-queues. Don't requeue, so we don't loop on bad input.
          saveRetries.current = 0;
          setSaveState("error");
          setSaveError(r.error.message);
          return;
        }
        // Transient blip (network / DB hiccup). Keep the patch and retry —
        // only flash "Save failed" if it survives a few quick retries, so a
        // momentary hiccup doesn't alarm the owner when the next try works.
        pendingPatch.current = { ...patch, ...pendingPatch.current };
        if (saveRetries.current >= MAX_SAVE_RETRIES) {
          setSaveState("error");
          setSaveError(r.error.message);
        } else {
          saveRetries.current += 1;
        }
        return;
      }
      saveRetries.current = 0;
      setProject(r.value);
      setSaveState("saved");
      const rep = await checkPublishabilityAction(r.value.id);
      if (rep.ok) setReport(rep.value);
    } finally {
      inflight.current = false;
      if (Object.keys(pendingPatch.current).length > 0) scheduleFlush();
    }
  }, [project.id]);

  const scheduleFlush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 500);
  }, [flush]);

  const setField = useCallback(
    <K extends keyof UpdateProjectInput>(key: K, value: UpdateProjectInput[K]) => {
      pendingPatch.current = { ...pendingPatch.current, [key]: value };
      setProject((p) => ({ ...p, [key]: value as never }));
      scheduleFlush();
    },
    [scheduleFlush],
  );

  useEffect(() => {
    const onBeforeUnload = () => {
      if (Object.keys(pendingPatch.current).length > 0) flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  // The instant the project flips draft → published — whether from the
  // explicit Publish button OR an autosave that completes the draft (the
  // server auto-promotes a draft the moment it has everything it needs) —
  // hand off to the full-screen "you're live" celebration. One nav path for
  // both, so the moment is never silently skipped. The ref fires it once;
  // the draft-start guard means editing an already-live project never does.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (
      initialProject.status === "draft" &&
      project.status !== "draft" &&
      !celebratedRef.current
    ) {
      celebratedRef.current = true;
      router.push(`/owner/projects/${project.slug}/published`);
    }
  }, [project.status, project.slug, initialProject.status, router]);

  const refreshDocs = useCallback(async () => {
    const r = await listProjectDocumentsAction(project.id);
    if (r.ok) setDocs(r.value);
    const rep = await checkPublishabilityAction(project.id);
    if (rep.ok) setReport(rep.value);
  }, [project.id]);

  // ── checkpoint logic ─────────────────────────────────────────────────

  const checkpoints = useMemo(() => {
    const step1Done =
      !!project.title?.trim() &&
      !!project.addressLine1 &&
      !!project.suburb &&
      !!project.state &&
      !!project.postcode;
    const step2Done = checkBuildStepDone(project);
    const archCount = docs.filter(
      (d) => d.category === "architectural" && d.status === "active",
    ).length;
    const step3Done = archCount > 0;
    return { 1: step1Done, 2: step2Done, 3: step3Done };
  }, [project, docs]);

  const allDone = checkpoints[1] && checkpoints[2] && checkpoints[3];

  // ── publish ──────────────────────────────────────────────────────────

  const onPublish = useCallback(async () => {
    setPublishing(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await flush();
      const r = await publishProjectAction(project.id);
      if (!r.ok) {
        const reasons = (r.error.details?.reasons as string[]) ?? [r.error.message];
        toast.error(
          "Couldn't publish",
          reasons.length > 1 ? reasons.join(" · ") : reasons[0],
        );
        return;
      }
      // Flip local state to published — the draft→published effect above
      // takes it from here and routes to the celebration. One nav path for
      // both the manual button and an autosave that auto-promotes the draft.
      setProject(r.value);
    } finally {
      setPublishing(false);
    }
  }, [flush, project.id]);

  const onDelete = useCallback(async () => {
    if (!confirm("Delete this draft? This can be undone by an admin.")) return;
    const r = await softDeleteProjectAction(project.id);
    if (!r.ok) {
      toast.error("Couldn't delete", r.error.message);
      return;
    }
    toast.message("Draft deleted");
    router.push("/owner/projects");
  }, [project.id, router]);

  // ── render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-32">
      {/* Header — type, title, save state */}
      <header className="border-b border-border-subtle bg-bg-deep/30">
        <div className="px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-7 flex items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2 flex-wrap">
              {TYPE_META[project.type].icon}
              {TYPE_META[project.type].label}
              <span className="text-text-dim/60 mx-1">·</span>
              <StatusPill status={project.status} />
            </span>
            <h1 className="mt-1.5 font-display uppercase tracking-[-0.018em] text-[26px] sm:text-[40px] leading-[0.95] text-text truncate">
              {project.title}
            </h1>
          </div>
          <SaveIndicator state={saveState} error={saveError} />
        </div>

        {/* Progress tracker */}
        <ProgressTracker
          step={step}
          checkpoints={checkpoints}
          onJump={goStep}
          locked={isPublished}
        />
      </header>

      {/* Step content */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        <div className="mx-auto max-w-[820px]">
          <Suspense fallback={null}>
            <AutofillBanner />
          </Suspense>
          {step === 1 ? (
            <Step1Basics
              project={project}
              setField={setField}
              disabled={isPublished}
              flagMissingRequired={flagMissingRequired}
            />
          ) : step === 2 ? (
            <Step2Build
              project={project}
              setField={setField}
              disabled={isPublished}
              flagMissingRequired={flagMissingRequired}
            />
          ) : (
            <Step3Documents
              projectId={project.id}
              docs={docs}
              onRefresh={refreshDocs}
            />
          )}

          {/* Step navigation */}
          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goStep(Math.max(1, step - 1) as Step)}
              disabled={step === 1}
              className={cn(
                "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-[12px] tracking-[0.04em] transition-colors",
                step === 1
                  ? "opacity-40 cursor-not-allowed border-border-subtle text-text-dim"
                  : "border-border-strong text-text hover:bg-surface-1",
              )}
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>

            {step === 1 && project.status === "draft" ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-[12px] text-text-dim hover:text-danger transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Delete draft
              </button>
            ) : <span />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => goStep(Math.min(3, step + 1) as Step)}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-accent-muted border border-border-accent text-accent-light text-[12px] font-semibold tracking-[0.04em] hover:bg-accent-muted/70 transition-colors"
              >
                Next
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>

      <PublishBar
        project={project}
        report={report}
        publishing={publishing}
        allDone={allDone}
        reviewed={reachedLast}
        onPublish={onPublish}
      />
    </div>
  );
}

// ── auto-fill review banner ──────────────────────────────────────────────

/**
 * Shown once when the owner arrives from the AI plan auto-fill flow
 * (?from=autofill&filled=N). Reassures them their plan is attached and
 * nudges a review. Reads the query off window.location (no Suspense
 * needed) and scrubs it so a refresh won't re-show it.
 */
function AutofillBanner() {
  const sp = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const isAutofill = sp.get("from") === "autofill";
  const n = parseInt(sp.get("filled") ?? "0", 10);
  const filled = Number.isFinite(n) ? n : 0;

  // Scrub the params from the address bar so a refresh won't re-show this.
  // Pure history-API side-effect — no React state is touched here.
  useEffect(() => {
    if (!isAutofill || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("from")) return;
    url.searchParams.delete("from");
    url.searchParams.delete("filled");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [isAutofill]);

  if (!isAutofill || dismissed) return null;

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-md border border-border-accent bg-[rgba(0,212,200,0.05)] px-4 py-3.5"
      style={{ animation: "var(--animate-fade-in)" }}
    >
      <span className="mt-0.5 size-7 shrink-0 rounded-md grid place-items-center border border-border-accent bg-accent-muted text-accent-light">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text">
          {filled > 0
            ? `We filled ${filled} ${filled === 1 ? "detail" : "details"} from your plans`
            : "Your plans are attached"}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-[1.5] text-text-muted">
          Review each step and adjust anything before you publish. Your
          architectural plan is already uploaded.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 -m-1 p-1 text-text-dim hover:text-text transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// ── progress tracker ─────────────────────────────────────────────────────

function ProgressTracker({
  step,
  checkpoints,
  onJump,
  locked,
}: {
  step: Step;
  checkpoints: Record<Step, boolean>;
  onJump: (s: Step) => void;
  locked: boolean;
}) {
  const STEPS: Array<{ id: Step; title: string; sub: string; icon: LucideIcon }> = [
    { id: 1, title: "About", sub: "Title + address", icon: Sparkles },
    { id: 2, title: "Build", sub: "Details + budget", icon: Hammer },
    { id: 3, title: "Documents", sub: "Plans + specs", icon: FileText },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 pb-6">
      <div className="mx-auto max-w-[820px] grid grid-cols-3 gap-3 relative">
        {/* connecting line */}
        <span
          aria-hidden
          className="absolute top-5 left-[16.6%] right-[16.6%] h-px bg-border-subtle"
        />
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isDone = checkpoints[s.id];
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => onJump(s.id)}
              className="relative group flex flex-col items-center text-center"
            >
              <span
                className={cn(
                  "relative size-10 rounded-full border flex items-center justify-center transition-all duration-[300ms]",
                  isActive
                    ? "border-border-accent bg-accent-muted text-accent-light shadow-[0_0_0_4px_rgba(0,212,200,0.10),_0_0_24px_rgba(0,212,200,0.25)]"
                    : isDone
                    ? "border-border-accent/60 bg-accent-muted/40 text-accent-light"
                    : "border-border-subtle bg-bg-deep text-text-dim",
                  !locked && "group-hover:border-border-accent",
                )}
              >
                {isDone && !isActive ? (
                  <Check className="size-4" />
                ) : (
                  <s.icon className="size-4" />
                )}
              </span>
              <span
                className={cn(
                  "mt-2.5 text-[11.5px] font-semibold tracking-[0.04em]",
                  isActive ? "text-text" : "text-text-muted",
                )}
              >
                {s.title}
              </span>
              <span className="text-[10px] text-text-dim">{s.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── step 1: basics ───────────────────────────────────────────────────────

function Step1Basics({
  project,
  setField,
  disabled,
  flagMissingRequired = false,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
  flagMissingRequired?: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle title="About the project" sub="The address — that's it for this step." />

      {flagMissingRequired ? (
        <FinishBanner project={project} />
      ) : null}

      <Card>
        <Field label="Project title">
          <input
            type="text"
            value={project.title}
            readOnly
            disabled
            className={inputCls}
          />
          <p className="mt-1.5 text-[12px] text-text-dim">
            Generated automatically from the type and suburb — this is what
            builders see, so it never includes your street address.
          </p>
        </Field>
      </Card>

      <Card icon={<MapPin className="size-4" />} title="Where is it?" sub="Australian addresses only.">
        <AddressFields
          project={project}
          setField={setField}
          disabled={disabled}
          flagMissingRequired={flagMissingRequired}
        />
      </Card>
    </div>
  );
}

/**
 * Welcome banner shown at the top of step 1 when the user landed
 * here via the ads-funnel magic-link click but couldn't auto-publish.
 * Lists what's still needed, sourced from the project state.
 */
function FinishBanner({ project }: { project: Project }) {
  const missing: string[] = [];
  if (!project.title?.trim()) missing.push("title");
  if (
    !project.addressLine1 ||
    !project.suburb ||
    !project.state ||
    !project.postcode
  ) {
    missing.push("street address");
  }
  if (project.type === "extension" && !project.extensionSizeBand) {
    missing.push("extension size");
  }
  if (missing.length === 0) return null;

  return (
    <div className="rounded-lg border border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.06)] px-4 py-3 flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 inline-flex items-center justify-center size-5 rounded-full bg-[rgba(251,184,64,0.18)] text-warning text-[11px] font-ui font-semibold"
      >
        !
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-warning text-[10px] tracking-[0.18em] uppercase font-ui font-semibold">
          Almost ready to publish
        </p>
        <p className="mt-1 text-[13px] leading-[1.55] text-text">
          We just need a {missing.join(", ")} before your project goes live to verified builders.
        </p>
      </div>
    </div>
  );
}

function AddressFields({
  project,
  setField,
  disabled,
  flagMissingRequired = false,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
  flagMissingRequired?: boolean;
}) {
  // Highlight unfilled required fields with red when arriving via the
  // ads-funnel magic-link click that couldn't auto-publish. The flag
  // is at-mount; the user's edits naturally remove the flag because
  // the field is no longer empty.
  const streetMissing = flagMissingRequired && !project.addressLine1;
  const postcodeMissing = flagMissingRequired && !project.postcode;
  const suburbMissing = flagMissingRequired && !project.suburb;
  const stateMissing = flagMissingRequired && !project.state;
  const [postcode, setPostcode] = useState(project.postcode ?? "");
  const [suburbOptions, setSuburbOptions] = useState<
    Array<{ suburb: string; state: string }>
  >([]);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  useEffect(() => {
    if (!/^\d{4}$/.test(postcode)) {
      setSuburbOptions([]);
      setLookupNote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await lookupPostcodeAction(postcode);
      if (cancelled) return;
      if (r.suburbs.length === 0) {
        setSuburbOptions([]);
        setLookupNote("Postcode not recognised.");
        return;
      }
      setSuburbOptions(r.suburbs);
      if (r.suburbs.length === 1) {
        const only = r.suburbs[0]!;
        setField("postcode", postcode);
        setField("suburb", only.suburb);
        setField("state", only.state as Project["state"]);
        setLookupNote(null);
      } else if (
        project.suburb &&
        r.suburbs.some((s) => s.suburb === project.suburb)
      ) {
        setLookupNote(null);
      } else {
        setLookupNote(`${r.suburbs.length} suburbs match — pick one.`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postcode, project.suburb, setField]);

  return (
    <div className="space-y-4">
      <Field
        label="Street address"
        required
        error={streetMissing ? "We need this to publish your project." : null}
      >
        <input
          type="text"
          defaultValue={project.addressLine1 ?? ""}
          disabled={disabled}
          onChange={(e) => setField("addressLine1", e.target.value || null)}
          placeholder="14 Treadwell Road"
          className={streetMissing ? inputClsErr : inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_120px] gap-3">
        <Field
          label="Postcode"
          required
          error={postcodeMissing ? "Required" : null}
        >
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={postcode}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPostcode(v);
              setField("postcode", v || null);
            }}
            placeholder="3042"
            className={cn(
              postcodeMissing ? inputClsErr : inputCls,
              "font-mono tabular-nums",
            )}
          />
        </Field>
        <Field
          label="Suburb"
          required
          error={suburbMissing ? "Required" : null}
        >
          {suburbOptions.length > 1 ? (
            <select
              value={project.suburb ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const sel = suburbOptions.find((s) => s.suburb === e.target.value);
                if (!sel) return;
                setField("suburb", sel.suburb);
                setField("state", sel.state as Project["state"]);
              }}
              className={inputCls}
            >
              <option value="">Pick a suburb…</option>
              {suburbOptions.map((s) => (
                <option key={s.suburb} value={s.suburb}>
                  {s.suburb}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={project.suburb ?? ""}
              disabled
              placeholder={lookupNote ?? "Enter postcode first"}
              className={cn(inputCls, "opacity-80")}
            />
          )}
        </Field>
        <Field
          label="State"
          required
          error={stateMissing ? "Required" : null}
        >
          <input
            type="text"
            value={project.state ?? ""}
            disabled
            placeholder="Auto"
            className={cn(
              stateMissing ? inputClsErr : inputCls,
              "opacity-80 text-center font-semibold",
            )}
          />
        </Field>
      </div>

      {lookupNote ? (
        <div className="text-[12px] text-text-dim">{lookupNote}</div>
      ) : null}
    </div>
  );
}

// ── step 2: build details + budget + brief ───────────────────────────────

function Step2Build({
  project,
  setField,
  disabled,
  flagMissingRequired = false,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
  flagMissingRequired?: boolean;
}) {
  const t = project.type;
  // The funnel scope step doesn't collect extension size band for
  // extension projects — flag it as missing on first paint so the
  // owner sees what to fill in. All other type-specific fields
  // (bedrooms / dwelling count / renovation scope) are collected by
  // the funnel, so they're populated by the time the user gets here.
  const extSizeMissing =
    flagMissingRequired && t === "extension" && !project.extensionSizeBand;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="The build"
        sub="Just the bits that matter for this project type."
      />

      <Card icon={TYPE_META[t].icon} title="Build details">
        <div className="space-y-4">
          {(t === "single_dwelling" ||
            t === "multi_dwelling" ||
            t === "extension") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DropdownField
                label={t === "multi_dwelling" ? "Total bedrooms" : "Bedrooms"}
                required
                options={COUNT_OPTIONS}
                value={project.bedrooms}
                onChange={(v) => setField("bedrooms", v)}
                disabled={disabled}
              />
              <DropdownField
                label={t === "multi_dwelling" ? "Total bathrooms" : "Bathrooms"}
                required
                options={COUNT_OPTIONS}
                value={project.bathrooms}
                onChange={(v) => setField("bathrooms", v)}
                disabled={disabled}
              />
              {t !== "multi_dwelling" ? (
                <DropdownField
                  label="Storeys"
                  required={t === "single_dwelling"}
                  options={FLOOR_OPTIONS}
                  value={project.floors}
                  onChange={(v) => setField("floors", v)}
                  disabled={disabled}
                />
              ) : null}
            </div>
          )}

          {(t === "single_dwelling" || t === "multi_dwelling") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DropdownField
                label="Land size"
                options={LAND_BANDS}
                value={project.landSizeBand}
                onChange={(v) => setField("landSizeBand", v)}
                disabled={disabled}
              />
              <DropdownField
                label="Build size"
                options={BUILD_BANDS}
                value={project.buildSizeBand}
                onChange={(v) => setField("buildSizeBand", v)}
                disabled={disabled}
              />
            </div>
          )}

          {t === "multi_dwelling" && (
            <DropdownField
              label="Number of dwellings"
              required
              options={DWELLING_OPTIONS}
              value={project.dwellingCount}
              onChange={(v) => setField("dwellingCount", v)}
              disabled={disabled}
            />
          )}

          {t === "renovation" && (
            <>
              <RenovationScopeMultiSelect
                tags={project.renovationScopeTags ?? []}
                onChange={(next) => setField("renovationScopeTags", next)}
                disabled={disabled}
              />
              <DropdownField
                label="Existing house age"
                options={AGE_BANDS}
                value={project.existingAgeBand}
                onChange={(v) => setField("existingAgeBand", v)}
                disabled={disabled}
              />
            </>
          )}

          {t === "extension" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DropdownField
                  label="Extension type"
                  required
                  options={EXTENSION_TYPES}
                  value={project.extensionType}
                  onChange={(v) => setField("extensionType", v)}
                  disabled={disabled}
                />
                <DropdownField
                  label="Extension size"
                  required
                  options={EXTENSION_BANDS}
                  value={project.extensionSizeBand}
                  onChange={(v) => setField("extensionSizeBand", v)}
                  disabled={disabled}
                  error={extSizeMissing ? "Required to publish." : null}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      <Card
        icon={<DollarSign className="size-4" />}
        title="Budget & timeline"
        sub="Banded — no need to commit to exact numbers."
      >
        <div className="space-y-4">
          <DropdownField
            label="Budget band"
            options={BUDGET_BANDS}
            value={project.budgetBand}
            onChange={(v) => setField("budgetBand", v)}
            disabled={disabled}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Target start (month)">
              <input
                type="month"
                defaultValue={project.targetStartMonth ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  setField("targetStartMonth", e.target.value || null)
                }
                className={inputCls}
              />
            </Field>
            <Field label="Target completion (month)">
              <input
                type="month"
                defaultValue={project.targetCompletionMonth ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  setField("targetCompletionMonth", e.target.value || null)
                }
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card
        icon={<FileText className="size-4" />}
        title="Anything else?"
        sub="Optional. A few sentences about the brief, style, or constraints."
      >
        <textarea
          defaultValue={project.description ?? ""}
          disabled={disabled}
          onChange={(e) => setField("description", e.target.value || null)}
          rows={5}
          placeholder="e.g. Modern 4-bed family home, contemporary build, ground + first floor, double garage. Looking for a builder who can manage the council DA process."
          className={cn(inputCls, "min-h-[120px] py-3 leading-[1.6]")}
        />
      </Card>
    </div>
  );
}

// ── step 3: documents (9 visible category tiles) ─────────────────────────

function Step3Documents({
  projectId,
  docs,
  onRefresh,
}: {
  projectId: string;
  docs: Document[];
  onRefresh: () => void | Promise<void>;
}) {
  const [active, setActive] = useState<LocalUpload[]>([]);

  const grouped = useMemo(() => {
    const groups: Record<DocumentCategory, Document[]> = {
      architectural: [],
      structural_engineering: [],
      civil_engineering: [],
      specifications: [],
      land_report: [],
      soil_report: [],
      energy_rating: [],
      town_planning: [],
      other: [],
    };
    for (const d of docs) groups[d.category]?.push(d);
    return groups;
  }, [docs]);

  const archCount = grouped.architectural.filter((d) => d.status === "active").length;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Documents"
        sub="Architectural plans are required to publish. The more you share, the better-fit the tenders."
      />

      {/* Compulsory note */}
      <div
        className={cn(
          "rounded-md border px-5 py-4 flex items-start gap-3 transition-colors",
          archCount > 0
            ? "border-border-accent/60 bg-[rgba(0,212,200,0.04)]"
            : "border-warning/30 bg-warning/[0.04]",
        )}
      >
        <span
          className={cn(
            "size-8 rounded-md flex items-center justify-center shrink-0 mt-0.5",
            archCount > 0
              ? "border border-border-accent bg-accent-muted text-accent-light"
              : "border border-warning/40 bg-warning/[0.08] text-warning",
          )}
        >
          {archCount > 0 ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
        </span>
        <div className="text-[13px] leading-[1.55]">
          <div className={cn("font-semibold", archCount > 0 ? "text-accent-light" : "text-warning")}>
            {archCount > 0
              ? `Architectural plans uploaded · ${archCount} file${archCount === 1 ? "" : "s"}`
              : "Architectural plans required"}
          </div>
          <div className="text-text-muted mt-0.5">
            {archCount > 0
              ? "You can publish whenever the rest of the project is ready."
              : "At least one architectural plan must be uploaded before this project can go live to builders."}
          </div>
        </div>
      </div>

      {/* 9 category tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOC_CATEGORIES.map((c) => (
          <CategoryTile
            key={c.id}
            meta={c}
            projectId={projectId}
            files={grouped[c.id] ?? []}
            inflight={active.filter((u) => u.category === c.id)}
            setActive={setActive}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryTile({
  meta,
  projectId,
  files,
  inflight,
  setActive,
  onRefresh,
}: {
  meta: DocCatMeta;
  projectId: string;
  files: Document[];
  inflight: LocalUpload[];
  setActive: React.Dispatch<React.SetStateAction<LocalUpload[]>>;
  onRefresh: () => void | Promise<void>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = meta.icon;

  const onDrop = useCallback(
    async (list: FileList | File[]) => {
      const items = Array.from(list);
      for (const f of items) {
        await uploadOne({
          file: f,
          projectId,
          category: meta.id,
          setActive,
          onDone: onRefresh,
        });
      }
    },
    [meta.id, projectId, onRefresh, setActive],
  );

  const activeFiles = files.filter((d) => d.status === "active");
  const hasFiles = activeFiles.length > 0 || inflight.length > 0;

  return (
    <article
      className={cn(
        "relative rounded-md border overflow-hidden transition-[border-color,background] duration-[300ms]",
        "shadow-[0_18px_44px_-22px_rgba(0,0,0,0.55)]",
        meta.required && activeFiles.length === 0
          ? "border-warning/40 bg-[linear-gradient(180deg,rgba(251,184,64,0.05),rgba(6,18,30,0.6))]"
          : hasFiles
          ? "border-border-accent/40 bg-[linear-gradient(180deg,rgba(0,212,200,0.05),rgba(6,18,30,0.6))]"
          : dragOver
          ? "border-border-accent bg-[rgba(0,212,200,0.05)]"
          : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] hover:border-border",
      )}
    >
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onDrop(e.dataTransfer.files);
        }}
        className="block cursor-pointer p-5"
      >
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && onDrop(e.target.files)}
        />

        <div className="flex items-start justify-between gap-3 mb-4">
          <span
            className={cn(
              "size-10 rounded-md border flex items-center justify-center",
              meta.required && activeFiles.length === 0
                ? "border-warning/40 bg-warning/[0.08] text-warning"
                : hasFiles
                ? "border-border-accent bg-accent-muted text-accent-light"
                : "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
            )}
          >
            <Icon className="size-4" />
          </span>
          {meta.required ? (
            <span
              className={cn(
                "px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
                activeFiles.length > 0
                  ? "border-border-accent text-accent-light bg-accent-muted/40"
                  : "border-warning/40 text-warning bg-warning/[0.08]",
              )}
            >
              {activeFiles.length > 0 ? "Done" : "Required"}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 border border-border-subtle rounded-sm text-[8.5px] tracking-[0.16em] uppercase text-text-dim">
              Optional
            </span>
          )}
        </div>

        <h3 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
          {meta.label}
        </h3>
        <p className="mt-1 text-[11.5px] text-text-dim leading-[1.5]">
          {meta.hint}
        </p>

        <div className="mt-4 pt-4 border-t border-border-subtle/50 flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-muted">
            {activeFiles.length > 0
              ? `${activeFiles.length} file${activeFiles.length === 1 ? "" : "s"} uploaded`
              : "Drop files or click to browse"}
          </span>
          <Upload className="size-3.5 text-text-faint" />
        </div>
      </label>

      {/* in-flight uploads (compact rows) */}
      {inflight.length > 0 ? (
        <div className="px-5 pb-3 -mt-1 space-y-1.5">
          {inflight.map((u) => (
            <div key={u.id} className="text-[10.5px]">
              <div className="flex justify-between text-text-muted">
                <span className="truncate mr-2">{u.filename}</span>
                <span
                  className={cn(
                    "shrink-0 tracking-[0.1em] uppercase",
                    u.status === "error" ? "text-danger" : "text-accent-light",
                  )}
                >
                  {u.status === "uploading" && `${u.progress}%`}
                  {u.status === "confirming" && "…"}
                  {u.status === "done" && "✓"}
                  {u.status === "error" && (u.error ?? "Err")}
                </span>
              </div>
              <div className="h-[2px] mt-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-300",
                    u.status === "error" ? "bg-danger" : "bg-accent",
                  )}
                  style={{
                    width: `${u.status === "done" ? 100 : u.status === "confirming" ? 95 : u.progress}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* uploaded files (collapsible if > 2) */}
      {activeFiles.length > 0 ? (
        <div className="px-5 pb-5 -mt-1">
          <ul className="space-y-1">
            {(expanded ? activeFiles : activeFiles.slice(0, 2)).map((d) => (
              <FileChip key={d.id} doc={d} onDeleted={onRefresh} />
            ))}
          </ul>
          {activeFiles.length > 2 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-[10.5px] text-text-dim hover:text-accent-light transition-colors"
            >
              {expanded
                ? "Show fewer"
                : `+ ${activeFiles.length - 2} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function FileChip({
  doc,
  onDeleted,
}: {
  doc: Document;
  onDeleted: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<"download" | "delete" | null>(null);
  return (
    <li className="flex items-center justify-between gap-2 text-[11.5px] px-2 py-1.5 rounded-sm bg-[rgba(255,255,255,0.022)] border border-border-subtle/60">
      <span className="truncate text-text-muted flex-1">{doc.filename}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("download");
            const r = await getDownloadUrlAction(doc.id);
            setBusy(null);
            if (!r.ok) {
              toast.error("Download failed", r.error.message);
              return;
            }
            window.open(r.value.url, "_blank", "noopener");
          }}
          className="size-5 rounded text-text-dim hover:text-accent-light transition-colors flex items-center justify-center"
          title="Download"
        >
          {busy === "download" ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            if (!confirm("Delete this document?")) return;
            setBusy("delete");
            const r = await softDeleteDocAction(doc.id);
            setBusy(null);
            if (!r.ok) {
              toast.error("Couldn't delete", r.error.message);
              return;
            }
            await onDeleted();
          }}
          className="size-5 rounded text-text-dim hover:text-danger transition-colors flex items-center justify-center"
          title="Delete"
        >
          {busy === "delete" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </button>
      </div>
    </li>
  );
}

// ── publish bar ──────────────────────────────────────────────────────────

function PublishBar({
  project,
  report,
  publishing,
  allDone,
  reviewed,
  onPublish,
}: {
  project: Project;
  report: PublishabilityReport | null;
  publishing: boolean;
  allDone: boolean;
  reviewed: boolean;
  onPublish: () => void | Promise<void>;
}) {
  const isPublished = project.status !== "draft";
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-deep/98 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          {isPublished ? (
            <div className="text-[13px] text-accent-light flex items-center gap-2">
              <Check className="size-4" />
              Published, visible to matched builders
            </div>
          ) : !allDone ? (
            <div className="text-[12.5px] text-text-dim flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-warning shrink-0 mt-0.5" />
              <span className="truncate">
                Still missing:{" "}
                {report?.missing.map((m) => MISSING_LABEL[m]).join(" · ")}
              </span>
            </div>
          ) : !reviewed ? (
            <div className="text-[12.5px] flex items-start gap-2">
              <ArrowRight className="size-3.5 text-accent-light shrink-0 mt-0.5" />
              <span className="min-w-0">
                <span className="text-text font-medium">
                  Review each step to publish.
                </span>{" "}
                <span className="text-text-dim">
                  You can add more plans in the Documents step.
                </span>
              </span>
            </div>
          ) : (
            <div className="text-[13px] text-accent-light flex items-center gap-2">
              <Check className="size-4" />
              Ready to publish
            </div>
          )}
        </div>
        {isPublished ? (
          <a
            href={`/owner/projects/${project.slug}`}
            className="inline-flex items-center gap-2 h-10 px-4 sm:px-5 rounded-full border border-border-strong text-text text-[12.5px] tracking-[0.04em] hover:bg-surface-1 transition-colors shrink-0"
          >
            <span className="hidden sm:inline">View project</span>
            <span className="sm:hidden">View</span>
            <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={!allDone || !reviewed || publishing}
            title={
              allDone && !reviewed
                ? "Review every step first. Open the Documents step to finish your review."
                : undefined
            }
            className={cn(
              "inline-flex items-center gap-2 h-10 px-4 sm:px-5 rounded-full text-[12.5px] font-semibold tracking-[0.04em] transition-colors duration-[160ms] shrink-0",
              allDone && reviewed && !publishing
                ? "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]"
                : "bg-surface-2 text-text-dim cursor-not-allowed",
            )}
          >
            {publishing ? <Loader2 className="size-4 animate-spin" /> : null}
            {publishing ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── small atoms ──────────────────────────────────────────────────────────

function SaveIndicator({
  state,
  error,
}: {
  state: SaveState;
  error: string | null;
}) {
  return (
    <div className="text-[11px] tracking-[0.04em] flex items-center gap-2 shrink-0">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin text-text-dim" />
          <span className="text-text-dim">Saving…</span>
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3 text-accent-light" />
          <span className="text-text-dim">Saved</span>
        </>
      ) : state === "error" ? (
        <>
          <AlertTriangle className="size-3 text-danger" />
          <span className="text-danger" title={error ?? ""}>
            Save failed
          </span>
        </>
      ) : (
        <span className="text-text-dim/60">Autosaved</span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Project["status"] }) {
  const cls =
    status === "draft"
      ? "border-border-subtle text-text-dim"
      : status === "published" || status === "tendering"
      ? "border-border-accent text-accent"
      : "border-border-subtle text-text-dim";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="font-display uppercase tracking-[-0.018em] text-[24px] sm:text-[32px] leading-[0.95] text-text">
        {title}
      </h2>
      {sub ? (
        <p className="mt-2 text-[13px] sm:text-[13.5px] leading-[1.6] text-text-muted">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function Card({
  icon,
  title,
  sub,
  children,
}: {
  icon?: React.ReactNode;
  title?: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden shadow-[0_18px_44px_-22px_rgba(0,0,0,0.55)]"
    >
      {title ? (
        <header className="px-4 sm:px-6 py-4 border-b border-border-subtle/60 flex items-start gap-3">
          {icon ? (
            <span className="size-8 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center shrink-0">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-ui font-semibold text-[13.5px] text-text">
              {title}
            </h3>
            {sub ? (
              <p className="text-[11.5px] text-text-dim mt-0.5">{sub}</p>
            ) : null}
          </div>
        </header>
      ) : null}
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

const inputCls =
  "w-full h-11 px-3.5 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[13.5px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-border-accent focus:bg-[rgba(0,212,200,0.025)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

/**
 * Same as inputCls but with a red border to flag a missing required
 * field. Used when ?welcome=finish lands a user from the ads-funnel
 * magic-link click before all required fields are filled.
 */
const inputClsErr =
  "w-full h-11 px-3.5 rounded-md border border-[rgba(255,80,80,0.55)] bg-[rgba(255,80,80,0.04)] text-[13.5px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-danger focus:bg-[rgba(255,80,80,0.06)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  /** When provided, renders below the field in danger color. Used
   *  to flag missing-but-required state from ?welcome=finish. */
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] tracking-[0.18em] uppercase text-text-dim mb-1.5">
        {label}
        {required ? (
          <span
            className={error ? "text-danger ml-1" : "text-accent ml-1"}
          >
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[11.5px] text-danger font-body">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Multi-select renovation scope. Owners often want multiple scopes
 * (kitchen + bathroom + structural). Renders the RENO_SCOPES options
 * as toggle chips; selected ones get the accent treatment.
 */
function RenovationScopeMultiSelect({
  tags,
  onChange,
  disabled,
}: {
  tags: NonNullable<Project["renovationScope"]>[];
  onChange: (next: NonNullable<Project["renovationScope"]>[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: NonNullable<Project["renovationScope"]>) {
    if (disabled) return;
    const next = tags.includes(id)
      ? tags.filter((t) => t !== id)
      : [...tags, id];
    onChange(next);
  }
  return (
    <Field label="Renovation scope" required>
      <p className="text-text-faint text-[11.5px] font-body mb-2.5 mt-0.5">
        Tick every part of the home that&apos;s in scope. You can pick more
        than one.
      </p>
      <div className="flex flex-wrap gap-2">
        {RENO_SCOPES.map((o) => {
          const selected = tags.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[12.5px] font-ui font-semibold transition-colors disabled:opacity-50",
                selected
                  ? "border border-accent bg-accent-muted text-accent-light"
                  : "border border-border-strong bg-surface-1/40 text-text hover:border-border-accent",
              ].join(" ")}
            >
              {selected ? "✓ " : ""}
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function DropdownField<T extends string | number>({
  label,
  required,
  options,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  required?: boolean;
  options: Array<{ id: T; label: string }>;
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  disabled?: boolean;
  /** Optional error string to flag a missing-but-required field. */
  error?: string | null;
}) {
  return (
    <Field label={label} required={required} error={error}>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          // If the option's id is numeric, coerce.
          const num = Number(raw);
          onChange(
            (Number.isFinite(num) && String(num) === raw ? num : raw) as T,
          );
        }}
        className={error ? inputClsErr : inputCls}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={String(o.id)} value={String(o.id)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ── upload pipeline ──────────────────────────────────────────────────────

type LocalUpload = {
  id: string;
  filename: string;
  category: DocumentCategory;
  status: "uploading" | "confirming" | "done" | "error";
  progress: number;
  error?: string;
};

async function uploadOne(args: {
  file: File;
  projectId: string;
  category: DocumentCategory;
  setActive: React.Dispatch<React.SetStateAction<LocalUpload[]>>;
  onDone: () => void | Promise<void>;
}) {
  const localId = crypto.randomUUID();
  const { file, projectId, category, setActive, onDone } = args;
  setActive((s) => [
    ...s,
    {
      id: localId,
      filename: file.name,
      category,
      status: "uploading",
      progress: 0,
    },
  ]);
  const patch = (p: Partial<LocalUpload>) =>
    setActive((s) => s.map((u) => (u.id === localId ? { ...u, ...p } : u)));

  try {
    const init = await initUploadAction({
      projectId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category,
    });
    if (!init.ok) {
      patch({ status: "error", error: init.error.message });
      return;
    }
    await putWithProgress({
      url: init.value.uploadUrl,
      headers: init.value.uploadHeaders,
      body: file,
      onProgress: (pct) => patch({ progress: Math.round(pct * 100) }),
    });
    patch({ status: "confirming" });
    const done = await completeUploadAction(init.value.documentId);
    if (!done.ok) {
      patch({ status: "error", error: done.error.message });
      return;
    }
    patch({ status: "done", progress: 100 });
    await onDone();
    setTimeout(() => {
      setActive((s) => s.filter((u) => u.id !== localId));
    }, 800);
  } catch (err) {
    patch({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function putWithProgress(args: {
  url: string;
  headers: Record<string, string>;
  body: Blob;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", args.url);
    for (const [k, v] of Object.entries(args.headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && args.onProgress) {
        args.onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 PUT failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(args.body);
  });
}

// ── helpers ──────────────────────────────────────────────────────────────

function checkBuildStepDone(p: Project): boolean {
  switch (p.type) {
    case "single_dwelling":
      return !!p.bedrooms && !!p.bathrooms && !!p.floors;
    case "multi_dwelling":
      return !!p.dwellingCount && p.dwellingCount >= 2 && !!p.bedrooms && !!p.bathrooms;
    case "renovation":
      // Multi-select: complete if at least one scope tag is picked.
      // The legacy `renovationScope` is derived from the tags array
      // on save, so the array is the source of truth here.
      return (p.renovationScopeTags?.length ?? 0) > 0;
    case "extension":
      return !!p.extensionType && !!p.extensionSizeBand;
    default:
      return false;
  }
}
