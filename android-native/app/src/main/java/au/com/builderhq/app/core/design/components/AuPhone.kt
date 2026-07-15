package au.com.builderhq.app.core.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.theme.Bhq

/**
 * AU phone parsing/formatting — mirrors the iOS `AuPhone` + web rules.
 * Valid = AU mobile or landline: first significant digit ∈ {2,3,4,7,8}.
 */
object AuPhone {
    private val validFirst = setOf('2', '3', '4', '7', '8')

    /** E.164 (+61…) or null if not a valid AU number. */
    fun normalise(input: String): String? {
        val cleaned = buildString {
            input.forEachIndexed { i, ch ->
                if (ch.isDigit() || (ch == '+' && i == 0)) append(ch)
            }
        }
        return when {
            cleaned.startsWith("+61") && cleaned.length == 12 &&
                cleaned[3] in validFirst -> cleaned
            cleaned.startsWith("61") && cleaned.length == 11 &&
                cleaned[2] in validFirst -> "+$cleaned"
            cleaned.startsWith("0") && cleaned.length == 10 &&
                cleaned[1] in validFirst -> "+61" + cleaned.drop(1)
            else -> null
        }
    }

    fun isValid(input: String): Boolean = normalise(input) != null

    /** Digits that count toward the 9 significant AU digits. */
    fun significantDigitCount(input: String): Int {
        val digits = input.filter { it.isDigit() }
        return when {
            digits.startsWith("61") -> (digits.length - 2).coerceAtLeast(0)
            digits.startsWith("0") -> (digits.length - 1).coerceAtLeast(0)
            else -> digits.length
        }
    }

    /** Live grouping: mobile `04XX XXX XXX`, landline `0X XXXX XXXX`. */
    fun formatAsTyping(input: String): String {
        val hasPlus = input.trimStart().startsWith("+")
        val digits = input.filter { it.isDigit() }.take(if (hasPlus) 11 else 10)
        if (hasPlus) return "+$digits"
        if (digits.isEmpty()) return ""
        return if (digits.startsWith("04")) {
            listOfNotNull(
                digits.take(4),
                digits.drop(4).take(3).ifEmpty { null },
                digits.drop(7).take(3).ifEmpty { null },
            ).joinToString(" ")
        } else {
            listOfNotNull(
                digits.take(2),
                digits.drop(2).take(4).ifEmpty { null },
                digits.drop(6).take(4).ifEmpty { null },
            ).joinToString(" ")
        }
    }

    /** `+61412345678` → `0412 345 678` for resume display. */
    fun displayFromE164(e164: String?): String {
        if (e164.isNullOrBlank()) return ""
        return if (e164.startsWith("+61") && e164.length == 12) {
            formatAsTyping("0" + e164.drop(3))
        } else {
            e164
        }
    }
}

/**
 * Branded AU phone input: static 🇦🇺 +61 chip, hairline divider,
 * live-grouped digits, teal tick when valid. Live error appears only
 * once ≥9 significant digits are present (don't nag mid-type);
 * [error] from the server overrides it.
 */
@Composable
fun AuPhoneField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
) {
    val c = Bhq.colors
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val valid = AuPhone.isValid(value)
    val liveError = when {
        error != null -> error
        value.isNotBlank() && !valid &&
            AuPhone.significantDigitCount(value) >= 9 ->
            "Enter a valid AU mobile or landline."
        else -> null
    }
    val borderColor = when {
        liveError != null -> c.danger
        focused -> c.accent
        else -> c.blueprintLine.copy(alpha = 0.14f)
    }

    Column(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .height(54.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Bhq.brushes.field)
                .border(1.dp, borderColor, RoundedCornerShape(14.dp)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "🇦🇺  +61",
                color = c.textMuted,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 14.dp),
            )
            Box(
                Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .padding(vertical = 12.dp)
                    .background(c.blueprintLine.copy(alpha = 0.14f)),
            )
            Box(Modifier.weight(1f).padding(horizontal = 14.dp)) {
                if (value.isEmpty()) {
                    Text("0412 345 678", color = c.textDim, fontSize = 15.sp)
                }
                BasicTextField(
                    value = value,
                    onValueChange = { onValueChange(AuPhone.formatAsTyping(it)) },
                    singleLine = true,
                    interactionSource = interaction,
                    textStyle = TextStyle(color = c.text, fontSize = 15.sp),
                    cursorBrush = SolidColor(c.accent),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (valid && value.isNotBlank()) {
                Icon(
                    Icons.Rounded.CheckCircle,
                    contentDescription = "Valid",
                    tint = c.accent,
                    modifier = Modifier.size(18.dp).padding(end = 0.dp),
                )
                Spacer(Modifier.width(12.dp))
            }
        }
        if (liveError != null) {
            Spacer(Modifier.height(6.dp))
            Text(liveError, color = c.danger, fontSize = 12.sp)
        }
    }
}
