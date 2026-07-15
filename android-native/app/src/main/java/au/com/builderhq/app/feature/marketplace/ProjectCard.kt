package au.com.builderhq.app.feature.marketplace

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Pill
import au.com.builderhq.app.core.design.components.ProjectCoverArt
import au.com.builderhq.app.core.design.components.SaveButton
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.model.ProjectLabels
import au.com.builderhq.app.core.network.dto.ProjectRowDto

@Composable
fun ProjectCard(
    project: ProjectRowDto,
    onClick: () -> Unit,
    onToggleSave: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val slotsLeft = (project.unlockCap - project.unlockedCount).coerceAtLeast(0)
    CardSurface(modifier.pressable(onClick = onClick)) {
        Column {
            Box(Modifier.fillMaxWidth().height(150.dp)) {
                ProjectCoverArt(seed = project.id, type = project.type, modifier = Modifier.fillMaxWidth().height(150.dp))
                // Legibility scrim over the lower half.
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Bhq.colors.scrimStrong))),
                )
                Row(
                    Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Pill(ProjectLabels.type(project.type), accent = true)
                    SaveButton(project.isSaved, onToggleSave)
                }
                Row(
                    Modifier.align(Alignment.BottomStart).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    UnlockDots(project.unlockedCount, project.unlockCap)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (slotsLeft == 0) "Fully tendered" else "$slotsLeft of ${project.unlockCap} slots open",
                        color = Bhq.colors.blueprintPale, fontSize = 11.sp, fontWeight = FontWeight.Medium,
                    )
                }
            }
            Column(Modifier.padding(16.dp)) {
                Text(
                    project.title, color = Bhq.colors.text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = Bhq.colors.textDim, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        ProjectLabels.location(project.suburb, project.state).ifBlank { "Australia" },
                        color = Bhq.colors.textMuted, fontSize = 13.sp,
                    )
                }
                val spec = listOfNotNull(
                    project.bedrooms?.let { "$it bd" },
                    project.bathrooms?.let { "$it ba" },
                )
                if (spec.isNotEmpty()) {
                    Spacer(Modifier.height(7.dp))
                    Text(spec.joinToString("   ·   "), color = Bhq.colors.textDim, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ProjectLabels.budget(project.budgetBand)?.let {
                        Pill(it)
                        Spacer(Modifier.width(8.dp))
                    }
                    if (project.documentCount > 0) {
                        Pill("${project.documentCount} plan${if (project.documentCount == 1) "" else "s"}")
                    }
                    Spacer(Modifier.weight(1f))
                    ProjectCardCta(isUnlocked = project.isUnlocked, slotsLeft = slotsLeft)
                }
            }
        }
    }
}

@Composable
private fun ProjectCardCta(isUnlocked: Boolean, slotsLeft: Int) {
    when {
        isUnlocked -> Pill("Unlocked", accent = true)
        slotsLeft == 0 -> Text("Full", color = Bhq.colors.textDim, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        else -> Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Bolt, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(3.dp))
            Text("Unlock", color = Bhq.colors.accentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun UnlockDots(filled: Int, cap: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        repeat(cap) { i ->
            Box(
                Modifier
                    .size(7.dp)
                    .clip(CircleShape)
                    .background(if (i < filled) Bhq.colors.accent else Color.White.copy(alpha = 0.3f)),
            )
        }
    }
}
