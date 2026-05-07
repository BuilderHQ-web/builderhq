"use client";

import { useCallback, useState, useTransition } from "react";
import { Loader2, Upload, Download, Trash2, X } from "lucide-react";

import {
  initUploadAction,
  completeUploadAction,
  getDownloadUrlAction,
  softDeleteAction,
} from "@/app/(app)/_actions/documents";
import type { Document } from "@/modules/documents";
import { cn } from "@/lib/utils";

type Status = "idle" | "uploading" | "confirming" | "done" | "error";

type LocalUpload = {
  id: string;
  filename: string;
  status: Status;
  progress: number;
  error?: string;
};

// Hard-coded fake projectId for the dev surface. Once Phase 2 step 3
// ships, real project IDs will flow from the project upload wizard.
const DEV_PROJECT_ID = "00000000-0000-0000-0000-000000000001";

export function StorageDevClient({
  initialDocs,
  userRole,
}: {
  initialDocs: Document[];
  userRole: string | null;
}) {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [active, setActive] = useState<LocalUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const f of list) {
        await uploadOne(f, setActive, setDocs);
      }
    },
    [],
  );

  return (
    <div className="space-y-8">
      {userRole !== "project_owner" && userRole !== "admin" ? (
        <div className="rounded-md border border-warning/30 bg-warning/[0.05] px-4 py-3 text-[13px] text-warning">
          Heads up — you&apos;re signed in as <b>{userRole ?? "unknown"}</b>.
          Only project owners (or admins) can upload. Sign in with a
          project-owner account to test.
        </div>
      ) : null}

      {/* Drop zone */}
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
          "block cursor-pointer rounded-md border-2 border-dashed p-12 text-center transition-colors",
          dragOver
            ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
            : "border-border-subtle hover:border-border bg-[rgba(255,255,255,0.012)]",
        )}
      >
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && onDrop(e.target.files)}
        />
        <Upload className="mx-auto size-6 text-accent-light mb-3" />
        <div className="text-[14px] text-text">
          Drop files here, or <span className="text-accent-light underline underline-offset-4">browse</span>
        </div>
        <div className="mt-1 text-[11px] text-text-dim">
          PDF · DOCX · XLSX · PNG · JPG · ZIP · DWG, up to 100 MB each
        </div>
      </label>

      {/* Active (in-flight) uploads */}
      {active.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            Uploading
          </div>
          {active.map((u) => (
            <div
              key={u.id}
              className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[13px] text-text truncate">
                  {u.filename}
                </span>
                <span
                  className={cn(
                    "text-[10px] tracking-[0.16em] uppercase shrink-0",
                    u.status === "error" ? "text-danger" : "text-accent-light",
                  )}
                >
                  {u.status === "uploading" && `Uploading · ${u.progress}%`}
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

      {/* Saved documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            Your documents · {docs.length}
          </div>
        </div>
        {docs.length === 0 ? (
          <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] px-4 py-6 text-center text-[13px] text-text-dim">
            Nothing here yet. Drop a file above to test the round-trip.
          </div>
        ) : (
          <div className="rounded-md border border-border-subtle overflow-hidden">
            {docs.map((d, i, arr) => (
              <div
                key={d.id}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.022)]",
                  i === arr.length - 1 ? "" : "border-b border-border-subtle",
                )}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text truncate">
                    {d.filename}
                  </div>
                  <div className="text-[10.5px] text-text-dim mt-0.5">
                    {prettyBytes(d.sizeBytes)} · v{d.version} ·{" "}
                    <span
                      className={cn(
                        d.status === "active"
                          ? "text-accent-light"
                          : d.status === "pending"
                          ? "text-warning"
                          : "text-danger",
                      )}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
                <DownloadButton id={d.id} disabled={d.status !== "active"} />
                <DeleteButton
                  id={d.id}
                  disabled={isPending}
                  onDeleted={() =>
                    startTransition(() => {
                      setDocs((s) => s.filter((x) => x.id !== d.id));
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── upload pipeline ──────────────────────────────────────────────────────

async function uploadOne(
  file: File,
  setActive: React.Dispatch<React.SetStateAction<LocalUpload[]>>,
  setDocs: React.Dispatch<React.SetStateAction<Document[]>>,
) {
  const localId = crypto.randomUUID();
  setActive((s) => [
    ...s,
    {
      id: localId,
      filename: file.name,
      status: "uploading",
      progress: 0,
    },
  ]);

  try {
    // ── 1. init: get presigned PUT URL ─────────────────────────────────
    const init = await initUploadAction({
      projectId: DEV_PROJECT_ID,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    if (!init.ok) {
      patchActive(setActive, localId, { status: "error", error: init.error.message });
      return;
    }

    // ── 2. PUT bytes directly to R2 ────────────────────────────────────
    await putWithProgress({
      url: init.value.uploadUrl,
      headers: init.value.uploadHeaders,
      body: file,
      onProgress: (pct) =>
        patchActive(setActive, localId, { progress: Math.round(pct * 100) }),
    });

    // ── 3. confirm: server HEADs the object + flips to active ──────────
    patchActive(setActive, localId, { status: "confirming" });
    const done = await completeUploadAction(init.value.documentId);
    if (!done.ok) {
      patchActive(setActive, localId, {
        status: "error",
        error: done.error.message,
      });
      return;
    }

    setDocs((s) => [done.value, ...s.filter((x) => x.id !== done.value.id)]);
    patchActive(setActive, localId, { status: "done", progress: 100 });

    // Auto-clear the in-flight row a moment later.
    setTimeout(() => {
      setActive((s) => s.filter((u) => u.id !== localId));
    }, 1200);
  } catch (err) {
    patchActive(setActive, localId, {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function patchActive(
  setActive: React.Dispatch<React.SetStateAction<LocalUpload[]>>,
  id: string,
  patch: Partial<LocalUpload>,
) {
  setActive((s) => s.map((u) => (u.id === id ? { ...u, ...patch } : u)));
}

/**
 * XHR PUT so we get progress events. fetch() doesn't expose upload
 * progress yet (the streams API is in flight but not browser-reliable).
 */
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

// ── action buttons ───────────────────────────────────────────────────────

function DownloadButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={async () => {
        setLoading(true);
        const r = await getDownloadUrlAction(id);
        setLoading(false);
        if (!r.ok) {
          alert(r.error.message);
          return;
        }
        window.open(r.value.url, "_blank", "noopener");
      }}
      className={cn(
        "inline-flex items-center justify-center size-8 rounded-sm border border-border-subtle text-text-muted hover:text-accent-light hover:border-border-accent transition-colors",
        (disabled || loading) && "opacity-40 cursor-not-allowed",
      )}
      title="Download"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
    </button>
  );
}

function DeleteButton({
  id,
  disabled,
  onDeleted,
}: {
  id: string;
  disabled?: boolean;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={async () => {
        if (!confirm("Soft-delete this document?")) return;
        setLoading(true);
        const r = await softDeleteAction(id);
        setLoading(false);
        if (!r.ok) {
          alert(r.error.message);
          return;
        }
        onDeleted();
      }}
      className={cn(
        "inline-flex items-center justify-center size-8 rounded-sm border border-border-subtle text-text-muted hover:text-danger hover:border-danger/50 transition-colors",
        (disabled || loading) && "opacity-40 cursor-not-allowed",
      )}
      title="Delete"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
