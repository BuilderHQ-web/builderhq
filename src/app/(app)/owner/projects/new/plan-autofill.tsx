"use client";

/**
 * AI auto-fill: upload an architectural plan, watch our AI read it, then
 * land straight in the normal project wizard with every field already
 * filled (and the plan attached as the architectural document). No
 * separate review screen - the wizard itself is the review.
 *
 * Phases: upload -> scanning (-> error). On a successful scan we show the
 * "pulled N details" beat, create the draft pre-filled, attach the plan,
 * and push into /owner/projects/[slug]/edit?from=autofill&filled=N.
 *
 * Robustness:
 *  - not a PDF / too big        -> inline message, stay on upload
 *  - extraction fails / offline -> error phase with Retry + "enter manually"
 *  - extraction returns little  -> still proceeds; the wizard is empty-ish
 *  - draft create fails         -> error phase, nothing lost
 *  - plan attach fails          -> non-fatal; re-add in the wizard
 * Only the read fields are applied; the plan is never overwritten.
 */

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileUp, ShieldCheck, ArrowLeft, RotateCcw, PencilLine } from "lucide-react";

import {
  createProjectAction,
  updateProjectAction,
} from "@/app/(app)/_actions/projects";
import {
  initUploadAction,
  completeUploadAction,
} from "@/app/(app)/_actions/documents";
import { cn } from "@/lib/utils";
import type { ProjectExtraction } from "@/modules/extraction";
import type { Project, UpdateProjectInput } from "@/modules/projects";

import { PlanScanAnimation } from "./plan-scan-animation";

const MAX_BYTES = 28 * 1024 * 1024;
const MIN_SCAN_MS = 2300;

type Phase = "upload" | "scanning" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isPdf(f: File): boolean {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

function countExtracted(x: ProjectExtraction): number {
  let n = 0;
  const single: Array<keyof ProjectExtraction> = [
    "type", "title", "description", "addressLine1", "suburb", "state",
    "postcode", "bedrooms", "bathrooms", "floors", "landSizeBand",
    "buildSizeBand", "dwellingCount", "existingAgeBand", "extensionType",
    "extensionSizeBand", "budgetBand", "targetStartMonth", "targetCompletionMonth",
  ];
  for (const k of single) {
    const v = x[k];
    if (v !== null && v !== undefined && v !== "") n += 1;
  }
  if (x.renovationScopeTags && x.renovationScopeTags.length > 0) n += 1;
  return n;
}

function buildPatch(x: ProjectExtraction): UpdateProjectInput {
  const p: UpdateProjectInput = {};
  if (x.title) p.title = x.title;
  if (x.description) p.description = x.description;
  if (x.addressLine1) p.addressLine1 = x.addressLine1;
  if (x.suburb) p.suburb = x.suburb;
  if (x.state) p.state = x.state as UpdateProjectInput["state"];
  if (x.postcode) p.postcode = x.postcode;
  if (x.bedrooms != null) p.bedrooms = x.bedrooms;
  if (x.bathrooms != null) p.bathrooms = x.bathrooms;
  if (x.floors != null) p.floors = x.floors;
  if (x.landSizeBand) p.landSizeBand = x.landSizeBand as UpdateProjectInput["landSizeBand"];
  if (x.buildSizeBand) p.buildSizeBand = x.buildSizeBand as UpdateProjectInput["buildSizeBand"];
  if (x.dwellingCount != null) p.dwellingCount = x.dwellingCount;
  if (x.renovationScopeTags && x.renovationScopeTags.length > 0) {
    p.renovationScopeTags =
      x.renovationScopeTags as NonNullable<UpdateProjectInput["renovationScopeTags"]>;
  }
  if (x.existingAgeBand) p.existingAgeBand = x.existingAgeBand as UpdateProjectInput["existingAgeBand"];
  if (x.extensionType) p.extensionType = x.extensionType as UpdateProjectInput["extensionType"];
  if (x.extensionSizeBand) p.extensionSizeBand = x.extensionSizeBand as UpdateProjectInput["extensionSizeBand"];
  if (x.budgetBand) p.budgetBand = x.budgetBand as UpdateProjectInput["budgetBand"];
  if (x.targetStartMonth) p.targetStartMonth = x.targetStartMonth;
  if (x.targetCompletionMonth) p.targetCompletionMonth = x.targetCompletionMonth;
  return p;
}

/** Best-effort attach of the scanned plan as the architectural document. */
async function attachPlan(project: Project, file: File): Promise<void> {
  try {
    const init = await initUploadAction({
      projectId: project.id,
      filename: file.name,
      contentType: file.type || "application/pdf",
      sizeBytes: file.size,
      category: "architectural",
    });
    if (!init.ok) return;
    const put = await fetch(init.value.uploadUrl, {
      method: "PUT",
      headers: init.value.uploadHeaders,
      body: file,
    });
    if (!put.ok) return;
    await completeUploadAction(init.value.documentId);
  } catch {
    /* non-fatal - the wizard's documents step lets them add it */
  }
}

export function PlanAutofill({
  onManual,
  onBack,
}: {
  onManual: () => void;
  onBack: () => void;
}) {
  const router = useRouter();
  // Mounted under both /owner and /architect — stay on the same base.
  const pathname = usePathname();
  const base = pathname.startsWith("/architect") ? "/architect" : "/owner";
  const [phase, setPhase] = useState<Phase>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [detailCount, setDetailCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setError(null);
    if (!isPdf(f)) {
      setError("Plan auto-fill needs a PDF. Export your plans as a PDF and try again.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("That plan set is over 28 MB. Try a smaller PDF, or enter the details manually.");
      return;
    }
    if (f.size === 0) {
      setError("That file looks empty. Pick your plan PDF and try again.");
      return;
    }
    fileRef.current = f;
    void runScan(f);
  }

  async function runScan(file: File) {
    setPhase("scanning");
    setScanComplete(false);
    setError(null);
    try {
      // Run the scan and a minimum-duration timer together, so the animation
      // always plays for at least MIN_SCAN_MS however fast the API returns.
      const [res] = await Promise.all([
        fetch("/api/projects/extract", {
          method: "POST",
          headers: { "content-type": "application/pdf" },
          body: file,
        }),
        sleep(MIN_SCAN_MS),
      ]);
      const json = (await res.json().catch(() => null)) as
        | { suggestions?: ProjectExtraction; error?: { message?: string } }
        | null;

      if (!res.ok || !json?.suggestions) {
        setError(
          json?.error?.message ??
            "We couldn't read those plans. Try a clearer PDF, or enter the details manually.",
        );
        setPhase("error");
        return;
      }

      const sugg = json.suggestions;
      const count = countExtracted(sugg);
      setDetailCount(count);
      setScanComplete(true); // animation shows the tick + "pulled N details"
      await sleep(1300); // let the success beat land

      // Build the draft, pre-fill it, attach the plan, then into the wizard.
      await finalize(sugg, file, count);
    } catch {
      await sleep(700);
      setError(
        "Something interrupted the scan. Check your connection and try again, or enter the details manually.",
      );
      setPhase("error");
    }
  }

  async function finalize(x: ProjectExtraction, file: File, count: number) {
    // 1 - create the draft with the read (or default) type.
    const type = (x.type ?? "single_dwelling") as Project["type"];
    const created = await createProjectAction({ type });
    if (!created.ok) {
      setError(created.error.message);
      setPhase("error");
      return;
    }
    const project = created.value;

    // 2 - apply the read fields. Setting the title regenerates a draft's
    //     slug, so we must redirect to the slug the UPDATE returns, not the
    //     create one (that was the 404). No arch plan yet, so it stays a draft.
    let slug = project.slug;
    const patch = buildPatch(x);
    if (Object.keys(patch).length > 0) {
      const upd = await updateProjectAction(project.id, patch);
      if (upd.ok) slug = upd.value.slug;
    }

    // 3 - attach the very PDF they scanned as the architectural doc.
    await attachPlan(project, file);

    // 4 - into the normal wizard, pre-filled, with the review banner.
    router.push(
      `${base}/projects/${slug}/edit?from=autofill&filled=${count}`,
    );
  }

  function reset() {
    fileRef.current = null;
    setError(null);
    setScanComplete(false);
    setDetailCount(0);
    setPhase("upload");
  }

  if (phase === "scanning") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-10">
        <PlanScanAnimation complete={scanComplete} detailCount={detailCount} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="py-6" style={{ animation: "var(--animate-fade-in)" }}>
        <div className="rounded-lg border border-border-subtle bg-[rgba(24,34,44,0.025)] p-6 sm:p-8 text-center">
          <span className="mx-auto size-12 rounded-full grid place-items-center border border-border-subtle bg-[rgba(255,80,80,0.06)] text-danger">
            <RotateCcw className="size-5" />
          </span>
          <h2 className="mt-4 text-[18px] font-semibold text-text">
            That didn&apos;t go through
          </h2>
          <p className="mt-2 mx-auto max-w-[42ch] text-[13.5px] leading-[1.6] text-text-muted">
            {error ?? "We couldn't read those plans."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors w-full sm:w-auto"
            >
              <FileUp className="size-4" />
              Try another PDF
            </button>
            <button
              type="button"
              onClick={onManual}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-border-subtle text-[13px] font-medium text-text-muted hover:text-text hover:border-border transition-colors w-full sm:w-auto"
            >
              <PencilLine className="size-4" />
              Enter the details myself
            </button>
          </div>
        </div>
      </div>
    );
  }

  // phase === "upload"
  return (
    <div style={{ animation: "var(--animate-fade-in)" }}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text-muted transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <div className="mb-7">
        <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium">
          AI auto-fill from plans
        </span>
        <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[30px] sm:text-[40px] leading-[0.92] text-text">
          Upload your plans
        </h1>
        <p className="mt-3 max-w-[54ch] text-[14px] leading-[1.7] text-text-subtle">
          Drop in your architectural plans as a PDF. Our AI reads them and fills
          out your project for you. You review everything before it goes anywhere.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "relative block cursor-pointer rounded-lg border overflow-hidden transition-[border-color,background] duration-[300ms]",
          dragOver
            ? "border-border-accent bg-[rgba(0,212,200,0.05)]"
            : "border-border-strong border-dashed bg-[rgba(24,34,44,0.025)] hover:border-border-accent/60",
        )}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => pick(e.target.files)}
        />
        {/* Blueprint grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,34,44,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,44,0.05) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
          }}
        />
        <div className="relative flex flex-col items-center text-center px-6 py-12 sm:py-16">
          <span className="size-14 rounded-full grid place-items-center border border-border-accent bg-accent-muted text-accent-light shadow-[0_0_0_6px_rgba(0,212,200,0.06)]">
            <FileUp className="size-6" />
          </span>
          <p className="mt-5 text-[15px] font-semibold text-text">
            Drop your plans here, or click to browse
          </p>
          <p className="mt-1.5 text-[12.5px] text-text-dim">PDF · up to 28 MB</p>
        </div>
      </label>

      {error ? (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex items-start gap-2.5 text-text-dim">
        <ShieldCheck className="size-4 shrink-0 mt-0.5 text-accent-light" />
        <p className="text-[12px] leading-[1.6] max-w-[58ch]">
          Your plans are read securely to fill the form. Nothing is published
          until you say so. You review and edit every detail first.
        </p>
      </div>

      <div className="mt-7 pt-5 border-t border-border-subtle">
        <button
          type="button"
          onClick={onManual}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-text-muted hover:text-text transition-colors"
        >
          <PencilLine className="size-4" />
          I&apos;ll enter the details myself
        </button>
      </div>
    </div>
  );
}
