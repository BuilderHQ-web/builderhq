"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, Building, Wrench, Layers, ArrowRight, Loader2 } from "lucide-react";

import { createProjectAction } from "@/app/(app)/_actions/projects";
import { cn } from "@/lib/utils";
import type { Project } from "@/modules/projects";

type TypeId = Project["type"];

const TYPES: Array<{
  id: TypeId;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "single_dwelling",
    label: "Single dwelling",
    description: "New build, one home on the site.",
    icon: <Home className="size-5" />,
  },
  {
    id: "multi_dwelling",
    label: "Multi-dwelling",
    description: "Duplex, townhouses, or two+ homes on the site.",
    icon: <Building className="size-5" />,
  },
  {
    id: "renovation",
    label: "Renovation",
    description: "Working on an existing home: kitchen, bathroom, internal.",
    icon: <Wrench className="size-5" />,
  },
  {
    id: "extension",
    label: "Extension",
    description: "Adding new floor space: ground, first floor, or rear.",
    icon: <Layers className="size-5" />,
  },
];

export function TypePicker() {
  const [picked, setPicked] = useState<TypeId | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onContinue = () => {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      const r = await createProjectAction({ type: picked });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      router.push(`/owner/projects/${r.value.slug}/edit`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPicked(t.id)}
            aria-pressed={picked === t.id}
            className={cn(
              "group relative text-left p-5 rounded-md border transition-[border-color,background] duration-[400ms] ease-[var(--ease-out)]",
              picked === t.id
                ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
                : "border-border-subtle bg-[rgba(255,255,255,0.012)] hover:border-border",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "size-10 rounded-md flex items-center justify-center border shrink-0 transition-colors duration-[400ms]",
                  picked === t.id
                    ? "border-border-accent bg-accent-muted text-accent-light"
                    : "border-border-subtle bg-[rgba(255,255,255,0.02)] text-text-muted",
                )}
              >
                {t.icon}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-[14px] font-semibold",
                    picked === t.id ? "text-text" : "text-text-muted",
                  )}
                >
                  {t.label}
                </div>
                <div className="text-[12.5px] text-text-dim mt-0.5 leading-[1.5]">
                  {t.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <span className="text-[12px] text-text-dim">
          You can edit anything in the next step.
        </span>
        <button
          type="button"
          onClick={onContinue}
          disabled={!picked || isPending}
          className={cn(
            "inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-[13px] font-semibold tracking-[0.04em] transition-colors duration-[160ms] w-full sm:w-auto",
            picked && !isPending
              ? "bg-accent text-accent-contrast hover:bg-accent-hover"
              : "bg-surface-2 text-text-dim cursor-not-allowed",
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {isPending ? "Setting up…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
