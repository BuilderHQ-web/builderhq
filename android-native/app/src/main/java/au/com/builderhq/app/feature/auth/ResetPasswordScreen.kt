package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.design.components.BhqTextField
import au.com.builderhq.app.core.design.components.OtpInput
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.theme.TextDim
import au.com.builderhq.app.core.network.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ResetUi(
    val code: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val resending: Boolean = false,
    val resendIn: Int = 0,
)

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val session: SessionRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val email: String = savedState.get<String>("email").orEmpty()
    var ui by mutableStateOf(ResetUi()); private set
    private var countdown: Job? = null

    init { startCountdown(60) }

    fun onCode(v: String) { ui = ui.copy(code = v, error = null) }
    fun onPassword(v: String) { ui = ui.copy(password = v, error = null) }

    fun submit() {
        if (ui.loading || ui.code.length < 6 || ui.password.length < 10) return
        ui = ui.copy(loading = true, error = null, info = null)
        viewModelScope.launch {
            when (val r = session.resetPassword(email, ui.code, ui.password)) {
                is ApiResult.Success -> Unit // RootApp swaps to the main shell
                is ApiResult.Error -> ui = ui.copy(loading = false, error = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(loading = false, error = NET_ERR)
            }
        }
    }

    fun resend() {
        if (ui.resending || ui.resendIn > 0) return
        ui = ui.copy(resending = true, error = null, info = null)
        viewModelScope.launch {
            when (val r = session.forgotPassword(email)) {
                is ApiResult.Success -> {
                    ui = ui.copy(resending = false, info = "We sent a fresh code to your email.")
                    startCountdown(60)
                }
                is ApiResult.Error -> ui = ui.copy(resending = false, error = r.message)
                is ApiResult.NetworkError -> ui = ui.copy(resending = false, error = NET_ERR)
            }
        }
    }

    private fun startCountdown(seconds: Int) {
        countdown?.cancel()
        countdown = viewModelScope.launch {
            var s = seconds
            ui = ui.copy(resendIn = s)
            while (s > 0) {
                delay(1000)
                s -= 1
                ui = ui.copy(resendIn = s)
            }
        }
    }
}

@Composable
fun ResetPasswordScreen(
    onBack: () -> Unit,
    vm: ResetPasswordViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    AuthScaffold(onBack = onBack) {
        Spacer(Modifier.height(8.dp))
        AuthHeader("Almost there", "New password", "Enter the code sent to ${vm.email}, then choose a new password.")
        Spacer(Modifier.height(30.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            OtpInput(value = ui.code, onValueChange = vm::onCode, isError = ui.error != null)
        }
        Spacer(Modifier.height(22.dp))
        BhqTextField(
            value = ui.password, onValueChange = vm::onPassword, label = "New password",
            placeholder = "At least 10 characters", leadingIcon = Icons.Rounded.Lock,
            isPassword = true, imeAction = ImeAction.Done, onImeAction = vm::submit,
        )
        if (ui.error != null) {
            Spacer(Modifier.height(18.dp))
            AuthErrorBanner(ui.error)
        } else if (ui.info != null) {
            Spacer(Modifier.height(18.dp))
            AuthInfoBanner(ui.info)
        }
        Spacer(Modifier.height(24.dp))
        PrimaryButton(
            "Reset password", onClick = vm::submit,
            enabled = ui.code.length == 6 && ui.password.length >= 10, loading = ui.loading,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(20.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (ui.resendIn > 0) {
                Text("Resend code in ${ui.resendIn}s", color = TextDim, fontSize = 13.sp)
            } else {
                AuthTextLink(
                    "Didn't get it?",
                    if (ui.resending) "Sending…" else "Resend code",
                    onClick = vm::resend,
                )
            }
        }
    }
}
