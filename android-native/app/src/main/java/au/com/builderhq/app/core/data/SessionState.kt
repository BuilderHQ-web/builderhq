package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.model.User

/** Top-level app state — drives the root navigation (splash / auth / main). */
sealed interface SessionState {
    data object Loading : SessionState
    data object SignedOut : SessionState
    data class SignedIn(val user: User) : SessionState
}
