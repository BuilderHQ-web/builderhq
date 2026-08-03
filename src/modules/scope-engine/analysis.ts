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

import {
  SCOPE_ITEMS,
  getScopeItem,
  itemsFor,
  type ScopeProjectType,
} from "@/modules/scope";
import type {
  SynthesisCapture,
  SynthesisDocumentInput,
  SynthesisResult,
} from "./pipeline";

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

type SynthesisConflict = SynthesisResult["conflicts"][number];

export interface ConflictEnforcement {
  conflicts: SynthesisConflict[];
  /** Citations naming pages the extract stage never saw — fabricated. */
  droppedCitations: number;
  /** Conflicts that lost every citation; "no citation, no claim"
   *  applies to conflicts exactly as it does to evidence. */
  droppedConflicts: number;
}

/**
 * The item rule, extended to conflicts: a conflict citation must name
 * a (document, page) the extract stage actually produced findings
 * for. Extraction emits an entry for EVERY page, so a page outside a
 * document's findings does not exist in that document — the citation
 * is fabricated and drops. A conflict with no surviving citations is
 * an uncited claim and drops with it.
 */
export function enforceConflictIntegrity(
  conflicts: SynthesisConflict[],
  documents: SynthesisDocumentInput[],
): ConflictEnforcement {
  const pagesByDoc = new Map<string, Set<number>>();
  for (const d of documents) {
    pagesByDoc.set(d.documentId, new Set(d.findings.pages.map((p) => p.page)));
  }
  const out: SynthesisConflict[] = [];
  let droppedCitations = 0;
  let droppedConflicts = 0;
  for (const c of conflicts) {
    const kept = c.citations.filter((x) => {
      const ok = pagesByDoc.get(x.documentId)?.has(x.page) ?? false;
      if (!ok) droppedCitations += 1;
      return ok;
    });
    if (kept.length === 0) {
      droppedConflicts += 1;
      continue;
    }
    out.push({ ...c, citations: kept });
  }
  return { conflicts: out, droppedCitations, droppedConflicts };
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
        depth: null,
        remaining: null,
        confidence: 0.7,
      };
    }
    return {
      itemId,
      status: "gap" as const,
      citations: [],
      note: getScopeItem(itemId)?.plain ?? null,
      depth: null,
      remaining: null,
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

/* ── the baseline check ─────────────────────────────────────────────── */

export interface BaselineDocument {
  documentId: string;
  kind: string | null;
  docTitle: string | null;
  /** ISO date string from the title block, or null. */
  issueDate: string | null;
  clientName: string | null;
}

export interface BaselineFinding {
  summary: string;
  citations: Array<{ documentId: string; page: number }>;
  severity: "attention" | "high";
}

const MONTH = 1000 * 60 * 60 * 24 * 30.4;

function monthsBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MONTH);
}

function displayName(d: BaselineDocument): string {
  return d.docTitle ?? d.kind ?? "a document";
}

/**
 * The revision-baseline cross-examination, in code where no model
 * judgement can wobble. Real packages assemble over years — a survey
 * from 2018, reports from 2022, architecture stamped 2024, structure
 * issued 2025 — and every stale basis is a place prices move later.
 * All rules are conservative: no date, no finding.
 */
export function baselineFindings(docs: BaselineDocument[]): BaselineFinding[] {
  const findings: BaselineFinding[] = [];
  const dated = docs.filter((d) => d.issueDate);
  if (dated.length >= 2) {
    const byKind = (k: string) => dated.filter((d) => d.kind === k);
    const arch = byKind("architectural");
    const struct = byKind("structural");
    const designDates = [...arch, ...struct].map((d) => d.issueDate!);
    const latestDesign = designDates.sort().at(-1) ?? null;
    const latestDesignDoc = [...arch, ...struct].find(
      (d) => d.issueDate === latestDesign,
    );

    // Reports prepared well before the design they certify.
    if (latestDesign && latestDesignDoc) {
      for (const kind of ["energy", "soil"]) {
        for (const d of byKind(kind)) {
          const months = monthsBetween(d.issueDate!, latestDesign);
          if (months > 12) {
            findings.push({
              summary: `${displayName(d)} is dated ${d.issueDate}, ${months} months before the latest design revision (${displayName(latestDesignDoc)}, ${latestDesign}). Written confirmation is needed that it still reflects the design being priced.`,
              citations: [
                { documentId: d.documentId, page: 1 },
                { documentId: latestDesignDoc.documentId, page: 1 },
              ],
              severity: "attention",
            });
          }
        }
      }
      // A survey older than everything it underpins.
      for (const d of byKind("survey")) {
        const months = monthsBetween(d.issueDate!, latestDesign);
        if (months > 36) {
          findings.push({
            summary: `The survey (${displayName(d)}) is dated ${d.issueDate}, ${Math.round(months / 12)} years before the latest design work. Boundaries, levels and neighbouring conditions may have changed; a current re-establishment survey should be confirmed before set-out.`,
            citations: [{ documentId: d.documentId, page: 1 }],
            severity: "attention",
          });
        }
      }
    }

    // Structure issued long after the stamped architecture: the
    // permit-amendment question.
    const latestArch = arch.map((d) => d.issueDate!).sort().at(-1);
    const latestStruct = struct.map((d) => d.issueDate!).sort().at(-1);
    if (latestArch && latestStruct) {
      const months = monthsBetween(latestArch, latestStruct);
      if (months > 12) {
        const a = arch.find((d) => d.issueDate === latestArch)!;
        const s = struct.find((d) => d.issueDate === latestStruct)!;
        findings.push({
          summary: `The structural set (${displayName(s)}, ${latestStruct}) post-dates the architectural set (${displayName(a)}, ${latestArch}) by ${months} months. Confirmation is needed that the newer structure is covered by the building permit, or that an amendment has been lodged.`,
          citations: [
            { documentId: s.documentId, page: 1 },
            { documentId: a.documentId, page: 1 },
          ],
          severity: "high",
        });
      }
    }
  }

  // Title blocks naming different clients or projects.
  const names = new Map<string, BaselineDocument>();
  for (const d of docs) {
    const n = d.clientName?.trim().toLowerCase();
    if (n && !names.has(n)) names.set(n, d);
  }
  if (names.size > 1) {
    const list = [...names.values()];
    findings.push({
      summary: `The documents' title blocks name different clients or projects: ${list
        .map((d) => `"${d.clientName}" (${displayName(d)})`)
        .join(", ")}. The owner, principal and contracting entity should be confirmed before tender.`,
      citations: list.map((d) => ({ documentId: d.documentId, page: 1 })),
      severity: "attention",
    });
  }
  return findings;
}

/* ── the pack's own missing-document register ───────────────────────── */

export interface NamedMissingRef {
  /** The reference exactly as a page printed it. */
  ref: string;
  /** Where the pack makes the reference. */
  citations: Array<{ documentId: string; page: number }>;
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Generic names a reference may use for a supplied document KIND —
 *  "refer to structural engineering drawings" resolves when a
 *  structural set is in the pack, whatever its filename says. */
const KIND_REF_SYNONYMS: Record<string, string[]> = {
  architectural: [
    "architectural plans",
    "architectural drawings",
    "architectural working drawings",
    "working drawings",
  ],
  structural: [
    "structural engineering drawings",
    "structural drawings",
    "structural plans",
    "engineering drawings",
  ],
  civil: ["civil drawings", "civil design", "drainage plans", "drainage layout"],
  soil: ["soil report", "geotechnical report", "soil test"],
  energy: ["energy report", "energy assessment", "nathers certificate"],
  survey: ["feature survey", "land survey", "survey plan"],
  specification: ["specification", "specifications"],
};

/** An internal sheet cross-reference ("E1 / S02", "refer to detail
 *  page S27") points inside the set, not at another document. */
function isSheetCrossRef(ref: string): boolean {
  const key = normalise(ref);
  if (/^(referto)?(detail)?(page|sheet)?[a-z]{1,3}\d{1,3}[a-z]?$/.test(key)) return true;
  // "E1 / S02" shapes: two short sheet codes.
  if (/^[a-z]{1,3}\d{1,3}[a-z]?[a-z]{1,3}\d{1,3}[a-z]?$/.test(key) && key.length <= 10) {
    return true;
  }
  return false;
}

/**
 * Documents the pack NAMES that the pack does not CONTAIN — "sheet 2
 * of 5", a soil report number, "refer plan 11637S-2". A reference is
 * considered supplied when its normalised text overlaps a supplied
 * document's title or filename, or names a supplied document's kind;
 * internal sheet cross-references are the set talking to itself and
 * never surface. Everything else is the pack telling us, in its own
 * words, what is missing from it.
 */
export function namedMissingDocuments(
  documents: Array<{
    documentId: string;
    filename: string;
    docTitle: string | null;
    kind?: string | null;
    findings: SynthesisDocumentInput["findings"];
  }>,
): NamedMissingRef[] {
  const suppliedKeys = documents.flatMap((d) =>
    [d.filename.replace(/\.[a-z0-9]+$/i, ""), d.docTitle ?? ""]
      .map(normalise)
      .filter((k) => k.length >= 6),
  );
  for (const d of documents) {
    if (d.kind && KIND_REF_SYNONYMS[d.kind]) {
      suppliedKeys.push(...KIND_REF_SYNONYMS[d.kind]!.map(normalise));
    }
  }
  const byRef = new Map<string, NamedMissingRef>();
  for (const d of documents) {
    for (const p of d.findings.pages) {
      for (const raw of p.docRefs ?? []) {
        const ref = raw.trim();
        if (ref.length < 4) continue;
        const key = normalise(ref);
        if (key.length < 4) continue;
        // The set talking to itself is not a missing document.
        if (isSheetCrossRef(ref)) continue;
        // Self-references and references to supplied documents resolve.
        if (suppliedKeys.some((s) => s.includes(key) || key.includes(s))) continue;
        const existing = byRef.get(key);
        if (existing) {
          if (
            existing.citations.length < 5 &&
            !existing.citations.some(
              (c) => c.documentId === d.documentId && c.page === p.page,
            )
          ) {
            existing.citations.push({ documentId: d.documentId, page: p.page });
          }
        } else if (byRef.size < 30) {
          byRef.set(key, {
            ref,
            citations: [{ documentId: d.documentId, page: p.page }],
          });
        }
      }
    }
  }
  return [...byRef.values()];
}

/* ── capture hygiene ────────────────────────────────────────────────── */

export interface CaptureHygiene {
  kept: SynthesisCapture[];
  /** Captures whose label already lives in the Standard — evidence the
   *  model should have mapped, not proposed. Logged, never stored. */
  mappedAway: Array<{ label: string; matchedItemId: string }>;
}

/**
 * A capture is only a capture if the Standard genuinely lacks the
 * work. Labels that match an existing item's label or alias are
 * mapped away here, in code, so the capture lane cannot become a
 * duplicate vocabulary.
 */
export function captureHygiene(captures: SynthesisCapture[]): CaptureHygiene {
  const kept: SynthesisCapture[] = [];
  const mappedAway: CaptureHygiene["mappedAway"] = [];
  for (const c of captures) {
    const key = normalise(c.label);
    if (key.length < 3) continue;
    const match = SCOPE_ITEMS.find((i) => {
      const candidates = [i.label, ...(i.aliases ?? [])].map(normalise);
      return candidates.some(
        (a) => a.length >= 4 && (a.includes(key) || key.includes(a)),
      );
    });
    if (match) mappedAway.push({ label: c.label, matchedItemId: match.id });
    else kept.push(c);
  }
  return { kept, mappedAway };
}

/* ── the readiness verdict ──────────────────────────────────────────── */

/** Partial share of evidenced items above which a fixed price is a
 *  guess wearing a suit. */
export const READINESS_PARTIAL_CEILING = 0.4;
/** Named-but-absent references above which the pack is visibly
 *  incomplete by its own account. */
export const READINESS_MISSING_REFS_CEILING = 3;

export interface PackReadiness {
  verdict: "fixed_price" | "budget_only";
  /** Plain sentences a client can read, one per contributing factor.
   *  Empty when the pack is clean. */
  factors: string[];
}

/**
 * The pack-level call: can this be priced fixed, or should it go out
 * for budget pricing until the gaps close? Derived entirely from
 * counts the run already produced — no model, no opinion that cannot
 * be pointed at.
 */
export function packReadiness(args: {
  items: Array<{ status: string; depth?: string | null }>;
  conflicts: Array<{ severity: string }>;
  namedMissingCount: number;
  registerKinds: string[];
  projectType: ScopeProjectType;
}): PackReadiness {
  const factors: string[] = [];
  let hard = false;

  const high = args.conflicts.filter((c) => c.severity === "high").length;
  if (high > 0) {
    hard = true;
    factors.push(
      high === 1
        ? "One unresolved high-severity conflict between the documents."
        : `${high} unresolved high-severity conflicts between the documents.`,
    );
  }

  const newBuild =
    args.projectType === "single_dwelling" || args.projectType === "multi_dwelling";
  if (newBuild && !args.registerKinds.includes("structural")) {
    hard = true;
    factors.push(
      "No structural engineering in the pack: footings, framing and steel would be priced on assumption.",
    );
  }

  if (args.namedMissingCount > READINESS_MISSING_REFS_CEILING) {
    factors.push(
      `The documents refer to ${args.namedMissingCount} other documents the pack does not contain.`,
    );
  }

  const evidenced = args.items.filter((i) => i.status === "evidenced");
  const partial = evidenced.filter((i) => i.depth === "partial").length;
  if (
    evidenced.length > 0 &&
    partial / evidenced.length >= READINESS_PARTIAL_CEILING
  ) {
    factors.push(
      `${partial} of ${evidenced.length} documented items are only partly specified: shown on the drawings, but not yet priceable without assumptions.`,
    );
  }

  return {
    verdict: hard || factors.length >= 2 ? "budget_only" : "fixed_price",
    factors,
  };
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
