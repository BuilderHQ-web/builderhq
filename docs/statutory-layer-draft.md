```json
{
  "jurisdiction": "VIC",
  "building_classes": ["1a", "1b"],
  "code_edition": "NCC 2022 as adopted in Victoria (incl. 1 May 2024 commencement of 7-star energy and Livable Housing; Building Regulations 2018; Plumbing Regulations 2018)",
  "rule_intent": "Items in statutory_items must NEVER be raised as design gaps when drawings are silent; they are builder scope by law. Items in assumed_statutory_but_discretionary must NEVER be auto-inserted as legal requirements.",
  "statutory_items": [
    {
      "id": "smoke-alarms",
      "item": "Hardwired photoelectric smoke alarms with battery backup on every storey and in corridors/areas serving bedrooms; interconnected where more than one alarm",
      "legal_basis": "NCC H3D6 / Housing Provisions Part 9.5; AS 3786",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Certified trade item (electrician) closed by Certificate of Electrical Safety; builder carries as lump-sum regardless of drawing silence"
    },
    {
      "id": "class-1b-alarm-and-lighting",
      "item": "Class 1b: smoke alarms in every bedroom plus evacuation lighting activated by the alarms",
      "legal_basis": "Housing Provisions Part 9.5 (class 1b provisions)",
      "applies": "CONDITIONALLY",
      "condition": "Building is class 1b (short-stay/boarding use)",
      "tender_treatment": "Certified trade item (electrician, CoES)"
    },
    {
      "id": "rcd-protection",
      "item": "30mA RCD protection on all final subcircuits; switchboard, earthing and wiring to AS/NZS 3000:2018",
      "legal_basis": "AS/NZS 3000:2018 cl 2.6; Electricity Safety Act 1998 (Vic)",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Certified trade item; Certificate of Electrical Safety is the compliance evidence, not a drawing"
    },
    {
      "id": "wet-area-waterproofing",
      "item": "Waterproofing of showers (floor + walls to 1800mm), water stops/hobs, waterproof or water-resistant surfaces to baths, laundries, WCs",
      "legal_basis": "NCC H4D2 / Housing Provisions Part 10.2; AS 3740",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder lump-sum; most Victorian surveyors require a waterproofing certificate from the applicator before fixing inspection"
    },
    {
      "id": "heated-water-tempering",
      "item": "Heated water delivered to sanitary fixtures used for personal hygiene limited to 50 deg C (tempering valve/TMV)",
      "legal_basis": "AS/NZS 3500.4; Plumbing Regulations 2018 (Vic)",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Certified trade item within plumbing compliance certificate"
    },
    {
      "id": "plumbing-compliance-certificates",
      "item": "VBA plumbing compliance certificates for all certifiable plumbing work (water, sanitary, drainage, gasfitting, roofing/stormwater)",
      "legal_basis": "Building Act 1993 Pt 12A; Plumbing Regulations 2018 (Vic)",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Certified trade item; cost of certification sits inside the plumbing trade price"
    },
    {
      "id": "safety-glazing",
      "item": "Grade A safety glass in human-impact zones: glazed doors and side panels, low-level glazing, bathrooms/ensuites; windows to AS 2047",
      "legal_basis": "AS 1288; AS 2047; NCC H1D8 family",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder lump-sum via window/glazing supplier; no elevation markup needed for it to be owed"
    },
    {
      "id": "window-fall-prevention",
      "item": "Openable bedroom windows with sill below 1.7m and fall over 2m: opening restricted to 125mm or fitted with a compliant screen/device",
      "legal_basis": "Housing Provisions Part 11.3 (H5D3)",
      "applies": "CONDITIONALLY",
      "condition": "Two-storey or raised-floor bedrooms meeting the sill-height/fall geometry",
      "tender_treatment": "Builder lump-sum (window hardware line)"
    },
    {
      "id": "barriers-balustrades",
      "item": "Barriers min 1m high wherever fall exceeds 1m; openings under 125mm; no climbable horizontal elements 150-760mm above floor where fall exceeds 4m",
      "legal_basis": "Housing Provisions Part 11.3 (H5D3)",
      "applies": "CONDITIONALLY",
      "condition": "Any trafficable surface (deck, landing, stair, void) with >1m fall",
      "tender_treatment": "Builder lump-sum; geometry compliance is builder risk even where drawings show a non-compliant balustrade"
    },
    {
      "id": "stair-geometry-handrails",
      "item": "Stair geometry (riser 115-190, going 240-355, 2R+G 550-700, uniform flights), slip resistance to AS 4586, handrail to at least one side where change in level exceeds 1m",
      "legal_basis": "Housing Provisions Part 11.2 (H5D2); AS 4586",
      "applies": "CONDITIONALLY",
      "condition": "Any internal or external stair/level change exists",
      "tender_treatment": "Builder lump-sum; compliant geometry owed even if sections are silent"
    },
    {
      "id": "energy-7-star-whole-of-home",
      "item": "7-star NatHERS thermal performance plus Whole of Home energy budget; building must match the stamped energy report (insulation R-values, glazing U/SHGC, appliance assumptions)",
      "legal_basis": "NCC H6; Vic adoption from 1 May 2024; NatHERS",
      "applies": "ALWAYS",
      "condition": "Permit applications from 1 May 2024 (earlier permits: 6-star regime)",
      "tender_treatment": "Consultant certificate (energy assessor) + builder lump-sum obligation to construct to the report; the report overrides silent drawings"
    },
    {
      "id": "insulation-installation",
      "item": "Bulk and reflective insulation installed to the energy report and to AS 3999 (fit, gaps, clearances to downlights/flues)",
      "legal_basis": "AS 3999; NCC H6 / Housing Provisions Part 13",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder lump-sum"
    },
    {
      "id": "building-sealing",
      "item": "Building sealing: weather seals to external doors and openable windows, self-closing dampers/filters on exhausts, sealed construction joints",
      "legal_basis": "Housing Provisions Part 13.4 (H6)",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder lump-sum"
    },
    {
      "id": "exhaust-ventilation-condensation",
      "item": "Mechanical exhaust from kitchen, bathrooms, sanitary compartments and laundry discharging directly to outdoor air; min flow 25 L/s (bath/sanitary) and 40 L/s (kitchen/laundry); run-on/interlock provisions in climate zones 6-8",
      "legal_basis": "NCC H4D7 / Housing Provisions Part 10.8.2",
      "applies": "ALWAYS",
      "condition": "Effectively always in Victoria (state is climate zones 6/7/8 where exhaust is mandatory, not merely if-installed)",
      "tender_treatment": "Builder lump-sum split across electrician/plumber; ducting to outside air owed even when drawings show only a fan symbol or nothing"
    },
    {
      "id": "roof-space-ventilation",
      "item": "Roof space ventilation (eave/ridge vents to prescribed free-open areas) in climate zones 6/7/8 for applicable roof constructions",
      "legal_basis": "Housing Provisions Part 10.8.3",
      "applies": "CONDITIONALLY",
      "condition": "Climate zone 6/7/8 (all of Vic) AND roof construction/membrane vapour class triggers the requirement",
      "tender_treatment": "Builder lump-sum (roofing trade)"
    },
    {
      "id": "vapour-permeable-wall-wrap",
      "item": "Where a pliable membrane is installed in external walls it must be vapour permeable (class 3 or 4) in climate zones 6/7/8",
      "legal_basis": "Housing Provisions Part 10.8.1; AS 4200.1/4200.2",
      "applies": "CONDITIONALLY",
      "condition": "Wall wrap used (standard in lightweight construction); all of Vic is CZ 6/7/8",
      "tender_treatment": "Builder lump-sum material spec; a generic 'sarking' note on drawings does not displace the vapour-class requirement"
    },
    {
      "id": "livable-housing",
      "item": "Livable housing design: step-free path and entry (site permitting), min 820mm clear internal door openings and corridor widths on entry level, entry-level toilet, hobless (step-free) shower, reinforced walls to shower/bath/WC for future grabrails",
      "legal_basis": "NCC H8D2 / ABCB Standard for Livable Housing Design; Vic from 1 May 2024",
      "applies": "ALWAYS",
      "condition": "Permit applications from 1 May 2024; step-free entry concession for steep sites",
      "tender_treatment": "Builder lump-sum; wall reinforcement and hobless shower owed even when bathroom details are silent"
    },
    {
      "id": "footings-soil-classification",
      "item": "Footing/slab system designed to site soil classification, including 0.2mm damp-proof membrane under slabs and slab edge min 150mm above finished ground (reduced for paved/sandy sites)",
      "legal_basis": "AS 2870 / AS 2159; NCC H1D4",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Consultant certificates (geotech report + structural engineer computations, mandatory for building permit) + builder lump-sum construction"
    },
    {
      "id": "wind-classification-tiedown",
      "item": "Wind classification of the site and corresponding bracing/tie-down throughout the structure",
      "legal_basis": "AS 4055 or AS/NZS 1170; NCC H1D2 family",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Consultant certificate (engineer) + builder lump-sum; bracing/tie-down owed even where framing plans are silent"
    },
    {
      "id": "timber-framing",
      "item": "Timber framing sized, braced and tied down to AS 1684 span tables or engineered design",
      "legal_basis": "AS 1684; NCC H1D6",
      "applies": "CONDITIONALLY",
      "condition": "Timber-framed construction",
      "tender_treatment": "Builder lump-sum with engineer sign-off where outside span tables"
    },
    {
      "id": "termite-management",
      "item": "Termite management system to AS 3660.1 plus durable notice in meter box",
      "legal_basis": "AS 3660.1; NCC H1D3; Building Regulations 2018 (Vic) council designation",
      "applies": "CONDITIONALLY",
      "condition": "Lot is in a council-designated termite-prone area (much of metropolitan Melbourne is NOT designated; regional Vic often is) — check the property information certificate",
      "tender_treatment": "Certified trade item (installer certificate of installation)"
    },
    {
      "id": "bushfire-bal",
      "item": "BAL assessment and construction to the assessed level (min BAL-12.5 in a Bushfire Prone Area under the Vic variation): ember-sealed construction, screened openings, compliant materials",
      "legal_basis": "AS 3959; NCC H7D4 family; Vic Building Regulations BPA mapping",
      "applies": "CONDITIONALLY",
      "condition": "Lot in a designated Bushfire Prone Area (majority of Victorian land area) per planning certificate",
      "tender_treatment": "Consultant certificate (BAL assessment) + builder lump-sum construction upgrades"
    },
    {
      "id": "weatherproofing-envelope",
      "item": "Weatherproofing of the envelope: damp-proof courses, flashings to all openings and junctions, weepholes in masonry, roof cladding fixed to standard",
      "legal_basis": "NCC H2; AS 4773/AS 3700 (masonry), AS 1562 (sheet roofing), AS 2049/2050 (tiles)",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder lump-sum; flashings are owed at every penetration regardless of detail drawings"
    },
    {
      "id": "stormwater-lpod",
      "item": "Gutters, downpipes and stormwater drainage connected to the council-nominated legal point of discharge",
      "legal_basis": "AS/NZS 3500.3; Building Regulations 2018 (Vic) reg 133 LPOD consent",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Certified trade item (plumber) + council LPOD report/consent as a permit prerequisite; builder carries connection even when the civil drawing is absent"
    },
    {
      "id": "site-surface-drainage",
      "item": "Surface water managed away from the building: ground falls away from slab, subfloor kept drained",
      "legal_basis": "NCC H2D2 / Housing Provisions Part 7",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder lump-sum within siteworks"
    },
    {
      "id": "subfloor-ventilation",
      "item": "Subfloor ventilation openings at prescribed rates and clearances for suspended ground floors",
      "legal_basis": "NCC H2 / Housing Provisions subfloor ventilation tables",
      "applies": "CONDITIONALLY",
      "condition": "Suspended/framed ground floor construction",
      "tender_treatment": "Builder lump-sum"
    },
    {
      "id": "natural-light-ventilation",
      "item": "Habitable rooms: window area min 10% of floor area for light; openable area min 5% for ventilation (or compliant borrowed/mechanical alternatives)",
      "legal_basis": "Housing Provisions Part 10 (H4) light and ventilation",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Design compliance carried by builder under a construct-to-code obligation; a silent window schedule does not excuse shortfall"
    },
    {
      "id": "gas-installation",
      "item": "Gasfitting to AS/NZS 5601.1 with VBA compliance certificate; flued appliances and ventilation to standard",
      "legal_basis": "AS/NZS 5601.1; Gas Safety Act 1997 (Vic)",
      "applies": "CONDITIONALLY",
      "condition": "Gas present AND lawful: Vic homes requiring a planning permit lodged from 1 Jan 2024 must be all-electric (Gas Substitution Roadmap)",
      "tender_treatment": "Certified trade item"
    },
    {
      "id": "attached-dwelling-separation",
      "item": "Walls separating attached class 1 dwellings (duplex/townhouse): FRL 60/60/60 carried to underside of roof covering plus airborne sound insulation (Rw not less than 45)",
      "legal_basis": "NCC H3 / Housing Provisions Parts 9.2 and 10.7",
      "applies": "CONDITIONALLY",
      "condition": "Dwellings share a separating wall",
      "tender_treatment": "Builder lump-sum with tested/deemed system; system selection is builder risk if drawings show only a wall line"
    },
    {
      "id": "pool-spa-barriers",
      "item": "Safety barrier to any pool/spa deeper than 300mm, plus Victorian registration with council and certification cycle",
      "legal_basis": "AS 1926.1; Building Regulations 2018 (Vic) Part 9A; Building Act s 218-220 registration",
      "applies": "CONDITIONALLY",
      "condition": "Pool or spa in scope",
      "tender_treatment": "Builder lump-sum + certified barrier inspection"
    },
    {
      "id": "wels-fixture-efficiency",
      "item": "Tapware, showers and toilets must be WELS-registered products, and fixture efficiencies must match any values assumed in the Whole of Home energy report",
      "legal_basis": "Water Efficiency Labelling and Standards Act 2005 (Cth) (supply-side mandate); NCC H6 Whole of Home assumptions",
      "applies": "ALWAYS",
      "condition": null,
      "tender_treatment": "Builder supply obligation inside PC/PS allowances; ratings assumed by the energy report bind the selection"
    }
  ],
  "assumed_statutory_but_discretionary": [
    {
      "id": "afdd",
      "item": "Arc-fault detection devices (AFDDs)",
      "why_assumed": "Mandatory in some overseas codes and in NZ contexts; often quoted as 'new AS 3000 requirement'",
      "actual_status": "Optional for Australian class 1a under AS/NZS 3000:2018; only RCDs are mandatory",
      "rule": "Never raise absence of AFDDs as a compliance gap"
    },
    {
      "id": "bathroom-floor-waste",
      "item": "Floor waste in class 1 bathrooms/laundries",
      "why_assumed": "Mandatory in class 2/3 sole-occupancy units, so widely believed universal",
      "actual_status": "Not required in class 1; but IF one is installed, floor falls to the waste become mandatory (AS 3740/Part 10.2)",
      "rule": "Absence is a design choice, not a gap; presence triggers the falls obligation"
    },
    {
      "id": "solar-hws-rainwater-tank",
      "item": "Solar/heat-pump hot water OR rainwater tank as a fixed mandate",
      "why_assumed": "Was a Victorian 5/6-star era requirement for over a decade",
      "actual_status": "Superseded by the Whole of Home performance budget from 1 May 2024; appliance mix is now a means, not a mandate",
      "rule": "Treat hot-water plant selection as governed by the energy report, not by a standalone statutory line"
    },
    {
      "id": "solar-pv-ev",
      "item": "Rooftop PV and EV-charging provision",
      "why_assumed": "EV-ready requirements exist for class 2; PV frequently appears in energy reports",
      "actual_status": "Not mandated for class 1; PV only binds if the stamped Whole of Home report relies on it",
      "rule": "Statutory only via the energy report pathway actually certified"
    },
    {
      "id": "double-glazing",
      "item": "Double glazing",
      "why_assumed": "Near-universal in 7-star CZ6 designs, so read as a code minimum",
      "actual_status": "No NCC clause mandates it; only the envelope performance in the NatHERS certificate binds",
      "rule": "Bind to the glazing U/SHGC values in the energy report, not to 'double glazing' as such"
    },
    {
      "id": "sprinklers",
      "item": "Residential fire sprinklers",
      "why_assumed": "Class 2/3 low-rise sprinkler requirements bleed into assumptions",
      "actual_status": "Not required for class 1a; class 1b below its thresholds also exempt",
      "rule": "Never insert for class 1a"
    },
    {
      "id": "low-fall-barriers",
      "item": "Balustrades to decks/landings with fall of 1m or less",
      "why_assumed": "Safety intuition; some councils' brochures overstate",
      "actual_status": "Barrier obligation begins above 1m fall; below that it is discretionary",
      "rule": "Only trigger the barrier item when fall geometry exceeds 1m"
    },
    {
      "id": "termite-statewide",
      "item": "Termite management everywhere in Victoria",
      "why_assumed": "Statutory in QLD/NSW broadly, so builders assume it travels",
      "actual_status": "In Vic only within council-designated areas; many metro Melbourne municipalities are not designated",
      "rule": "Condition on the property information certificate, never default-on"
    },
    {
      "id": "screens-gutter-guard",
      "item": "Insect screens and gutter guard",
      "why_assumed": "Standard inclusions read as code items",
      "actual_status": "Discretionary, EXCEPT ember-protection screening/guards required by AS 3959 in BAL-rated construction",
      "rule": "Statutory only under the bushfire item's condition"
    },
    {
      "id": "full-accessibility",
      "item": "Grabrails, AS 1428 circulation, ramps at 1:14",
      "why_assumed": "Conflated with the new livable housing standard",
      "actual_status": "Only the ABCB Livable Housing minimums apply (reinforcement for FUTURE grabrails, not the rails; step-free entry with concessions); full AS 1428 is not mandated for class 1a",
      "rule": "Cap the statutory obligation at the LHD standard's scope"
    },
    {
      "id": "alarm-every-bedroom",
      "item": "Smoke alarm inside every bedroom (class 1a)",
      "why_assumed": "Class 1b and some interstate rental rules require it",
      "actual_status": "Class 1a needs alarms on each storey and in corridors/areas serving bedrooms, not inside each bedroom",
      "rule": "In-bedroom alarms are an upgrade for 1a; mandatory pattern differs for 1b"
    },
    {
      "id": "internal-acoustic-insulation",
      "item": "Acoustic insulation to internal walls (bedroom/bathroom) within one dwelling",
      "why_assumed": "Separating-wall sound rules misread as applying internally",
      "actual_status": "No NCC sound requirement between rooms of a single class 1 dwelling; only walls separating dwellings are regulated",
      "rule": "Internal acoustic batts are a specification item, never a code gap"
    }
  ]
}
```