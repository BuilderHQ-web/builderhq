package au.com.builderhq.app.core.design.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.theme.Bhq

/** The premium text field: floating caps label, blueprint hairline that
 *  ignites teal (with a soft glow) on focus, password reveal toggle, and an
 *  animated inline error. Touched on every form in the app. */
@Composable
fun BhqTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    leadingIcon: ImageVector? = null,
    isPassword: Boolean = false,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    capitalize: Boolean = false,
    enabled: Boolean = true,
    onImeAction: () -> Unit = {},
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    var hidden by remember { mutableStateOf(true) }
    val shape = RoundedCornerShape(14.dp)
    val borderColor by animateColorAsState(
        targetValue = when {
            error != null -> Bhq.colors.danger
            focused -> Bhq.colors.accent
            else -> Bhq.colors.blueprintLine.copy(alpha = 0.16f)
        },
        label = "fieldBorder",
    )

    Column(modifier) {
        Text(
            label.uppercase(),
            color = if (error != null) Bhq.colors.danger else Bhq.colors.textDim,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.6.sp,
        )
        Spacer(Modifier.height(7.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .then(
                    if (focused) Modifier.shadow(
                        10.dp, shape,
                        ambientColor = Bhq.colors.accent.copy(alpha = 0.25f),
                        spotColor = Bhq.colors.accent.copy(alpha = 0.35f),
                    ) else Modifier,
                )
                .clip(shape)
                .background(Bhq.brushes.field)
                .border(1.5.dp, borderColor, shape)
                .padding(horizontal = 14.dp, vertical = 15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leadingIcon != null) {
                Icon(
                    leadingIcon, contentDescription = null,
                    tint = if (focused) Bhq.colors.accent else Bhq.colors.textDim,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(10.dp))
            }
            Box(Modifier.weight(1f)) {
                if (value.isEmpty()) {
                    Text(placeholder, color = Bhq.colors.textDim, fontSize = 16.sp)
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    textStyle = TextStyle(color = Bhq.colors.text, fontSize = 16.sp),
                    singleLine = true,
                    enabled = enabled,
                    cursorBrush = SolidColor(Bhq.colors.accent),
                    visualTransformation = if (isPassword && hidden) {
                        PasswordVisualTransformation()
                    } else {
                        VisualTransformation.None
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = keyboardType,
                        imeAction = imeAction,
                        capitalization = if (capitalize) {
                            KeyboardCapitalization.Words
                        } else {
                            KeyboardCapitalization.None
                        },
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { onImeAction() },
                        onDone = { onImeAction() },
                        onGo = { onImeAction() },
                        onSend = { onImeAction() },
                    ),
                    interactionSource = interaction,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (isPassword) {
                Spacer(Modifier.width(8.dp))
                Icon(
                    if (hidden) Icons.Rounded.Visibility else Icons.Rounded.VisibilityOff,
                    contentDescription = if (hidden) "Show password" else "Hide password",
                    tint = Bhq.colors.textDim,
                    modifier = Modifier.size(20.dp).clickable { hidden = !hidden },
                )
            }
        }
        AnimatedVisibility(visible = error != null) {
            Text(
                error ?: "",
                color = Bhq.colors.danger,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 6.dp, start = 2.dp),
            )
        }
    }
}

/** Segmented 6-box verification code input. A single hidden field captures
 *  the digits; each box lights teal when active/filled, with a pulsing caret
 *  in the focused-empty box. Auto-focuses (keyboard opens on arrival) and
 *  fires [onComplete] on the final digit. */
@Composable
fun OtpInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    length: Int = 6,
    isError: Boolean = false,
    onComplete: (String) -> Unit = {},
) {
    val focusRequester = remember { FocusRequester() }
    BasicTextField(
        value = value,
        onValueChange = {
            val digits = it.filter(Char::isDigit).take(length)
            if (digits != value) {
                onValueChange(digits)
                if (digits.length == length) onComplete(digits)
            }
        },
        modifier = modifier.focusRequester(focusRequester),
        cursorBrush = SolidColor(Color.Transparent),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done,
        ),
        decorationBox = {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(length) { i ->
                    OtpCell(
                        char = value.getOrNull(i)?.toString() ?: "",
                        active = i == value.length,
                        isError = isError,
                    )
                }
            }
        },
    )
    androidx.compose.runtime.LaunchedEffect(Unit) { focusRequester.requestFocus() }
}

@Composable
private fun OtpCell(char: String, active: Boolean, isError: Boolean) {
    val filled = char.isNotEmpty()
    val shape = RoundedCornerShape(12.dp)
    val border by animateColorAsState(
        when {
            isError -> Bhq.colors.danger
            active || filled -> Bhq.colors.accent
            else -> Bhq.colors.blueprintLine.copy(alpha = 0.16f)
        },
        label = "otpBorder",
    )
    val transition = rememberInfiniteTransition(label = "caret")
    val caretAlpha by transition.animateFloat(
        0.15f, 1f,
        infiniteRepeatable(tween(650), RepeatMode.Reverse),
        label = "caretAlpha",
    )
    Box(
        Modifier
            .size(width = 48.dp, height = 58.dp)
            .then(
                if (active) Modifier.shadow(
                    10.dp, shape,
                    ambientColor = Bhq.colors.accent.copy(alpha = 0.30f),
                    spotColor = Bhq.colors.accent.copy(alpha = 0.40f),
                ) else Modifier,
            )
            .clip(shape)
            .background(Bhq.brushes.field)
            .border(1.5.dp, border, shape),
        contentAlignment = Alignment.Center,
    ) {
        if (filled) {
            Text(char, color = Bhq.colors.text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
        } else if (active) {
            Box(
                Modifier
                    .size(width = 2.dp, height = 24.dp)
                    .background(Bhq.colors.accent.copy(alpha = caretAlpha)),
            )
        }
    }
}
