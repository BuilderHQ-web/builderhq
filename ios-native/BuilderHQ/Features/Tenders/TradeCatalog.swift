/// TradeCatalog — Swift mirror of `src/modules/tenders/trades.ts`.
///
/// The 28 fixed BoQ trades + "other", with display labels, hints, and
/// canonical order — identical to the web so a cost breakdown reads
/// the same on either platform.
///
/// The server stores trades flat (canonical order only). For the
/// mobile picker we additionally group them into build **phases** so
/// 28 trades don't arrive as one overwhelming list — the builder
/// scans by phase (Site & structure → Envelope → Services → Finishes
/// → External → Other), which mirrors how a build actually sequences.

import Foundation

struct Trade: Identifiable, Equatable {
    let id: String        // canonical trade id (snake_case, matches server)
    let label: String
    let order: Int
    let hint: String?
    var name: String { label }   // Identifiable convenience
}

enum TradePhase: String, CaseIterable, Identifiable {
    case siteStructure = "Site & structure"
    case envelope = "Carpentry & envelope"
    case finishes = "Finishes & fit-out"
    case services = "Services"
    case external = "External"
    case other = "Other"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .siteStructure: return "square.stack.3d.up.fill"
        case .envelope:      return "house.fill"
        case .finishes:      return "paintbrush.fill"
        case .services:      return "bolt.fill"
        case .external:      return "tree.fill"
        case .other:         return "ellipsis.circle.fill"
        }
    }
}

enum TradeCatalog {
    /// All 28 trades + other, in canonical order (matches the server).
    static let all: [Trade] = [
        .init(id: "preliminaries", label: "Preliminaries", order: 1, hint: "Site setup, fencing, toilet hire, scaffold."),
        .init(id: "demolition", label: "Demolition", order: 2, hint: nil),
        .init(id: "ground_works", label: "Ground works", order: 3, hint: "Excavation, levelling, compaction."),
        .init(id: "concrete_work", label: "Concrete work", order: 4, hint: "Slab, footings, retaining walls."),
        .init(id: "precast_concrete", label: "Precast concrete", order: 5, hint: nil),
        .init(id: "brickwork_and_blockwork", label: "Brickwork & blockwork", order: 6, hint: nil),
        .init(id: "stonework", label: "Stonework", order: 7, hint: nil),
        .init(id: "structural_steelwork", label: "Structural steelwork", order: 8, hint: nil),
        .init(id: "metalwork", label: "Metalwork", order: 9, hint: "Balustrades, handrails, gates."),
        .init(id: "carpentry", label: "Carpentry", order: 10, hint: "Frames, trusses, flooring."),
        .init(id: "joinery", label: "Joinery", order: 11, hint: "Cabinetry, built-ins, custom timberwork."),
        .init(id: "windows_and_curtain_wall", label: "Windows & curtain wall", order: 12, hint: nil),
        .init(id: "doors", label: "Doors", order: 13, hint: nil),
        .init(id: "roofing", label: "Roofing", order: 14, hint: "Tiles or metal, gutters, downpipes."),
        .init(id: "partitions_and_ceilings", label: "Partitions & ceilings", order: 15, hint: nil),
        .init(id: "tiling", label: "Tiling", order: 16, hint: "Bathroom, kitchen, laundry, alfresco."),
        .init(id: "internal_finishes", label: "Internal finishes", order: 17, hint: "Skirting, architraves, trim."),
        .init(id: "external_finishes", label: "External finishes", order: 18, hint: "Render, cladding, paint."),
        .init(id: "glazing", label: "Glazing", order: 19, hint: nil),
        .init(id: "painting", label: "Painting", order: 20, hint: nil),
        .init(id: "special_provisions", label: "Special provisions", order: 21, hint: "Contingency or PC sums."),
        .init(id: "fixtures_and_fittings", label: "Fixtures & fittings", order: 22, hint: "Tapware, sanitaryware, hardware."),
        .init(id: "hydraulic_services", label: "Hydraulic services", order: 23, hint: "Plumbing, drainage, hot water."),
        .init(id: "mechanical_services", label: "Mechanical services", order: 24, hint: "HVAC, ventilation."),
        .init(id: "electrical_services", label: "Electrical services", order: 25, hint: "Power, lighting, data."),
        .init(id: "fire_protection_services", label: "Fire protection services", order: 26, hint: "Alarms, sprinklers, extinguishers."),
        .init(id: "external_works", label: "External works", order: 27, hint: "Driveway, paths, fencing, landscaping."),
        .init(id: "other", label: "Other", order: 28, hint: "Custom line — name it and add the amount."),
    ]

    private static let byId: [String: Trade] = Dictionary(
        uniqueKeysWithValues: all.map { ($0.id, $0) }
    )

    static func trade(_ id: String) -> Trade? { byId[id] }
    static func label(_ id: String) -> String { byId[id]?.label ?? id }
    static func order(_ id: String) -> Int { byId[id]?.order ?? 99 }

    /// Reverse lookup: which build phase a trade belongs to. Used by the
    /// owner comparison's "where the money goes" allocation.
    static func phase(_ id: String) -> TradePhase { phaseById[id] ?? .other }

    private static let phaseById: [String: TradePhase] = {
        var map: [String: TradePhase] = [:]
        for (phase, ids) in phaseMembership {
            for id in ids { map[id] = phase }
        }
        return map
    }()

    /// Trades belonging to a build phase, in canonical order.
    static func trades(in phase: TradePhase) -> [Trade] {
        let ids = phaseMembership[phase] ?? []
        return ids.compactMap { byId[$0] }
    }

    private static let phaseMembership: [TradePhase: [String]] = [
        .siteStructure: [
            "preliminaries", "demolition", "ground_works", "concrete_work",
            "precast_concrete", "brickwork_and_blockwork", "stonework",
            "structural_steelwork", "metalwork",
        ],
        .envelope: [
            "carpentry", "joinery", "windows_and_curtain_wall", "doors",
            "roofing", "partitions_and_ceilings", "glazing",
        ],
        .finishes: [
            "tiling", "internal_finishes", "external_finishes", "painting",
            "special_provisions", "fixtures_and_fittings",
        ],
        .services: [
            "hydraulic_services", "mechanical_services", "electrical_services",
            "fire_protection_services",
        ],
        .external: ["external_works"],
        .other: ["other"],
    ]
}
