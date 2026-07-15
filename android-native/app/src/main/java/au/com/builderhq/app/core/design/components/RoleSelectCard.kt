package au.com.builderhq.app.core.design.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.theme.Bhq

/** Big, tappable selectable card — used for the "I'm an owner / builder"
 *  choice. Selected state lights the border teal, glows, and shows a check. */
@Composable
fun RoleSelectCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(16.dp)
    val border by animateColorAsState(
        if (selected) Bhq.colors.accent else Bhq.colors.blueprintLine.copy(alpha = 0.14f),
        label = "roleBorder",
    )
    Row(
        modifier
            .fillMaxWidth()
            .then(
                if (selected) Modifier.shadow(
                    12.dp, shape,
                    ambientColor = Bhq.colors.accent.copy(alpha = 0.25f),
                    spotColor = Bhq.colors.accent.copy(alpha = 0.35f),
                ) else Modifier,
            )
            .clip(shape)
            .background(Bhq.brushes.card)
            .border(if (selected) 1.5.dp else 1.dp, border, shape)
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (selected) Bhq.colors.accent.copy(alpha = 0.16f) else Bhq.colors.fillSubtle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon, contentDescription = null,
                tint = if (selected) Bhq.colors.accentLight else Bhq.colors.textMuted,
                modifier = Modifier.size(22.dp),
            )
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Bhq.colors.text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, color = Bhq.colors.textMuted, fontSize = 13.sp, lineHeight = 17.sp)
        }
        Spacer(Modifier.width(10.dp))
        Box(
            Modifier
                .size(22.dp)
                .clip(RoundedCornerShape(50))
                .background(if (selected) Bhq.colors.accent else Color.Transparent)
                .border(1.5.dp, if (selected) Bhq.colors.accent else Bhq.colors.textDim, RoundedCornerShape(50)),
            contentAlignment = Alignment.Center,
        ) {
            if (selected) {
                Icon(
                    Icons.Rounded.Check, contentDescription = "Selected",
                    tint = Bhq.colors.accentContrast, modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}
