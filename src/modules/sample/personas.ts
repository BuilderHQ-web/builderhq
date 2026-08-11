/**
 * The example round's three rival tenders — ported from the dev rival
 * seeder (scripts/dev-arch-p4-seed-rivals.mts) and made canonical.
 * Three personas spread so the comparison has a story to tell:
 * the cheapest carries its risk in allowances and exclusions, the
 * middle is firm and complete, the premium buys certainty. Complete
 * v2 answer sets, validated against the instrument at seed time.
 */

import {
  requiredQuestionIds,
  isAnswerComplete,
  getQuestion,
  scopeMatrixRows,
} from "@/modules/tenders/instrument";

type Answers = Record<string, unknown>;

const INCLUDED_ALL: Record<string, string> = {};
for (const r of scopeMatrixRows()) INCLUDED_ALL[r.id] = "included";

/** A complete, clean v2 answer set — the balanced default. Personas
 *  override from here, deleting keys behind gates they close. */
const base: Answers = {
  // eligibility
  "elig.authority": true,
  "elig.licence": true,
  "elig.insurance_pl": true,
  "elig.warranty_eligible": true,
  "elig.workers_comp": "current",
  "elig.site_inspection": "inspected",
  "elig.docs_reviewed": "full_set",
  "elig.conditions": true,
  // understanding
  "understand.scope_confirm": "matches",
  "understand.rfis": "none_needed",
  "understand.gaps": false,
  "understand.concerns": false,
  "understand.risks": ["ground"],
  // credentials
  "creds.supervisor_role": "myself_director",
  "team.supervisor_load": "1_2",
  "team.contact": "director",
  "creds.experience_type": "6_20",
  "creds.largest_value": "1m_2m",
  "creds.references": [
    { name: "J. Calder", project: "New build, Kew", year: "2025", contact: "0400 111 222", link: "" },
    { name: "M. Aldous", project: "Extension, Balwyn", year: "2024", contact: "0400 333 444", link: "" },
  ],
  "programme.concurrent": "0_2",
  "team.in_house": ["carpentry"],
  "team.crew_tenure": "3_plus",
  "creds.whs": "documented",
  "creds.qa": ["itp"],
  "creds.memberships": ["hia"],
  // commercial
  "contract.form": "hia",
  "price.total": 685000,
  "commercial.gst_registered": true,
  "price.fixed": true,
  "price.validity": 30,
  "payments.deposit": 5,
  "payments.schedule_type": "standard_stages",
  "payments.terms": "14",
  "payments.final_claim": "handover",
  "price.escalation": false,
  "price.margin": 15,
  "commercial.alternatives": false,
  // scope
  "scope.matrix": { ...INCLUDED_ALL, demolition: "not_applicable" },
  "site.soil_report": "site_report",
  "site.rock": "included",
  "site.survey": "already_done",
  "site.engineering": "builder",
  "site.asbestos": "not_applicable",
  "site.service_connections": ["power", "water", "sewer", "stormwater", "nbn"],
  "compliance.permit": "builder",
  "compliance.permit_fees": true,
  "compliance.energy": "assessment_and_upgrades",
  // exclusions
  "excl.derived_confirm": true,
  "excl.owner_supplied": false,
  // allowances
  "pcps.has_ps": false,
  "pcps.has_pc": false,
  "pcps.overrun_margin": 10,
  "pcps.basis": "documented",
  // programme
  "prog.lead_time": "4_8",
  "programme.start": "2026-10",
  "programme.duration": 34,
  "programme.weather": true,
  "programme.weather_days": 10,
  "programme.liquidated_damages": false,
  // delivery
  "team.updates": "weekly",
  "contract.variations_written": true,
  "contract.variation_fee": false,
  "contract.defects_liability": "12",
  "aftercare.walkthrough": true,
  "aftercare.response": "48h",
  "aftercare.manual": true,
  // sign-off
  "sign.true_complete": true,
  "sign.capable": true,
  "sign.no_collusion": true,
  "sign.signatory": "Sam Wheeler",
  "sign.role": "Director",
};


export interface SamplePersona {
  /** Stable key — pairs the persona with its system builder account. */
  key: "corten" | "meridian" | "brightwater";
  company: string;
  abn: string;
  licence: { number: string; state: string };
  years: number;
  price: number;
  weeks: number;
  validity: number;
  pitch: string;
  answers: Answers;
  /** Keys to delete from the merged set (behind closed gates). */
  drop?: string[];
}

export const SAMPLE_PERSONAS: SamplePersona[] = [
  {
    key: "corten",
    company: "Corten Build Co.",
    abn: "62 118 220 471",
    licence: { number: "CB-L 88231", state: "VIC" },
    years: 6,
    price: 648000,
    weeks: 36,
    validity: 45,
    pitch: "Corten Build Co. delivers sharp, competitive pricing on Melbourne residential builds.",
    drop: ["programme.weather_days"],
    answers: {
      "price.total": 648000,
      "price.validity": 45,
      "programme.duration": 36,
      // fixed on paper, hollow underneath
      "price.escalation": true,
      "price.escalation_scope": ["materials", "labour"],
      "price.escalation_cap": "uncapped",
      "price.margin": 18,
      "pcps.has_ps": true,
      "pcps.ps_items": [
        { description: "Site works, cut and fill", allowance: 44000 },
        { description: "Retaining wall to east boundary", allowance: 26000 },
      ],
      "pcps.has_pc": true,
      "pcps.pc_items": [
        { description: "Kitchen appliances", allowance: 18000 },
        { description: "Tapware and sanitaryware", allowance: 8000 },
        { description: "Floor and wall tiling", allowance: 9000 },
      ],
      "pcps.overrun_margin": 20,
      "pcps.basis": "generic",
      "scope.matrix": {
        ...INCLUDED_ALL,
        demolition: "not_applicable",
        stonework: "not_applicable",
        ground_works: "allowance",
        painting: "allowance",
        external_works: "excluded",
        external_finishes: "excluded",
      },
      "scope.exclusions_list": [
        { exclusion: "Landscaping and turf" },
        { exclusion: "Driveway beyond the crossover" },
      ],
      "site.soil_report": "assumed",
      "site.soil_class": "m",
      "site.rock": "variation",
      "site.survey": "owner",
      "site.engineering": "owner",
      "site.asbestos": "excluded",
      "site.service_connections": ["power", "water"],
      "compliance.permit": "owner",
      "compliance.permit_fees": false,
      "compliance.energy": "assessment_only",
      // thin credentials
      "creds.supervisor_role": "project_manager",
      "creds.supervisor": "Jordan Blake",
      "team.supervisor_load": "6_plus",
      "team.contact": "project_manager",
      "creds.experience_type": "1_5",
      "creds.largest_value": "500k_1m",
      "creds.references": [
        { name: "R. Okafor", project: "Townhouse, Sunshine", year: "2024", contact: "0400 555 111", link: "" },
      ],
      "programme.concurrent": "6_plus",
      "team.in_house": ["none"],
      "team.crew_tenure": "under_1",
      "creds.whs": "swms",
      "creds.qa": ["supervisor"],
      "creds.memberships": ["none"],
      // programme: no weather allowance, disclosed add-on
      "programme.weather": false,
      "programme.weather_addon_days": 12,
      // delivery: lighter touch, short defects
      "team.updates": "fortnightly",
      "contract.variation_fee": true,
      "contract.defects_liability": "3",
      "aftercare.response": "best_effort",
      "sign.signatory": "Jordan Blake",
      "sign.role": "Project Manager",
    },
  },
  {
    key: "meridian",
    company: "Meridian Building Co",
    abn: "51 824 753 556",
    licence: { number: "CDB-U 51102", state: "VIC" },
    years: 14,
    price: 685000,
    weeks: 34,
    validity: 30,
    pitch: "Meridian Building Co builds considered homes across Melbourne's inner north. Fixed teams, honest programmes.",
    answers: {
      "sign.signatory": "Sam Wheeler",
      "creds.experience_type": "21_50",
      "creds.largest_value": "1m_2m",
      "creds.whs": "documented",
      "creds.qa": ["itp", "supervisor"],
      "comment.approach":
        "We build one job at a time in this pocket of Melbourne, so your project has our full attention from set-out to handover.",
    },
  },
  {
    key: "brightwater",
    company: "Brightwater Homes",
    abn: "44 610 991 208",
    licence: { number: "CDB-U 22540", state: "VIC" },
    years: 22,
    price: 728000,
    weeks: 30,
    validity: 60,
    pitch: "Brightwater Homes delivers premium custom residential builds with an in-house trade base and a fixed-price guarantee.",
    answers: {
      "price.total": 728000,
      "price.validity": 60,
      "programme.duration": 30,
      "price.margin": 20,
      "contract.form": "mba",
      "contract.defects_liability": "24",
      // strong credentials
      "creds.supervisor_role": "dedicated_supervisor",
      "creds.supervisor": "Priya Nair, registration DB-U 41022",
      "team.supervisor_load": "1_2",
      "team.contact": "director",
      "creds.experience_type": "50_plus",
      "creds.largest_value": "5m_plus",
      "creds.references": [
        { name: "T. Fenwick", project: "New build, Ivanhoe", year: "2025", contact: "0400 777 222", link: "" },
        { name: "H. Zhao", project: "Full renovation, Kew", year: "2024", contact: "0400 777 333", link: "" },
        { name: "P. Marchetti", project: "New build, Fitzroy", year: "2023", contact: "0400 777 444", link: "" },
      ],
      "programme.concurrent": "0_2",
      "team.in_house": ["carpentry", "concreting", "bricklaying"],
      "team.crew_tenure": "3_plus",
      "creds.whs": "certified",
      "creds.qa": ["independent", "itp"],
      "creds.memberships": ["hia", "mba"],
      "site.service_connections": ["power", "water", "sewer", "stormwater", "gas", "nbn"],
      // fully fixed, LDs, an alternative
      "programme.weather_days": 15,
      "programme.liquidated_damages": true,
      "programme.ld_amount": 2500,
      "commercial.alternatives": true,
      "commercial.alternative_items": [
        {
          description: "Upgrade to double glazing throughout",
          note: "+$14,000, no impact on the programme",
        },
      ],
      // rich commentary — the differentiator
      "comment.approach":
        "Your build runs with a dedicated supervisor and our own carpentry, concreting and bricklaying crews, so quality and programme stay under one roof from slab to handover.",
      "comment.value_engineering": [
        { suggestion: "Reconfigure the slab set-down to remove a day of formwork", saving: 3500 },
        { suggestion: "Standardise window sizing across the rear elevation", saving: 2200 },
      ],
      "comment.recommendations": [
        { area: "Roof", recommendation: "Colorbond over tile for the span — lighter structure, longer life." },
      ],
      "comment.risk_advice": [
        { risk: "Laneway access", handling: "We stage deliveries early morning to keep the crossover clear." },
      ],
      "sign.signatory": "Priya Nair",
    },
  },
];

export function buildPersonaAnswers(p: SamplePersona): Answers {
  const merged: Answers = { ...base, ...p.answers };
  for (const k of p.drop ?? []) delete merged[k];
  return merged;
}

/** Every required v2 question must be complete, or seeding refuses. */
export function findPersonaGaps(p: SamplePersona): string[] {
  const answers = buildPersonaAnswers(p);
  const map = new Map<string, unknown>(Object.entries(answers));
  const required = requiredQuestionIds(map, 2);
  const missing: string[] = [];
  for (const id of required) {
    const q = getQuestion(id);
    if (!q || !isAnswerComplete(q, answers[id])) missing.push(id);
  }
  return missing;
}

export type { Answers as SampleAnswers };
