package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * Owner tender review payloads — mirror /api/mobile/projects/{slug}/tenders,
 * /tenders/{id}/owner, /tenders/{id}/decision. The rich MobileOwnerTenderDetail
 * (with cost lines + completeness) is shared across all three.
 */

@Serializable
data class OwnerTenderBuilderDto(
    val id: String = "",
    val displayName: String = "Builder",
    val initials: String = "",
    val companyName: String? = null,
    val slug: String? = null,
    val state: String? = null,
    val yearsInOperation: Int? = null,
    val abnVerified: Boolean = false,
    val anyLicenceVerified: Boolean = false,
    val awardedCount: Int = 0,
)

@Serializable
data class TenderCompletenessDto(
    val score: Double = 0.0,
    val filled: Int = 0,
    val total: Int = 8,
    val missing: List<String> = emptyList(),
)

@Serializable
data class OwnerCostLineDto(
    val id: String = "",
    val trade: String = "",
    val label: String? = null,
    val amountAud: Int = 0,
    val sortOrder: Int = 0,
)

@Serializable
data class OwnerTenderDetailDto(
    val id: String,
    val status: String = "",
    val totalPriceAud: Int? = null,
    val durationWeeks: Int? = null,
    val validityDays: Int? = null,
    val proposedStartMonth: String? = null,
    val exclusions: List<String>? = null,
    val conditions: String? = null,
    val pitch: String? = null,
    val submittedAtIso: String? = null,
    val decidedAtIso: String? = null,
    val documentCount: Int = 0,
    val builder: OwnerTenderBuilderDto = OwnerTenderBuilderDto(),
    val completeness: TenderCompletenessDto = TenderCompletenessDto(),
    val costLines: List<OwnerCostLineDto> = emptyList(),
)

@Serializable
data class PriceStatBlockDto(
    val min: Int? = null,
    val median: Int? = null,
    val max: Int? = null,
    val spread: Double? = null,
)

@Serializable
data class DurationStatBlockDto(
    val min: Int? = null,
    val median: Int? = null,
    val max: Int? = null,
)

@Serializable
data class TenderAnalyticsDto(
    val count: Int = 0,
    val uniqueBuilders: Int = 0,
    val price: PriceStatBlockDto = PriceStatBlockDto(),
    val duration: DurationStatBlockDto = DurationStatBlockDto(),
    val daysLive: Int? = null,
    val daysSinceLatest: Int? = null,
    val verifiedRatio: Double = 0.0,
)

@Serializable
data class CompareProjectDto(
    val type: String = "",
    val buildSizeBand: String? = null,
    val budgetBand: String? = null,
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
)

@Serializable
data class TenderCompareDto(
    val projectId: String = "",
    val projectTitle: String = "",
    val project: CompareProjectDto = CompareProjectDto(),
    val analytics: TenderAnalyticsDto = TenderAnalyticsDto(),
    val tenders: List<OwnerTenderDetailDto> = emptyList(),
)

// ── Decision ────────────────────────────────────────────────────────

@Serializable
data class DecisionRequest(
    val action: String, // shortlist | award | reject | reopen
    val rejectOthers: Boolean? = null,
)

@Serializable
data class DecisionResponse(
    val tender: OwnerTenderDetailDto,
    val rejectedIds: List<String> = emptyList(),
    val rejectedFailedIds: List<String> = emptyList(),
)

@Serializable
data class OwnerTenderResponse(val tender: OwnerTenderDetailDto)
