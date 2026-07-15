package au.com.builderhq.app.core.model

/** Client-safe trade catalogue — mirrors modules/tenders/trades.ts.
 *  28 fixed BoQ trades + "other" (which requires a label). */
data class Trade(val id: String, val label: String, val hint: String? = null)

object TradeCatalog {
    val all: List<Trade> = listOf(
        Trade("preliminaries", "Preliminaries", "Site setup, fencing, toilet hire, scaffold."),
        Trade("demolition", "Demolition"),
        Trade("ground_works", "Ground works", "Excavation, levelling, compaction."),
        Trade("concrete_work", "Concrete work", "Slab, footings, retaining walls."),
        Trade("precast_concrete", "Precast concrete"),
        Trade("brickwork_and_blockwork", "Brickwork & blockwork"),
        Trade("stonework", "Stonework"),
        Trade("structural_steelwork", "Structural steelwork"),
        Trade("metalwork", "Metalwork", "Balustrades, handrails, gates."),
        Trade("carpentry", "Carpentry", "Frames, trusses, flooring."),
        Trade("joinery", "Joinery", "Cabinetry, built-ins, custom timberwork."),
        Trade("windows_and_curtain_wall", "Windows & curtain wall"),
        Trade("doors", "Doors"),
        Trade("roofing", "Roofing", "Tiles or metal, gutters, downpipes."),
        Trade("partitions_and_ceilings", "Partitions & ceilings"),
        Trade("tiling", "Tiling", "Bathroom, kitchen, laundry, alfresco."),
        Trade("internal_finishes", "Internal finishes", "Skirting, architraves, trim."),
        Trade("external_finishes", "External finishes", "Render, cladding, paint."),
        Trade("glazing", "Glazing"),
        Trade("painting", "Painting"),
        Trade("special_provisions", "Special provisions", "Contingency or PC sums."),
        Trade("fixtures_and_fittings", "Fixtures & fittings", "Tapware, sanitaryware, hardware."),
        Trade("hydraulic_services", "Hydraulic services", "Plumbing, drainage, hot water."),
        Trade("mechanical_services", "Mechanical services", "HVAC, ventilation."),
        Trade("electrical_services", "Electrical services", "Power, lighting, data."),
        Trade("fire_protection_services", "Fire protection services", "Alarms, sprinklers, extinguishers."),
        Trade("external_works", "External works", "Driveway, paths, fencing, landscaping."),
        Trade("other", "Other", "Custom line — name it and add the amount."),
    )

    private val byId: Map<String, Trade> = all.associateBy { it.id }

    fun label(id: String): String = byId[id]?.label ?: id.replace('_', ' ').replaceFirstChar { it.uppercase() }

    fun order(id: String): Int = all.indexOfFirst { it.id == id }.let { if (it < 0) 99 else it }
}
