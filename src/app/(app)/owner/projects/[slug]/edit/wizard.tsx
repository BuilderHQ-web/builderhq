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
import type {
  Project,
  PublishabilityReport,
  UpdateProjectInput,
} from "@/modules/projects";
import type { Document, DocumentCategory } from "@/modules/documents";

// ── helpers/constants ────────────────────────────────────────────────────

const TYPE_META: Record<
  Project["type"],
  { label: string; icon: React.ReactNode }
> = {
  single_dwelling: { label: "Single dwelling", icon: <Home className="size-4" /> },
  multi_dwelling: { label: "Multi-dwelling", icon: <Building className="size-4" /> },
  renovation: { label: "Renovation", icon: <Wrench className="size-4" /> },
  extension: { label: "Extension", icon: <Layers className="size-4" /> },
};

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;

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

const DOC_CATEGORIES: Array<{ id: DocumentCategory; label: string; required?: boolean }> = [
  { id: "architectural", label: "Architectural plans", required: true },
  { id: "specifications", label: "Specifications" },
  { id: "scope", label: "Scope of works" },
  { id: "engineering", label: "Engineering" },
  { id: "site_survey", label: "Site survey" },
  { id: "contract", label: "Contract" },
  { id: "other", label: "Other" },
];

const MISSING_LABEL: Record<PublishabilityReport["missing"][number], string> = {
  title: "Project title",
  type: "Project type",
  address: "Address",
  type_specific_fields: "Type-specific details",
  architectural_plan: "Architectural plan",
};

// ── component ────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

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
        // Re-merge so changes aren't lost — user can fix and trigger again.
        pendingPatch.current = { ...patch, ...pendingPatch.current };
        return;
      }
      setProject(r.value);
      setSaveState("saved");
      // Refresh publishability after each save.
      const rep = await checkPublishabilityAction(r.value.id);
      if (rep.ok) setReport(rep.value);
    } finally {
      inflight.current = false;
      // If more changes accumulated while we were inflight, schedule another flush.
      if (Object.keys(pendingPatch.current).length > 0) {
        scheduleFlush();
      }
    }
  }, [project.id]);

  const scheduleFlush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 700);
  }, [flush]);

  const setField = useCallback(
    <K extends keyof UpdateProjectInput>(key: K, value: UpdateProjectInput[K]) => {
      pendingPatch.current = { ...pendingPatch.current, [key]: value };
      // Optimistic local update so the UI feels instant.
      setProject((p) => ({ ...p, [key]: value as never }));
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Flush on unload to avoid losing trailing edits.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (Object.keys(pendingPatch.current).length > 0) {
        // Best effort — sendBeacon is overkill for a server action; just fire.
        flush();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  // Refresh docs after upload/delete via this single helper.
  const refreshDocs = useCallback(async () => {
    const r = await listProjectDocumentsAction(project.id);
    if (r.ok) setDocs(r.value);
    const rep = await checkPublishabilityAction(project.id);
    if (rep.ok) setReport(rep.value);
  }, [project.id]);

  // ── publish ──────────────────────────────────────────────────────────

  const onPublish = useCallback(async () => {
    setPublishing(true);
    try {
      // Flush any pending patch first.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await flush();
      const r = await publishProjectAction(project.id);
      if (!r.ok) {
        const reasons = (r.error.details?.reasons as string[]) ?? [r.error.message];
        alert(reasons.join("\n"));
        return;
      }
      setProject(r.value);
      router.push(`/owner/projects/${r.value.slug}`);
    } finally {
      setPublishing(false);
    }
  }, [flush, project.id, router]);

  // ── delete ───────────────────────────────────────────────────────────

  const onDelete = useCallback(async () => {
    if (!confirm("Delete this project? This can be undone by an admin.")) return;
    const r = await softDeleteProjectAction(project.id);
    if (!r.ok) {
      alert(r.error.message);
      return;
    }
    router.push("/owner/projects");
  }, [project.id, router]);

  const archCount = useMemo(
    () => docs.filter((d) => d.category === "architectural" && d.status === "active").length,
    [docs],
  );

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 pb-32">
      <div className="mx-auto max-w-[760px]">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              {TYPE_META[project.type].icon}
              {TYPE_META[project.type].label}
              <span className="text-text-dim/60">·</span>
              <StatusPill status={project.status} />
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.02em] text-[36px] sm:text-[40px] leading-[0.95] text-text">
              {project.title}
            </h1>
          </div>
          <SaveIndicator state={saveState} error={saveError} />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          <BasicsSection
            project={project}
            setField={setField}
            disabled={isPublished}
          />

          <AddressSection
            project={project}
            setField={setField}
            disabled={isPublished}
          />

          <TypeSpecificSection
            project={project}
            setField={setField}
            disabled={isPublished}
          />

          <BudgetTimelineSection
            project={project}
            setField={setField}
            disabled={isPublished}
          />

          <DescriptionSection
            project={project}
            setField={setField}
            disabled={isPublished}
          />

          <DocumentsSection
            projectId={project.id}
            docs={docs}
            archCount={archCount}
            onRefresh={refreshDocs}
            disabled={false /* documents always editable */}
          />
        </div>

        {/* Danger zone (drafts only) */}
        {project.status === "draft" ? (
          <div className="mt-12 pt-8 border-t border-border-subtle/60">
            <button
              type="button"
              onClick={onDelete}
              className="text-[12px] text-text-dim hover:text-danger transition-colors inline-flex items-center gap-2"
            >
              <Trash2 className="size-3.5" />
              Delete this draft
            </button>
          </div>
        ) : null}
      </div>

      {/* Sticky publish bar */}
      <PublishBar
        project={project}
        report={report}
        publishing={publishing}
        onPublish={onPublish}
      />
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

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
          <span className="text-text-dim">All changes saved</span>
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

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-1/40 overflow-hidden">
      <header className="px-6 py-5 border-b border-border-subtle/60 flex items-start gap-3">
        <span className="size-8 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
            {title}
          </h2>
          {description ? (
            <p className="text-[12.5px] text-text-dim mt-0.5">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ── sections ─────────────────────────────────────────────────────────────

function BasicsSection({
  project,
  setField,
  disabled,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
}) {
  return (
    <Section
      icon={<Sparkles className="size-4" />}
      title="The basics"
      description="A clear title helps builders identify the project."
    >
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
    </Section>
  );
}

function AddressSection({
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

  // Postcode lookup whenever 4 digits.
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
      // Auto-resolve when there's exactly one suburb.
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
        // Keep current selection.
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
    <Section
      icon={<MapPin className="size-4" />}
      title="Where is it?"
      description="Australian addresses only. We use postcode to filter matched builders."
    >
      <div className="space-y-4">
        <Field label="Street address" required>
          <input
            type="text"
            defaultValue={project.addressLine1 ?? ""}
            disabled={disabled}
            onChange={(e) =>
              setField("addressLine1", e.target.value || null)
            }
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
                placeholder={lookupNote ?? "Enter a postcode first"}
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
    </Section>
  );
}

function TypeSpecificSection({
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
    <Section
      icon={TYPE_META[t].icon}
      title="The build"
      description="Just the fields that matter for this type."
    >
      <div className="space-y-4">
        {/* common across single, multi, extension */}
        {(t === "single_dwelling" || t === "multi_dwelling" || t === "extension") && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField
              label={t === "multi_dwelling" ? "Total bedrooms" : "Bedrooms"}
              required
              value={project.bedrooms}
              onChange={(v) => setField("bedrooms", v)}
              disabled={disabled}
              min={1}
            />
            <NumberField
              label={t === "multi_dwelling" ? "Total bathrooms" : "Bathrooms"}
              required
              value={project.bathrooms}
              onChange={(v) => setField("bathrooms", v)}
              disabled={disabled}
              min={1}
            />
            {t !== "multi_dwelling" ? (
              <NumberField
                label="Floors"
                required={t === "single_dwelling"}
                value={project.floors}
                onChange={(v) => setField("floors", v)}
                disabled={disabled}
                min={1}
              />
            ) : null}
          </div>
        )}

        {(t === "single_dwelling" || t === "multi_dwelling") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberField
              label="Land size (m²)"
              value={project.landSizeSqm}
              onChange={(v) => setField("landSizeSqm", v)}
              disabled={disabled}
            />
            <NumberField
              label="Build size (m²)"
              value={project.buildSizeSqm}
              onChange={(v) => setField("buildSizeSqm", v)}
              disabled={disabled}
            />
          </div>
        )}

        {/* multi only */}
        {t === "multi_dwelling" && (
          <NumberField
            label="Number of dwellings"
            required
            value={project.dwellingCount}
            onChange={(v) => setField("dwellingCount", v)}
            disabled={disabled}
            min={2}
          />
        )}

        {/* renovation */}
        {t === "renovation" && (
          <>
            <Field label="Renovation scope" required>
              <PillGroup
                options={RENO_SCOPES}
                value={project.renovationScope}
                onChange={(v) => setField("renovationScope", v)}
                disabled={disabled}
              />
            </Field>
            <NumberField
              label="Existing house age (years)"
              value={project.existingAgeYears}
              onChange={(v) => setField("existingAgeYears", v)}
              disabled={disabled}
            />
          </>
        )}

        {/* extension */}
        {t === "extension" && (
          <>
            <Field label="Extension type" required>
              <PillGroup
                options={EXTENSION_TYPES}
                value={project.extensionType}
                onChange={(v) => setField("extensionType", v)}
                disabled={disabled}
              />
            </Field>
            <NumberField
              label="Extension size (m²)"
              required
              value={project.extensionSizeSqm}
              onChange={(v) => setField("extensionSizeSqm", v)}
              disabled={disabled}
              min={1}
            />
          </>
        )}
      </div>
    </Section>
  );
}

function BudgetTimelineSection({
  project,
  setField,
  disabled,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
}) {
  return (
    <Section
      icon={<DollarSign className="size-4" />}
      title="Budget & timeline"
      description="Banded — no need to commit to exact numbers."
    >
      <div className="space-y-5">
        <Field label="Budget band">
          <PillGroup
            options={BUDGET_BANDS}
            value={project.budgetBand}
            onChange={(v) => setField("budgetBand", v)}
            disabled={disabled}
          />
        </Field>

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
    </Section>
  );
}

function DescriptionSection({
  project,
  setField,
  disabled,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(k: K, v: UpdateProjectInput[K]) => void;
  disabled: boolean;
}) {
  return (
    <Section
      icon={<FileText className="size-4" />}
      title="Anything else?"
      description="Optional. A few sentences about the brief, style, or constraints."
    >
      <textarea
        defaultValue={project.description ?? ""}
        disabled={disabled}
        onChange={(e) => setField("description", e.target.value || null)}
        rows={5}
        placeholder="e.g. Modern 4-bed family home, contemporary build, ground + first floor, double garage. Looking for a builder who can manage council DA process."
        className={cn(inputCls, "min-h-[120px] py-3 leading-[1.6]")}
      />
    </Section>
  );
}

// ── documents ────────────────────────────────────────────────────────────

function DocumentsSection({
  projectId,
  docs,
  archCount,
  onRefresh,
  disabled,
}: {
  projectId: string;
  docs: Document[];
  archCount: number;
  onRefresh: () => Promise<void>;
  disabled: boolean;
}) {
  const [category, setCategory] = useState<DocumentCategory>("architectural");
  const [active, setActive] = useState<LocalUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const f of list) {
        await uploadOne({
          file: f,
          projectId,
          category,
          setActive,
          onDone: onRefresh,
        });
      }
    },
    [category, projectId, onRefresh],
  );

  const groupedDocs = useMemo(() => {
    const groups: Record<DocumentCategory, Document[]> = {
      architectural: [],
      specifications: [],
      scope: [],
      engineering: [],
      site_survey: [],
      contract: [],
      other: [],
    };
    for (const d of docs) groups[d.category].push(d);
    return groups;
  }, [docs]);

  return (
    <Section
      icon={<FileText className="size-4" />}
      title="Documents"
      description="Architectural plans are required to publish. Everything else is optional."
    >
      {/* category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {DOC_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] tracking-[0.04em] border transition-colors",
              category === c.id
                ? "bg-accent-muted/40 border-border-accent text-accent-light"
                : "bg-[rgba(255,255,255,0.012)] border-border-subtle text-text-muted hover:text-text",
            )}
          >
            {c.label}
            {c.required ? (
              <span className={cn("ml-1.5", category === c.id ? "text-accent" : "text-text-dim")}>
                *
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* drop zone */}
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
        className={cn(
          "block cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
            : "border-border-subtle hover:border-border bg-[rgba(255,255,255,0.012)]",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        <input
          type="file"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => e.target.files && onDrop(e.target.files)}
        />
        <Upload className="mx-auto size-5 text-accent-light mb-2" />
        <div className="text-[13px] text-text">
          Drop {DOC_CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()} here, or{" "}
          <span className="text-accent-light underline underline-offset-4">browse</span>
        </div>
        <div className="mt-1 text-[11px] text-text-dim">
          PDF · DOCX · DWG · images, up to 100 MB each
        </div>
      </label>

      {/* in-flight */}
      {active.length > 0 ? (
        <div className="mt-4 space-y-2">
          {active.map((u) => (
            <div
              key={u.id}
              className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-[12px] text-text truncate">{u.filename}</span>
                <span
                  className={cn(
                    "text-[10px] tracking-[0.14em] uppercase shrink-0",
                    u.status === "error" ? "text-danger" : "text-accent-light",
                  )}
                >
                  {u.status === "uploading" && `${u.progress}%`}
                  {u.status === "confirming" && "Confirming…"}
                  {u.status === "done" && "Done"}
                  {u.status === "error" && (u.error ?? "Failed")}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-300",
                    u.status === "error" ? "bg-danger" : "bg-accent",
                  )}
                  style={{
                    width: `${
                      u.status === "done"
                        ? 100
                        : u.status === "confirming"
                        ? 95
                        : u.progress
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* saved docs grouped by category */}
      <div className="mt-6 space-y-4">
        {DOC_CATEGORIES.map((c) => {
          const list = groupedDocs[c.id];
          if (list.length === 0) return null;
          return (
            <div key={c.id}>
              <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-2 flex items-center gap-2">
                {c.label}
                {c.id === "architectural" && archCount > 0 ? (
                  <span className="text-accent-light normal-case tracking-normal text-[11px]">
                    ✓ Required uploaded
                  </span>
                ) : null}
              </div>
              <div className="rounded-md border border-border-subtle overflow-hidden">
                {list.map((d, i) => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    last={i === list.length - 1}
                    onDeleted={onRefresh}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function DocRow({
  doc,
  last,
  onDeleted,
}: {
  doc: Document;
  last: boolean;
  onDeleted: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<"download" | "delete" | null>(null);
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.022)]",
        last ? "" : "border-b border-border-subtle",
      )}
    >
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-text truncate">{doc.filename}</div>
        <div className="text-[10px] text-text-dim">
          {prettyBytes(doc.sizeBytes)} · v{doc.version} ·{" "}
          <span
            className={cn(
              doc.status === "active"
                ? "text-accent-light"
                : doc.status === "pending"
                ? "text-warning"
                : "text-danger",
            )}
          >
            {doc.status}
          </span>
        </div>
      </div>
      <button
        type="button"
        disabled={busy !== null || doc.status !== "active"}
        onClick={async () => {
          setBusy("download");
          const r = await getDownloadUrlAction(doc.id);
          setBusy(null);
          if (!r.ok) {
            alert(r.error.message);
            return;
          }
          window.open(r.value.url, "_blank", "noopener");
        }}
        title="Download"
        className={cn(
          "size-7 rounded-sm border border-border-subtle text-text-muted hover:text-accent-light hover:border-border-accent transition-colors flex items-center justify-center",
          (busy !== null || doc.status !== "active") && "opacity-40 cursor-not-allowed",
        )}
      >
        {busy === "download" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
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
            alert(r.error.message);
            return;
          }
          await onDeleted();
        }}
        title="Delete"
        className={cn(
          "size-7 rounded-sm border border-border-subtle text-text-muted hover:text-danger hover:border-danger/50 transition-colors flex items-center justify-center",
          busy !== null && "opacity-40 cursor-not-allowed",
        )}
      >
        {busy === "delete" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </div>
  );
}

// ── publish bar ──────────────────────────────────────────────────────────

function PublishBar({
  project,
  report,
  publishing,
  onPublish,
}: {
  project: Project;
  report: PublishabilityReport | null;
  publishing: boolean;
  onPublish: () => void | Promise<void>;
}) {
  const isPublished = project.status !== "draft";
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-deep/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[760px] px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {isPublished ? (
            <div className="text-[13px] text-accent-light flex items-center gap-2">
              <Check className="size-4" />
              Published — visible to matched builders
            </div>
          ) : report?.canPublish ? (
            <div className="text-[13px] text-accent-light flex items-center gap-2">
              <Check className="size-4" />
              Ready to publish
            </div>
          ) : (
            <div className="text-[12.5px] text-text-dim flex items-start gap-2">
              <AlertTriangle className="size-3.5 text-warning shrink-0 mt-0.5" />
              <span className="truncate">
                Still missing:{" "}
                {report?.missing
                  .map((m) => MISSING_LABEL[m])
                  .join(" · ")}
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
            disabled={!report?.canPublish || publishing}
            className={cn(
              "inline-flex items-center gap-2 h-10 px-5 rounded-full text-[12.5px] font-semibold tracking-[0.04em] transition-colors duration-[160ms]",
              report?.canPublish && !publishing
                ? "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]"
                : "bg-surface-2 text-text-dim cursor-not-allowed",
            )}
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {publishing ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── form atoms ───────────────────────────────────────────────────────────

const inputCls =
  "w-full h-11 px-3.5 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] text-[13.5px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-border-accent focus:bg-[rgba(0,212,200,0.025)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

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

function NumberField({
  label,
  value,
  onChange,
  disabled,
  required,
  min,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  min?: number;
}) {
  return (
    <Field label={label} required={required}>
      <input
        type="number"
        inputMode="numeric"
        defaultValue={value ?? ""}
        disabled={disabled}
        min={min}
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className={cn(inputCls, "tabular-nums")}
      />
    </Field>
  );
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Array<{ id: T; label: string }>;
  value: T | null | undefined;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "px-3 py-1.5 rounded-full text-[11.5px] tracking-[0.02em] border transition-colors",
            value === o.id
              ? "bg-accent-muted/40 border-border-accent text-accent-light"
              : "bg-[rgba(255,255,255,0.012)] border-border-subtle text-text-muted hover:text-text",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── upload pipeline ──────────────────────────────────────────────────────

type LocalUpload = {
  id: string;
  filename: string;
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
    { id: localId, filename: file.name, status: "uploading", progress: 0 },
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
    }, 1000);
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
    for (const [k, v] of Object.entries(args.headers)) xhr.setRequestHeader(k, v);
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

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
