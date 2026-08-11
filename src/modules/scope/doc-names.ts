/**
 * scope · standard document names (pure, client-safe).
 *
 * One naming convention for every register on every surface. A
 * document's classified KIND gives it its standard display name;
 * consultants' own titles and filenames stay visible as the second
 * line, never the headline. Kinds the convention does not name fall
 * back to the document's own title, cleaned — so a new kind of file
 * still gets a sensible, consistent name instead of a raw filename.
 *
 * Importance order is the order a builder reads a pack: drawings
 * first, then the written word, then the land, then the reports.
 */

export const DOC_KIND_STANDARD_NAME: Record<string, string> = {
  architectural: "Architectural Plans",
  structural: "Structural Engineering",
  civil: "Civil Engineering",
  specification: "Project Specifications",
  survey: "Land Survey",
  soil: "Geotechnical Report",
  energy: "Energy Efficiency Report",
  planning: "Town Planning",
};

/** Register order: architectural, structural, civil, specifications,
 *  survey, geotech, energy, planning, everything else. */
export const DOC_KIND_ORDER: string[] = [
  "architectural",
  "structural",
  "civil",
  "specification",
  "survey",
  "soil",
  "energy",
  "planning",
  "other",
];

export function registerImportance(kind: string | null): number {
  const i = DOC_KIND_ORDER.indexOf(kind ?? "other");
  return i === -1 ? DOC_KIND_ORDER.length : i;
}

/** Title-case a consultant's own title into a presentable name. */
function presentableTitle(raw: string): string {
  const cleaned = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
  if (!cleaned) return "Project Document";
  // Respect existing capitalisation unless the title is shouting.
  if (cleaned === cleaned.toUpperCase()) {
    return cleaned
      .toLowerCase()
      .replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return cleaned;
}

/** The standard display name for one document. */
export function standardDocumentName(
  kind: string | null,
  docTitle: string | null,
  filename: string,
): string {
  const std = kind ? DOC_KIND_STANDARD_NAME[kind] : undefined;
  if (std) return std;
  if (docTitle) return presentableTitle(docTitle);
  return presentableTitle(filename.replace(/\.[a-z0-9]+$/i, ""));
}

/**
 * Standard names for a whole register, disambiguated: when two
 * documents share a kind ("Architectural Plans" twice), each carries
 * enough of its own title to tell them apart.
 */
export function resolveRegisterNames(
  docs: Array<{
    documentId: string;
    kind: string | null;
    docTitle: string | null;
    filename: string;
  }>,
): Map<string, string> {
  const base = new Map(
    docs.map((d) => [
      d.documentId,
      standardDocumentName(d.kind, d.docTitle, d.filename),
    ]),
  );
  const counts = new Map<string, number>();
  for (const name of base.values()) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  const ordinals = new Map<string, number>();
  for (const d of docs) {
    const name = base.get(d.documentId)!;
    if ((counts.get(name) ?? 0) > 1) {
      const detail = presentableTitle(
        d.docTitle ?? d.filename.replace(/\.[a-z0-9]+$/i, ""),
      ).slice(0, 28);
      if (detail && detail !== name) {
        out.set(d.documentId, `${name} · ${detail}`);
      } else {
        // No distinguishing title: fall back to a stable ordinal so
        // two same-kind documents never share one display name.
        const n = (ordinals.get(name) ?? 0) + 1;
        ordinals.set(name, n);
        out.set(d.documentId, `${name} · ${n}`);
      }
    } else {
      out.set(d.documentId, name);
    }
  }
  return out;
}
