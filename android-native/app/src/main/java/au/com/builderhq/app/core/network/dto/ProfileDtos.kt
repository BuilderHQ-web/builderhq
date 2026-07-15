package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * DTOs for the builder profile + onboarding wizard, mirroring
 * the /api/mobile/profile endpoints 1:1. Tolerant JSON ignores extra keys.
 */

@Serializable
data class BuilderBundleDto(
    val profile: BuilderProfileFullDto? = null,
    val licences: List<BuilderLicenceDto> = emptyList(),
    val serviceAreas: List<BuilderServiceAreaDto> = emptyList(),
    val categories: List<BuilderCategoryRowDto> = emptyList(),
    val lockState: BuilderLockStateDto = BuilderLockStateDto(),
    val phone: String? = null,
)

@Serializable
data class BuilderProfileFullDto(
    val companyName: String? = null,
    val tradingName: String? = null,
    val abn: String? = null,
    val acn: String? = null,
    val businessAddressLine1: String? = null,
    val businessSuburb: String? = null,
    val businessState: String? = null,
    val businessPostcode: String? = null,
    val hasDifferentPostal: Boolean = false,
    val postalAddressLine1: String? = null,
    val postalSuburb: String? = null,
    val postalState: String? = null,
    val postalPostcode: String? = null,
    val bio: String? = null,
    val website: String? = null,
    val linkedinUrl: String? = null,
    val instagramUrl: String? = null,
    val yearsInOperation: Int? = null,
    val slug: String? = null,
    val approvalStatus: String? = null,
)

/** `abn == true` → ABN + legal entity name are verified-locked. */
@Serializable
data class BuilderLockStateDto(
    val abn: Boolean = false,
    val licences: Map<String, Boolean> = emptyMap(),
)

@Serializable
data class BuilderCategoryRowDto(val category: String = "")

@Serializable
data class BuilderServiceAreaDto(
    val id: String? = null,
    val state: String = "",
    val suburb: String? = null,
    val postcode: String? = null,
    val radiusKm: Int = 25,
)

@Serializable
data class BuilderLicenceDto(
    val id: String = "",
    val state: String = "",
    val licenceType: String = "",
    val licenceNumber: String = "",
    val licenceHolderName: String? = null,
    val issuedAt: String? = null,
    val expiresAt: String? = null,
    val verificationStatus: String? = null,
)

@Serializable
data class BuilderPatchResponse(val profile: BuilderProfileFullDto? = null)

// ── ABN verification ─────────────────────────────────────────────────

@Serializable
data class AbnVerifyRequest(val abn: String)

/**
 * status: "verified" | "inactive" | "not_found" | "error".
 * On verified the server has already applied [autofill] to the profile.
 */
@Serializable
data class AbnVerifyDto(
    val status: String = "error",
    val matchedName: String? = null,
    val reason: String? = null,
    val autofill: AbrAutofillDto? = null,
    val applied: Boolean = false,
)

@Serializable
data class AbrAutofillDto(
    val legalEntityName: String? = null,
    val acn: String? = null,
    val state: String? = null,
    val postcode: String? = null,
)

// ── replace-all sets ─────────────────────────────────────────────────

@Serializable
data class BuilderCategoriesRequest(val categories: List<String>)

@Serializable
data class BuilderServiceAreasRequest(val areas: List<ServiceAreaPayload>)

@Serializable
data class ServiceAreaPayload(
    val state: String,
    val suburb: String? = null,
    val postcode: String? = null,
    val radiusKm: Int,
)

// ── licences ─────────────────────────────────────────────────────────

@Serializable
data class AddLicenceRequest(
    val state: String,
    val licenceType: String,
    val licenceNumber: String,
    val licenceHolderName: String? = null,
    /** ISO-8601 date strings. */
    val issuedAt: String? = null,
    val expiresAt: String? = null,
)

@Serializable
data class AddLicenceResponse(
    val licence: BuilderLicenceDto,
    val verification: LicenceVerificationDto? = null,
)

/** status: verified | inactive | not_found | mismatch | manual_review | error */
@Serializable
data class LicenceVerificationDto(
    val status: String? = null,
    val reason: String? = null,
)

// ── submit ───────────────────────────────────────────────────────────

/** Auto-approved iff ABN verified AND ≥1 licence verified; else pending. */
@Serializable
data class BuilderSubmitResponse(
    val ok: Boolean = true,
    val approved: Boolean = false,
    val reasons: List<String> = emptyList(),
    val user: UserDto,
)

@Serializable
data class ProfileOkResponse(val ok: Boolean = true)
