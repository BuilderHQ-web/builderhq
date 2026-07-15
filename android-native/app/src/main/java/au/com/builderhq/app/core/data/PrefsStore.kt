package au.com.builderhq.app.core.data

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * First-run UI flags — the once-only intro and the marketplace coachmark.
 * Backed by SharedPreferences: tiny, synchronous, zero extra deps.
 *
 * Deliberately distinct from the server's `needsOnboarding` (profile-completion)
 * gate — these are pure client-side "has the user seen this guidance" markers,
 * so they clear independently of whether the builder has finished their profile.
 */
@Singleton
class PrefsStore @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("bhq_prefs", Context.MODE_PRIVATE)

    fun onboardingSeen(): Boolean = prefs.getBoolean(KEY_ONBOARDING, false)
    fun setOnboardingSeen() { prefs.edit().putBoolean(KEY_ONBOARDING, true).apply() }

    fun coachmarkSeen(): Boolean = prefs.getBoolean(KEY_COACHMARK, false)
    fun setCoachmarkSeen() { prefs.edit().putBoolean(KEY_COACHMARK, true).apply() }

    private companion object {
        const val KEY_ONBOARDING = "onboarding_seen_v1"
        const val KEY_COACHMARK = "coachmark_seen_v1"
    }
}
