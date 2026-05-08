/**
 * tenders · trade catalogue (client-safe).
 *
 * Display labels + canonical order for the 28 BoQ trade categories
 * + "other". Imported by both the builder tender form and the owner
 * comparison matrix. No DB / server-only deps — safe in any bundle.
 */

import type { TenderCostLineRow } from "./schema";

export type TradeId = TenderCostLineRow["trade"];

export type TradeMeta = {
  id: TradeId;
  label: string;
  /** Stable display order (1-based). */
  order: number;
  /** Short description shown in the form helper text + the comparison
   *  view tooltip. Keep tight. */
  hint?: string;
};

/** All 28 fixed trades + "other", in the canonical render order. */
export const TRADES: TradeMeta[] = [
  { id: "preliminaries", label: "Preliminaries", order: 1, hint: "Site setup, fencing, toilet hire, scaffold." },
  { id: "demolition", label: "Demolition", order: 2 },
  { id: "ground_works", label: "Ground works", order: 3, hint: "Excavation, levelling, compaction." },
  { id: "concrete_work", label: "Concrete work", order: 4, hint: "Slab, footings, retaining walls." },
  { id: "precast_concrete", label: "Precast concrete", order: 5 },
  { id: "brickwork_and_blockwork", label: "Brickwork & blockwork", order: 6 },
  { id: "stonework", label: "Stonework", order: 7 },
  { id: "structural_steelwork", label: "Structural steelwork", order: 8 },
  { id: "metalwork", label: "Metalwork", order: 9, hint: "Balustrades, handrails, gates." },
  { id: "carpentry", label: "Carpentry", order: 10, hint: "Frames, trusses, flooring." },
  { id: "joinery", label: "Joinery", order: 11, hint: "Cabinetry, built-ins, custom timberwork." },
  { id: "windows_and_curtain_wall", label: "Windows & curtain wall", order: 12 },
  { id: "doors", label: "Doors", order: 13 },
  { id: "roofing", label: "Roofing", order: 14, hint: "Tiles or metal, gutters, downpipes." },
  { id: "partitions_and_ceilings", label: "Partitions & ceilings", order: 15 },
  { id: "tiling", label: "Tiling", order: 16, hint: "Bathroom, kitchen, laundry, alfresco." },
  { id: "internal_finishes", label: "Internal finishes", order: 17, hint: "Skirting, architraves, trim." },
  { id: "external_finishes", label: "External finishes", order: 18, hint: "Render, cladding, paint." },
  { id: "glazing", label: "Glazing", order: 19 },
  { id: "painting", label: "Painting", order: 20 },
  { id: "special_provisions", label: "Special provisions", order: 21, hint: "Contingency or PC sums." },
  { id: "fixtures_and_fittings", label: "Fixtures & fittings", order: 22, hint: "Tapware, sanitaryware, hardware." },
  { id: "hydraulic_services", label: "Hydraulic services", order: 23, hint: "Plumbing, drainage, hot water." },
  { id: "mechanical_services", label: "Mechanical services", order: 24, hint: "HVAC, ventilation." },
  { id: "electrical_services", label: "Electrical services", order: 25, hint: "Power, lighting, data." },
  { id: "fire_protection_services", label: "Fire protection services", order: 26, hint: "Alarms, sprinklers, extinguishers." },
  { id: "external_works", label: "External works", order: 27, hint: "Driveway, paths, fencing, landscaping." },
  { id: "other", label: "Other", order: 28, hint: "Custom line — name it and add the amount." },
];

const BY_ID: Record<TradeId, TradeMeta> = Object.fromEntries(
  TRADES.map((t) => [t.id, t]),
) as Record<TradeId, TradeMeta>;

export function tradeLabel(id: TradeId): string {
  return BY_ID[id]?.label ?? id;
}

export function tradeOrder(id: TradeId): number {
  return BY_ID[id]?.order ?? 99;
}

/** Sort cost-line rows by their trade's canonical order. */
export function sortLines<L extends { trade: TradeId; sortOrder: number }>(
  lines: L[],
): L[] {
  return [...lines].sort((a, b) => {
    const ao = tradeOrder(a.trade);
    const bo = tradeOrder(b.trade);
    if (ao !== bo) return ao - bo;
    return a.sortOrder - b.sortOrder;
  });
}
