#!/usr/bin/env node
/**
 * Re-skin the four launch-test projects with legit Melbourne addresses,
 * suburb-specific titles, and substantive descriptions. Keeps the
 * existing dimensional fields (bedrooms/bathrooms/floors/dwelling_count/
 * budget_band) since those drive UI cards and were set deliberately.
 *
 * Slugs are regenerated from the new title — slug has a UNIQUE index,
 * so the four new slugs must not collide. Each new suburb is distinct
 * so this is fine.
 *
 * Idempotent because we look up the target by stable id, not by the
 * existing title. Re-running with the same values is a no-op.
 *
 * Run:
 *   node --env-file=.env.local scripts/refresh-project-details.mjs --apply
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;
console.log(`\n${DRY ? "── DRY RUN ──" : "── APPLY ──"}\n`);

const UPDATES = [
  {
    id: "961b0727-d391-4b96-ae16-53397751cbfb", // was "Single Dwelling" — Essendon
    title: "Single dwelling · Camberwell, VIC",
    slug: "single-dwelling-camberwell-vic",
    address_line1: "9 Stanhope Grove",
    suburb: "Camberwell",
    state: "VIC",
    postcode: "3124",
    description:
      "Architect-designed two-storey family home on a 720m² north-facing block in Camberwell. Brief includes 5 bedrooms (master with WIR + ensuite), 3 bathrooms, formal lounge, open-plan kitchen/family/dining, study, butler's pantry, and a 4-car basement garage with internal lift. Full working drawings + structural engineering complete. Looking for a fixed-price tender against the documented set. Programme: 14–16 month build, target slab pour Q4 2026. Owner has previously built one custom home and is design-literate.",
  },
  {
    id: "4af9a5f4-76f2-4c90-8b39-cb2baab1341a", // was "Wheeler Property" — Pascoe Vale South
    title: "Multi-dwelling · Hawthorn, VIC",
    slug: "multi-dwelling-hawthorn-vic",
    address_line1: "28 Glenferrie Road",
    suburb: "Hawthorn",
    state: "VIC",
    postcode: "3122",
    description:
      "Two side-by-side luxury townhouses on a 920m² Hawthorn corner allotment, walking distance to Glenferrie Road shops + the 16 tram. Combined brief: 5 bed / 4 bath across both dwellings, each with single basement garage, lift, and rooftop terrace. Finishes specified: stone benchtops, herringbone European oak, custom joinery throughout, integrated Sub-Zero / Wolf appliances. Planning permit issued; engineering + BCA assessment complete. Sequenced build expected — concurrent slab + fitout to compress programme to ~18 months.",
  },
  {
    id: "61dc4e98-0f42-4ea6-bb9c-d5957b61f6b6", // was "Renovation" — Essendon
    title: "Renovation · Brighton, VIC",
    slug: "renovation-brighton-vic",
    address_line1: "47 Roslyn Street",
    suburb: "Brighton",
    state: "VIC",
    postcode: "3186",
    description:
      "Period weatherboard renovation + rear extension on a Brighton heritage-overlay block. Front 1920s façade fully restored — original leadlights, plaster cornices, and Baltic pine flooring retained. Rear extension opens to a new open-plan kitchen/dining/living with a raked ceiling, exposed Tasmanian oak beams, and bifold doors to a north-facing deck + pool. Architectural drawings + structural engineering complete; heritage consent obtained. 9–11 month programme, owner is happy to relocate during the build.",
  },
  {
    id: "7ad62d7f-1ab9-4a46-9e42-dd9221f006f8", // was "Barrymore House" — Greenvale
    title: "Single dwelling · Glen Iris, VIC",
    slug: "single-dwelling-glen-iris-vic",
    address_line1: "14 Cherry Lane",
    suburb: "Glen Iris",
    state: "VIC",
    postcode: "3146",
    description:
      "New 4-bedroom contemporary family home on a 580m² Glen Iris block, walking distance to Gardiner station and Malvern Central. Two-storey design with master + ensuite + WIR upstairs, three further bedrooms, and a downstairs guest suite. Double-glazed Velfac windows throughout, hydronic in-slab heating, and a north-facing landscaped courtyard. Working drawings + soil report + structural ready for tender. Targeting a 12-month build, slab pour Q4 2026.",
  },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  for (const u of UPDATES) {
    const before = await c.query(
      `SELECT title, suburb, state, postcode FROM projects WHERE id = $1`,
      [u.id],
    );
    if (before.rows.length === 0) {
      console.log(`  [skip · not found] ${u.id}`);
      continue;
    }
    const old = before.rows[0];
    console.log(
      `  [${DRY ? "would" : "did"}] ${old.title} → ${u.title}`,
    );
    console.log(
      `         ${old.suburb}, ${old.state} ${old.postcode}  →  ${u.suburb}, ${u.state} ${u.postcode}`,
    );

    if (DRY) continue;

    await c.query(
      `UPDATE projects
          SET title          = $2,
              slug           = $3,
              address_line1  = $4,
              suburb         = $5,
              state          = $6::australian_state,
              postcode       = $7,
              description    = $8,
              updated_at     = now()
        WHERE id = $1`,
      [
        u.id,
        u.title,
        u.slug,
        u.address_line1,
        u.suburb,
        u.state,
        u.postcode,
        u.description,
      ],
    );
  }
  console.log(`\n${DRY ? "Dry run done — re-run with --apply." : "All 4 projects updated."}`);
} finally {
  c.release();
  await pool.end();
}
