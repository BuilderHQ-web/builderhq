package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.theme.Bhq

/** Shared chrome for every auth screen: the ambient backdrop, an optional
 *  circular back button, and a keyboard-aware scrolling content column. */
@Composable
fun AuthScaffold(
    onBack: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    AmbientBackground {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp),
        ) {
            Spacer(Modifier.height(12.dp))
            if (onBack != null) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Bhq.colors.fillSubtle)
                        .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onBack),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = "Back",
                        tint = Bhq.colors.text,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Spacer(Modifier.height(12.dp))
            }
            content()
            Spacer(Modifier.height(40.dp))
        }
    }
}
