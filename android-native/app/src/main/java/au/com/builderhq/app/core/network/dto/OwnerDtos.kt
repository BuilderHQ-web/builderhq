package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * Owner-facing payloads — mirror /api/mobile/dashboard/owner, /projects,
 * /projects/mine, /projects/{slug} (owner mode), /publish, /extract,
 * /documents, /postcodes 1:1. Tolerant JSON ignores extra keys.
 */

// ── Dashboard ───────────────────────────────────────────────────────

@Serializable
data class OwnerStatsDto(
    val activeProjects: Int = 0,
    val draftProjects: Int = 0,
    val totalTenders: Int = 0,
    val unreadMessages: Int = 0,
)

@Serializable
data class OwnerProjectStatsDto(
    val unlockCount: Int = 0,
    val tenderCount: Int = 0,
    val unreadMessages: Int = 0,
)

@Serializable
data class OwnerProjectRowDto(
    val id: String,
    val slug: String,
    val title: String = "",
    val status: String = "draft",
    val type: String = "",
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val publishedAt: String? = null,
    val createdAt: String? = null,
    val stats: OwnerProjectStatsDto = OwnerProjectStatsDto(),
)

@Serializable
data class OwnerActivityDto(
    val id: String,
    val kind: String = "",
    val title: String = "",
    val body: String? = null,
    val actionUrl: String? = null,
    val readAt: String? = null,
    val createdAt: String? = null,
)

@Serializable
data class OwnerDashboardDto(
    val stats: OwnerStatsDto = OwnerStatsDto(),
    val projects: List<OwnerProjectRowDto> = emptyList(),
    val activity: List<OwnerActivityDto> = emptyList(),
)

@Serializable
data class OwnerProjectsResponse(
    val items: List<OwnerProjectRowDto> = emptyList(),
)

// ── Owner project detail (mode == "owner") ──────────────────────────

@Serializable
data class OwnerProjectTenderRowDto(
    val id: String,
    val status: String = "",
    val totalPriceAud: Int? = null,
    val durationWeeks: Int? = null,
    val proposedStartMonth: String? = null,
    val submittedAt: String? = null,
    val builder: OwnerTenderBuilderCompactDto = OwnerTenderBuilderCompactDto(),
)

@Serializable
data class OwnerTenderBuilderCompactDto(
    val id: String = "",
    val displayName: String = "Builder",
    val company: String? = null,
    val state: String? = null,
    val yearsInOperation: Int? = null,
)

@Serializable
data class OwnerConversationRowDto(
    val id: String,
    val builderId: String = "",
    val builderName: String = "",
    val lastMessageAt: String? = null,
    val lastMessagePreview: String? = null,
    val unreadCount: Int = 0,
)

@Serializable
data class OwnerProjectDetailDto(
    val mode: String = "owner",
    val project: ProjectFieldsDto,
    val stats: OwnerProjectStatsDto = OwnerProjectStatsDto(),
    val documents: List<ProjectDocumentDto> = emptyList(),
    val tenders: List<OwnerProjectTenderRowDto> = emptyList(),
    val conversations: List<OwnerConversationRowDto> = emptyList(),
    val showsFullAddress: Boolean = true,
)

// ── Create / patch / publish ────────────────────────────────────────

/** Lean project shape returned by create / patch / publish writes. */
@Serializable
data class LeanProjectDto(
    val id: String,
    val slug: String,
    val title: String = "",
    val type: String = "",
    val status: String = "draft",
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val publishedAt: String? = null,
)

/** All fields optional except [type] on create. Reused (minus type) for
 *  patch + publish bodies; null fields are omitted by the JSON config. */
@Serializable
data class ProjectWriteRequest(
    val type: String? = null,
    val title: String? = null,
    val description: String? = null,
    val addressLine1: String? = null,
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
    val floors: Int? = null,
    val landSizeBand: String? = null,
    val buildSizeBand: String? = null,
    val dwellingCount: Int? = null,
    val existingAgeBand: String? = null,
    val extensionType: String? = null,
    val extensionSizeBand: String? = null,
    val budgetBand: String? = null,
    val targetStartMonth: String? = null,
    val targetCompletionMonth: String? = null,
    val renovationScopeTags: List<String>? = null,
)

@Serializable
data class CreateProjectResponse(val project: LeanProjectDto)

@Serializable
data class PublishResponse(
    val project: LeanProjectDto,
    val savedAsDraft: Boolean = false,
    val missing: List<String> = emptyList(),
    val reasons: List<String> = emptyList(),
)

@Serializable
data class DeleteProjectResponse(val deleted: DeletedDto = DeletedDto()) {
    @Serializable data class DeletedDto(val id: String = "")
}

// ── AI extraction ───────────────────────────────────────────────────

@Serializable
data class ProjectSuggestionsDto(
    val type: String? = null,
    val title: String? = null,
    val description: String? = null,
    val addressLine1: String? = null,
    val suburb: String? = null,
    val state: String? = null,
    val postcode: String? = null,
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
    val floors: Int? = null,
    val landSizeBand: String? = null,
    val buildSizeBand: String? = null,
    val dwellingCount: Int? = null,
    val renovationScopeTags: List<String> = emptyList(),
    val existingAgeBand: String? = null,
    val extensionType: String? = null,
    val extensionSizeBand: String? = null,
    val budgetBand: String? = null,
    val targetStartMonth: String? = null,
    val targetCompletionMonth: String? = null,
    val warnings: List<String> = emptyList(),
)

@Serializable
data class ExtractResponse(val suggestions: ProjectSuggestionsDto = ProjectSuggestionsDto())

// ── Document upload (two-phase: init → PUT to R2 → complete) ─────────

@Serializable
data class InitDocRequest(
    val projectId: String,
    val category: String,
    val filename: String,
    val contentType: String,
    val sizeBytes: Long,
    val mode: String = "init",
)

@Serializable
data class InitDocResponse(
    val documentId: String,
    val uploadUrl: String,
    val uploadHeaders: Map<String, String> = emptyMap(),
)

@Serializable
data class CompleteDocRequest(
    val projectId: String,
    val documentId: String,
    val mode: String = "complete",
)

@Serializable
data class CompleteDocResponse(val document: ProjectDocumentDto)

@Serializable
data class DeleteDocRequest(
    val projectId: String,
    val documentId: String,
    val mode: String = "delete",
)

// ── Postcode lookup ─────────────────────────────────────────────────

@Serializable
data class SuburbDto(val suburb: String = "", val state: String = "")

@Serializable
data class PostcodeResponse(
    val postcode: String = "",
    val suburbs: List<SuburbDto> = emptyList(),
)
