"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";

import { QuizShell } from "../../_components/quiz-shell";
import { QuizNext } from "../../_components/quiz-next";
import {
  clearQuizState,
  readQuizState,
  CONVERSION_VALUE_BY_BUDGET,
} from "../../_lib/quiz-state";

/**
 * Step 7 — architectural plans. Two paths:
 *
 *   Upload path: drag/drop file → POST /api/start/q/plans (init)
 *                → upload to R2 with the signed URL → POST again
 *                (complete) → marks the project publish-ready →
 *                sends magic link → redirects to /start/sent.
 *
 *   Skip path:   POST /api/start/q/plans with { skip: true } →
 *                sends magic link → redirects to /start/sent. The
 *                project stays as a draft awaiting plans.
 *
 * The skip path is intentionally just as accessible as upload —
 * users at the "scoping" stage of a project (many of them) don't
 * have plans yet. Forcing the upload would drop them entirely.
 */

const ACCEPTED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export function PlansStep() {
  const router = useRouter();
  const search = useSearchParams();
  const projectId = search.get("pid");

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // If no project id in URL, bounce — the user shouldn't be here
    // without having completed step 6. Easy edge: someone refreshed
    // after closing the tab. We can't recover their soft-auth cookie
    // is fine but without projectId we don't know which project.
    if (!projectId) {
      router.replace("/start");
      return;
    }
  }, [projectId, router]);

  const pickFile = useCallback(() => inputRef.current?.click(), []);

  const onSelectFile = useCallback((files: FileList | null) => {
    setError(null);
    const f = files?.[0];
    if (!f) return;
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError("Use a PDF, PNG, JPG, WebP, or HEIC file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`File is too large. 50 MB max — yours is ${formatBytes(f.size)}.`);
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onSelectFile(e.dataTransfer?.files ?? null);
    },
    [onSelectFile],
  );

  // Defined before submit handlers so they can capture it via useCallback
  // deps without a forward-reference lint error.
  const finishToSent = useCallback(
    (plansOutcome: "uploaded" | "skipped") => {
      // Read conversion value from quiz state (budget tier) before
      // clearing, pass to /start/sent via URL so the gtag fires with
      // weighted value.
      const state = readQuizState();
      const value = state.budgetBand
        ? CONVERSION_VALUE_BY_BUDGET[state.budgetBand]
        : 50;
      clearQuizState();
      const q = new URLSearchParams({
        pid: projectId ?? "",
        v: String(value),
        plans: plansOutcome,
      });
      router.push(`/start/sent?${q.toString()}`);
    },
    [projectId, router],
  );

  const submitWithUpload = useCallback(async () => {
    if (!file || !projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      // Phase 1: init upload — server creates the document row +
      // returns a presigned R2 URL.
      const init = await fetch("/api/start/q/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode: "init",
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      const initBody = (await init.json().catch(() => null)) as
        | { ok: true; uploadUrl: string; documentId: string }
        | { ok: false; code: string; message: string }
        | null;
      if (!init.ok || !initBody || initBody.ok !== true) {
        const msg =
          initBody && "message" in initBody
            ? initBody.message
            : "We couldn't start the upload. Try again.";
        setError(msg);
        setSubmitting(false);
        return;
      }

      // Phase 2: direct upload to R2 with XHR so we get progress.
      await uploadWithProgress(initBody.uploadUrl, file, setProgress);

      // Phase 3: complete — server flips the doc to "active" + sends
      // the magic link + flags project for publishing.
      const complete = await fetch("/api/start/q/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode: "complete",
          documentId: initBody.documentId,
        }),
      });
      const completeBody = (await complete.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; code: string; message: string }
        | null;
      if (!complete.ok || !completeBody || completeBody.ok !== true) {
        const msg =
          completeBody && "message" in completeBody
            ? completeBody.message
            : "Upload finished but we couldn't link it. Try again.";
        setError(msg);
        setSubmitting(false);
        return;
      }

      finishToSent("uploaded");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Upload error: ${err.message}`
          : "Upload error. Try again.",
      );
      setSubmitting(false);
    }
  }, [file, projectId, finishToSent]);

  const submitSkip = useCallback(async () => {
    if (!projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/start/q/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, mode: "skip" }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; code: string; message: string }
        | null;
      if (!res.ok || !body || body.ok !== true) {
        const msg =
          body && "message" in body
            ? body.message
            : "Couldn't save. Try again.";
        setError(msg);
        setSubmitting(false);
        return;
      }
      finishToSent("skipped");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Network error.",
      );
      setSubmitting(false);
    }
  }, [projectId, finishToSent]);

  return (
    <QuizShell
      step="plans"
      title={
        <>
          Got architectural <span className="text-accent">plans?</span>
        </>
      }
      sub="Builders bid better — and faster — with plans in hand. Don't have any yet? Skip this and add them later from your dashboard."
    >
      <div>
        <DropZone
          file={file}
          progress={progress}
          submitting={submitting}
          onPick={pickFile}
          onDrop={onDrop}
          onRemove={() => {
            setFile(null);
            setProgress(null);
          }}
        />

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          className="hidden"
          onChange={(e) => onSelectFile(e.target.files)}
        />

        {error ? (
          <p role="alert" className="mt-4 text-[12.5px] text-warning font-body">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <QuizNext
            onClick={submitWithUpload}
            disabled={!file || submitting}
            loading={submitting && progress !== null}
          >
            {file ? "Upload + send my link" : "Send my link"}
          </QuizNext>
          <button
            type="button"
            onClick={submitSkip}
            disabled={submitting}
            className="text-[13px] font-ui font-semibold text-text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            I&apos;ll add plans later →
          </button>
        </div>

        <p className="mt-6 text-text-faint text-[12px] font-body">
          Files stay private to your account until you publish. Up to 50 MB. PDF,
          PNG, JPG, WebP or HEIC.
        </p>
      </div>
    </QuizShell>
  );
}

// ── Drop zone ───────────────────────────────────────────────────────

function DropZone({
  file,
  progress,
  submitting,
  onPick,
  onDrop,
  onRemove,
}: {
  file: File | null;
  progress: number | null;
  submitting: boolean;
  onPick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
}) {
  if (file) {
    return (
      <div className="rounded-2xl border border-border-accent bg-accent-muted/30 px-5 py-4 flex items-center gap-4">
        <span className="inline-flex items-center justify-center size-10 rounded-lg border border-border-accent bg-accent-muted shrink-0">
          <FileText size={18} strokeWidth={1.7} className="text-accent-light" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-ui font-semibold text-text text-[14px] truncate">
            {file.name}
          </p>
          <p className="text-text-faint text-[11.5px] mt-0.5 font-body">
            {formatBytes(file.size)} · {file.type.split("/")[1]?.toUpperCase()}
          </p>
          {progress !== null && submitting ? (
            <div className="mt-2 h-1 rounded-full bg-border-subtle overflow-hidden">
              <span
                className="block h-full bg-accent transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
        {submitting ? (
          <Loader2
            size={16}
            strokeWidth={2}
            className="text-accent-light animate-spin shrink-0"
          />
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove file"
            className="size-8 rounded-full border border-border-strong bg-surface-1/40 flex items-center justify-center text-text-muted hover:text-text hover:border-border-accent transition-colors shrink-0"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="w-full rounded-2xl border-2 border-dashed border-border-strong hover:border-border-accent hover:bg-surface-1/30 transition-colors px-6 py-12 flex flex-col items-center text-center group"
    >
      <span className="inline-flex items-center justify-center size-12 rounded-2xl border border-border-strong bg-surface-1/40 group-hover:border-border-accent group-hover:bg-accent-muted transition-colors">
        <Upload
          size={18}
          strokeWidth={1.7}
          className="text-text-muted group-hover:text-accent-light transition-colors"
        />
      </span>
      <p className="mt-4 font-ui font-semibold text-text text-[15px]">
        Drop your plans here, or click to choose
      </p>
      <p className="mt-1.5 text-text-faint text-[12.5px] font-body max-w-[320px]">
        Architect&apos;s drawings, council-stamped plans, or scanned PDFs all work.
      </p>
      <p className="mt-5 text-[10px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-1.5">
        <CheckCircle2 size={11} strokeWidth={2.2} />
        Private to your account
      </p>
    </button>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

async function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
