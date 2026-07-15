package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Construction
import androidx.compose.material.icons.rounded.HomeWork
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.MailOutline
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.RoleSelectCard
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.network.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SignupRole(val api: String) { OWNER("project_owner"), BUILDER("builder") }

data class SignUpUi(
    val role: SignupRole? = null,
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val fieldErrors: Map<String, String> = emptyMap(),
    val sentToEmail: String? = null,
)

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val session: SessionRepository,
) : ViewModel() {
    var ui by mutableStateOf(SignUpUi()); private set

    val canSubmit: Boolean
        get() = ui.role != null && ui.firstName.isNotBlank() && ui.lastName.isNotBlank() &&
            ui.email.contains("@") && ui.password.length >= 10 && !ui.loading

    fun onRole(r: SignupRole) { ui = ui.copy(role = r, error = null) }
    fun onFirst(v: String) { ui = ui.copy(firstName = v, error = null, fieldErrors = ui.fieldErrors - "firstName") }
    fun onLast(v: String) { ui = ui.copy(lastName = v, error = null, fieldErrors = ui.fieldErrors - "lastName") }
    fun onEmail(v: String) { ui = ui.copy(email = v, error = null, fieldErrors = ui.fieldErrors - "email") }
    fun onPassword(v: String) { ui = ui.copy(password = v, error = null, fieldErrors = ui.fieldErrors - "password") }

    fun submit() {
        val role = ui.role ?: return
        if (!canSubmit) return
        ui = ui.copy(loading = true, error = null, fieldErrors = emptyMap())
        viewModelScope.launch {
            when (val r = session.signup(ui.firstName, ui.lastName, ui.email, ui.password, role.api)) {
                is ApiResult.Success -> ui = ui.copy(loading = false, sentToEmail = r.data.email)
                is ApiResult.Error -> ui = ui.copy(
                    loading = false,
                    error = if (r.fieldErrors.isEmpty()) r.message else null,
                    fieldErrors = r.fieldErrors,
                )
                is ApiResult.NetworkError -> ui = ui.copy(loading = false, error = NET_ERR)
            }
        }
    }

    fun consumeSent() { ui = ui.copy(sentToEmail = null) }
}

@Composable
fun SignUpScreen(
    onBack: () -> Unit,
    onLogin: () -> Unit,
    onCodeSent: (String) -> Unit,
    vm: SignUpViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    LaunchedEffect(ui.sentToEmail) {
        ui.sentToEmail?.let { onCodeSent(it); vm.consumeSent() }
    }
    AuthScaffold(onBack = onBack) {
        Spacer(Modifier.height(8.dp))
        AuthHeader("Create your account", "Let's build.", "Two minutes to set up, then you're tendering.")
        Spacer(Modifier.height(26.dp))

        Text("I'M A", color = TextDim, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.6.sp)
        Spacer(Modifier.height(10.dp))
        RoleSelectCard(
            "Project owner", "I have plans and want builders to tender.",
            Icons.Rounded.HomeWork, ui.role == SignupRole.OWNER,
            onClick = { vm.onRole(SignupRole.OWNER) },
        )
        Spacer(Modifier.height(10.dp))
        RoleSelectCard(
            "Builder", "I tender on residential projects.",
            Icons.Rounded.Construction, ui.role == SignupRole.BUILDER,
            onClick = { vm.onRole(SignupRole.BUILDER) },
        )
        Spacer(Modifier.height(22.dp))

        Row {
            BhqTextField(
                value = ui.firstName, onValueChange = vm::onFirst, label = "First name",
                modifier = Modifier.weight(1f), capitalize = true,
                error = ui.fieldErrors["firstName"], imeAction = ImeAction.Next,
            )
            Spacer(Modifier.width(12.dp))
            BhqTextField(
                value = ui.lastName, onValueChange = vm::onLast, label = "Last name",
                modifier = Modifier.weight(1f), capitalize = true,
                error = ui.fieldErrors["lastName"], imeAction = ImeAction.Next,
            )
        }
        Spacer(Modifier.height(16.dp))
        BhqTextField(
            value = ui.email, onValueChange = vm::onEmail, label = "Email",
            placeholder = "you@email.com", leadingIcon = Icons.Rounded.MailOutline,
            keyboardType = KeyboardType.Email, error = ui.fieldErrors["email"], imeAction = ImeAction.Next,
        )
        Spacer(Modifier.height(16.dp))
        BhqTextField(
            value = ui.password, onValueChange = vm::onPassword, label = "Password",
            placeholder = "At least 10 characters", leadingIcon = Icons.Rounded.Lock,
            isPassword = true, error = ui.fieldErrors["password"],
            imeAction = ImeAction.Done, onImeAction = vm::submit,
        )
        if (ui.error != null) {
            Spacer(Modifier.height(18.dp))
            AuthErrorBanner(ui.error)
        }
        Spacer(Modifier.height(24.dp))
        PrimaryButton(
            "Create account", onClick = vm::submit,
            enabled = vm.canSubmit, loading = ui.loading,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(14.dp))
        Text(
            "By continuing you agree to our Terms and Privacy Policy.",
            color = TextDim, fontSize = 12.sp, lineHeight = 16.sp,
        )
        Spacer(Modifier.height(18.dp))
        AuthTextLink("Already have an account?", "Sign in", onLogin, Modifier.fillMaxWidth())
    }
}
