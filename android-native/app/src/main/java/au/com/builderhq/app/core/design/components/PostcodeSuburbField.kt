package au.com.builderhq.app.core.design.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.PostcodeResponse

/** A resolved AU location: 4-digit postcode + suburb + state. */
data class PostcodeSelection(
    val postcode: String,
    val suburb: String,
    val state: String,
)

/**
 * Postcode-first suburb picker — the shared primitive for business /
 * postal addresses, service-area drafts, and owner default location.
 *
 * Type 4 digits → looked up via GET /api/mobile/postcodes/{postcode}:
 * one match auto-selects; several show a "WHICH SUBURB?" list; none
 * shows a warning hint. Editing after selection clears it.
 */
@Composable
fun PostcodeSuburbField(
    selection: PostcodeSelection?,
    onSelectionChange: (PostcodeSelection?) -> Unit,
    lookup: suspend (String) -> ApiResult<PostcodeResponse>,
    modifier: Modifier = Modifier,
    error: String? = null,
) {
    val c = Bhq.colors
    var input by remember { mutableStateOf(selection?.postcode ?: "") }
    var candidates by remember { mutableStateOf<List<PostcodeSelection>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var hint by remember { mutableStateOf<String?>(null) }
    var hintIsWarning by remember { mutableStateOf(true) }

    // Lookup fires when a full 4-digit postcode is present and nothing
    // is selected yet.
    LaunchedEffect(input, selection) {
        candidates = emptyList()
        hint = null
        if (selection != null || input.length != 4) return@LaunchedEffect
        loading = true
        when (val r = lookup(input)) {
            is ApiResult.Success -> {
                val subs = r.data.suburbs.map {
                    PostcodeSelection(r.data.postcode.ifBlank { input }, it.suburb, it.state)
                }
                when {
                    subs.isEmpty() -> {
                        hint = "Postcode not recognised — double-check the 4 digits."
                        hintIsWarning = true
                    }
                    subs.size == 1 -> onSelectionChange(subs.first())
                    else -> candidates = subs
                }
            }
            else -> {
                hint = "Couldn't look that postcode up. Try again in a moment."
                hintIsWarning = false
            }
        }
        loading = false
    }

    Column(modifier) {
        if (selection != null) {
            // Resolved chip: teal check + "Suburb · STATE" + clear.
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(c.accentMuted)
                    .border(1.dp, c.accent.copy(alpha = 0.30f), RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.CheckCircle, null, tint = c.accent, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Text(
                    "${selection.suburb} · ${selection.state} ${selection.postcode}",
                    color = c.text, fontSize = 15.sp, fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    Icons.Rounded.Close, "Clear", tint = c.textDim,
                    modifier = Modifier.size(18.dp).pressable {
                        onSelectionChange(null)
                        input = ""
                    },
                )
            }
        } else {
            val interaction = remember { MutableInteractionSource() }
            val focused by interaction.collectIsFocusedAsState()
            val borderColor = when {
                error != null -> c.danger
                focused -> c.accent
                else -> c.blueprintLine.copy(alpha = 0.14f)
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Bhq.brushes.field)
                    .border(1.dp, borderColor, RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Place, null, tint = c.textDim, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Box(Modifier.weight(1f)) {
                    if (input.isEmpty()) {
                        Text("Postcode", color = c.textDim, fontSize = 15.sp)
                    }
                    BasicTextField(
                        value = input,
                        onValueChange = { v -> input = v.filter { it.isDigit() }.take(4) },
                        singleLine = true,
                        interactionSource = interaction,
                        textStyle = TextStyle(color = c.text, fontSize = 15.sp),
                        cursorBrush = SolidColor(c.accent),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (loading) {
                    CircularProgressIndicator(
                        color = c.accent, strokeWidth = 2.dp,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }

            AnimatedVisibility(candidates.isNotEmpty()) {
                Column(Modifier.padding(top = 8.dp)) {
                    Text(
                        "WHICH SUBURB?",
                        color = c.textDim, fontSize = 11.sp,
                        fontWeight = FontWeight.Bold, letterSpacing = 2.sp,
                    )
                    Spacer(Modifier.height(6.dp))
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(c.surfaceElev)
                            .border(1.dp, c.blueprintLine.copy(alpha = 0.10f), RoundedCornerShape(14.dp)),
                    ) {
                        candidates.forEach { cand ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .pressable { onSelectionChange(cand) }
                                    .padding(horizontal = 14.dp, vertical = 13.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    cand.suburb, color = c.text, fontSize = 15.sp,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(cand.state, color = c.textMuted, fontSize = 13.sp)
                                Spacer(Modifier.width(6.dp))
                                Icon(
                                    Icons.Rounded.ChevronRight, null,
                                    tint = c.textDim, modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                    }
                }
            }

            hint?.let {
                Spacer(Modifier.height(6.dp))
                Text(it, color = if (hintIsWarning) c.warning else c.textMuted, fontSize = 12.sp)
            }
            error?.let {
                Spacer(Modifier.height(6.dp))
                Text(it, color = c.danger, fontSize = 12.sp)
            }
        }
    }
}
