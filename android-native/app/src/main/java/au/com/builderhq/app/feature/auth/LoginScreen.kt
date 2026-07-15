package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.MailOutline
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import au.com.builderhq.app.core.design.theme.AccentLight
import au.com.builderhq.app.core.network.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

internal const val NET_ERR = "No connection. Check your internet and try again."

data class LoginUi(
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val session: SessionRepository,
) : ViewModel() {
    var ui by mutableStateOf(LoginUi()); private set

    fun onEmail(v: String) { ui = ui.copy(email = v, error = null) }
    fun onPassword(v: String) { ui = ui.copy(password = v, error = null) }

    fun submit() {
        if (ui.loading || ui.email.isBlank() || ui.password.isBlank()) return
        ui = ui.copy(loading = true, error = null)
        viewModelScope.launch {
            ui = when (val r = session.login(ui.email, ui.password)) {
                is ApiResult.Success -> ui.copy(loading = false) // RootApp swaps to the main shell
                is ApiResult.Error -> ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError -> ui.copy(loading = false, error = NET_ERR)
            }
        }
    }
}

@Composable
fun LoginScreen(
    onBack: () -> Unit,
    onForgot: () -> Unit,
    onSignUp: () -> Unit,
    vm: LoginViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    AuthScaffold(onBack = onBack) {
        Spacer(Modifier.height(8.dp))
        AuthHeader("Welcome back", "Sign in", "Pick up right where you left off.")
        Spacer(Modifier.height(28.dp))
        BhqTextField(
            value = ui.email, onValueChange = vm::onEmail, label = "Email",
            placeholder = "you@email.com", leadingIcon = Icons.Rounded.MailOutline,
            keyboardType = KeyboardType.Email, imeAction = ImeAction.Next,
        )
        Spacer(Modifier.height(16.dp))
        BhqTextField(
            value = ui.password, onValueChange = vm::onPassword, label = "Password",
            placeholder = "Your password", leadingIcon = Icons.Rounded.Lock,
            isPassword = true, imeAction = ImeAction.Done, onImeAction = vm::submit,
        )
        Spacer(Modifier.height(12.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            Text(
                "Forgot password?", color = AccentLight, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                modifier = Modifier.clickable(remember { MutableInteractionSource() }, indication = null, onClick = onForgot),
            )
        }
        if (ui.error != null) {
            Spacer(Modifier.height(18.dp))
            AuthErrorBanner(ui.error)
        }
        Spacer(Modifier.height(24.dp))
        PrimaryButton(
            "Sign in", onClick = vm::submit,
            enabled = ui.email.isNotBlank() && ui.password.isNotBlank(),
            loading = ui.loading,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(22.dp))
        AuthTextLink("New to BuilderHQ?", "Create account", onSignUp, Modifier.fillMaxWidth())
    }
}
