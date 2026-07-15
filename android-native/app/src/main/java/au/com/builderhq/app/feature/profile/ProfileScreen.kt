package au.com.builderhq.app.feature.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.Gavel
import androidx.compose.material.icons.rounded.HelpOutline
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.DashboardRepository
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.data.SessionState
import au.com.builderhq.app.core.design.components.CardSurface
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.Pill
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Accent
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.design.theme.BlueprintLine
import au.com.builderhq.app.core.design.theme.Danger
import au.com.builderhq.app.core.design.theme.Success
import au.com.builderhq.app.core.design.theme.Surface1
import au.com.builderhq.app.core.design.theme.SurfaceElev
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.design.theme.TextMuted
import au.com.builderhq.app.core.design.theme.TextPrimary
import au.com.builderhq.app.core.model.Role
import au.com.builderhq.app.core.model.User
import au.com.builderhq.app.core.network.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class VerificationInfo(val abnVerified: Boolean, val anyLicenceVerified: Boolean, val approvalStatus: String?)

data class ProfileUi(val verification: VerificationInfo? = null)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val session: SessionRepository,
    private val dashboard: DashboardRepository,
) : ViewModel() {
    val state: StateFlow<SessionState> = session.state
    var ui by mutableStateOf(ProfileUi()); private set

    init {
        if ((session.state.value as? SessionState.SignedIn)?.user?.role == Role.BUILDER) fetchVerification()
    }

    private fun fetchVerification() {
        viewModelScope.launch {
            val r = dashboard.builder()
            if (r is ApiResult.Success) {
                ui = ui.copy(
                    verification = VerificationInfo(
                        r.data.verification.abnVerified,
                        r.data.verification.anyLicenceVerified,
                        r.data.profile.approvalStatus,
                    ),
                )
            }
        }
    }

    fun logout() { viewModelScope.launch { session.logout() } }
}

@Composable
fun ProfileScreen(vm: ProfileViewModel = hiltViewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val user = (state as? SessionState.SignedIn)?.user
    val context = LocalContext.current
    var confirm by remember { mutableStateOf(false) }
    val openUrl: (String) -> Unit = { url ->
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Spacer(Modifier.height(8.dp))
        Kicker("Your account")
        Spacer(Modifier.height(8.dp))
        Text("You", color = TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(22.dp))

        if (user != null) IdentityCard(user)

        vm.ui.verification?.let { v ->
            Spacer(Modifier.height(16.dp))
            VerificationCard(v)
        }

        Spacer(Modifier.height(24.dp))
        Kicker("Support")
        Spacer(Modifier.height(12.dp))
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SurfaceElev)
                .border(1.dp, BlueprintLine.copy(alpha = 0.10f), RoundedCornerShape(16.dp)),
        ) {
            LinkRow(Icons.Rounded.HelpOutline, "Help & support") { openUrl("https://builderhq.com.au/contact") }
            LinkDivider()
            LinkRow(Icons.Rounded.Gavel, "Terms of service") { openUrl("https://builderhq.com.au/terms") }
            LinkDivider()
            LinkRow(Icons.Rounded.Shield, "Privacy policy") { openUrl("https://builderhq.com.au/privacy") }
        }

        Spacer(Modifier.height(24.dp))
        SignOutRow { confirm = true }
        Spacer(Modifier.height(18.dp))
        Text(
            "BuilderHQ · v0.1.0 · early access",
            color = TextDim, fontSize = 12.sp, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(40.dp))
    }

    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            containerColor = Surface1,
            titleContentColor = TextPrimary,
            textContentColor = TextMuted,
            title = { Text("Sign out?") },
            text = { Text("You'll need to sign in again to get back to your projects.") },
            confirmButton = {
                TextButton(onClick = { confirm = false; vm.logout() }) {
                    Text("Sign out", color = Danger, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirm = false }) { Text("Cancel", color = TextMuted) }
            },
        )
    }
}

@Composable
private fun IdentityCard(user: User) {
    CardSurface(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(58.dp).clip(CircleShape).background(Color(0x2900D4C8)),
                contentAlignment = Alignment.Center,
            ) {
                Text(initials(user), color = AccentLight, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    user.name?.ifBlank { null } ?: "BuilderHQ member",
                    color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(3.dp))
                Text(user.email, color = TextMuted, fontSize = 13.sp)
                Spacer(Modifier.height(12.dp))
                Row {
                    Pill(roleLabel(user.role), accent = true)
                    if (user.needsOnboarding) {
                        Spacer(Modifier.width(8.dp))
                        Pill("Finish setup")
                    }
                }
            }
        }
    }
}

@Composable
private fun VerificationCard(v: VerificationInfo) {
    CardSurface(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Kicker("Verification")
                v.approvalStatus?.let {
                    Pill(it.replace('_', ' ').replaceFirstChar { c -> c.uppercase() }, accent = it == "approved")
                }
            }
            Spacer(Modifier.height(14.dp))
            VerifyRow("ABN verified", v.abnVerified)
            Spacer(Modifier.height(10.dp))
            VerifyRow("Licence verified", v.anyLicenceVerified)
        }
    }
}

@Composable
private fun VerifyRow(label: String, done: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(24.dp).clip(CircleShape).background((if (done) Success else TextDim).copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Verified, contentDescription = null, tint = if (done) Success else TextDim, modifier = Modifier.size(14.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(label, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        Text(if (done) "Verified" else "Pending", color = if (done) Success else TextDim, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun LinkRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().pressable(onClick = onClick).padding(horizontal = 16.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = AccentLight, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(14.dp))
        Text(label, color = TextPrimary, fontSize = 15.sp, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = TextDim, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun LinkDivider() {
    Box(Modifier.fillMaxWidth().padding(start = 48.dp).height(1.dp).background(BlueprintLine.copy(alpha = 0.08f)))
}

@Composable
private fun SignOutRow(onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Danger.copy(alpha = 0.08f))
            .border(1.dp, Danger.copy(alpha = 0.28f), RoundedCornerShape(16.dp))
            .pressable(onClick = onClick)
            .padding(vertical = 16.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = null, tint = Danger, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text("Sign out", color = Danger, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}

private fun initials(user: User): String {
    val name = user.name?.trim().orEmpty()
    return if (name.isNotEmpty()) {
        name.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercaseChar().toString() }
    } else {
        user.email.take(1).uppercase()
    }
}

private fun roleLabel(role: Role): String = when (role) {
    Role.OWNER -> "Project owner"
    Role.BUILDER -> "Builder"
    Role.ADMIN -> "Admin"
    Role.UNKNOWN -> "Member"
}
