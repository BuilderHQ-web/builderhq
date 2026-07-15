package au.com.builderhq.app.feature.onboarding.builder

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.FormatPaint
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.OpenInFull
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq

/** One selectable project-type card in the step-03 grid. */
private data class CategoryOption(
    val value: String,
    val label: String,
    val caption: String,
    val icon: ImageVector,
)

private val categoryOptions = listOf(
    CategoryOption(
        value = "single_dwelling",
        label = "Single dwelling",
        caption = "Standalone homes — new builds + custom",
        icon = Icons.Rounded.Home,
    ),
    CategoryOption(
        value = "multi_dwelling",
        label = "Multi-dwelling",
        caption = "Townhouses, duplexes, multi-unit",
        icon = Icons.Rounded.Apartment,
    ),
    CategoryOption(
        value = "renovation",
        label = "Renovation",
        caption = "Kitchen, bathroom, full refurb",
        icon = Icons.Rounded.FormatPaint,
    ),
    CategoryOption(
        value = "extension",
        label = "Extension",
        caption = "Adding to an existing home",
        icon = Icons.Rounded.OpenInFull,
    ),
)

/** Step 03 · project types — replace-all multi-select card grid. */
@Composable
internal fun Step03Categories(vm: BuilderWizardViewModel) {
    Column(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 12.dp),
        ) {
            WizardHeader(
                index = WizardStep.Categories.index,
                kicker = WizardStep.Categories.label,
                title = "What kind of",
                titleAccent = "work do you do?",
                caption = "Pick everything that fits. You'll see projects that match these in your inbox.",
            )
            Spacer(Modifier.height(24.dp))

            categoryOptions.chunked(2).forEachIndexed { rowIndex, pair ->
                if (rowIndex > 0) Spacer(Modifier.height(10.dp))
                Row(
                    Modifier.fillMaxWidth().height(IntrinsicSize.Min),
                ) {
                    pair.forEachIndexed { i, option ->
                        if (i > 0) Spacer(Modifier.width(10.dp))
                        CategoryCard(
                            option = option,
                            selected = option.value in vm.selectedCategories,
                            onToggle = { vm.toggleCategory(option.value) },
                            modifier = Modifier.weight(1f).fillMaxHeight(),
                        )
                    }
                }
            }
        }

        vm.bannerError?.let { WizardBanner(it, Modifier.padding(bottom = 10.dp)) }
        WizardFooter(
            canContinue = vm.selectedCategories.isNotEmpty(),
            isSaving = vm.isSaving,
            onContinue = vm::saveCategoriesStep,
            onBack = vm::goBack,
            modifier = Modifier.padding(bottom = 16.dp),
        )
    }
}

@Composable
private fun CategoryCard(
    option: CategoryOption,
    selected: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = Bhq.colors
    val shape = RoundedCornerShape(16.dp)
    val fill by animateColorAsState(
        if (selected) c.accentMuted else c.surfaceElev,
        label = "categoryFill",
    )
    val border by animateColorAsState(
        if (selected) c.accent.copy(alpha = 0.30f) else c.blueprintLine.copy(alpha = 0.10f),
        label = "categoryBorder",
    )

    Column(
        modifier
            .clip(shape)
            .background(fill)
            .border(1.dp, border, shape)
            .pressable(onClick = onToggle)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Icon(
                option.icon,
                contentDescription = null,
                tint = if (selected) c.accentLight else c.textMuted,
                modifier = Modifier.size(22.dp),
            )
            Spacer(Modifier.weight(1f))
            Icon(
                if (selected) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (selected) c.accentLight else c.textDim.copy(alpha = 0.55f),
                modifier = Modifier.size(18.dp),
            )
        }
        Spacer(Modifier.height(12.dp))
        Text(
            option.label,
            color = c.text,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(3.dp))
        Text(
            option.caption,
            color = c.textMuted,
            fontSize = 12.sp,
            lineHeight = 16.sp,
        )
    }
}
