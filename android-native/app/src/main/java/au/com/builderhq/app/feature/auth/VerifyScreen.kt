package au.com.builderhq.app.feature.auth

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.design.components.OtpInput
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.network.ApiResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

data class VerifyUi(
    val code: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val resending: Boolean = false,
    val resendIn: Int = 0,
)

@HiltViewModel
class VerifyViewModel @Inject constructor(
    private val session: SessionRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val email: String = savedState.get<String>("email").orEmpty()
    var ui by mutableStateOf(VerifyUi()); private set
    private var countdown: Job? = null

    init { startCountdown(60) }

    fun onCode(v: String) { ui = ui.copy(code = v, error = null) }

    fun submit() {
        if (ui.loading || ui.code.length < 6) return
        ui = ui.copy(loading = true, error = null, info = null)
        viewModelScope.launch {
            when (val r = session.verify(email, ui.code)) {
                is ApiResult.Success -> Unit // RootApp swaps to the main shell
                is ApiResult.Error -> ui = ui.copy(loading = false, error = r.message, code = "")
                is ApiResult.NetworkError -> ui = ui.copy(loading = false, error = NET_ERR)
            }
        }
    }

    fun resend() {
        if (ui.resending || ui.resendIn > 0) return
        ui = ui.copy(resending = true, error = null, info = null)
        viewModelScope.launch {
            when (val r = session.resendCode(email)) {
                is ApiResult.Success -> {
                    ui = ui.copy(
                        resending = false,
                        info = if (r.data.throttled) {
                            "Hang tight, a code is already on its way."
                        } else {
                            "We sent a fresh code to your email."
                        },
                    )
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
fun VerifyScreen(
    onBack: () -> Unit,
    vm: VerifyViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    AuthScaffold(onBack = onBack) {
        Spacer(Modifier.height(8.dp))
        AuthHeader("Check your email", "Enter the code", "We sent a 6-digit code to ${vm.email}.")
        Spacer(Modifier.height(32.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            OtpInput(
                value = ui.code, onValueChange = vm::onCode,
                isError = ui.error != null, onComplete = { vm.submit() },
            )
        }
        if (ui.error != null) {
            Spacer(Modifier.height(20.dp))
            AuthErrorBanner(ui.error)
        } else if (ui.info != null) {
            Spacer(Modifier.height(20.dp))
            AuthInfoBanner(ui.info)
        }
        Spacer(Modifier.height(28.dp))
        PrimaryButton(
            "Verify", onClick = vm::submit,
            enabled = ui.code.length == 6, loading = ui.loading,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(20.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (ui.resendIn > 0) {
                Text("Resend code in ${ui.resendIn}s", color = Bhq.colors.textDim, fontSize = 13.sp)
            } else {
                AuthTextLink(
                    "Didn't get it?",
                    if (ui.resending) "Sending…" else "Resend code",
                    onClick = vm::resend,
                )
            }
        }
        Spacer(Modifier.height(14.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            AuthTextLink("Wrong email?", "Change it", onClick = onBack)
        }
        Spacer(Modifier.height(10.dp))
        Text(
            "Your code expires 15 minutes after it's sent. Can't find it? Check your spam or promotions folder.",
            color = Bhq.colors.textDim, fontSize = 12.sp, lineHeight = 17.sp, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
