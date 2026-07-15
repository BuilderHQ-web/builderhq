package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq

/** value → display label for the project-type categories. */
private val CATEGORY_LABELS = mapOf(
    "single_dwelling" to "Single dwelling",
    "multi_dwelling" to "Multi-dwelling",
    "renovation" to "Renovation",
    "extension" to "Extension",
)

/**
 * Step 07 · Review. Six summary cards, each jumping back to its step
 * for edits; the footer submits for approval. The post-submit outcome
 * view lives in BuilderWizard.kt.
 */
@Composable
internal fun Step07Review(vm: BuilderWizardViewModel) {
    val c = Bhq.colors

    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.Review.index,
                kicker = WizardStep.Review.label,
                title = "One last",
                titleAccent = "look.",
                caption = "Verify everything looks right. You can edit any " +
                    "section before submitting.",
            )
            Spacer(Modifier.height(24.dp))

            // ── 1 · company ──────────────────────────────────────────
            ReviewCard("Company", onEdit = { vm.jump(WizardStep.Company) }) {
                Text(
                    vm.companyNameDraft.ifBlank { "—" },
                    color = c.text,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                if (vm.tradingNameDraft.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text("Trades as ${vm.tradingNameDraft}", color = c.textMuted, fontSize = 13.sp)
                }
                val chips = buildList {
                    if (vm.abnDraft.isNotBlank()) add(formatAbn(vm.abnDraft))
                    if (vm.acnDraft.isNotBlank()) add("ACN ${vm.acnDraft}")
                    if (vm.yearsDraft.isNotBlank()) add("${vm.yearsDraft} yrs")
                }
                if (chips.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    ReviewChipRow(chips)
                }
            }
            Spacer(Modifier.height(12.dp))

            // ── 2 · address ──────────────────────────────────────────
            ReviewCard("Address", onEdit = { vm.jump(WizardStep.Address) }) {
                val street = vm.businessStreetDraft.trim()
                val sel = vm.businessSelection
                if (street.isEmpty() && sel == null) {
                    NotProvided()
                } else {
                    if (street.isNotEmpty()) {
                        Text(street, color = c.text, fontSize = 14.sp)
                    }
                    if (sel != null) {
                        Text(
                            "${sel.suburb}, ${sel.state} ${sel.postcode}",
                            color = c.textMuted,
                            fontSize = 13.sp,
                        )
                    }
                    val postal = vm.postalSelection
                    if (vm.hasDifferentPostal && postal != null) {
                        Spacer(Modifier.height(4.dp))
                        val postalStreet = vm.postalStreetDraft.trim()
                        Text(
                            buildString {
                                append("Postal: ")
                                if (postalStreet.isNotEmpty()) append("$postalStreet, ")
                                append("${postal.suburb}, ${postal.state} ${postal.postcode}")
                            },
                            color = c.textMuted,
                            fontSize = 13.sp,
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // ── 3 · project types ────────────────────────────────────
            ReviewCard("Project types", onEdit = { vm.jump(WizardStep.Categories) }) {
                val labels = CATEGORY_LABELS.keys.filter { it in vm.selectedCategories }
                    .map { CATEGORY_LABELS.getValue(it) } +
                    vm.selectedCategories.filter { it !in CATEGORY_LABELS.keys }
                if (labels.isEmpty()) NotProvided() else ReviewChipRow(labels)
            }
            Spacer(Modifier.height(12.dp))

            // ── 4 · service areas ────────────────────────────────────
            ReviewCard("Service areas", onEdit = { vm.jump(WizardStep.ServiceAreas) }) {
                if (vm.draftServiceAreas.isEmpty()) {
                    NotProvided()
                } else {
                    vm.draftServiceAreas.forEachIndexed { i, a ->
                        if (i > 0) Spacer(Modifier.height(6.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "${a.state}  ${a.suburb ?: "Statewide"}",
                                color = c.text,
                                fontSize = 14.sp,
                            )
                            Spacer(Modifier.weight(1f))
                            Text("${a.radiusKm} km", color = c.textMuted, fontSize = 12.sp)
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // ── 5 · licences ─────────────────────────────────────────
            ReviewCard("Licences", onEdit = { vm.jump(WizardStep.Licences) }) {
                if (vm.licences.isEmpty()) {
                    Text("None added", color = c.textMuted, fontSize = 14.sp)
                } else {
                    vm.licences.forEachIndexed { i, l ->
                        if (i > 0) Spacer(Modifier.height(6.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "${l.state}  ${l.licenceType}",
                                color = c.text,
                                fontSize = 14.sp,
                            )
                            Spacer(Modifier.weight(1f))
                            Text(
                                l.verificationStatus ?: "pending",
                                color = c.textMuted,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // ── 6 · about ────────────────────────────────────────────
            ReviewCard("About", onEdit = { vm.jump(WizardStep.About) }) {
                val links = buildList {
                    if (vm.websiteDraft.isNotBlank()) add("Website")
                    if (vm.linkedinDraft.isNotBlank()) add("LinkedIn")
                    if (vm.instagramDraft.isNotBlank()) add("Instagram")
                }
                if (vm.bioDraft.isBlank() && links.isEmpty()) {
                    NotProvided()
                } else {
                    if (vm.bioDraft.isNotBlank()) {
                        Text(
                            vm.bioDraft,
                            color = c.text,
                            fontSize = 14.sp,
                            lineHeight = 20.sp,
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (links.isNotEmpty()) {
                        if (vm.bioDraft.isNotBlank()) Spacer(Modifier.height(10.dp))
                        ReviewChipRow(links)
                    }
                }
            }
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = true,
            isSaving = vm.isSaving,
            onContinue = vm::submitForApproval,
            continueLabel = "Submit for approval",
            isFinal = true,
            onBack = vm::goBack,
        )
    }
}

// ── shared pieces ────────────────────────────────────────────────────

@Composable
private fun ReviewCard(
    title: String,
    onEdit: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(16.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(c.surfaceElev)
            .border(1.dp, c.blueprintLine.copy(alpha = 0.10f), shape)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                title.uppercase(),
                color = c.textDim,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            )
            Spacer(Modifier.weight(1f))
            Text(
                "Edit",
                color = c.accentLight,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clip(CircleShape)
                    .pressable(onClick = onEdit)
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            )
        }
        Spacer(Modifier.height(10.dp))
        content()
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReviewChipRow(labels: List<String>) {
    val c = Bhq.colors
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        labels.forEach { label ->
            Text(
                label,
                color = c.textMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(c.fillSubtle)
                    .padding(horizontal = 10.dp, vertical = 5.dp),
            )
        }
    }
}

@Composable
private fun NotProvided() {
    Text("Not provided", color = Bhq.colors.textMuted, fontSize = 14.sp)
}

/** "11222333444" → "11 222 333 444" (2/3/3/3); non-11-digit passes through. */
private fun formatAbn(raw: String): String {
    val d = raw.filter(Char::isDigit)
    if (d.length != 11) return raw
    return "${d.substring(0, 2)} ${d.substring(2, 5)} ${d.substring(5, 8)} ${d.substring(8, 11)}"
}
