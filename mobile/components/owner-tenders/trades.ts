/**
 * Trade catalogue lookup for the owner tender detail screen.
 *
 * Kept inline (rather than importing from `@/modules/tenders/trades`)
 * because the mobile bundle can't see server-only modules. Same 28
 * trade IDs + "other" the web/builder-side trade picker uses — if the
 * catalogue ever drifts between this file, `components/tender/
 * trade-picker.tsx`, and `src/modules/tenders/trades.ts`, owners will
 * see raw IDs in cost breakdowns. Keep them in lockstep.
 */

interface TradeMeta {
  id: string;
  label: string;
  order: number;
}

const TRADES: TradeMeta[] = [
  { id: "preliminaries", label: "Preliminaries", order: 1 },
  { id: "demolition", label: "Demolition", order: 2 },
  { id: "ground_works", label: "Ground works", order: 3 },
  { id: "concrete_work", label: "Concrete work", order: 4 },
  { id: "precast_concrete", label: "Precast concrete", order: 5 },
  { id: "brickwork_and_blockwork", label: "Brickwork & blockwork", order: 6 },
  { id: "stonework", label: "Stonework", order: 7 },
  { id: "structural_steelwork", label: "Structural steelwork", order: 8 },
  { id: "metalwork", label: "Metalwork", order: 9 },
  { id: "carpentry", label: "Carpentry", order: 10 },
  { id: "joinery", label: "Joinery", order: 11 },
  { id: "windows_and_curtain_wall", label: "Windows & curtain wall", order: 12 },
  { id: "doors", label: "Doors", order: 13 },
  { id: "roofing", label: "Roofing", order: 14 },
  { id: "partitions_and_ceilings", label: "Partitions & ceilings", order: 15 },
  { id: "tiling", label: "Tiling", order: 16 },
  { id: "internal_finishes", label: "Internal finishes", order: 17 },
  { id: "external_finishes", label: "External finishes", order: 18 },
  { id: "glazing", label: "Glazing", order: 19 },
  { id: "painting", label: "Painting", order: 20 },
  { id: "special_provisions", label: "Special provisions", order: 21 },
  { id: "fixtures_and_fittings", label: "Fixtures & fittings", order: 22 },
  { id: "hydraulic_services", label: "Hydraulic services", order: 23 },
  { id: "mechanical_services", label: "Mechanical services", order: 24 },
  { id: "electrical_services", label: "Electrical services", order: 25 },
  { id: "fire_protection_services", label: "Fire protection services", order: 26 },
  { id: "external_works", label: "External works", order: 27 },
  { id: "other", label: "Other", order: 28 },
];

const BY_ID = new Map<string, TradeMeta>(TRADES.map((t) => [t.id, t]));

export function tradeLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

function tradeOrder(id: string): number {
  return BY_ID.get(id)?.order ?? 99;
}

/** Sort cost-line rows by canonical trade order, then by sortOrder. */
export function sortLines<L extends { trade: string; sortOrder: number }>(
  lines: L[],
): L[] {
  return [...lines].sort((a, b) => {
    const ao = tradeOrder(a.trade);
    const bo = tradeOrder(b.trade);
    if (ao !== bo) return ao - bo;
    return a.sortOrder - b.sortOrder;
  });
}
