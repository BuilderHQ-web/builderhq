package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * Lean slice of GET /api/mobile/dashboard/builder — only the Founding Builder
 * Access block the marketplace header renders. Unknown keys (stats, tenders,
 * suggested, …) are ignored by the tolerant JSON config.
 */

@Serializable
data class FoundingAccessDto(
    val active: Boolean = false,
    val remainingThisCycle: Int = 0,
    val monthlyQuota: Int = 0,
    val totalSavedAud: Int = 0,
    val reason: String? = null,
)

@Serializable
data class BuilderVerificationDto(
    val abnVerified: Boolean = false,
    val anyLicenceVerified: Boolean = false,
)

@Serializable
data class BuilderProfileDto(
    val approvalStatus: String? = null,
    val companyName: String? = null,
)

@Serializable
data class BuilderDashboardDto(
    val fba: FoundingAccessDto = FoundingAccessDto(),
    val verification: BuilderVerificationDto = BuilderVerificationDto(),
    val profile: BuilderProfileDto = BuilderProfileDto(),
)
