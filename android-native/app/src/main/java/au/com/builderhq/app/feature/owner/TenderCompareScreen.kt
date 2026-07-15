package au.com.builderhq.app.feature.owner

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Verified
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.OwnerTendersRepository
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentContrast
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.Gold
import au.com.builderhq.app.core.design.theme.Success
import au.com.builderhq.app.core.design.theme.SurfaceElev
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.design.theme.Warning
import au.com.builderhq.app.feature.messaging.InitialsAvatar
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.OwnerTenderDetailDto
import au.com.builderhq.app.core.network.dto.TenderCompareDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AwardInfo(val builder: String, val priceAud: Int?, val weeks: Int?)

data class CompareUi(
    val loading: Boolean = true,
    val data: TenderCompareDto? = null,
    val error: String? = null,
    val decidingId: String? = null,
    val decisionError: String? = null,
    val award: AwardInfo? = null,
    val confirmAwardId: String? = null,
)

@HiltViewModel
class TenderCompareViewModel @Inject constructor(
    private val repo: OwnerTendersRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val slug: String = savedState.get<String>("slug").orEmpty()
    var ui by mutableStateOf(CompareUi()); private set

    init { load() }

    fun load() {
        ui = ui.copy(loading = ui.data == null, error = null)
        viewModelScope.launch {
            ui = when (val r = repo.compare(slug)) {
                is ApiResult.Success -> ui.copy(loading = false, data = r.data, error = null)
                is ApiResult.Error -> ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError -> ui.copy(loading = false, error = "No connection. Check your internet and try again.")
            }
        }
    }

    fun askAward(id: String) { ui = ui.copy(confirmAwardId = id) }
    fun cancelAward() { ui = ui.copy(confirmAwardId = null) }

    fun shortlist(id: String) = decide(id, "shortlist", null)
    fun reopen(id: String) = decide(id, "reopen", null)

    fun confirmAward() {
        val id = ui.confirmAwardId ?: return
        val t = ui.data?.tenders?.find { it.id == id }
        ui = ui.copy(confirmAwardId = null, decidingId = id, decisionError = null)
        viewModelScope.launch {
            when (val r = repo.decide(id, "award", rejectOthers = true)) {
                is ApiResult.Success -> {
                    val fresh = (repo.compare(slug) as? ApiResult.Success)?.data ?: ui.data
                    ui = ui.copy(
                        data = fresh, decidingId = null,
                        award = AwardInfo(t?.builder?.displayName ?: "the builder", t?.totalPriceAud, t?.durationWeeks),
                    )
                }
                is ApiResult.Error -> ui = ui.copy(decidingId = null, decisionError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(decidingId = null, decisionError = "No connection. Check your internet and try again.")
            }
        }
    }

    private fun decide(id: String, action: String, rejectOthers: Boolean?) {
        if (ui.decidingId != null) return
        ui = ui.copy(decidingId = id, decisionError = null)
        viewModelScope.launch {
            when (val r = repo.decide(id, action, rejectOthers)) {
                is ApiResult.Success -> {
                    val fresh = (repo.compare(slug) as? ApiResult.Success)?.data ?: ui.data
                    ui = ui.copy(data = fresh, decidingId = null)
                }
                is ApiResult.Error -> ui = ui.copy(decidingId = null, decisionError = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(decidingId = null, decisionError = "No connection. Check your internet and try again.")
            }
        }
    }

    fun dismissAward() { ui = ui.copy(award = null) }
}

@Composable
fun TenderCompareScreen(
    onBack: () -> Unit,
    vm: TenderCompareViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    au.com.builderhq.app.core.design.components.AmbientBackground {
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize()) {
                TopBar(ui.data?.projectTitle ?: "Tender review", onBack)
                Crossfade(targetState = ui.loading, animationSpec = tween(320), modifier = Modifier.weight(1f), label = "compare") { loading ->
                    when {
                        loading -> CenterLoading()
                        ui.data == null -> CenterMessage(ui.error ?: "Couldn't load tenders.", onBack)
                        ui.data!!.tenders.isEmpty() -> CenterMessage("No tenders yet. They'll appear here as builders submit.", onBack)
                        else -> CompareBody(ui, vm)
                    }
                }
            }

            // Award celebration overlay
            ui.award?.let { aw ->
                CelebrationScene(
                    icon = Icons.Rounded.EmojiEvents,
                    titlePlain = "Tender",
                    titleEmphasis = "awarded.",
                    detail = aw.builder,
                    subtitle = "We've let ${aw.builder} know. The other quotes were declined. Time to build.",
                    metric = aw.priceAud?.let { p -> formatAud(p) + (aw.weeks?.let { " · $it wks" } ?: "") },
                    ctaLabel = "Done",
                    tone = CelebrationTone.GOLD,
                    onCta = vm::dismissAward,
                )
            }
        }
    }

    ui.confirmAwardId?.let { id ->
        val name = ui.data?.tenders?.find { it.id == id }?.builder?.displayName ?: "this builder"
        val others = (ui.data?.tenders?.count { it.id != id && (it.status == "submitted" || it.status == "shortlisted") }) ?: 0
        androidx.compose.material3.AlertDialog(
            onDismissRequest = vm::cancelAward,
            containerColor = au.com.builderhq.app.core.design.theme.Surface1,
            titleContentColor = TextPrimary,
            textContentColor = TextMuted,
            title = { Text("Award to $name?") },
            text = { Text(if (others > 0) "The other $others live quote${if (others == 1) "" else "s"} will be declined automatically." else "This builder will be notified they've won the tender.") },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = vm::confirmAward) {
                    Text("Award", color = Gold, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = { androidx.compose.material3.TextButton(onClick = vm::cancelAward) { Text("Cancel", color = TextMuted) } },
        )
    }
}

@Composable
private fun CompareBody(ui: CompareUi, vm: TenderCompareViewModel) {
    val data = ui.data!!
    val tenders = data.tenders
    val median = data.analytics.price.median
    val lowestId = tenders.filter { it.totalPriceAud != null }.minByOrNull { it.totalPriceAud!! }?.id
    val fastestId = tenders.filter { it.durationWeeks != null }.minByOrNull { it.durationWeeks!! }?.id
    val bestValueId = remember(tenders) { computeBestValue(tenders, median) }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 40.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Column {
                Text("${tenders.size}", color = AccentLight, fontSize = 44.sp, fontWeight = FontWeight.Bold)
                Text(
                    "tender${if (tenders.size == 1) "" else "s"} · ${data.analytics.uniqueBuilders} builder${if (data.analytics.uniqueBuilders == 1) "" else "s"}" +
                        (data.analytics.daysLive?.let { " · live ${it}d" } ?: ""),
                    color = TextMuted, fontSize = 14.sp,
                )
            }
        }
        if (tenders.size >= 2 && median != null) {
            item { PriceRangeCard(data, tenders) }
        }
        if (decisionError(ui) != null) {
            item { Text(decisionError(ui)!!, color = Danger, fontSize = 13.sp) }
        }
        items(tenders.size) { idx ->
            val t = tenders[idx]
            QuoteCard(
                t = t,
                median = median,
                budgetBand = data.project.budgetBand,
                isLowest = t.id == lowestId,
                isFastest = t.id == fastestId,
                isBestValue = t.id == bestValueId,
                deciding = ui.decidingId == t.id,
                anyDeciding = ui.decidingId != null,
                onShortlist = { vm.shortlist(t.id) },
                onAward = { vm.askAward(t.id) },
                onReopen = { vm.reopen(t.id) },
            )
        }
    }
}

private fun decisionError(ui: CompareUi): String? = ui.decisionError

private fun computeBestValue(tenders: List<OwnerTenderDetailDto>, median: Int?): String? {
    if (tenders.size < 2) return null
    return tenders.maxByOrNull { t ->
        var s = t.completeness.score * 0.5
        if (t.builder.abnVerified && t.builder.anyLicenceVerified) s += 0.3
        if (t.totalPriceAud != null && median != null && t.totalPriceAud <= median) s += 0.2
        s
    }?.id
}

// ── Price range band (the BandScale moment) ─────────────────────────

@Composable
private fun PriceRangeCard(data: TenderCompareDto, tenders: List<OwnerTenderDetailDto>) {
    val min = data.analytics.price.min ?: return
    val max = data.analytics.price.max ?: return
    val median = data.analytics.price.median ?: return
    val span = (max - min).coerceAtLeast(1)
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Kicker("Price range")
                data.analytics.price.spread?.let {
                    Text("${(it * 100).toInt()}% spread", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
            Spacer(Modifier.height(20.dp))
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                val trackW = maxWidth
                Column {
                    Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(50)).background(Brush.horizontalGradient(listOf(Accent, Warning))))
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth().height(34.dp)) {
                        tenders.filter { it.totalPriceAud != null }.forEach { t ->
                            val frac = ((t.totalPriceAud!! - min).toFloat() / span).coerceIn(0f, 1f)
                            val animFrac by animateFloatAsState(frac, spring(stiffness = Spring.StiffnessLow), label = "marker")
                            Box(
                                Modifier.offset(x = (trackW - 26.dp) * animFrac).size(26.dp).clip(CircleShape)
                                    .background(Accent).border(1.5.dp, AccentLight, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(t.builder.initials.take(2), color = AccentContrast, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(compactAud(min), color = Success, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Text("med ${compactAud(median)}", color = TextDim, fontSize = 11.sp)
                Text(compactAud(max), color = Warning, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ── Quote card ──────────────────────────────────────────────────────

@Composable
private fun QuoteCard(
    t: OwnerTenderDetailDto,
    median: Int?,
    budgetBand: String?,
    isLowest: Boolean,
    isFastest: Boolean,
    isBestValue: Boolean,
    deciding: Boolean,
    anyDeciding: Boolean,
    onShortlist: () -> Unit,
    onAward: () -> Unit,
    onReopen: () -> Unit,
) {
    val awarded = t.status == "awarded"
    val rejected = t.status == "rejected"
    val border = when {
        awarded -> Gold.copy(alpha = 0.6f)
        else -> BlueprintLine.copy(alpha = 0.12f)
    }
    Box(
        Modifier
            .fillMaxWidth()
            .graphicsAlpha(if (rejected) 0.55f else 1f)
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF162033), Color(0xFF0C1424))))
            .border(1.dp, border, RoundedCornerShape(18.dp))
            .padding(16.dp),
    ) {
        Column {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar(t.builder.initials.ifBlank { t.builder.displayName }, size = 42)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.builder.displayName, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.height(3.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (t.builder.abnVerified) { VerifyChip("ABN"); Spacer(Modifier.width(6.dp)) }
                        if (t.builder.anyLicenceVerified) { VerifyChip("Licensed"); Spacer(Modifier.width(6.dp)) }
                        t.builder.yearsInOperation?.let { Text("${it}y", color = TextDim, fontSize = 11.sp) }
                    }
                }
                StatusPill(if (awarded) "awarded" else t.status)
            }

            // Badges
            val badges = buildList {
                if (isBestValue) add("Best value")
                if (isLowest) add("Lowest")
                if (isFastest) add("Fastest")
            }
            if (badges.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    badges.forEach { BadgeChip(it) }
                }
            }

            // Price + delta
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(t.totalPriceAud?.let { formatAud(it) } ?: "No price", color = TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                if (t.totalPriceAud != null && median != null && median > 0) {
                    Spacer(Modifier.width(10.dp))
                    val delta = t.totalPriceAud - median
                    val pct = (delta.toFloat() / median * 100).toInt()
                    Text(
                        if (delta <= 0) "${pct}% vs med" else "+${pct}% vs med",
                        color = if (delta <= 0) Success else Warning, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
            }

            // Stats + completeness
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    StatLine("Build", t.durationWeeks?.let { "$it wks" } ?: "—")
                    Spacer(Modifier.height(6.dp))
                    StatLine("Validity", t.validityDays?.let { "$it days" } ?: "—")
                    Spacer(Modifier.height(6.dp))
                    StatLine("Start", t.proposedStartMonth ?: "Flexible")
                }
                Box(contentAlignment = Alignment.Center) {
                    au.com.builderhq.app.core.design.components.ProgressRing(progress = t.completeness.score.toFloat(), diameter = 56.dp, thickness = 5.dp)
                    Text("${(t.completeness.score * 100).toInt()}%", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            if (!t.pitch.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                Text(t.pitch!!, color = TextMuted, fontSize = 13.sp, lineHeight = 19.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }

            // Actions
            Spacer(Modifier.height(16.dp))
            when {
                deciding -> Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(22.dp), color = AccentLight, strokeWidth = 2.dp)
                }
                awarded -> AwardedBanner()
                rejected -> SecondaryAction("Reopen", onReopen, enabled = !anyDeciding)
                else -> Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (t.status != "shortlisted") {
                        Box(Modifier.weight(1f)) { SecondaryAction("Shortlist", onShortlist, enabled = !anyDeciding) }
                    }
                    Box(Modifier.weight(1f)) { AwardAction(onAward, enabled = !anyDeciding) }
                }
            }
        }
    }
}

@Composable private fun StatLine(label: String, value: String) {
    Row {
        Text(label, color = TextDim, fontSize = 12.sp, modifier = Modifier.width(64.dp))
        Text(value, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable private fun VerifyChip(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Rounded.Verified, contentDescription = null, tint = Success, modifier = Modifier.size(12.dp))
        Spacer(Modifier.width(3.dp))
        Text(text, color = Success, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable private fun BadgeChip(text: String) {
    Box(
        Modifier.clip(RoundedCornerShape(50)).background(Accent.copy(alpha = 0.12f))
            .border(1.dp, Accent.copy(alpha = 0.3f), RoundedCornerShape(50)).padding(horizontal = 9.dp, vertical = 4.dp),
    ) {
        Text(text.uppercase(), color = AccentLight, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    }
}

@Composable private fun AwardedBanner() {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Gold.copy(alpha = 0.14f))
            .border(1.dp, Gold.copy(alpha = 0.4f), RoundedCornerShape(50)).padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.EmojiEvents, contentDescription = null, tint = Gold, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text("Awarded", color = Gold, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable private fun AwardAction(onClick: () -> Unit, enabled: Boolean) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(if (enabled) Accent else Accent.copy(alpha = 0.4f))
            .pressable(enabled = enabled, onClick = onClick).padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.EmojiEvents, contentDescription = null, tint = AccentContrast, modifier = Modifier.size(15.dp))
        Spacer(Modifier.width(6.dp))
        Text("Award", color = AccentContrast, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable private fun SecondaryAction(text: String, onClick: () -> Unit, enabled: Boolean) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Color(0x14FFFFFF))
            .border(1.dp, BlueprintLine.copy(alpha = 0.14f), RoundedCornerShape(50))
            .pressable(enabled = enabled, onClick = onClick).padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(text, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

// ── Top bar + states ────────────────────────────────────────────────

@Composable
private fun TopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(Color(0x14FFFFFF)).pressable(onClick = onBack), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Close, contentDescription = "Close", tint = TextPrimary, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text("TENDER REVIEW", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.sp)
            Text(title, color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable private fun CenterLoading() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = AccentLight, strokeWidth = 2.dp, modifier = Modifier.size(26.dp))
            Spacer(Modifier.height(14.dp))
            Text("Gathering your tenders…", color = TextMuted, fontSize = 14.sp)
        }
    }
}

@Composable private fun CenterMessage(message: String, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(36.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(Modifier.size(60.dp).clip(RoundedCornerShape(20.dp)).background(Accent.copy(alpha = 0.10f)).border(1.dp, BlueprintLine.copy(alpha = 0.18f), RoundedCornerShape(20.dp)), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Bolt, contentDescription = null, tint = AccentLight, modifier = Modifier.size(26.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(message, color = TextMuted, fontSize = 14.sp, lineHeight = 21.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Spacer(Modifier.height(20.dp))
        au.com.builderhq.app.core.design.components.PrimaryButton("Back", onClick = onBack)
    }
}

// Small alpha helper so a rejected card visibly recedes.
private fun Modifier.graphicsAlpha(a: Float): Modifier =
    this.then(Modifier.graphicsLayer(alpha = a))
