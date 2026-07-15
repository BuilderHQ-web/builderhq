package au.com.builderhq.app.core.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.TextMuted

/** Frosted, lifted card: gradient fill, blueprint-blue hairline border,
 *  top-edge light catch, accent-tinted shadow. The unit of premium. */
@Composable
fun CardSurface(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(18.dp),
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier
            .shadow(
                elevation = 16.dp,
                shape = shape,
                ambientColor = Accent.copy(alpha = 0.22f),
                spotColor = Accent.copy(alpha = 0.30f),
            )
            .clip(shape)
            .background(Brush.verticalGradient(listOf(Color(0xFF162033), Color(0xFF0C1424))))
            .border(1.dp, BlueprintLine.copy(alpha = 0.12f), shape),
    ) {
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .height(1.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(Color.Transparent, Color(0x14CFE6FF), Color.Transparent),
                    ),
                ),
        )
        content()
    }
}

/** Uppercase section label with a glowing teal rule — the brand kicker. */
@Composable
fun Kicker(text: String, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .width(22.dp)
                .height(2.dp)
                .clip(RoundedCornerShape(50))
                .background(Accent),
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = text.uppercase(),
            color = Accent,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 2.2.sp,
        )
    }
}

/** Small status chip. */
@Composable
fun Pill(
    text: String,
    modifier: Modifier = Modifier,
    accent: Boolean = false,
) {
    val shape = RoundedCornerShape(50)
    Box(
        modifier
            .clip(shape)
            .border(
                1.dp,
                if (accent) Accent.copy(alpha = 0.40f) else BlueprintLine.copy(alpha = 0.14f),
                shape,
            )
            .background(if (accent) Accent.copy(alpha = 0.10f) else Color.Transparent)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text.uppercase(),
            color = if (accent) AccentLight else TextMuted,
            fontSize = 9.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.4.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
