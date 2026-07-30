/**
 * Synthesis analysis — the deterministic half of accuracy.
 *
 * Two structural rules live here, in code where they cannot drift:
 *
 * COMPLEMENT. The Scope Standard is closed, so "what is not evidenced"
 * is arithmetic, never generation. The model's synthesis names what
 * the documents show; the residual pool — every relevant item it did
 * not name — is computed here and sent to a CLASSIFIER whose only
 * choice per item is gap or not_expected. A synthesis can no longer
 * "forget" to sweep for gaps, because the sweep is not the model's
 * job any more: coverage of the full pool is asserted, and anything
 * the classifier fails to answer defaults to a gap carrying the
 * Standard's own plain sentence. The 76-gaps-then-0-gaps instability
 * class dies by construction.
 *
 * CITATIONS. "No citation, no claim" was a prompt rule enforced only
 * against the document list. It is now checked against the EXTRACT
 * stage's own findings: a citation naming a page that does not exist
 * in that document's findings is fabricated and drops (hard); a
 * citation naming a real page whose extraction did not list the item
 * is a stage disagreement — the citation stays, the item's confidence
 * takes a penalty, and the ops floor routes it to a person (soft).
 * An evidenced item with no surviving citations leaves the selection
 * and joins the residual pool.
 *
 * Pure functions, no API calls: everything here is unit-testable.
 */

import { getScopeItem, itemsFor, type ScopeProjectType } from "@/modules/scope";
import type { SynthesisDocumentInput, SynthesisResult } from "./pipeline";

type SynthesisItem = SynthesisResult["items"][number];

/** Soft stage-disagreement penalty; lands doubtful items below the
 *  ops confidence floor so a person looks before the client does. */
export const SOFT_CITATION_PENALTY = 0.7;

export interface CitationEnforcement {
  items: SynthesisItem[];
  /** Evidenced entries that lost every citation; they rejoin the
   *  residual pool for classification. */
  demoted: string[];
  hardDropped: number;
  softFlagged: number;
}

/**
 * Check every evidenced citation against the extract stage's own
 * findings. Hard violations (page not in the document's findings at
 * all) drop the citation; soft violations (page real, item not listed
 * on it) keep it with a confidence penalty on the entry.
 */
export function enforceCitationConsistency(
  items: SynthesisItem[],
  documents: SynthesisDocumentInput[],
): CitationEnforcement {
  const pagesByDoc = new Map<string, Map<number, Set<string>>>();
  for (const d of documents) {
    const byPage = new Map<number, Set<string>>();
    for (const p of d.findings.pages) {
      byPage.set(p.page, new Set(p.itemIds));
    }
    pagesByDoc.set(d.documentId, byPage);
  }

  const out: SynthesisItem[] = [];
  const demoted: string[] = [];
  let hardDropped = 0;
  let softFlagged = 0;

  for (const entry of items) {
    if (entry.status !== "evidenced") {
      out.push(entry);
      continue;
    }
    let soft = false;
    const kept = entry.citations.filter((c) => {
      const byPage = pagesByDoc.get(c.documentId);
      const onPage = byPage?.get(c.page);
      if (!onPage) {
        hardDropped += 1;
        return false;
      }
      if (!onPage.has(entry.itemId)) soft = true;
      return true;
    });
    if (kept.length === 0) {
      demoted.push(entry.itemId);
      continue;
    }
    if (soft) softFlagged += 1;
    out.push({
      ...entry,
      citations: kept,
      confidence: soft
        ? Math.round(entry.confidence * SOFT_CITATION_PENALTY * 100) / 100
        : entry.confidence,
    });
  }
  return { items: out, demoted, hardDropped, softFlagged };
}

/** The type's pool minus everything the synthesis accounted for. */
export function residualPool(
  projectType: ScopeProjectType,
  items: Array<{ itemId: string }>,
): string[] {
  const accounted = new Set(items.map((i) => i.itemId));
  return itemsFor(projectType)
    .map((i) => i.id)
    .filter((id) => !accounted.has(id));
}

export interface ResidualVerdict {
  verdict: "gap" | "not_expected";
  note: string | null;
}

/**
 * Fold classifier verdicts over the residual pool into final entries.
 * Every residual id gets an entry: the classifier's where it answered,
 * and a defensive gap carrying the Standard's plain sentence where it
 * did not — silence must never hide a hole in a tender.
 */
export function foldResiduals(
  residualIds: string[],
  verdicts: Map<string, ResidualVerdict>,
): SynthesisItem[] {
  return residualIds.map((itemId) => {
    const v = verdicts.get(itemId);
    if (v) {
      return {
        itemId,
        status: v.verdict,
        citations: [],
        note: v.note,
        confidence: 0.7,
      };
    }
    return {
      itemId,
      status: "gap" as const,
      citations: [],
      note: getScopeItem(itemId)?.plain ?? null,
      confidence: 0.5,
    };
  });
}

/**
 * The invariant the whole rework exists for: evidenced + gap +
 * not_expected covers the type's pool exactly, no misses and no
 * strays. Returns the discrepancies rather than throwing — the
 * caller logs and decides.
 */
export function coverageReport(
  projectType: ScopeProjectType,
  items: Array<{ itemId: string }>,
): { poolSize: number; covered: number; missing: string[]; strays: string[] } {
  const pool = new Set(itemsFor(projectType).map((i) => i.id));
  const seen = new Set<string>();
  const strays: string[] = [];
  for (const i of items) {
    if (pool.has(i.itemId)) seen.add(i.itemId);
    else strays.push(i.itemId);
  }
  const missing = [...pool].filter((id) => !seen.has(id));
  return { poolSize: pool.size, covered: seen.size, missing, strays };
}

/**
 * Register hygiene: the same document uploaded twice must not read as
 * twice the evidence. Documents agreeing on (kind, title, pageCount)
 * synthesise once; duplicates are reported, never silently used.
 */
export function dedupeRegister<
  T extends {
    documentId: string;
    kind: string | null;
    docTitle: string | null;
    pageCount: number | null;
  },
>(docs: T[]): { keep: T[]; duplicates: T[] } {
  const seen = new Map<string, T>();
  const keep: T[] = [];
  const duplicates: T[] = [];
  for (const d of docs) {
    const title = d.docTitle?.trim().toLowerCase();
    if (!title || !d.kind || !d.pageCount) {
      keep.push(d);
      continue;
    }
    const key = `${d.kind}|${title}|${d.pageCount}`;
    if (seen.has(key)) duplicates.push(d);
    else {
      seen.set(key, d);
      keep.push(d);
    }
  }
  return { keep, duplicates };
}
