package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.BuilderProfileRepository
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.design.components.AuPhone
import au.com.builderhq.app.core.design.components.PostcodeSelection
import au.com.builderhq.app.core.model.User
import au.com.builderhq.app.core.model.toUser
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.AddLicenceRequest
import au.com.builderhq.app.core.network.dto.BuilderBundleDto
import au.com.builderhq.app.core.network.dto.BuilderLicenceDto
import au.com.builderhq.app.core.network.dto.ServiceAreaPayload
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

/** Wizard steps, in order. `index` renders as the "01 / Company" kicker. */
enum class WizardStep(val label: String) {
    Company("Company"),
    Address("Address"),
    Categories("Project types"),
    ServiceAreas("Service areas"),
    Licences("Licences"),
    About("About"),
    Review("Review");

    val index: String get() = "%02d".format(ordinal + 1)
}

sealed interface AbnVerifyState {
    data object Idle : AbnVerifyState
    data object Verifying : AbnVerifyState
    data class Verified(val matchedName: String) : AbnVerifyState
    data class Failed(val reason: String) : AbnVerifyState
}

/** Post-submit outcome — swaps the review step for the outcome view. */
sealed interface WizardOutcome {
    data object Approved : WizardOutcome
    data object PendingReview : WizardOutcome
}

/**
 * State machine for the 7-step builder onboarding wizard. Mirrors the
 * iOS BuilderWizardViewModel + the web wizard:
 *
 *   · hydrates from GET profile/builder and RESUMES at the lowest
 *     incomplete step
 *   · steps 1/2/6 save via partial profile patch; 3/4 are replace-all
 *     sets; licences (5) persist immediately on add/remove
 *   · submit auto-approves iff ABN verified AND ≥1 licence verified,
 *     else lands pending_review
 */
@HiltViewModel
class BuilderWizardViewModel @Inject constructor(
    private val repo: BuilderProfileRepository,
    private val session: SessionRepository,
) : ViewModel() {

    // ── navigation / meta ────────────────────────────────────────────
    var step by mutableStateOf(WizardStep.Company); private set
    var forward by mutableStateOf(true); private set
    var isHydrating by mutableStateOf(true); private set
    var bundle by mutableStateOf<BuilderBundleDto?>(null); private set
    var bannerError by mutableStateOf<String?>(null); private set
    var fieldErrors by mutableStateOf<Map<String, String>>(emptyMap()); private set
    var isSaving by mutableStateOf(false); private set
    var outcome by mutableStateOf<WizardOutcome?>(null); private set
    private var completionUser: User? = null

    // ── step 01 · company ────────────────────────────────────────────
    var abnDraft by mutableStateOf("")
    var companyNameDraft by mutableStateOf("")
    var tradingNameDraft by mutableStateOf("")
    var acnDraft by mutableStateOf("")
    var yearsDraft by mutableStateOf("")
    var phoneDraft by mutableStateOf("")
    var abnVerifyState by mutableStateOf<AbnVerifyState>(AbnVerifyState.Idle); private set
    /** "Skip for now" on a failed verify — reveals manual entry. */
    var manualMode by mutableStateOf(false); private set

    // ── step 02 · address ────────────────────────────────────────────
    var businessStreetDraft by mutableStateOf("")
    var businessSelection by mutableStateOf<PostcodeSelection?>(null)
    var hasDifferentPostal by mutableStateOf(false)
    var postalStreetDraft by mutableStateOf("")
    var postalSelection by mutableStateOf<PostcodeSelection?>(null)

    // ── step 03 · categories ─────────────────────────────────────────
    var selectedCategories by mutableStateOf<Set<String>>(emptySet())

    // ── step 04 · service areas ──────────────────────────────────────
    var draftServiceAreas by mutableStateOf<List<ServiceAreaPayload>>(emptyList())
    var areaDraftSelection by mutableStateOf<PostcodeSelection?>(null)
    var areaDraftRadiusKm by mutableStateOf(25f)

    // ── step 05 · licences ───────────────────────────────────────────
    var licences by mutableStateOf<List<BuilderLicenceDto>>(emptyList()); private set
    var licenceDraftState by mutableStateOf<String?>(null)
    var licenceDraftType by mutableStateOf("")
    var licenceDraftNumber by mutableStateOf("")
    var licenceDraftHolder by mutableStateOf("")
    /** ISO yyyy-MM-dd or null. */
    var licenceDraftIssuedAt by mutableStateOf<String?>(null)
    var licenceDraftExpiresAt by mutableStateOf<String?>(null)
    var isAddingLicence by mutableStateOf(false); private set
    var showingAddForm by mutableStateOf(false)

    // ── step 06 · about ──────────────────────────────────────────────
    var bioDraft by mutableStateOf("")
    var websiteDraft by mutableStateOf("")
    var linkedinDraft by mutableStateOf("")
    var instagramDraft by mutableStateOf("")

    val abnLocked: Boolean get() = bundle?.lockState?.abn == true

    init {
        hydrate()
    }

    // ── hydration + resume ───────────────────────────────────────────

    fun hydrate() {
        viewModelScope.launch {
            isHydrating = true
            when (val r = repo.bundle()) {
                is ApiResult.Success -> {
                    bundle = r.data
                    seedDrafts(r.data)
                    step = resumeStep(r.data)
                }
                is ApiResult.Error -> bannerError = r.message
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
            isHydrating = false
        }
    }

    private suspend fun refetchBundle() {
        when (val r = repo.bundle()) {
            is ApiResult.Success -> {
                bundle = r.data
                licences = r.data.licences
            }
            else -> Unit // keep the local view; next hydrate corrects it
        }
    }

    private fun seedDrafts(b: BuilderBundleDto) {
        val p = b.profile
        abnDraft = p?.abn.orEmpty()
        companyNameDraft = p?.companyName.orEmpty()
        tradingNameDraft = p?.tradingName.orEmpty()
        acnDraft = p?.acn.orEmpty()
        yearsDraft = p?.yearsInOperation?.toString().orEmpty()
        phoneDraft = AuPhone.displayFromE164(b.phone)
        businessStreetDraft = p?.businessAddressLine1.orEmpty()
        businessSelection =
            if (p?.businessSuburb != null && p.businessState != null && p.businessPostcode != null) {
                PostcodeSelection(p.businessPostcode, p.businessSuburb, p.businessState)
            } else null
        hasDifferentPostal = p?.hasDifferentPostal == true
        postalStreetDraft = p?.postalAddressLine1.orEmpty()
        postalSelection =
            if (p?.postalSuburb != null && p.postalState != null && p.postalPostcode != null) {
                PostcodeSelection(p.postalPostcode, p.postalSuburb, p.postalState)
            } else null
        selectedCategories = b.categories.map { it.category }.toSet()
        draftServiceAreas = b.serviceAreas.map {
            ServiceAreaPayload(it.state, it.suburb, it.postcode, it.radiusKm)
        }
        licences = b.licences
        bioDraft = p?.bio.orEmpty()
        websiteDraft = p?.website.orEmpty()
        linkedinDraft = p?.linkedinUrl.orEmpty()
        instagramDraft = p?.instagramUrl.orEmpty()
        if (b.lockState.abn && abnDraft.isNotBlank()) {
            abnVerifyState = AbnVerifyState.Verified(p?.companyName ?: "Verified")
        }
    }

    /** Lowest-incomplete resume, mirroring the web + iOS. */
    private fun resumeStep(b: BuilderBundleDto): WizardStep {
        val p = b.profile
        return when {
            p == null || p.companyName.isNullOrBlank() || p.abn == null -> WizardStep.Company
            p.businessAddressLine1 == null && p.businessSuburb == null -> WizardStep.Address
            b.categories.isEmpty() -> WizardStep.Categories
            b.serviceAreas.isEmpty() -> WizardStep.ServiceAreas
            b.licences.isEmpty() -> WizardStep.Licences
            else -> WizardStep.Review
        }
    }

    // ── navigation ───────────────────────────────────────────────────

    fun goBack() {
        clearErrors()
        if (step.ordinal > 0) {
            forward = false
            step = WizardStep.entries[step.ordinal - 1]
        }
    }

    private fun goForward() {
        clearErrors()
        if (step.ordinal < WizardStep.entries.lastIndex) {
            forward = true
            step = WizardStep.entries[step.ordinal + 1]
        }
    }

    fun jump(to: WizardStep) {
        clearErrors()
        forward = to.ordinal > step.ordinal
        step = to
    }

    private fun clearErrors() {
        bannerError = null
        fieldErrors = emptyMap()
    }

    // ── error handling ───────────────────────────────────────────────

    private fun handleSaveError(r: ApiResult.Error, visibleKeys: Set<String>) {
        val errors = r.fieldErrors
        fieldErrors = errors
        bannerError = when {
            errors.isEmpty() -> r.message
            errors.keys.none { it in visibleKeys } ->
                errors.entries.first().let { "${it.key}: ${it.value}" }
            else -> null
        }
    }

    // ── step 01 · company ────────────────────────────────────────────

    val canContinueCompany: Boolean
        get() {
            val cleanAbn = abnDraft.filter { it.isDigit() }
            return companyNameDraft.isNotBlank() &&
                (cleanAbn.isEmpty() || cleanAbn.length == 11) &&
                AuPhone.isValid(phoneDraft)
        }

    fun runAbnVerify() {
        val clean = abnDraft.filter { it.isDigit() }
        if (clean.length != 11) {
            abnVerifyState = AbnVerifyState.Failed("ABN must be 11 digits.")
            return
        }
        viewModelScope.launch {
            abnVerifyState = AbnVerifyState.Verifying
            when (val r = repo.verifyAbn(clean)) {
                is ApiResult.Success -> {
                    val d = r.data
                    if (d.status == "verified" && d.matchedName != null) {
                        abnVerifyState = AbnVerifyState.Verified(d.matchedName)
                        d.autofill?.legalEntityName?.let { companyNameDraft = it }
                        d.autofill?.acn?.let { acnDraft = it }
                        refetchBundle() // picks up the lock
                    } else {
                        abnVerifyState = AbnVerifyState.Failed(
                            d.reason ?: "We couldn't verify that ABN.",
                        )
                    }
                }
                is ApiResult.Error ->
                    abnVerifyState = AbnVerifyState.Failed(r.message)
                is ApiResult.NetworkError ->
                    abnVerifyState = AbnVerifyState.Failed(
                        "No connection. Check your network and try again.",
                    )
            }
        }
    }

    fun tryDifferentAbn() {
        abnDraft = ""
        abnVerifyState = AbnVerifyState.Idle
        manualMode = false
    }

    fun skipAbnForNow() {
        abnDraft = ""
        abnVerifyState = AbnVerifyState.Idle
        manualMode = true
    }

    fun saveCompanyStep() {
        clearErrors()
        val years = yearsDraft.trim()
        val yearsInt = years.toIntOrNull()
        if (years.isNotEmpty() && (yearsInt == null || yearsInt !in 0..150)) {
            fieldErrors = mapOf("yearsInOperation" to "Must be a number between 0 and 150.")
            return
        }
        val phoneE164 = AuPhone.normalise(phoneDraft)
        if (phoneE164 == null) {
            fieldErrors = mapOf(
                "phone" to "Enter a valid AU mobile or landline (e.g. 0412 345 678).",
            )
            return
        }
        val cleanAbn = abnDraft.filter { it.isDigit() }
        val cleanAcn = acnDraft.filter { it.isDigit() }
        val patch = buildJsonObject {
            put("companyName", companyNameDraft.trim())
            put("tradingName", tradingNameDraft.trim())
            if (yearsInt != null) put("yearsInOperation", yearsInt)
            put("phone", phoneE164)
            if (cleanAbn.isNotEmpty()) put("abn", cleanAbn)
            if (cleanAcn.isNotEmpty()) put("acn", cleanAcn)
        }
        saveThenAdvance(patch, visibleKeys = setOf(
            "abn", "companyName", "tradingName", "acn", "yearsInOperation", "phone",
        ))
    }

    // ── step 02 · address ────────────────────────────────────────────

    fun saveAddressStep() {
        clearErrors()
        val patch = buildJsonObject {
            put("businessAddressLine1", businessStreetDraft.trim())
            businessSelection.let { sel ->
                if (sel != null) {
                    put("businessSuburb", sel.suburb)
                    put("businessState", sel.state)
                    put("businessPostcode", sel.postcode)
                } else {
                    put("businessSuburb", JsonNull)
                    put("businessState", JsonNull)
                    put("businessPostcode", JsonNull)
                }
            }
            put("hasDifferentPostal", hasDifferentPostal)
            if (hasDifferentPostal && postalSelection != null) {
                val sel = postalSelection!!
                put("postalAddressLine1", postalStreetDraft.trim())
                put("postalSuburb", sel.suburb)
                put("postalState", sel.state)
                put("postalPostcode", sel.postcode)
            } else {
                put("postalAddressLine1", JsonNull)
                put("postalSuburb", JsonNull)
                put("postalState", JsonNull)
                put("postalPostcode", JsonNull)
            }
        }
        saveThenAdvance(patch, visibleKeys = setOf(
            "businessAddressLine1", "businessSuburb", "businessState", "businessPostcode",
            "postalAddressLine1", "postalSuburb", "postalState", "postalPostcode",
        ))
    }

    // ── step 03 · categories ─────────────────────────────────────────

    fun toggleCategory(value: String) {
        selectedCategories =
            if (value in selectedCategories) selectedCategories - value
            else selectedCategories + value
    }

    fun saveCategoriesStep() {
        clearErrors()
        if (selectedCategories.isEmpty()) {
            bannerError = "Pick at least one project type."
            return
        }
        viewModelScope.launch {
            isSaving = true
            when (val r = repo.setCategories(selectedCategories.toList())) {
                is ApiResult.Success -> { refetchBundle(); goForward() }
                is ApiResult.Error -> handleSaveError(r, setOf("categories"))
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
            isSaving = false
        }
    }

    // ── step 04 · service areas ──────────────────────────────────────

    /** Postcode → suburb lookup, shared with PostcodeSuburbField. */
    suspend fun lookupPostcode(postcode: String) = repo.lookupPostcode(postcode)

    fun addDraftServiceArea() {
        val sel = areaDraftSelection ?: return
        val payload = ServiceAreaPayload(
            state = sel.state,
            suburb = sel.suburb,
            postcode = sel.postcode,
            radiusKm = areaDraftRadiusKm.toInt(),
        )
        val key = "${payload.state}|${payload.suburb}"
        if (draftServiceAreas.none { "${it.state}|${it.suburb}" == key }) {
            draftServiceAreas = draftServiceAreas + payload
        }
        areaDraftSelection = null
        areaDraftRadiusKm = 25f
    }

    fun removeDraftServiceArea(index: Int) {
        draftServiceAreas = draftServiceAreas.filterIndexed { i, _ -> i != index }
    }

    fun saveServiceAreasStep() {
        clearErrors()
        if (draftServiceAreas.isEmpty()) {
            bannerError = "Add at least one service area."
            return
        }
        viewModelScope.launch {
            isSaving = true
            when (val r = repo.setServiceAreas(draftServiceAreas)) {
                is ApiResult.Success -> { refetchBundle(); goForward() }
                is ApiResult.Error -> handleSaveError(r, setOf("areas", "serviceAreas"))
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
            isSaving = false
        }
    }

    // ── step 05 · licences ───────────────────────────────────────────

    val canContinueLicences: Boolean get() = licences.isNotEmpty()

    fun addLicence() {
        clearErrors()
        val state = licenceDraftState
        if (state == null) {
            bannerError = "Pick the state your licence is from."
            return
        }
        if (licenceDraftType.trim().length < 2) {
            bannerError = "Licence type is required (e.g. 'Domestic Builder Unlimited')."
            return
        }
        if (licenceDraftNumber.trim().length < 2) {
            bannerError = "Licence number is required."
            return
        }
        viewModelScope.launch {
            isAddingLicence = true
            val body = AddLicenceRequest(
                state = state,
                licenceType = licenceDraftType.trim(),
                licenceNumber = licenceDraftNumber.trim(),
                licenceHolderName = licenceDraftHolder.trim().ifEmpty { null },
                issuedAt = licenceDraftIssuedAt,
                expiresAt = licenceDraftExpiresAt,
            )
            when (val r = repo.addLicence(body)) {
                is ApiResult.Success -> {
                    val added = r.data.licence.copy(
                        verificationStatus = r.data.verification?.status
                            ?: r.data.licence.verificationStatus,
                    )
                    licences = licences + added
                    licenceDraftState = null
                    licenceDraftType = ""
                    licenceDraftNumber = ""
                    licenceDraftHolder = ""
                    licenceDraftIssuedAt = null
                    licenceDraftExpiresAt = null
                    showingAddForm = false
                    refetchBundle()
                }
                is ApiResult.Error -> handleSaveError(
                    r,
                    setOf("state", "licenceType", "licenceNumber", "licenceHolderName", "issuedAt", "expiresAt"),
                )
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
            isAddingLicence = false
        }
    }

    fun removeLicence(id: String) {
        viewModelScope.launch {
            when (val r = repo.removeLicence(id)) {
                is ApiResult.Success -> {
                    licences = licences.filterNot { it.id == id }
                    refetchBundle()
                }
                is ApiResult.Error -> bannerError =
                    if (r.httpStatus == 404) "Licence not found." else r.message
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
        }
    }

    fun continueFromLicences() {
        // Licences persist on add — Continue just advances.
        if (canContinueLicences) goForward()
    }

    // ── step 06 · about ──────────────────────────────────────────────

    val bioLimit = 2000
    val canContinueAbout: Boolean get() = bioDraft.length <= bioLimit

    fun saveAboutStep() {
        clearErrors()
        if (bioDraft.length > bioLimit) {
            fieldErrors = mapOf("bio" to "Bio is over the $bioLimit-character limit.")
            return
        }
        val patch = buildJsonObject {
            put("bio", bioDraft.trim())
            put("website", websiteDraft.trim())
            put("linkedinUrl", linkedinDraft.trim())
            put("instagramUrl", instagramDraft.trim())
        }
        saveThenAdvance(patch, visibleKeys = setOf("bio", "website", "linkedinUrl", "instagramUrl"))
    }

    // ── step 07 · review + submit ────────────────────────────────────

    fun submitForApproval() {
        clearErrors()
        viewModelScope.launch {
            isSaving = true
            when (val r = repo.submit()) {
                is ApiResult.Success -> {
                    completionUser = r.data.user.toUser()
                    outcome = if (r.data.approved) WizardOutcome.Approved
                    else WizardOutcome.PendingReview
                }
                is ApiResult.Error -> handleSaveError(r, emptySet())
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
            isSaving = false
        }
    }

    /** "Open dashboard" on the outcome view — flips needsOnboarding. */
    fun finish() {
        completionUser?.let(session::applyUser)
    }

    // ── shared save helper (steps 1/2/6) ─────────────────────────────

    private fun saveThenAdvance(
        patch: kotlinx.serialization.json.JsonObject,
        visibleKeys: Set<String>,
    ) {
        viewModelScope.launch {
            isSaving = true
            when (val r = repo.patchProfile(patch)) {
                is ApiResult.Success -> { refetchBundle(); goForward() }
                is ApiResult.Error -> handleSaveError(r, visibleKeys)
                is ApiResult.NetworkError ->
                    bannerError = "No connection. Check your network and try again."
            }
            isSaving = false
        }
    }
}
