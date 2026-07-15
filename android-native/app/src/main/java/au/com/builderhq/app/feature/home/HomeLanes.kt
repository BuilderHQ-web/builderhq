package au.com.builderhq.app.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bed
import androidx.compose.material.icons.rounded.Cancel
import androidx.compose.material.icons.rounded.Crop
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.FormatPaint
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material.icons.rounded.OpenInFull
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material.icons.rounded.Shower
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.ProjectCoverArt
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.dto.BuilderProjectRowDto
import au.com.builderhq.app.core.network.dto.BuilderTenderRowDto
import java.time.Duration
import java.time.Instant
import java.util.Locale

/**
 * Builder-home lanes — the tender pipeline (horizontal cards with a
 * 3-dot stage stepper), the pickup lane (unlocked projects), and the
 * suggested-feed project card. Ported 1:1 from iOS.
 */

// ── tender pipeline lane ─────────────────────────────────────────────

@Composable
internal fun TenderPipelineLane(
    tenders: List<BuilderTenderRowDto>,
    onOpenProject: (String) -> Unit,
) {
    val c = Bhq.colors
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            HomeSectionLabel("Your tenders")
            Spacer(Modifier.weight(1f))
            Text(
                "${tenders.size} live",
                color = c.textDim,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.2.sp,
            )
        }
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            tenders.forEach { tender ->
                PipelineCard(tender = tender, onOpen = { onOpenProject(tender.projectSlug) })
            }
        }
    }
}

@Composable
private fun PipelineCard(
    tender: BuilderTenderRowDto,
    onOpen: () -> Unit,
) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(18.dp)
    val awarded = tender.status == "awarded"
    Column(
        Modifier
            .width(248.dp)
            .height(156.dp)
            .clip(shape)
            .background(c.surface)
            .border(
                width = if (awarded) 1.5.dp else 1.dp,
                color = if (awarded) c.gold.copy(alpha = 0.5f) else c.blueprintLine.copy(alpha = 0.14f),
                shape = shape,
            )
            .pressable { onOpen() }
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            StatusPill(tender.status)
            Spacer(Modifier.weight(1f))
            if (tender.totalPriceAud != null) {
                Text(
                    compactMoney(tender.totalPriceAud),
                    color = c.text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        Text(
            tender.projectTitle,
            color = c.text,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        Spacer(Modifier.weight(1f))

        when (tender.status) {
            "draft" -> Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    Icons.Rounded.Edit,
                    contentDescription = null,
                    tint = c.accent,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    "Finish your tender",
                    color = c.accent,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.weight(1f))
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowForward,
                    contentDescription = null,
                    tint = c.accent,
                    modifier = Modifier.size(13.dp),
                )
            }

            "rejected" -> Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    Icons.Rounded.Cancel,
                    contentDescription = null,
                    tint = c.textDim,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    "Not selected",
                    color = c.textDim,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            "withdrawn" -> Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.Undo,
                    contentDescription = null,
                    tint = c.textDim,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    "Withdrawn",
                    color = c.textDim,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            else -> {
                // submitted / shortlisted / awarded — the 3-dot stage stepper.
                val stageIndex = when (tender.status) {
                    "shortlisted" -> 1
                    "awarded" -> 2
                    else -> 0
                }
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        for (i in 0..2) {
                            val filled = i <= stageIndex
                            val dot = Modifier.size(9.dp).clip(CircleShape)
                            Box(
                                if (filled) {
                                    dot.background(if (i == 2) c.gold else c.accent)
                                } else {
                                    dot
                                        .background(c.surfaceElev)
                                        .border(1.dp, c.blueprintLine.copy(alpha = 0.14f), CircleShape)
                                },
                            )
                            if (i < 2) {
                                Box(
                                    Modifier
                                        .weight(1f)
                                        .height(2.dp)
                                        .background(
                                            if (i < stageIndex) c.accent
                                            else c.blueprintLine.copy(alpha = 0.08f),
                                        ),
                                )
                            }
                        }
                    }
                    Text(
                        when (tender.status) {
                            "shortlisted" -> "Shortlisted"
                            "awarded" -> "Awarded 🏆"
                            else -> "Submitted"
                        },
                        color = if (awarded) c.gold else c.accentLight,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }

        Text(
            if (tender.submittedAt != null) "Submitted ${relativeTime(tender.submittedAt)} ago"
            else "Updated ${relativeTime(tender.updatedAt)} ago",
            color = c.textDim,
            fontSize = 10.5.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun StatusPill(status: String) {
    val c = Bhq.colors
    val (label, tint) = when (status) {
        "draft" -> "DRAFT" to c.warning
        "shortlisted" -> "SHORTLISTED" to c.secondaryBlue
        "awarded" -> "AWARDED" to c.gold
        "rejected" -> "DECLINED" to c.textDim
        "withdrawn" -> "WITHDRAWN" to c.textDim
        else -> "SUBMITTED" to c.accent
    }
    Text(
        label,
        color = tint,
        fontSize = 8.5.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 0.8.sp,
        modifier = Modifier
            .clip(CircleShape)
            .background(tint.copy(alpha = 0.14f))
            .padding(horizontal = 7.dp, vertical = 3.dp),
    )
}

/** "$450k", "$1M", "$1.5M" — compact AUD for the pipeline card. */
private fun compactMoney(aud: Int): String = when {
    aud >= 1_000_000 -> {
        val m = String.format(Locale.US, "%.1f", aud / 1_000_000.0).removeSuffix(".0")
        "$${m}M"
    }
    aud >= 1_000 -> "$${aud / 1_000}k"
    else -> "$$aud"
}

// ── pickup lane (unlocked projects) ──────────────────────────────────

@Composable
internal fun PickupLane(
    unlocked: List<BuilderProjectRowDto>,
    onOpenProject: (String) -> Unit,
) {
    val c = Bhq.colors
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                HomeSectionLabel("Pick up where you left off")
                Text(
                    "Your unlocked projects",
                    color = c.textMuted,
                    fontSize = 13.sp,
                )
            }
            Spacer(Modifier.weight(1f))
            Row(
                Modifier
                    .clip(CircleShape)
                    .background(c.accentMuted)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Rounded.LockOpen,
                    contentDescription = null,
                    tint = c.accent,
                    modifier = Modifier.size(11.dp),
                )
                Text(
                    "${unlocked.size}",
                    color = c.accent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            unlocked.forEach { project ->
                PickupCard(project = project, onOpen = { onOpenProject(project.slug) })
            }
        }
    }
}

@Composable
private fun PickupCard(
    project: BuilderProjectRowDto,
    onOpen: () -> Unit,
) {
    val c = Bhq.colors
    CardSurface(
        Modifier
            .width(232.dp)
            .pressable { onOpen() },
    ) {
        Column {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(88.dp),
            ) {
                ProjectCoverArt(
                    seed = project.slug,
                    type = project.type ?: "",
                    modifier = Modifier.matchParentSize(),
                )
                Row(
                    Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp)
                        .clip(CircleShape)
                        .background(c.accent.copy(alpha = 0.85f))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Rounded.Verified,
                        contentDescription = null,
                        tint = c.accentContrast,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        "UNLOCKED",
                        color = c.accentContrast,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp,
                    )
                }
            }
            Column(
                Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    project.title,
                    color = c.text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                val location = ProjectLabels.location(project.suburb, project.state)
                if (location.isNotEmpty()) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Rounded.Place,
                            contentDescription = null,
                            tint = c.textDim,
                            modifier = Modifier.size(10.dp),
                        )
                        Text(
                            location,
                            color = c.textMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.AutoMirrored.Rounded.ArrowForward,
                        contentDescription = null,
                        tint = c.accentLight,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        "Resume",
                        color = c.accentLight,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.4.sp,
                    )
                }
            }
        }
    }
}

// ── suggested-feed project card ──────────────────────────────────────

@Composable
internal fun ProjectFeedCard(
    project: BuilderProjectRowDto,
    fbaActive: Boolean,
    onClick: () -> Unit,
) {
    val c = Bhq.colors
    CardSurface(
        Modifier
            .fillMaxWidth()
            .pressable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
    ) {
        Column {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(132.dp),
            ) {
                ProjectCoverArt(
                    seed = project.slug,
                    type = project.type ?: "",
                    modifier = Modifier.matchParentSize(),
                )

                // Type chip — top start.
                Row(
                    Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp)
                        .clip(CircleShape)
                        .background(c.scrimSoft)
                        .border(1.dp, c.fillSubtle, CircleShape)
                        .padding(horizontal = 9.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        typeIcon(project.type),
                        contentDescription = null,
                        tint = c.text,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        ProjectLabels.type(project.type ?: "").uppercase(),
                        color = c.text,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp,
                    )
                }

                // Unlock count — top end.
                Row(
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp)
                        .clip(CircleShape)
                        .background(c.scrimSoft)
                        .border(1.dp, c.fillSubtle, CircleShape)
                        .padding(horizontal = 9.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        if (project.unlockedCount > 0) Icons.Rounded.LockOpen else Icons.Rounded.Lock,
                        contentDescription = null,
                        tint = c.text,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        "${project.unlockedCount} / 3 unlocked",
                        color = c.text,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp,
                    )
                }

                // Freshness — bottom end.
                Row(
                    Modifier
                        .align(Alignment.BottomEnd)
                        .padding(12.dp)
                        .clip(CircleShape)
                        .background(c.scrimSoft)
                        .border(1.dp, c.fillSubtle, CircleShape)
                        .padding(horizontal = 9.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(5.dp)
                            .clip(CircleShape)
                            .background(c.text),
                    )
                    Text(
                        freshness(project.publishedAt).uppercase(),
                        color = c.text,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.6.sp,
                    )
                }
            }

            Column(
                Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    project.title,
                    color = c.text,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val location = ProjectLabels.location(project.suburb, project.state)
                    if (location.isNotEmpty()) {
                        FactChip(icon = Icons.Rounded.Place, label = location, accent = false)
                    }
                    val budget = ProjectLabels.budget(project.budgetBand)
                    if (budget != null) {
                        FactChip(icon = Icons.Rounded.Payments, label = budget, accent = true)
                    }
                }

                if (project.bedrooms != null || project.bathrooms != null) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        project.bedrooms?.let { n ->
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    Icons.Rounded.Bed,
                                    contentDescription = null,
                                    tint = c.textDim,
                                    modifier = Modifier.size(12.dp),
                                )
                                Text(
                                    if (n == 1) "1 bed" else "$n beds",
                                    color = c.textMuted,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                        }
                        project.bathrooms?.let { n ->
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    Icons.Rounded.Shower,
                                    contentDescription = null,
                                    tint = c.textDim,
                                    modifier = Modifier.size(12.dp),
                                )
                                Text(
                                    if (n == 1) "1 bath" else "$n baths",
                                    color = c.textMuted,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                        }
                    }
                }

                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(c.blueprintLine.copy(alpha = 0.08f)),
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            if (fbaActive) Icons.Rounded.AutoAwesome else Icons.Rounded.Lock,
                            contentDescription = null,
                            tint = if (fbaActive) c.accent else c.accentLight,
                            modifier = Modifier.size(13.dp),
                        )
                        Text(
                            if (fbaActive) "Free with founding access"
                            else "Unlock for $${unlockPrice(project.type)}",
                            color = c.text,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    Icon(
                        Icons.AutoMirrored.Rounded.ArrowForward,
                        contentDescription = null,
                        tint = c.accentLight,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun FactChip(
    icon: ImageVector,
    label: String,
    accent: Boolean,
) {
    val c = Bhq.colors
    Row(
        Modifier
            .clip(CircleShape)
            .background(if (accent) c.accentMuted else c.surfaceElev)
            .border(
                1.dp,
                if (accent) c.accent.copy(alpha = 0.35f) else c.blueprintLine.copy(alpha = 0.08f),
                CircleShape,
            )
            .padding(horizontal = 9.dp, vertical = 5.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (accent) c.accent else c.textDim,
            modifier = Modifier.size(10.dp),
        )
        Text(
            label,
            color = if (accent) c.accentLight else c.textMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private fun typeIcon(type: String?): ImageVector = when (type) {
    "single_dwelling" -> Icons.Rounded.Home
    "multi_dwelling" -> Icons.Rounded.Apartment
    "renovation" -> Icons.Rounded.FormatPaint
    "extension" -> Icons.Rounded.OpenInFull
    else -> Icons.Rounded.Crop
}

/** Mirrors the web's per-type unlock pricing table. */
private fun unlockPrice(type: String?): Int = when (type) {
    "renovation" -> 99
    "extension" -> 149
    "single_dwelling" -> 199
    "multi_dwelling" -> 249
    else -> 199
}

/** "NEW" / "Today" / "Yesterday" / "3d ago" / "2w ago" / "1mo ago". */
private fun freshness(publishedAt: String?): String {
    if (publishedAt == null) return "NEW"
    val days = try {
        Duration.between(Instant.parse(publishedAt), Instant.now()).toDays().coerceAtLeast(0)
    } catch (_: Exception) {
        return "NEW"
    }
    return when {
        days == 0L -> "Today"
        days == 1L -> "Yesterday"
        days < 7 -> "${days}d ago"
        days < 30 -> "${days / 7}w ago"
        else -> "${days / 30}mo ago"
    }
}
