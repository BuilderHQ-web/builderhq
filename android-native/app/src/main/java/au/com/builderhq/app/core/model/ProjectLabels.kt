package au.com.builderhq.app.core.model

/** Maps the backend's enum strings to human labels — mirrors the web's
 *  label tables (dispatch.ts BUDGET_LABEL, project type copy). */
object ProjectLabels {
    fun type(t: String): String = when (t) {
        "single_dwelling" -> "New home"
        "multi_dwelling" -> "Multi dwelling"
        "renovation" -> "Renovation"
        "extension" -> "Extension"
        else -> t.replace('_', ' ').replaceFirstChar { it.uppercase() }
    }

    fun budget(b: String?): String? = when (b) {
        "under_500k" -> "Under \$500k"
        "500k_1m" -> "\$500k–\$1M"
        "1m_1_5m" -> "\$1M–\$1.5M"
        "1_5m_2m" -> "\$1.5M–\$2M"
        "2m_3m" -> "\$2M–\$3M"
        "3m_5m" -> "\$3M–\$5M"
        "over_5m" -> "Over \$5M"
        else -> null
    }

    fun status(s: String): String = when (s) {
        "published", "tendering" -> "Live"
        "awarded" -> "Awarded"
        "archived" -> "Archived"
        "draft" -> "Draft"
        else -> s.replaceFirstChar { it.uppercase() }
    }

    fun location(suburb: String?, state: String?): String =
        listOfNotNull(suburb?.ifBlank { null }, state?.ifBlank { null }).joinToString(", ")

    /** Numeric m² band → "Under 200 m²" / "600–800 m²" / "Over 1,000 m²". */
    fun sizeBand(b: String?): String? {
        val v = b?.ifBlank { null } ?: return null
        fun n(s: String) = s.toLongOrNull()?.let { "%,d".format(it) } ?: s
        return when {
            v.startsWith("under_") -> "Under ${n(v.removePrefix("under_"))} m²"
            v.startsWith("over_") -> "Over ${n(v.removePrefix("over_"))} m²"
            else -> v.split("_").let { p ->
                if (p.size == 2) "${n(p[0])}–${n(p[1])} m²" else (pretty(v) ?: v)
            }
        }
    }

    /** Categorical token → readable ("ground_floor" → "Ground floor"). */
    fun pretty(s: String?): String? =
        s?.ifBlank { null }?.replace('_', ' ')?.replaceFirstChar { it.uppercase() }
}
