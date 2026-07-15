package au.com.builderhq.app.feature.owner

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.OwnerRepository
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.ProjectSuggestionsDto
import au.com.builderhq.app.core.network.dto.ProjectWriteRequest
import au.com.builderhq.app.core.network.dto.SuburbDto
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

enum class WizardStage { CHOICE, SCAN, WIZARD }
enum class WizardStep { TYPE, LOCATION, SPECS, BUDGET, TITLE, DOCUMENTS, REVIEW }
enum class ScanPhase { IDLE, READING, FAILED }
enum class DocState { UPLOADING, DONE, FAILED }

private val STEPS = WizardStep.entries

data class DraftFields(
    val type: String? = null,
    val title: String = "",
    val description: String = "",
    val addressLine1: String = "",
    val suburb: String = "",
    val state: String = "",
    val postcode: String = "",
    val bedrooms: Int? = null,
    val bathrooms: Int? = null,
    val floors: Int? = null,
    val dwellingCount: Int? = null,
    val landSizeBand: String? = null,
    val buildSizeBand: String? = null,
    val renovationScopeTags: List<String> = emptyList(),
    val existingAgeBand: String? = null,
    val extensionType: String? = null,
    val extensionSizeBand: String? = null,
    val budgetBand: String? = null,
    val targetStartMonth: String? = null,
    val targetCompletionMonth: String? = null,
)

data class DocItem(
    val localId: Long,
    val filename: String,
    val category: String,
    val state: DocState,
    val serverId: String? = null,
)

data class PublishedResult(val savedAsDraft: Boolean, val title: String, val missing: List<String>)

data class WizardUi(
    val stage: WizardStage = WizardStage.CHOICE,
    val step: WizardStep = WizardStep.TYPE,
    val forward: Boolean = true,
    val fields: DraftFields = DraftFields(),
    val scanPhase: ScanPhase = ScanPhase.IDLE,
    val scanError: String? = null,
    val planFilledCount: Int = 0,
    val showPlanReview: Boolean = false,
    val draftSlug: String? = null,
    val creatingDraft: Boolean = false,
    val docs: List<DocItem> = emptyList(),
    val saving: Boolean = false,
    val publishError: String? = null,
    val published: PublishedResult? = null,
    val pcLoading: Boolean = false,
    val pcError: String? = null,
    val suburbOptions: List<SuburbDto> = emptyList(),
) {
    val hasArchitectural: Boolean get() = docs.any { it.category == "architectural" && it.state == DocState.DONE }
}

private class PickedFile(val filename: String, val bytes: ByteArray, val contentType: String)

@HiltViewModel
class PublishWizardViewModel @Inject constructor(
    private val repo: OwnerRepository,
    @ApplicationContext private val context: Context,
) : ViewModel() {
    var ui by mutableStateOf(WizardUi()); private set

    private var draftId: String? = null
    private var pendingPlan: PickedFile? = null
    private var localSeq = 0L

    // ── Stage routing ───────────────────────────────────────────────
    fun chooseAi() { ui = ui.copy(stage = WizardStage.SCAN) }
    fun chooseManual() { ui = ui.copy(stage = WizardStage.WIZARD, step = WizardStep.TYPE) }
    fun backToChoice() { ui = ui.copy(stage = WizardStage.CHOICE, scanPhase = ScanPhase.IDLE, scanError = null) }

    // ── Field edits ─────────────────────────────────────────────────
    fun update(block: (DraftFields) -> DraftFields) { ui = ui.copy(fields = block(ui.fields)) }

    fun toggleScopeTag(tag: String) = update {
        it.copy(renovationScopeTags = if (tag in it.renovationScopeTags) it.renovationScopeTags - tag else it.renovationScopeTags + tag)
    }

    // ── AI scan ─────────────────────────────────────────────────────
    fun scanPlan(uri: Uri) {
        ui = ui.copy(scanPhase = ScanPhase.READING, scanError = null)
        viewModelScope.launch {
            val file = readUri(uri, forcePdf = true)
            if (file == null) { ui = ui.copy(scanPhase = ScanPhase.FAILED, scanError = "Couldn't read that file."); return@launch }
            when (val r = repo.extractFromPlan(file.bytes)) {
                is ApiResult.Success -> {
                    pendingPlan = file
                    val count = applySuggestions(r.data.suggestions)
                    ui = ui.copy(stage = WizardStage.WIZARD, step = WizardStep.TYPE, scanPhase = ScanPhase.IDLE, planFilledCount = count, showPlanReview = count > 0)
                }
                is ApiResult.Error -> ui = ui.copy(scanPhase = ScanPhase.FAILED, scanError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(scanPhase = ScanPhase.FAILED, scanError = "No connection. Check your internet and try again.")
            }
        }
    }

    fun skipScan() = chooseManual()
    fun dismissPlanReview() { ui = ui.copy(showPlanReview = false) }

    /** Fill only empty fields from the AI suggestions; return how many landed. */
    private fun applySuggestions(s: ProjectSuggestionsDto): Int {
        var count = 0
        var f = ui.fields
        fun <T> pick(cur: T?, sug: T?, set: (T) -> Unit) { if ((cur == null || (cur is String && cur.isBlank())) && sug != null) { set(sug); count++ } }
        pick(f.type, s.type) { f = f.copy(type = it) }
        pick(f.title.ifBlank { null }, s.title) { f = f.copy(title = it) }
        pick(f.description.ifBlank { null }, s.description) { f = f.copy(description = it) }
        pick(f.addressLine1.ifBlank { null }, s.addressLine1) { f = f.copy(addressLine1 = it) }
        pick(f.suburb.ifBlank { null }, s.suburb) { f = f.copy(suburb = it) }
        pick(f.state.ifBlank { null }, s.state) { f = f.copy(state = it) }
        pick(f.postcode.ifBlank { null }, s.postcode) { f = f.copy(postcode = it) }
        pick(f.bedrooms, s.bedrooms) { f = f.copy(bedrooms = it) }
        pick(f.bathrooms, s.bathrooms) { f = f.copy(bathrooms = it) }
        pick(f.floors, s.floors) { f = f.copy(floors = it) }
        pick(f.dwellingCount, s.dwellingCount) { f = f.copy(dwellingCount = it) }
        pick(f.landSizeBand, s.landSizeBand) { f = f.copy(landSizeBand = it) }
        pick(f.buildSizeBand, s.buildSizeBand) { f = f.copy(buildSizeBand = it) }
        pick(f.existingAgeBand, s.existingAgeBand) { f = f.copy(existingAgeBand = it) }
        pick(f.extensionType, s.extensionType) { f = f.copy(extensionType = it) }
        pick(f.extensionSizeBand, s.extensionSizeBand) { f = f.copy(extensionSizeBand = it) }
        pick(f.budgetBand, s.budgetBand) { f = f.copy(budgetBand = it) }
        pick(f.targetStartMonth, s.targetStartMonth) { f = f.copy(targetStartMonth = it) }
        pick(f.targetCompletionMonth, s.targetCompletionMonth) { f = f.copy(targetCompletionMonth = it) }
        if (f.renovationScopeTags.isEmpty() && s.renovationScopeTags.isNotEmpty()) { f = f.copy(renovationScopeTags = s.renovationScopeTags); count++ }
        ui = ui.copy(fields = f)
        return count
    }

    // ── Postcode → suburb ───────────────────────────────────────────
    fun onPostcodeChange(raw: String) {
        val pc = raw.filter(Char::isDigit).take(4)
        update { it.copy(postcode = pc, suburb = "", state = "") }
        ui = ui.copy(suburbOptions = emptyList(), pcError = null)
        if (pc.length == 4) lookupPostcode(pc)
    }

    private fun lookupPostcode(pc: String) {
        ui = ui.copy(pcLoading = true, pcError = null)
        viewModelScope.launch {
            when (val r = repo.postcode(pc)) {
                is ApiResult.Success -> {
                    val subs = r.data.suburbs
                    when {
                        subs.isEmpty() -> ui = ui.copy(pcLoading = false, pcError = "Postcode not recognised.")
                        subs.size == 1 -> { chooseSuburb(subs.first()); ui = ui.copy(pcLoading = false) }
                        else -> ui = ui.copy(pcLoading = false, suburbOptions = subs)
                    }
                }
                else -> ui = ui.copy(pcLoading = false, pcError = "Couldn't look that up. Enter your suburb below.")
            }
        }
    }

    fun chooseSuburb(s: SuburbDto) {
        update { it.copy(suburb = s.suburb, state = s.state) }
        ui = ui.copy(suburbOptions = emptyList())
    }

    fun setStreet(v: String) = update { it.copy(addressLine1 = v) }

    // ── Step navigation ─────────────────────────────────────────────
    fun canContinue(): Boolean {
        val f = ui.fields
        return when (ui.step) {
            WizardStep.TYPE -> f.type != null
            WizardStep.LOCATION -> f.suburb.isNotBlank() && f.addressLine1.isNotBlank()
            WizardStep.SPECS -> when (f.type) {
                "single_dwelling" -> f.bedrooms != null && f.bathrooms != null
                "multi_dwelling" -> f.dwellingCount != null && f.bedrooms != null && f.bathrooms != null
                "renovation" -> f.renovationScopeTags.isNotEmpty()
                "extension" -> f.extensionType != null && f.extensionSizeBand != null
                else -> true
            }
            WizardStep.BUDGET -> f.budgetBand != null && f.targetStartMonth != null
            WizardStep.TITLE -> f.title.isNotBlank()
            WizardStep.DOCUMENTS -> !ui.creatingDraft && ui.draftSlug != null
            WizardStep.REVIEW -> true
        }
    }

    fun next() {
        if (!canContinue()) return
        val idx = STEPS.indexOf(ui.step)
        if (ui.step == WizardStep.REVIEW) { publish(); return }
        val target = STEPS[idx + 1]
        ui = ui.copy(step = target, forward = true)
        if (target == WizardStep.DOCUMENTS) ensureDraft()
    }

    fun back() {
        val idx = STEPS.indexOf(ui.step)
        if (idx == 0) return
        ui = ui.copy(step = STEPS[idx - 1], forward = false)
    }

    fun jumpTo(step: WizardStep) { ui = ui.copy(step = step, forward = STEPS.indexOf(step) > STEPS.indexOf(ui.step)) }

    // ── Draft + documents ───────────────────────────────────────────
    private fun ensureDraft() {
        if (ui.draftSlug != null || ui.creatingDraft) return
        ui = ui.copy(creatingDraft = true)
        viewModelScope.launch {
            when (val r = repo.create(writeRequest(includeType = true))) {
                is ApiResult.Success -> {
                    draftId = r.data.project.id
                    ui = ui.copy(creatingDraft = false, draftSlug = r.data.project.slug)
                    pendingPlan?.let { plan -> pendingPlan = null; uploadBytes(plan, "architectural") }
                }
                is ApiResult.Error -> ui = ui.copy(creatingDraft = false, publishError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(creatingDraft = false, publishError = "No connection. Check your internet and try again.")
            }
        }
    }

    fun addDocument(uri: Uri, category: String) {
        viewModelScope.launch {
            val file = readUri(uri, forcePdf = false) ?: return@launch
            uploadBytes(file, category)
        }
    }

    private suspend fun uploadBytes(file: PickedFile, category: String) {
        val id = draftId ?: return
        val localId = localSeq++
        ui = ui.copy(docs = ui.docs + DocItem(localId, file.filename, category, DocState.UPLOADING))
        val r = repo.uploadDocument(id, category, file.filename, file.contentType, file.bytes)
        ui = ui.copy(docs = ui.docs.map {
            if (it.localId == localId) when (r) {
                is ApiResult.Success -> it.copy(state = DocState.DONE, serverId = r.data.id, filename = r.data.filename.ifBlank { it.filename })
                else -> it.copy(state = DocState.FAILED)
            } else it
        })
    }

    fun removeDocument(localId: Long) {
        val doc = ui.docs.find { it.localId == localId } ?: return
        ui = ui.copy(docs = ui.docs.filterNot { it.localId == localId })
        val sid = doc.serverId
        val pid = draftId
        if (sid != null && pid != null) viewModelScope.launch { repo.deleteDocument(pid, sid) }
    }

    // ── Publish ─────────────────────────────────────────────────────
    private fun publish() {
        val slug = ui.draftSlug ?: return
        if (ui.saving) return
        ui = ui.copy(saving = true, publishError = null)
        viewModelScope.launch {
            when (val r = repo.publish(slug, writeRequest(includeType = false))) {
                is ApiResult.Success -> ui = ui.copy(
                    saving = false,
                    published = PublishedResult(r.data.savedAsDraft, ui.fields.title.ifBlank { "Your project" }, r.data.missing),
                )
                is ApiResult.Error -> ui = ui.copy(saving = false, publishError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(saving = false, publishError = "No connection. Check your internet and try again.")
            }
        }
    }

    private fun writeRequest(includeType: Boolean): ProjectWriteRequest {
        val f = ui.fields
        return ProjectWriteRequest(
            type = if (includeType) f.type else null,
            title = f.title.ifBlank { null },
            description = f.description.ifBlank { null },
            addressLine1 = f.addressLine1.ifBlank { null },
            suburb = f.suburb.ifBlank { null },
            state = f.state.ifBlank { null },
            postcode = f.postcode.ifBlank { null },
            bedrooms = f.bedrooms,
            bathrooms = f.bathrooms,
            floors = f.floors,
            dwellingCount = f.dwellingCount,
            landSizeBand = f.landSizeBand,
            buildSizeBand = f.buildSizeBand,
            existingAgeBand = f.existingAgeBand,
            extensionType = f.extensionType,
            extensionSizeBand = f.extensionSizeBand,
            budgetBand = f.budgetBand,
            targetStartMonth = f.targetStartMonth,
            targetCompletionMonth = f.targetCompletionMonth,
            renovationScopeTags = f.renovationScopeTags.ifEmpty { null },
        )
    }

    private suspend fun readUri(uri: Uri, forcePdf: Boolean): PickedFile? = withContext(Dispatchers.IO) {
        runCatching {
            val cr = context.contentResolver
            val name = cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
                if (it.moveToFirst() && it.columnCount > 0) it.getString(0) else null
            } ?: "document"
            val type = if (forcePdf) "application/pdf" else (cr.getType(uri) ?: "application/octet-stream")
            val bytes = cr.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching null
            PickedFile(name, bytes, type)
        }.getOrNull()
    }
}
