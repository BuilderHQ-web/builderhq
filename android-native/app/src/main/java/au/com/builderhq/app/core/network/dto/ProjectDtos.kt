package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

// ── Marketplace browse ──────────────────────────────────────────────

@Serializable
data class ProjectRowDto(
    val id: String,
    val slug: String,
    val title: String,
    val type: String,
    val status: String = "",
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val budgetBand: String? = null,
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
    val documentCount: Int = 0,
    val unlockedCount: Int = 0,
    val unlockCap: Int = 3,
    val unlockPriceAud: Int = 0,
    val publishedAt: String? = null,
    val isSaved: Boolean = false,
    val isUnlocked: Boolean = false,
)

@Serializable
data class BrowseResponse(
    val items: List<ProjectRowDto> = emptyList(),
    val hasMore: Boolean = false,
)

// ── Project detail (tagged union on `mode`) ─────────────────────────

/** Shared project field bag. Tolerant: covers preview, unlocked_builder
 *  (adds addressLine1), and owner mode (extra fields ignored). */
@Serializable
data class ProjectFieldsDto(
    val id: String,
    val slug: String,
    val title: String,
    val status: String = "",
    val type: String = "",
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
    val floors: Int? = null,
    val dwellingCount: Int? = null,
    val landSizeBand: String? = null,
    val buildSizeBand: String? = null,
    val renovationScope: String? = null,
    val existingAgeBand: String? = null,
    val extensionType: String? = null,
    val extensionSizeBand: String? = null,
    val budgetBand: String? = null,
    val targetStartMonth: String? = null,
    val targetCompletionMonth: String? = null,
    val description: String? = null,
    val publishedAtIso: String? = null,
    val addressLine1: String? = null,
    val renovationScopeTags: List<String> = emptyList(),
)

@Serializable
data class UnlockPricingDto(
    val kind: String = "unavailable", // free | paid | unavailable
    val reason: String? = null,
    val remainingThisCycle: Int? = null,
    val priceAud: Int? = null,
)

@Serializable
data class UnlockAffordanceDto(
    val canUnlock: Boolean = false,
    val slotsRemaining: Int = 0,
    val unlockCap: Int = 3,
    val basePriceAud: Int = 0,
    val pricing: UnlockPricingDto = UnlockPricingDto(),
)

@Serializable
data class ProjectDocumentDto(
    val id: String,
    val category: String = "",
    val filename: String = "",
    val contentType: String = "",
    val sizeBytes: Long = 0,
    val version: Int = 1,
    val status: String = "active",
    val createdAt: String? = null,
)

@Serializable
data class BuilderTenderSnapshotDto(
    val id: String,
    val status: String = "",
    val totalPriceAud: Int? = null,
    val durationWeeks: Int? = null,
    val submittedAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class UnlockedOwnerDto(
    val id: String,
    val name: String = "Project owner",
    val joinedAtIso: String? = null,
    val publishedProjectCount: Int = 0,
)

@Serializable
data class ProjectDetailDto(
    val mode: String, // owner | preview | unlocked_builder
    val project: ProjectFieldsDto,
    val documentCount: Int? = null,
    val unlockedCount: Int? = null,
    val isSaved: Boolean = false,
    val unlock: UnlockAffordanceDto? = null,
    val documents: List<ProjectDocumentDto> = emptyList(),
    val myTender: BuilderTenderSnapshotDto? = null,
    val owner: UnlockedOwnerDto? = null,
    val showsFullAddress: Boolean = false,
)

// ── Action responses ────────────────────────────────────────────────

@Serializable
data class UnlockedDto(val id: String, val source: String = "", val unlockedAt: String? = null)

@Serializable
data class UnlockResponse(val ok: Boolean = false, val unlock: UnlockedDto? = null)

@Serializable
data class SaveResponse(val ok: Boolean = false, val saved: Boolean = false)

/** Short-lived presigned download URL for one unlocked document. */
@Serializable
data class DocumentDownloadDto(val url: String = "", val filename: String = "")
