"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  { id: "under_20", label: "Under 20 m²" },
  { id: "20_40", label: "20 – 40 m²" },
  { id: "40_60", label: "40 – 60 m²" },
  { id: "60_80", label: "60 – 80 m²" },
  { id: "80_100", label: "80 – 100 m²" },
  { id: "over_100", label: "100 m²+" },
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
type Step = 1 | 2 | 3;

export function ProjectWizard({
  initialProject,
  initialDocs,
  initialReport,
}: {
  initialProject: Project;
  initialDocs: Document[];
  initialReport: PublishabilityReport | null;
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project>(initialProject);
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [report, setReport] = useState<PublishabilityReport | null>(initialReport);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState<Step>(1);

  const isPublished = project.status !== "draft";

  // ── autosave (debounced patch sender) ────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<UpdateProjectInput>({});
  const inflight = useRef(false);

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
        setSaveState("error");
        setSaveError(r.error.message);
        pendingPatch.current = { ...patch, ...pendingPatch.current };
        return;
      }
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
      setProject(r.value);
      toast.success("Project published", "Builders can now find it in the marketplace.");
      router.push(`/owner/projects/${r.value.slug}`);
    } finally {
      setPublishing(false);
    }
  }, [flush, project.id, router]);

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
        <div className="px-6 lg:px-10 py-6 lg:py-7 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              {TYPE_META[project.type].icon}
              {TYPE_META[project.type].label}
              <span className="text-text-dim/60 mx-1">·</span>
              <StatusPill status={project.status} />
            </span>
            <h1 className="mt-1.5 font-display uppercase tracking-[-0.018em] text-[32px] sm:text-[40px] leading-[0.95] text-text truncate">
              {project.title}
            </h1>
          </div>
          <SaveIndicator state={saveState} error={saveError} />
        </div>

        {/* Progress tracker */}
        <ProgressTracker
          step={step}
          checkpoints={checkpoints}
          onJump={(s) => setStep(s)}
          locked={isPublished}
        />
      </header>

      {/* Step content */}
      <div className="px-6 lg:px-10 py-10">
        <div className="mx-auto max-w-[820px]">
          {step === 1 ? (
            <Step1Basics
              project={project}
              setField={setField}
              disabled={isPublished}
            />
          ) : step === 2 ? (
            <Step2Build
              project={project}
              setField={setField}
              disabled={isPublished}
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
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
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
                onClick={() => setStep((s) => Math.min(3, s + 1) as Step)}
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
        onPublish={onPublish}
      />
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
    <div className="px-6 lg:px-10 pb-6">
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
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle title="About the project" sub="A clear title and address — that's it for this step." />

      <Card>
        <Field label="Project title" required>
          <input
            type="text"
            defaultValue={project.title}
            disabled={disabled}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g. Niddrie townhouse"
            className={inputCls}
          />
        </Field>
      </Card>

      <Card icon={<MapPin className="size-4" />} title="Where is it?" sub="Australian addresses only.">
        <AddressFields project={project} setField={setField} disabled={disabled} />
      </Card>
    </div>
  );
}

function AddressFields({
  project,
  setField,
  disabled,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
}) {
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
      <Field label="Street address" required>
        <input
          type="text"
          defaultValue={project.addressLine1 ?? ""}
          disabled={disabled}
          onChange={(e) => setField("addressLine1", e.target.value || null)}
          placeholder="14 Treadwell Road"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_120px] gap-3">
        <Field label="Postcode" required>
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
            className={cn(inputCls, "font-mono tabular-nums")}
          />
        </Field>
        <Field label="Suburb" required>
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
        <Field label="State" required>
          <input
            type="text"
            value={project.state ?? ""}
            disabled
            placeholder="Auto"
            className={cn(inputCls, "opacity-80 text-center font-semibold")}
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
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
}) {
  const t = project.type;

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
              <DropdownField
                label="Renovation scope"
                required
                options={RENO_SCOPES}
                value={project.renovationScope}
                onChange={(v) => setField("renovationScope", v)}
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
  onPublish,
}: {
  project: Project;
  report: PublishabilityReport | null;
  publishing: boolean;
  allDone: boolean;
  onPublish: () => void | Promise<void>;
}) {
  const isPublished = project.status !== "draft";
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-deep/98 backdrop-blur-md">
      <div className="mx-auto max-w-[820px] px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {isPublished ? (
            <div className="text-[13px] text-accent-light flex items-center gap-2">
              <Check className="size-4" />
              Published — visible to matched builders
            </div>
          ) : allDone ? (
            <div className="text-[13px] text-accent-light flex items-center gap-2">
              <Check className="size-4" />
              Ready to publish
            </div>
          ) : (
            <div className="text-[12.5px] text-text-dim flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-warning shrink-0 mt-0.5" />
              <span className="truncate">
                Still missing:{" "}
                {report?.missing.map((m) => MISSING_LABEL[m]).join(" · ")}
              </span>
            </div>
          )}
        </div>
        {isPublished ? (
          <a
            href={`/owner/projects/${project.slug}`}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border-strong text-text text-[12.5px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
          >
            View project
            <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={!allDone || publishing}
            className={cn(
              "inline-flex items-center gap-2 h-10 px-5 rounded-full text-[12.5px] font-semibold tracking-[0.04em] transition-colors duration-[160ms]",
              allDone && !publishing
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
      <h2 className="font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[32px] leading-[0.95] text-text">
        {title}
      </h2>
      {sub ? (
        <p className="mt-2 text-[13.5px] leading-[1.6] text-text-muted">
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
        <header className="px-6 py-4 border-b border-border-subtle/60 flex items-start gap-3">
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
      <div className="p-6">{children}</div>
    </section>
  );
}

const inputCls =
  "w-full h-11 px-3.5 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] text-[13.5px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-border-accent focus:bg-[rgba(0,212,200,0.025)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] tracking-[0.18em] uppercase text-text-dim mb-1.5">
        {label}
        {required ? <span className="text-accent ml-1">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function DropdownField<T extends string | number>({
  label,
  required,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  required?: boolean;
  options: Array<{ id: T; label: string }>;
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  disabled?: boolean;
}) {
  return (
    <Field label={label} required={required}>
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
        className={inputCls}
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
      return !!p.renovationScope;
    case "extension":
      return !!p.extensionType && !!p.extensionSizeBand;
    default:
      return false;
  }
}
