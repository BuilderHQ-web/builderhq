package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * GET /api/mobile/dashboard/builder — the full bundle the builder home
 * renders: hero state (verification/FBA), pulse stats, tender pipeline,
 * suggested + recently-unlocked project rows, and the activity feed.
 * Tolerant JSON ignores keys we don't model (e.g. `user`).
 */

@Serializable
data class FoundingAccessDto(
    val active: Boolean = false,
    val remainingThisCycle: Int = 0,
    val monthlyQuota: Int = 0,
    val totalSavedAud: Int = 0,
    val daysToRefresh: Int = 0,
    val daysToGrantEnd: Int = 0,
    val cycleIndex: Int = 0,
    val totalCycles: Int = 0,
    val reason: String? = null,
)

@Serializable
data class BuilderVerificationDto(
    val abnVerified: Boolean = false,
    val anyLicenceVerified: Boolean = false,
    val reasons: List<String> = emptyList(),
)

@Serializable
data class BuilderProfileDto(
    val hasProfile: Boolean = false,
    val approvalStatus: String? = null,
    val companyName: String? = null,
    val tradingName: String? = null,
    val serviceAreas: List<ServiceAreaBriefDto> = emptyList(),
)

@Serializable
data class ServiceAreaBriefDto(
    val state: String = "",
    val suburb: String? = null,
    val statewide: Boolean = false,
)

@Serializable
data class BuilderStatsDto(
    val activeTenders: Int = 0,
    val unlockedProjects: Int = 0,
    val savedProjects: Int = 0,
    val suggestedCount: Int = 0,
)

/** Project preview row — shared by the suggested feed + pickup lane. */
@Serializable
data class BuilderProjectRowDto(
    val id: String = "",
    val slug: String = "",
    val title: String = "",
    val status: String = "",
    val type: String? = null,
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val budgetBand: String? = null,
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
    val unlockedCount: Int = 0,
    val publishedAt: String? = null,
)

@Serializable
data class BuilderTenderRowDto(
    val id: String = "",
    val projectId: String = "",
    val projectSlug: String = "",
    val projectTitle: String = "",
    val status: String = "",
    val totalPriceAud: Int? = null,
    val durationWeeks: Int? = null,
    val submittedAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class ActivityRowDto(
    val id: String = "",
    val kind: String = "",
    val title: String = "",
    val body: String? = null,
    val actionUrl: String? = null,
    val readAt: String? = null,
    val createdAt: String? = null,
)

@Serializable
data class BuilderDashboardDto(
    val fba: FoundingAccessDto = FoundingAccessDto(),
    val verification: BuilderVerificationDto = BuilderVerificationDto(),
    val profile: BuilderProfileDto = BuilderProfileDto(),
    val stats: BuilderStatsDto = BuilderStatsDto(),
    val suggested: List<BuilderProjectRowDto> = emptyList(),
    val unlocked: List<BuilderProjectRowDto> = emptyList(),
    val myTenders: List<BuilderTenderRowDto> = emptyList(),
    val activity: List<ActivityRowDto> = emptyList(),
)
