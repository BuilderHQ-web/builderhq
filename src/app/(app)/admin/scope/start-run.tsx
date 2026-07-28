"use client";

/**
 * StartRunPicker — paste a project id (or slug via the admin's own
 * knowledge), kick a run, land on its review page. Deliberately
 * spartan: this is an internal instrument.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

import { startScopeRunAction } from "@/app/(app)/_actions/scope";
import { toast } from "@/components/ui/toast";

export function StartRunPicker() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!projectId.trim()) return;
    setBusy(true);
    try {
      const r = await startScopeRunAction(projectId.trim());
      if (!r.ok) {
        toast.error("Could not start the run", r.error.message);
        return;
      }
      router.push(`/admin/scope/${r.value.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        placeholder="Project id"
        className="h-10 w-[280px] px-3 rounded-md border border-border-subtle bg-surface-1 text-[12.5px] font-mono text-text placeholder:text-text-faint outline-none focus:border-border-accent"
      />
      <button
        type="button"
        disabled={busy || !projectId.trim()}
        onClick={start}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Play className="size-3.5" />
        )}
        Start run
      </button>
    </div>
  );
}
