package au.com.builderhq.app.feature.owner

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Bhq
import java.time.YearMonth

@Composable
internal fun SectionTitle(text: String) {
    Text(text, color = Bhq.colors.text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
}

// ── Big choice card (type / start choice) ───────────────────────────

@Composable
internal fun BigChoiceCard(
    selected: Boolean,
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val haptics = rememberHaptics()
    val scale by animateFloatAsState(if (selected) 1f else 0.99f, spring(), label = "card")
    val border by animateColorAsState(if (selected) Bhq.colors.accent.copy(alpha = 0.6f) else Bhq.colors.blueprintLine.copy(alpha = 0.12f), label = "b")
    Box(
        modifier
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(18.dp))
            .background(if (selected) Bhq.colors.accent.copy(alpha = 0.10f) else Bhq.colors.surfaceElev)
            .border(1.dp, border, RoundedCornerShape(18.dp))
            .pressable { haptics.tick(); onClick() }
            .padding(16.dp),
    ) {
        Column {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Box(
                    Modifier.size(40.dp).clip(RoundedCornerShape(12.dp))
                        .background(if (selected) Bhq.colors.accent.copy(alpha = 0.18f) else Bhq.colors.fillFaint),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = if (selected) Bhq.colors.accentLight else Bhq.colors.textMuted, modifier = Modifier.size(20.dp))
                }
                RadioDot(selected)
            }
            Spacer(Modifier.height(14.dp))
            Text(title, color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(3.dp))
            Text(subtitle, color = Bhq.colors.textMuted, fontSize = 12.sp, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun RadioDot(selected: Boolean) {
    Box(
        Modifier.size(20.dp).clip(CircleShape)
            .background(if (selected) Bhq.colors.accent else Color.Transparent)
            .border(1.5.dp, if (selected) Bhq.colors.accent else Bhq.colors.blueprintLine.copy(alpha = 0.3f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (selected) Icon(Icons.Rounded.Check, contentDescription = null, tint = Bhq.colors.accentContrast, modifier = Modifier.size(13.dp))
    }
}

// ── Pill stepper (small integers) ───────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun PillStepper(label: String, value: Int?, range: IntRange, onChange: (Int) -> Unit) {
    val haptics = rememberHaptics()
    Column {
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            range.forEach { n ->
                val on = value == n
                val scale by animateFloatAsState(if (on) 1.06f else 1f, spring(), label = "pill")
                Box(
                    Modifier.graphicsLayer { scaleX = scale; scaleY = scale }
                        .size(44.dp).clip(RoundedCornerShape(12.dp))
                        .background(if (on) Bhq.colors.accent else Bhq.colors.surfaceElev)
                        .border(1.dp, if (on) Color.Transparent else Bhq.colors.blueprintLine.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                        .pressable { haptics.tick(); onChange(n) },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (n == range.last) "$n+" else "$n",
                        color = if (on) Bhq.colors.accentContrast else Bhq.colors.textMuted, fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

// ── Band picker (vertical tiles) ────────────────────────────────────

@Composable
internal fun BandPicker(label: String, options: List<Pair<String, String>>, selected: String?, onSelect: (String) -> Unit) {
    val haptics = rememberHaptics()
    Column {
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, text) ->
                val on = value == selected
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp))
                        .background(if (on) Bhq.colors.accent.copy(alpha = 0.12f) else Bhq.colors.surfaceElev)
                        .border(1.dp, if (on) Bhq.colors.accent.copy(alpha = 0.45f) else Bhq.colors.blueprintLine.copy(alpha = 0.10f), RoundedCornerShape(13.dp))
                        .pressable { haptics.tick(); onSelect(value) }
                        .padding(horizontal = 14.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(text, color = if (on) Bhq.colors.text else Bhq.colors.textMuted, fontSize = 14.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.weight(1f))
                    RadioDot(on)
                }
            }
        }
    }
}

// ── Multi-select tags (renovation scope) ────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun ChoiceTags(label: String, options: List<Pair<String, String>>, selected: List<String>, onToggle: (String) -> Unit) {
    val haptics = rememberHaptics()
    Column {
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, text) ->
                val on = value in selected
                Box(
                    Modifier.clip(RoundedCornerShape(50))
                        .background(if (on) Bhq.colors.accent.copy(alpha = 0.14f) else Bhq.colors.surfaceElev)
                        .border(1.dp, if (on) Bhq.colors.accent.copy(alpha = 0.45f) else Bhq.colors.blueprintLine.copy(alpha = 0.12f), RoundedCornerShape(50))
                        .pressable { haptics.tick(); onToggle(value) }
                        .padding(horizontal = 14.dp, vertical = 9.dp),
                ) {
                    Text(text, color = if (on) Bhq.colors.accentLight else Bhq.colors.textMuted, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

// ── Month grid ──────────────────────────────────────────────────────

@Composable
internal fun MonthGrid(label: String, selected: String?, onSelect: (String) -> Unit) {
    val haptics = rememberHaptics()
    val now = YearMonth.now()
    val years = (0..2).map { now.year + it }
    val sel = selected?.let { runCatching { YearMonth.parse(it) }.getOrNull() }
    val activeYear = sel?.year ?: now.year
    val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    Column {
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            years.forEach { y ->
                val on = y == activeYear
                Box(
                    Modifier.clip(RoundedCornerShape(50))
                        .background(if (on) Bhq.colors.accent.copy(alpha = 0.14f) else Bhq.colors.surfaceElev)
                        .border(1.dp, if (on) Bhq.colors.accent.copy(alpha = 0.4f) else Bhq.colors.blueprintLine.copy(alpha = 0.1f), RoundedCornerShape(50))
                        .pressable { haptics.tick(); onSelect("%04d-%02d".format(y, (sel?.monthValue ?: now.monthValue))) }
                        .padding(horizontal = 14.dp, vertical = 7.dp),
                ) {
                    Text("$y", color = if (on) Bhq.colors.accentLight else Bhq.colors.textMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        months.chunked(4).forEachIndexed { rowIdx, row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEachIndexed { colIdx, name ->
                    val monthNum = rowIdx * 4 + colIdx + 1
                    val disabled = activeYear == now.year && monthNum < now.monthValue
                    val on = sel?.year == activeYear && sel.monthValue == monthNum
                    Box(
                        Modifier.weight(1f).height(40.dp).clip(RoundedCornerShape(11.dp))
                            .background(if (on) Bhq.colors.accent else Bhq.colors.surfaceElev)
                            .border(1.dp, if (on) Color.Transparent else Bhq.colors.blueprintLine.copy(alpha = 0.1f), RoundedCornerShape(11.dp))
                            .then(if (disabled) Modifier else Modifier.pressable { haptics.tick(); onSelect("%04d-%02d".format(activeYear, monthNum)) })
                            .graphicsLayer { alpha = if (disabled) 0.3f else 1f },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(name, color = if (on) Bhq.colors.accentContrast else Bhq.colors.textMuted, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }
                }
                repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
            }
            if (rowIdx < 2) Spacer(Modifier.height(8.dp))
        }
    }
}

// ── Text field ──────────────────────────────────────────────────────

@Composable
internal fun WizardField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    singleLine: Boolean = true,
    minHeight: Int = 0,
) {
    Column {
        Text(label.uppercase(), color = Bhq.colors.textDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(7.dp))
        Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Bhq.colors.surfaceElev)
                .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.14f), RoundedCornerShape(13.dp))
                .padding(14.dp)
                .then(if (minHeight > 0) Modifier.heightIn(min = minHeight.dp) else Modifier),
        ) {
            if (value.isEmpty()) Text(placeholder, color = Bhq.colors.textDim, fontSize = 15.sp, lineHeight = 21.sp)
            BasicTextField(
                value = value, onValueChange = onChange, singleLine = singleLine,
                textStyle = TextStyle(color = Bhq.colors.text, fontSize = 15.sp, lineHeight = 21.sp),
                cursorBrush = SolidColor(Bhq.colors.accent), modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
