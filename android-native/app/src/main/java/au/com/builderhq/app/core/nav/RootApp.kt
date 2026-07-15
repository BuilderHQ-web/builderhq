package au.com.builderhq.app.core.nav

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.PrefsStore
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.data.SessionState
import au.com.builderhq.app.core.design.components.SnackHost
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.feature.auth.AuthNavHost
import au.com.builderhq.app.feature.onboarding.OnboardingScreen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RootViewModel @Inject constructor(
    private val session: SessionRepository,
    private val prefs: PrefsStore,
) : ViewModel() {
    val state: StateFlow<SessionState> = session.state

    /** Client-side first-run gate for the intro flow. */
    var onboardingSeen by mutableStateOf(prefs.onboardingSeen()); private set
    fun completeOnboarding() { prefs.setOnboardingSeen(); onboardingSeen = true }

    init {
        viewModelScope.launch { session.bootstrap() }
    }
}

/**
 * Root of the app. Session-gated: the system splash holds while bootstrapping,
 * then we route to the signed-out auth flow or the main shell.
 */
@Composable
fun RootApp(onReady: () -> Unit) {
    val vm: RootViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()

    LaunchedEffect(state) {
        if (state !is SessionState.Loading) onReady()
    }

    Box(Modifier.fillMaxSize()) {
      Crossfade(
        targetState = state,
        animationSpec = tween(Motion.SLOW, easing = Motion.EaseOutSoft),
        label = "rootState",
      ) { s ->
        when (s) {
            is SessionState.Loading -> Unit // system splash covers this frame
            is SessionState.SignedOut -> AuthNavHost()
            is SessionState.SignedIn -> AnimatedContent(
                targetState = vm.onboardingSeen,
                transitionSpec = {
                    fadeIn(tween(Motion.SLOW, easing = Motion.EaseOutSoft))
                        .togetherWith(fadeOut(tween(Motion.BASE)))
                },
                label = "onboardingGate",
            ) { seen ->
                if (seen) MainNavHost(role = s.user.role)
                else OnboardingScreen(role = s.user.role, onDone = vm::completeOnboarding)
            }
        }
      }
      SnackHost()
    }
}
