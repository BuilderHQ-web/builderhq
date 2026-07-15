package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class TenderCostLineDto(
    val id: String? = null,
    val trade: String,
    val label: String? = null,
    val amountAud: Long = 0,
    val sortOrder: Int = 0,
)

@Serializable
data class TenderReadinessDto(
    val canSubmit: Boolean = false,
    val missing: List<String> = emptyList(),
    val variance: Long? = null,
)

/** Mirrors MobileTenderPayload — returned by every tender endpoint. */
@Serializable
data class TenderPayloadDto(
    val id: String,
    val projectId: String = "",
    val builderId: String = "",
    val status: String = "draft",
    val totalPriceAud: Long? = null,
    val durationWeeks: Int? = null,
    val validityDays: Int? = null,
    val proposedStartMonth: String? = null,
    val exclusions: List<String>? = null,
    val conditions: String? = null,
    val pitch: String? = null,
    val costLines: List<TenderCostLineDto> = emptyList(),
    val readiness: TenderReadinessDto = TenderReadinessDto(),
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val submittedAt: String? = null,
)

/** Autosave patch — every field optional; nulls are omitted by the
 *  serializer (explicitNulls=false) so omitted == "no change". */
@Serializable
data class TenderPatchRequest(
    val totalPriceAud: Long? = null,
    val durationWeeks: Int? = null,
    val validityDays: Int? = null,
    val proposedStartMonth: String? = null,
    val exclusions: List<String>? = null,
    val conditions: String? = null,
    val pitch: String? = null,
)

@Serializable
data class CostLineInput(
    val trade: String,
    val amountAud: Long,
    val label: String? = null,
)

@Serializable
data class CostLinesRequest(val lines: List<CostLineInput>)
