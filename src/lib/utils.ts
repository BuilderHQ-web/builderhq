import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class strings, deduping conflicting utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate text to roughly `max` characters, preferring a word boundary
 * when that still leaves a reasonable amount (else a hard cut). Appends an
 * ellipsis whenever anything was removed. Used for teaser copy such as the
 * pre-unlock project description a builder sees before they unlock.
 */
export function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,.;:-]+$/, "") + "…";
}

/**
 * Pick the form that agrees with the count. Both forms are spelled out
 * rather than derived: a stat label puts the noun anywhere in the
 * phrase ("Active tenders", "Projects uploaded", "Decisions waiting"),
 * so no suffix rule gets all three right.
 */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
