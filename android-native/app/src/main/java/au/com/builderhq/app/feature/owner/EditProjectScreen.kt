package au.com.builderhq.app.feature.owner

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.OwnerRepository
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.Success
import au.com.builderhq.app.core.design.theme.SurfaceElev
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.ProjectDocumentDto
import au.com.builderhq.app.core.network.dto.ProjectFieldsDto
import au.com.builderhq.app.core.network.dto.ProjectWriteRequest
import au.com.builderhq.app.core.network.dto.SuburbDto
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

private val EDIT_BUDGETS = listOf("under_500k", "500k_1m", "1m_1_5m", "1_5m_2m", "2m_3m", "3m_5m", "over_5m")
private val EDIT_BUILD = listOf("under_100", "100_150", "150_200", "200_250", "250_300", "300_400", "over_400")
private val EDIT_LAND = listOf("under_200", "200_400", "400_600", "600_800", "800_1000", "over_1000")
private val EDIT_EXT_TYPES = listOf("ground_floor", "first_floor", "ground_and_first", "rear", "side")
private val EDIT_EXT_SIZES = listOf("under_20", "20_40", "40_60", "60_80", "80_100", "over_100")
private val EDIT_AGE = listOf("under_10", "10_25", "25_50", "50_75", "over_75")
private val EDIT_RENO = listOf("kitchen", "bathroom", "kitchen_and_bathroom", "full_internal", "full_internal_and_external", "structural")

data class EditUi(
    val loading: Boolean = true,
    val error: String? = null,
    val projectId: String = "",
    val status: String = "draft",
    val fields: DraftFields = DraftFields(),
    val existingDocs: List<ProjectDocumentDto> = emptyList(),
    val newDocs: List<DocItem> = emptyList(),
    val pcLoading: Boolean = false,
    val pcError: String? = null,
    val suburbOptions: List<SuburbDto> = emptyList(),
    val saving: Boolean = false,
    val saveError: String? = null,
    val savedAndPublished: Boolean? = null,
) {
    val hasArchitectural: Boolean
        get() = existingDocs.any { it.category == "architectural" } || newDocs.any { it.category == "architectural" && it.state == DocState.DONE }
}

@HiltViewModel
class EditProjectViewModel @Inject constructor(
    private val repo: OwnerRepository,
    @ApplicationContext private val context: Context,
    savedState: SavedStateHandle,
) : ViewModel() {
    val slug: String = savedState.get<String>("slug").orEmpty()
    var ui by mutableStateOf(EditUi()); private set
    private var seq = 0L

    init { load() }

    private fun load() {
        ui = ui.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.projectDetail(slug)) {
                is ApiResult.Success -> {
                    val p = r.data.project
                    ui = ui.copy(loading = false, projectId = p.id, status = p.status, fields = fieldsFrom(p), existingDocs = r.data.documents)
                }
                is ApiResult.Error -> ui = ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(loading = false, error = "No connection. Check your internet and try again.")
            }
        }
    }

    fun update(block: (DraftFields) -> DraftFields) { ui = ui.copy(fields = block(ui.fields)) }
    fun setStreet(v: String) = update { it.copy(addressLine1 = v) }
    fun toggleScopeTag(tag: String) = update {
        it.copy(renovationScopeTags = if (tag in it.renovationScopeTags) it.renovationScopeTags - tag else it.renovationScopeTags + tag)
    }

    fun onPostcodeChange(raw: String) {
        val pc = raw.filter(Char::isDigit).take(4)
        update { it.copy(postcode = pc) }
        ui = ui.copy(suburbOptions = emptyList(), pcError = null)
        if (pc.length == 4) {
            ui = ui.copy(pcLoading = true)
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
                    else -> ui = ui.copy(pcLoading = false, pcError = "Couldn't look that up.")
                }
            }
        }
    }

    fun chooseSuburb(s: SuburbDto) {
        update { it.copy(suburb = s.suburb, state = s.state) }
        ui = ui.copy(suburbOptions = emptyList())
    }

    fun addDocument(uri: Uri, category: String) {
        viewModelScope.launch {
            val f = readUri(uri) ?: return@launch
            val localId = seq++
            ui = ui.copy(newDocs = ui.newDocs + DocItem(localId, f.first, category, DocState.UPLOADING))
            val r = repo.uploadDocument(ui.projectId, category, f.first, f.third, f.second)
            ui = ui.copy(newDocs = ui.newDocs.map {
                if (it.localId == localId) when (r) {
                    is ApiResult.Success -> it.copy(state = DocState.DONE, serverId = r.data.id, filename = r.data.filename.ifBlank { it.filename })
                    else -> it.copy(state = DocState.FAILED)
                } else it
            })
        }
    }

    fun removeNewDoc(localId: Long) {
        val d = ui.newDocs.find { it.localId == localId } ?: return
        ui = ui.copy(newDocs = ui.newDocs.filterNot { it.localId == localId })
        d.serverId?.let { sid -> viewModelScope.launch { repo.deleteDocument(ui.projectId, sid) } }
    }

    fun removeExistingDoc(id: String) {
        ui = ui.copy(existingDocs = ui.existingDocs.filterNot { it.id == id })
        viewModelScope.launch { repo.deleteDocument(ui.projectId, id) }
    }

    /** Save edits. A complete draft with a plan auto-publishes; live stays live. */
    fun save() {
        if (ui.saving) return
        ui = ui.copy(saving = true, saveError = null)
        viewModelScope.launch {
            val body = writeRequest()
            val draftReady = ui.status == "draft" && ui.hasArchitectural && complete()
            if (draftReady) {
                when (val r = repo.publish(slug, body)) {
                    is ApiResult.Success -> ui = ui.copy(saving = false, savedAndPublished = !r.data.savedAsDraft)
                    is ApiResult.Error -> ui = ui.copy(saving = false, saveError = r.message)
                    is ApiResult.NetworkError -> ui = ui.copy(saving = false, saveError = "No connection. Check your internet and try again.")
                }
            } else {
                when (val r = repo.patch(slug, body)) {
                    is ApiResult.Success -> ui = ui.copy(saving = false, savedAndPublished = false)
                    is ApiResult.Error -> ui = ui.copy(saving = false, saveError = r.message)
                    is ApiResult.NetworkError -> ui = ui.copy(saving = false, saveError = "No connection. Check your internet and try again.")
                }
            }
        }
    }

    private fun complete(): Boolean {
        val f = ui.fields
        if (f.title.isBlank() || f.suburb.isBlank() || f.addressLine1.isBlank() || f.budgetBand == null || f.targetStartMonth == null) return false
        return when (f.type) {
            "single_dwelling" -> f.bedrooms != null && f.bathrooms != null
            "multi_dwelling" -> f.dwellingCount != null && f.bedrooms != null && f.bathrooms != null
            "renovation" -> f.renovationScopeTags.isNotEmpty()
            "extension" -> f.extensionType != null && f.extensionSizeBand != null
            else -> true
        }
    }

    private fun writeRequest(): ProjectWriteRequest {
        val f = ui.fields
        return ProjectWriteRequest(
            type = null,
            title = f.title.ifBlank { null }, description = f.description.ifBlank { null },
            addressLine1 = f.addressLine1.ifBlank { null }, suburb = f.suburb.ifBlank { null },
            state = f.state.ifBlank { null }, postcode = f.postcode.ifBlank { null },
            bedrooms = f.bedrooms, bathrooms = f.bathrooms, floors = f.floors, dwellingCount = f.dwellingCount,
            landSizeBand = f.landSizeBand, buildSizeBand = f.buildSizeBand, existingAgeBand = f.existingAgeBand,
            extensionType = f.extensionType, extensionSizeBand = f.extensionSizeBand, budgetBand = f.budgetBand,
            targetStartMonth = f.targetStartMonth, targetCompletionMonth = f.targetCompletionMonth,
            renovationScopeTags = f.renovationScopeTags.ifEmpty { null },
        )
    }

    private fun fieldsFrom(p: ProjectFieldsDto) = DraftFields(
        type = p.type.ifBlank { null }, title = p.title, description = p.description ?: "",
        addressLine1 = p.addressLine1 ?: "", suburb = p.suburb ?: "", state = p.state ?: "", postcode = p.postcode ?: "",
        bedrooms = p.bedrooms, bathrooms = p.bathrooms, floors = p.floors, dwellingCount = p.dwellingCount,
        landSizeBand = p.landSizeBand, buildSizeBand = p.buildSizeBand, existingAgeBand = p.existingAgeBand,
        extensionType = p.extensionType, extensionSizeBand = p.extensionSizeBand, budgetBand = p.budgetBand,
        targetStartMonth = p.targetStartMonth, targetCompletionMonth = p.targetCompletionMonth,
        renovationScopeTags = p.renovationScopeTags,
    )

    private suspend fun readUri(uri: Uri): Triple<String, ByteArray, String>? = withContext(Dispatchers.IO) {
        runCatching {
            val cr = context.contentResolver
            val name = cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
                if (it.moveToFirst() && it.columnCount > 0) it.getString(0) else null
            } ?: "document"
            val type = cr.getType(uri) ?: "application/octet-stream"
            val bytes = cr.openInputStream(uri)?.use { s -> s.readBytes() } ?: return@runCatching null
            Triple(name, bytes, type)
        }.getOrNull()
    }
}

@Composable
fun EditProjectScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    vm: EditProjectViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    var pendingCategory by remember { mutableStateOf("architectural") }
    val docLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let { vm.addDocument(it, pendingCategory) } }
    val pickDoc: (String, String) -> Unit = { c, m -> pendingCategory = c; docLauncher.launch(m) }

    AmbientBackground {
        if (ui.savedAndPublished != null) {
            CelebrationScene(
                icon = Icons.Rounded.CheckCircle,
                titlePlain = if (ui.savedAndPublished == true) "You're" else "Changes",
                titleEmphasis = if (ui.savedAndPublished == true) "live." else "saved.",
                detail = ui.fields.title.ifBlank { "Your project" },
                subtitle = if (ui.savedAndPublished == true) "Builders can see your project now." else "Your project has been updated.",
                metric = null, ctaLabel = "Done", tone = if (ui.savedAndPublished == true) CelebrationTone.SUCCESS else CelebrationTone.ACCENT, onCta = onSaved,
            )
            return@AmbientBackground
        }
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(40.dp).clip(CircleShape).background(Color(0x14FFFFFF)).pressable(onClick = onBack), contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = TextPrimary, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.width(14.dp))
                Text("Edit project", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            }
            if (ui.loading) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    repeat(4) { SkeletonBox(Modifier.fillMaxWidth().height(70.dp), cornerRadius = 14.dp) }
                }
            } else if (ui.error != null && ui.projectId.isBlank()) {
                Box(Modifier.fillMaxSize().padding(36.dp), contentAlignment = Alignment.Center) {
                    Text(ui.error, color = TextMuted, fontSize = 14.sp)
                }
            } else {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    Spacer(Modifier.height(4.dp))
                    EditSection("Basics") {
                        WizardField("Title", ui.fields.title, { v -> vm.update { it.copy(title = v.take(90)) } }, "Project title")
                        Spacer(Modifier.height(16.dp))
                        WizardField("Description", ui.fields.description, { v -> vm.update { it.copy(description = v.take(2000)) } }, "Tell builders about the project…", singleLine = false, minHeight = 100)
                    }
                    EditSection("Location") {
                        WizardField("Postcode", ui.fields.postcode, vm::onPostcodeChange, "e.g. 3000")
                        if (ui.suburbOptions.isNotEmpty()) {
                            Spacer(Modifier.height(8.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                ui.suburbOptions.forEach { s ->
                                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SurfaceElev).border(1.dp, BlueprintLine.copy(alpha = 0.1f), RoundedCornerShape(12.dp)).pressable { vm.chooseSuburb(s) }.padding(12.dp)) {
                                        Text("${s.suburb}, ${s.state}", color = TextPrimary, fontSize = 14.sp)
                                    }
                                }
                            }
                        }
                        if (ui.fields.suburb.isNotBlank()) {
                            Spacer(Modifier.height(10.dp))
                            Text("${ui.fields.suburb}, ${ui.fields.state}", color = AccentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(14.dp))
                            WizardField("Street address", ui.fields.addressLine1, vm::setStreet, "Street address")
                        }
                    }
                    EditSection("Details") { EditSpecs(ui, vm) }
                    EditSection("Budget & timeline") {
                        BandPicker("Budget", EDIT_BUDGETS.map { it to (ProjectLabels.budget(it) ?: it) }, ui.fields.budgetBand) { v -> vm.update { it.copy(budgetBand = v) } }
                        Spacer(Modifier.height(20.dp))
                        MonthGrid("Target start", ui.fields.targetStartMonth) { v -> vm.update { it.copy(targetStartMonth = v) } }
                    }
                    EditSection("Documents") { EditDocs(ui, vm, pickDoc) }
                    ui.saveError?.let { Text(it, color = Danger, fontSize = 13.sp) }
                    Spacer(Modifier.height(16.dp))
                }
                Row(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(20.dp)) {
                    val label = when {
                        ui.status == "draft" && ui.hasArchitectural -> "Save & publish"
                        else -> "Save changes"
                    }
                    PrimaryButton(label, onClick = vm::save, loading = ui.saving, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun EditSection(title: String, content: @Composable () -> Unit) {
    Column {
        Kicker(title)
        Spacer(Modifier.height(14.dp))
        content()
    }
}

@Composable
private fun EditSpecs(ui: EditUi, vm: EditProjectViewModel) {
    val f = ui.fields
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        when (f.type) {
            "single_dwelling" -> {
                PillStepper("Bedrooms", f.bedrooms, 1..7) { n -> vm.update { it.copy(bedrooms = n) } }
                PillStepper("Bathrooms", f.bathrooms, 1..5) { n -> vm.update { it.copy(bathrooms = n) } }
                PillStepper("Floors", f.floors, 1..4) { n -> vm.update { it.copy(floors = n) } }
                BandPicker("Build size", EDIT_BUILD.map { it to (ProjectLabels.sizeBand(it) ?: it) }, f.buildSizeBand) { v -> vm.update { it.copy(buildSizeBand = v) } }
                BandPicker("Land size", EDIT_LAND.map { it to (ProjectLabels.sizeBand(it) ?: it) }, f.landSizeBand) { v -> vm.update { it.copy(landSizeBand = v) } }
            }
            "multi_dwelling" -> {
                PillStepper("Dwellings", f.dwellingCount, 2..12) { n -> vm.update { it.copy(dwellingCount = n) } }
                PillStepper("Bedrooms each", f.bedrooms, 1..7) { n -> vm.update { it.copy(bedrooms = n) } }
                PillStepper("Bathrooms each", f.bathrooms, 1..5) { n -> vm.update { it.copy(bathrooms = n) } }
                BandPicker("Land size", EDIT_LAND.map { it to (ProjectLabels.sizeBand(it) ?: it) }, f.landSizeBand) { v -> vm.update { it.copy(landSizeBand = v) } }
            }
            "renovation" -> {
                ChoiceTags("Scope", EDIT_RENO.map { it to (ProjectLabels.pretty(it) ?: it) }, f.renovationScopeTags) { vm.toggleScopeTag(it) }
                BandPicker("Age of home", EDIT_AGE.map { it to (ProjectLabels.pretty(it) ?: it) }, f.existingAgeBand) { v -> vm.update { it.copy(existingAgeBand = v) } }
            }
            "extension" -> {
                BandPicker("Extension type", EDIT_EXT_TYPES.map { it to (ProjectLabels.pretty(it) ?: it) }, f.extensionType) { v -> vm.update { it.copy(extensionType = v) } }
                BandPicker("Extension size", EDIT_EXT_SIZES.map { it to (ProjectLabels.sizeBand(it) ?: it) }, f.extensionSizeBand) { v -> vm.update { it.copy(extensionSizeBand = v) } }
            }
            else -> Text("This project's type can't be changed here.", color = TextMuted, fontSize = 13.sp)
        }
    }
}

@Composable
private fun EditDocs(ui: EditUi, vm: EditProjectViewModel, pickDoc: (String, String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ui.existingDocs.forEach { d ->
            DocLine(d.filename.ifBlank { "Document" }, ProjectLabels.pretty(d.category), DocState.DONE) { vm.removeExistingDoc(d.id) }
        }
        ui.newDocs.forEach { d ->
            DocLine(d.filename, ProjectLabels.pretty(d.category), d.state) { vm.removeNewDoc(d.localId) }
        }
        Spacer(Modifier.height(2.dp))
        Row(
            Modifier.clip(RoundedCornerShape(50)).border(1.dp, Accent.copy(alpha = 0.35f), RoundedCornerShape(50))
                .pressable { pickDoc("architectural", "application/pdf") }.padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Add, contentDescription = null, tint = AccentLight, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(6.dp))
            Text("Add architectural plan", color = AccentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
        if (!ui.hasArchitectural) {
            Text("An architectural plan is required to publish.", color = TextDim, fontSize = 12.sp)
        }
    }
}

@Composable
private fun DocLine(name: String, category: String?, state: DocState, onRemove: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SurfaceElev).border(1.dp, BlueprintLine.copy(alpha = 0.1f), RoundedCornerShape(14.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when (state) {
            DocState.UPLOADING -> CircularProgressIndicator(Modifier.size(16.dp), color = AccentLight, strokeWidth = 2.dp)
            DocState.DONE -> Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = Success, modifier = Modifier.size(16.dp))
            DocState.FAILED -> Icon(Icons.Rounded.Close, contentDescription = null, tint = Danger, modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(name, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            category?.let { Text(it, color = TextDim, fontSize = 12.sp) }
        }
        Icon(Icons.Rounded.Close, contentDescription = "Remove", tint = TextDim, modifier = Modifier.size(16.dp).pressable(onClick = onRemove))
    }
}
