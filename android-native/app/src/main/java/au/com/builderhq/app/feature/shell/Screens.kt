package au.com.builderhq.app.feature.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.GhostButton
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.Pill
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.ProgressRing
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.theme.Bhq

/** Home tab (for now): a living gallery of the design system. */
@Composable
fun DesignGalleryScreen() {
    val c = Bhq.colors
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Spacer(Modifier.height(8.dp))
        Kicker("Design system")
        Spacer(Modifier.height(12.dp))
        Text("BuilderHQ", fontSize = 40.sp, fontWeight = FontWeight.SemiBold, color = c.text)
        Text("Android · foundation online", fontSize = 14.sp, color = c.accentLight)
        Spacer(Modifier.height(24.dp))

        CardSurface(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Kicker("Founding access")
                    Spacer(Modifier.weight(1f))
                    Pill("Live", accent = true)
                }
                Spacer(Modifier.height(18.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ProgressRing(progress = 0.6f, diameter = 76.dp)
                    Spacer(Modifier.width(20.dp))
                    Column {
                        Text("3 of 5", fontSize = 30.sp, fontWeight = FontWeight.Bold, color = c.text)
                        Text("free unlocks this cycle", fontSize = 13.sp, color = c.textMuted)
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        Row {
            PrimaryButton("Unlock", onClick = {}, leadingIcon = Icons.Rounded.Bolt)
            Spacer(Modifier.width(12.dp))
            GhostButton("Save", onClick = {})
        }
        Spacer(Modifier.height(16.dp))

        Row {
            Pill("ABN verified", accent = true)
            Spacer(Modifier.width(8.dp))
            Pill("Licence")
            Spacer(Modifier.width(8.dp))
            Pill("VIC")
        }
        Spacer(Modifier.height(16.dp))

        CardSurface(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                SkeletonBox(Modifier.fillMaxWidth().height(14.dp))
                Spacer(Modifier.height(10.dp))
                SkeletonBox(Modifier.fillMaxWidth(0.6f).height(14.dp))
            }
        }
        Spacer(Modifier.height(48.dp))
    }
}

@Composable
fun PlaceholderScreen(title: String, subtitle: String, icon: ImageVector) {
    val c = Bhq.colors
    Box(
        Modifier.fillMaxSize().statusBarsPadding().padding(28.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(c.accent.copy(alpha = 0.10f))
                    .border(1.dp, c.blueprintLine.copy(alpha = 0.18f), RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = c.accentLight, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text(title, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, color = c.text)
            Spacer(Modifier.height(6.dp))
            Text(subtitle, fontSize = 14.sp, color = c.textMuted, textAlign = TextAlign.Center)
        }
    }
}
