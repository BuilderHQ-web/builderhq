package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MailOutline
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.network.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ForgotUi(
    val email: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val sentToEmail: String? = null,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val session: SessionRepository,
) : ViewModel() {
    var ui by mutableStateOf(ForgotUi()); private set

    fun onEmail(v: String) { ui = ui.copy(email = v, error = null) }

    fun submit() {
        if (ui.loading || !ui.email.contains("@")) return
        ui = ui.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = session.forgotPassword(ui.email)) {
                is ApiResult.Success -> ui = ui.copy(loading = false, sentToEmail = ui.email.trim().lowercase())
                is ApiResult.Error -> ui = ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(loading = false, error = NET_ERR)
            }
        }
    }

    fun consumeSent() { ui = ui.copy(sentToEmail = null) }
}

@Composable
fun ForgotPasswordScreen(
    onBack: () -> Unit,
    onCodeSent: (String) -> Unit,
    vm: ForgotPasswordViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    LaunchedEffect(ui.sentToEmail) {
        ui.sentToEmail?.let { onCodeSent(it); vm.consumeSent() }
    }
    AuthScaffold(onBack = onBack) {
        Spacer(Modifier.height(8.dp))
        AuthHeader("Reset password", "Forgot it?", "Enter your email and we'll send a 6-digit reset code.")
        Spacer(Modifier.height(28.dp))
        BhqTextField(
            value = ui.email, onValueChange = vm::onEmail, label = "Email",
            placeholder = "you@email.com", leadingIcon = Icons.Rounded.MailOutline,
            keyboardType = KeyboardType.Email, imeAction = ImeAction.Done, onImeAction = vm::submit,
        )
        if (ui.error != null) {
            Spacer(Modifier.height(18.dp))
            AuthErrorBanner(ui.error)
        }
        Spacer(Modifier.height(24.dp))
        PrimaryButton(
            "Send reset code", onClick = vm::submit,
            enabled = ui.email.contains("@"), loading = ui.loading,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
