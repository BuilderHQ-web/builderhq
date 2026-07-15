package au.com.builderhq.app.feature.home

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.DashboardRepository
import au.com.builderhq.app.core.data.PrefsStore
import au.com.builderhq.app.core.data.SessionRepository
import au.com.builderhq.app.core.data.SessionState
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.BuilderDashboardDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Calendar
import javax.inject.Inject

/**
 * Builder home — one bundle fetch feeds every section. Mirrors the iOS
 * HomeViewModel: the reveal cascade plays ONCE (hasRevealed), refreshes
 * keep stale data on screen, and the "+N NEW" matches badge is a
 * since-last-visit delta persisted in PrefsStore.
 */
@HiltViewModel
class BuilderHomeViewModel @Inject constructor(
    private val dashboard: DashboardRepository,
    private val session: SessionRepository,
    private val prefs: PrefsStore,
) : ViewModel() {

    var bundle by mutableStateOf<BuilderDashboardDto?>(null); private set
    var errorMessage by mutableStateOf<String?>(null); private set
    var isRefreshing by mutableStateOf(false); private set
    /** Flips true ~40ms after the first successful load; never resets. */
    var hasRevealed by mutableStateOf(false); private set
    /** "+N NEW" badge for the For-you header; 0 = hidden. */
    var matchDelta by mutableStateOf(0); private set

    val firstName: String
        get() {
            val name = (session.state.value as? SessionState.SignedIn)?.user?.name
            return name?.trim()?.split(" ")?.firstOrNull { it.isNotBlank() } ?: "there"
        }

    val showsApprovalCallout: Boolean
        get() = bundle?.profile?.approvalStatus != "approved"

    val showsFbaHero: Boolean
        get() = bundle?.profile?.approvalStatus == "approved" && bundle?.fba?.active == true

    init {
        load()
    }

    // ── silent refresh triggers ──────────────────────────────────────
    // Both skip their first firing (init already loads) and only act
    // once data exists, so stale content refreshes without a flash.

    private var tabSeenOnce = false
    fun onTabVisible() {
        if (tabSeenOnce && bundle != null) refresh()
        tabSeenOnce = true
    }

    private var foregroundSeenOnce = false
    fun onForegrounded() {
        if (foregroundSeenOnce && bundle != null) refresh()
        foregroundSeenOnce = true
    }

    fun load() {
        viewModelScope.launch {
            errorMessage = null
            when (val r = dashboard.builder()) {
                is ApiResult.Success -> {
                    applyBundle(r.data)
                    if (!hasRevealed) {
                        delay(40)
                        hasRevealed = true
                    }
                }
                is ApiResult.Error -> errorMessage = r.message
                is ApiResult.NetworkError ->
                    errorMessage = "Something went wrong. Pull to refresh."
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            isRefreshing = true
            when (val r = dashboard.builder()) {
                is ApiResult.Success -> { errorMessage = null; applyBundle(r.data) }
                is ApiResult.Error -> if (bundle == null) errorMessage = r.message
                is ApiResult.NetworkError ->
                    if (bundle == null) errorMessage = "Something went wrong. Pull to refresh."
            }
            isRefreshing = false
        }
    }

    private fun applyBundle(b: BuilderDashboardDto) {
        bundle = b
        val snap = prefs.builderSnapSuggested()
        matchDelta = if (snap < 0) 0 else (b.stats.suggestedCount - snap).coerceAtLeast(0)
        prefs.setBuilderSnapSuggested(b.stats.suggestedCount)
    }

    /**
     * Time-of-day greeting: plain prefix + the serif-italic name with
     * a trailing period, e.g. "Good afternoon," + "Aryan."
     */
    fun greetingPair(): Pair<String, String> {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val plain = when (hour) {
            in 5..11 -> "Good morning,"
            in 12..16 -> "Good afternoon,"
            in 17..21 -> "Good evening,"
            else -> "Working late,"
        }
        return plain to "$firstName."
    }

    /** The self-typing ticker lines, most-relevant first, max 4. */
    fun tickerLines(): List<String> {
        val b = bundle ?: return emptyList()
        if (b.profile.approvalStatus != "approved") {
            return listOf(
                "Hang tight while we review your account.",
                "We'll ping you the moment you're verified.",
            )
        }
        val lines = mutableListOf<String>()
        val awarded = b.myTenders.count { it.status == "awarded" }
        if (awarded == 1) lines += "You won a tender — time to build."
        if (awarded > 1) lines += "You've won $awarded tenders — time to build."
        val shortlisted = b.myTenders.count { it.status == "shortlisted" }
        if (shortlisted > 0) lines += "Shortlisted on $shortlisted — owners are deciding."
        val live = b.myTenders.count { it.status == "submitted" || it.status == "shortlisted" }
        if (live > 0) lines += "You're in the running on $live tender${if (live == 1) "" else "s"}."
        if (b.fba.active && b.fba.remainingThisCycle > 0) {
            val n = b.fba.remainingThisCycle
            lines += "$n free unlock${if (n == 1) "" else "s"} left this cycle."
        }
        if (b.stats.suggestedCount > 0) {
            val n = b.stats.suggestedCount
            lines += "$n project${if (n == 1) "" else "s"} match your trade."
        }
        if (b.stats.savedProjects > 0) {
            val n = b.stats.savedProjects
            lines += "$n saved project${if (n == 1) "" else "s"} to revisit."
        }
        if (lines.isEmpty()) lines += "Fresh work lands in your area daily."
        return lines.take(4)
    }
}
