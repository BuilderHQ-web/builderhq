package au.com.builderhq.app.feature.tenders

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.TendersRepository
import au.com.builderhq.app.core.model.TradeCatalog
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.CostLineInput
import au.com.builderhq.app.core.network.dto.TenderPatchRequest
import au.com.builderhq.app.core.network.dto.TenderPayloadDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

internal const val TENDER_NET_ERR = "No connection. Check your internet and try again."

/** A cost-breakdown row being edited. Amount/label kept as strings for the
 *  text fields; only valid rows are pushed to the server. */
data class LineRow(val trade: String, val label: String = "", val amount: String = "")

/** Visible autosave status surfaced as a chip in the composer. */
enum class SaveState { Idle, Saving, Saved, Failed }

data class ComposerUi(
    val loading: Boolean = true,
    val loadError: String? = null,
    val tenderId: String? = null,
    val status: String = "draft",
    val price: String = "",
    val durationWeeks: String = "",
    val validityDays: Int? = null,
    val startMonth: String? = null,
    val pitch: String = "",
    val conditions: String = "",
    val exclusions: List<String> = emptyList(),
    val lines: List<LineRow> = emptyList(),
    val canSubmit: Boolean = false,
    val missing: List<String> = emptyList(),
    val saving: Boolean = false,
    val saveState: SaveState = SaveState.Idle,
    val submitting: Boolean = false,
    val submitted: Boolean = false,
    val error: String? = null,
) {
    val lineSum: Long get() = lines.sumOf { it.amount.toLongOrNull() ?: 0L }
    val priceValue: Long? get() = price.toLongOrNull()
    /** Local variance vs entered price; null when no priced lines. */
    val variance: Long? get() = if (lines.none { (it.amount.toLongOrNull() ?: 0L) > 0 }) null else lineSum - (priceValue ?: 0L)
}

@HiltViewModel
class TenderComposerViewModel @Inject constructor(
    private val repo: TendersRepository,
    private val snack: au.com.builderhq.app.core.data.SnackController,
    savedState: SavedStateHandle,
) : ViewModel() {
    val slug: String = savedState.get<String>("slug").orEmpty()
    var ui by mutableStateOf(ComposerUi()); private set

    private var hydrated = false
    private var patchJob: Job? = null
    private var linesJob: Job? = null
    private var pendingPatch = false
    private var pendingLines = false

    init {
        viewModelScope.launch {
            when (val r = repo.createForProject(slug)) {
                is ApiResult.Success -> hydrate(r.data)
                is ApiResult.Error -> ui = ui.copy(loading = false, loadError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(loading = false, loadError = TENDER_NET_ERR)
            }
        }
    }

    private fun hydrate(p: TenderPayloadDto) {
        if (!hydrated) {
            hydrated = true
            ui = ui.copy(
                loading = false,
                tenderId = p.id,
                status = p.status,
                price = p.totalPriceAud?.toString() ?: "",
                durationWeeks = p.durationWeeks?.toString() ?: "",
                validityDays = p.validityDays,
                startMonth = p.proposedStartMonth,
                pitch = p.pitch ?: "",
                conditions = p.conditions ?: "",
                exclusions = p.exclusions ?: emptyList(),
                lines = p.costLines
                    .sortedBy { TradeCatalog.order(it.trade) }
                    .map { LineRow(it.trade, it.label ?: "", it.amountAud.toString()) },
                canSubmit = p.readiness.canSubmit,
                missing = p.readiness.missing,
            )
        } else {
            // Resync only the server-computed bits; keep the user's live edits.
            ui = ui.copy(
                tenderId = p.id,
                status = p.status,
                canSubmit = p.readiness.canSubmit,
                missing = p.readiness.missing,
                saving = false,
            )
        }
    }

    fun onPrice(v: String) { ui = ui.copy(price = v.filter(Char::isDigit).take(9)); schedulePatch() }
    fun onDuration(v: String) { ui = ui.copy(durationWeeks = v.filter(Char::isDigit).take(3)); schedulePatch() }
    fun onValidity(d: Int) { ui = ui.copy(validityDays = if (ui.validityDays == d) null else d); patchNow() }
    fun onStartMonth(m: String) { ui = ui.copy(startMonth = m); patchNow() }
    fun onPitch(v: String) { ui = ui.copy(pitch = v.take(2000)); schedulePatch() }
    fun onConditions(v: String) { ui = ui.copy(conditions = v.take(2000)); schedulePatch() }

    fun addExclusion(text: String) {
        val t = text.trim().take(80)
        if (t.isEmpty() || ui.exclusions.size >= 20 || ui.exclusions.any { it.equals(t, ignoreCase = true) }) return
        ui = ui.copy(exclusions = ui.exclusions + t)
        patchNow()
    }

    fun removeExclusion(index: Int) {
        ui = ui.copy(exclusions = ui.exclusions.filterIndexed { i, _ -> i != index })
        patchNow()
    }

    fun addLine(trade: String) {
        if (trade != "other" && ui.lines.any { it.trade == trade }) return
        ui = ui.copy(lines = (ui.lines + LineRow(trade)).sortedBy { TradeCatalog.order(it.trade) })
    }

    fun onLineAmount(index: Int, v: String) {
        ui = ui.copy(lines = ui.lines.mapIndexed { i, l -> if (i == index) l.copy(amount = v.filter(Char::isDigit).take(9)) else l })
        scheduleLines()
    }

    fun onLineLabel(index: Int, v: String) {
        ui = ui.copy(lines = ui.lines.mapIndexed { i, l -> if (i == index) l.copy(label = v.take(80)) else l })
        scheduleLines()
    }

    fun removeLine(index: Int) {
        ui = ui.copy(lines = ui.lines.filterIndexed { i, _ -> i != index })
        scheduleLines()
    }

    private fun schedulePatch() {
        pendingPatch = true
        ui = ui.copy(saveState = SaveState.Saving)
        patchJob?.cancel()
        patchJob = viewModelScope.launch { delay(700); doPatch() }
    }

    private fun patchNow() {
        pendingPatch = true
        ui = ui.copy(saveState = SaveState.Saving)
        patchJob?.cancel()
        patchJob = viewModelScope.launch { doPatch() }
    }

    private suspend fun doPatch() {
        val id = ui.tenderId ?: return
        pendingPatch = false
        ui = ui.copy(saving = true, error = null)
        val req = TenderPatchRequest(
            totalPriceAud = ui.price.toLongOrNull(),
            durationWeeks = ui.durationWeeks.toIntOrNull(),
            validityDays = ui.validityDays,
            proposedStartMonth = ui.startMonth,
            exclusions = ui.exclusions,
            conditions = ui.conditions,
            pitch = ui.pitch,
        )
        when (val r = repo.patch(id, req)) {
            is ApiResult.Success -> { hydrate(r.data); ui = ui.copy(saveState = restingSaveState()) }
            is ApiResult.Error -> ui = ui.copy(saving = false, error = r.message, saveState = SaveState.Failed)
            is ApiResult.NetworkError -> ui = ui.copy(saving = false, saveState = SaveState.Failed)
        }
    }

    private fun scheduleLines() {
        pendingLines = true
        ui = ui.copy(saveState = SaveState.Saving)
        linesJob?.cancel()
        linesJob = viewModelScope.launch { delay(700); doLines() }
    }

    private suspend fun doLines() {
        val id = ui.tenderId ?: return
        pendingLines = false
        val valid = ui.lines.mapNotNull { l ->
            val amt = l.amount.toLongOrNull() ?: return@mapNotNull null
            if (l.trade == "other" && l.label.isBlank()) return@mapNotNull null
            CostLineInput(trade = l.trade, amountAud = amt, label = l.label.ifBlank { null })
        }
        ui = ui.copy(saving = true)
        when (val r = repo.setCostLines(id, valid)) {
            is ApiResult.Success -> { hydrate(r.data); ui = ui.copy(saveState = restingSaveState()) }
            is ApiResult.Error -> ui = ui.copy(saving = false, error = r.message, saveState = SaveState.Failed)
            is ApiResult.NetworkError -> ui = ui.copy(saving = false, saveState = SaveState.Failed)
        }
    }

    /** After a save lands: "Saving" if more edits are still queued, else "Saved". */
    private fun restingSaveState(): SaveState =
        if (pendingPatch || pendingLines) SaveState.Saving else SaveState.Saved

    /** Flush any debounced edits immediately — called on back-press and when the
     *  app is backgrounded, so a draft never loses the last few keystrokes. */
    fun flushPending() {
        val patch = pendingPatch
        val lines = pendingLines
        if (!patch && !lines) return
        patchJob?.cancel(); linesJob?.cancel()
        viewModelScope.launch {
            if (patch) doPatch()
            if (lines) doLines()
        }
    }

    fun submit() {
        val id = ui.tenderId ?: return
        if (ui.submitting) return
        ui = ui.copy(submitting = true, error = null)
        viewModelScope.launch {
            // Flush any pending edits first so the server has the latest.
            patchJob?.cancel(); linesJob?.cancel()
            doPatch(); doLines()
            when (val r = repo.submit(id)) {
                is ApiResult.Success -> ui = ui.copy(submitting = false, submitted = true, status = r.data.status)
                is ApiResult.Error -> { ui = ui.copy(submitting = false, error = r.message); snack.error(r.message, "Retry") { submit() } }
                is ApiResult.NetworkError -> { ui = ui.copy(submitting = false, error = TENDER_NET_ERR); snack.error(TENDER_NET_ERR, "Retry") { submit() } }
            }
        }
    }
}
