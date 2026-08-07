"use client";

/**
 * The standard (i) beside a schedule line's notes. Click opens it,
 * hover opens it on a mouse, Escape and blur close it — a bare title
 * attribute leaves touch users with nothing to press.
 */

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { SCHEDULE_NOTE_HINT } from "@/modules/tenders/schedule";

export function NoteHint({
  text = SCHEDULE_NOTE_HINT,
  label = "What these notes are",
  className,
}: {
  text?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onBlur={() => setOpen(false)}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        className={cn(
          "cursor-pointer transition-colors text-text-faint hover:text-text-muted",
          className,
        )}
      >
        <Info className="size-3" />
      </button>
      {open ? (
        <span className="absolute left-0 top-full z-20 mt-1.5 w-[250px] max-w-[72vw] rounded-md border border-border-subtle bg-surface-1 card-elev px-3 py-2 text-left text-[11px] leading-[1.55] font-normal text-text-muted">
          {text}
        </span>
      ) : null}
    </span>
  );
}
