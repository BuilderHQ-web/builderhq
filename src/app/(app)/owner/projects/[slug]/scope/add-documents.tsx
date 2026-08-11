"use client";

/**
 * The answer to "upload it where?" — right here. A compact drop zone
 * inside chapter 03: PDFs land on the project through the same upload
 * path as the wizard, each one listed as it arrives, and the re-read
 * button sits beside it. The classifier reads content, not filenames,
 * so no category quiz stands between the client and adding a soil
 * report.
 */

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";

import {
  completeUploadAction,
  initUploadAction,
} from "@/app/(app)/_actions/documents";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;

export function AddDocuments({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [added, setAdded] = useState<string[]>([]);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const pdfs = [...files].filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length === 0) {
        toast.error("PDF documents only", "Drawings and reports upload as PDF.");
        return;
      }
      setBusy(true);
      try {
        for (const file of pdfs) {
          if (file.size > MAX_BYTES) {
            toast.error("Too large", `${file.name} is over 50 MB.`);
            continue;
          }
          const init = await initUploadAction({
            projectId,
            filename: file.name,
            contentType: "application/pdf",
            sizeBytes: file.size,
            category: "other",
          });
          if (!init.ok) {
            toast.error("Could not start the upload", init.error.message);
            continue;
          }
          const put = await fetch(init.value.uploadUrl, {
            method: "PUT",
            headers: init.value.uploadHeaders,
            body: file,
          });
          if (!put.ok) {
            toast.error("Upload failed", `${file.name} did not reach storage.`);
            continue;
          }
          const done = await completeUploadAction(init.value.documentId);
          if (!done.ok) {
            toast.error("Could not finish the upload", done.error.message);
            continue;
          }
          setAdded((prev) => [...prev, file.name]);
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [projectId],
  );

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn(
          "w-full rounded-md border border-dashed px-4 py-4 text-center transition-colors",
          dragOver
            ? "border-border-accent bg-[rgba(0,212,200,0.05)]"
            : "border-border-strong hover:border-border-accent hover:bg-[rgba(0,212,200,0.025)]",
          busy && "opacity-70",
        )}
      >
        <span className="inline-flex items-center gap-2 text-[12.5px] font-ui text-text-muted">
          {busy ? (
            <Loader2 className="size-4 animate-spin text-accent-light" />
          ) : (
            <UploadCloud className="size-4 text-accent-light" />
          )}
          {busy
            ? "Uploading"
            : "Drop PDFs here or click to add documents"}
        </span>
        <span className="mt-0.5 block text-[10.5px] text-text-dim">
          They join your project set; we work out what each one is when we
          read it.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && void upload(e.target.files)}
      />
      {added.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {added.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="flex items-center gap-2 text-[11.5px] text-text-muted"
            >
              <CheckCircle2 className="size-3.5 text-[#0a7d73] shrink-0" />
              <span className="min-w-0 truncate">{name}</span>
              <span className="text-text-dim shrink-0">added</span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-[11px] text-text-dim pl-5.5">
            <FileUp className="size-3 shrink-0" />
            Now use &ldquo;Documents added, read again&rdquo; and the pack
            re-issues with {added.length === 1 ? "it" : "them"} read in.
          </li>
        </ul>
      ) : null}
    </div>
  );
}
