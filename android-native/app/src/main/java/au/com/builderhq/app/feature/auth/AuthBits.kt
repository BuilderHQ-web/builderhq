package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary

/** Standard auth-screen heading: kicker + big title + supporting line. */
@Composable
fun AuthHeader(kicker: String, title: String, subtitle: String) {
    Column {
        Kicker(kicker)
        Spacer(Modifier.height(16.dp))
        Text(title, fontSize = 34.sp, lineHeight = 38.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
        Spacer(Modifier.height(10.dp))
        Text(subtitle, fontSize = 15.sp, lineHeight = 22.sp, color = TextMuted)
    }
}

/** "New here? Create account" style footer with a teal tappable tail. */
@Composable
fun AuthTextLink(prefix: String, link: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        Text(prefix, color = TextMuted, fontSize = 14.sp)
        Spacer(Modifier.width(5.dp))
        Text(
            link, color = AccentLight, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClick),
        )
    }
}

/** Red-tinted inline error banner for failed submits. */
@Composable
fun AuthErrorBanner(message: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Danger.copy(alpha = 0.10f))
            .border(1.dp, Danger.copy(alpha = 0.30f), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.ErrorOutline, contentDescription = null, tint = Danger, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(message, color = TextPrimary, fontSize = 13.sp, lineHeight = 18.sp)
    }
}

/** Teal-tinted info banner (e.g. "We sent a code to your email"). */
@Composable
fun AuthInfoBanner(message: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Accent.copy(alpha = 0.08f))
            .border(1.dp, BlueprintLine.copy(alpha = 0.20f), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Email, contentDescription = null, tint = AccentLight, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(message, color = TextPrimary, fontSize = 13.sp, lineHeight = 18.sp)
    }
}
