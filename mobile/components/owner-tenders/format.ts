/**
 * Owner tender review — shared formatters + status meta.
 *
 * Pure-string helpers + the status pill palette. Keeping the meta in
 * one file means the list card, detail header, and any future filter
 * sheet stay visually in lockstep.
 */

import { colors } from "@/lib/theme";
import type { OwnerTenderStatus } from "./types";

// ── Status pill palette ─────────────────────────────────────────────

export interface StatusMeta {
  label: string;
  bg: string;
  border: string;
  text: string;
}

export const STATUS_META: Record<OwnerTenderStatus, StatusMeta> = {
  submitted: {
    label: "Submitted",
    bg: "rgba(126, 245, 237, 0.08)",
    border: "rgba(126, 245, 237, 0.30)",
    text: colors.accentLight,
  },
  shortlisted: {
    label: "Shortlisted",
    bg: "rgba(126, 245, 237, 0.14)",
    border: "rgba(126, 245, 237, 0.55)",
    text: colors.accentLight,
  },
  awarded: {
    label: "Awarded",
    bg: "rgba(126, 245, 237, 0.22)",
    border: "rgba(126, 245, 237, 0.85)",
    text: "#031118",
  },
  rejected: {
    label: "Rejected",
    bg: "rgba(255, 120, 120, 0.08)",
    border: "rgba(255, 120, 120, 0.32)",
    text: "rgba(255, 160, 160, 0.95)",
  },
  draft: {
    label: "Draft",
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.14)",
    text: colors.textSubtle,
  },
  withdrawn: {
    label: "Withdrawn",
    bg: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.10)",
    text: colors.textDim,
  },
};

// ── Formatters ──────────────────────────────────────────────────────

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

/** AUD with no cents — "$2,450,000". null → "—". */
export function formatAud(n: number | null): string {
  if (n == null) return "—";
  return AUD.format(n);
}

/** Compact AUD — "$2.45M", "$450k", "$0". null → "—". */
export function formatAudCompact(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

/** "12 weeks" / "—". */
export function formatWeeks(n: number | null): string {
  if (n == null || n <= 0) return "—";
  return n === 1 ? "1 week" : `${n} weeks`;
}

/** "30 days" / "—". */
export function formatDays(n: number | null): string {
  if (n == null || n <= 0) return "—";
  return n === 1 ? "1 day" : `${n} days`;
}

/** "Mar 2026" / "—". Input is "YYYY-MM". */
export function formatStartMonth(s: string | null): string {
  if (!s) return "—";
  const [y, m] = s.split("-").map((p) => Number.parseInt(p, 10));
  if (!y || !m) return "—";
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

/** Relative — "Today", "Yesterday", "3 days ago", "12 May". */
export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "Today";
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;
  return then.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** "Y years ago" rough banner — for builder track records. */
export function formatYearsBadge(years: number | null): string | null {
  if (years == null || years <= 0) return null;
  return years === 1 ? "1 yr in business" : `${years} yrs in business`;
}
