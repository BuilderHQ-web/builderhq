package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * App-wide unread-message total, surfaced as the Inbox tab badge. Kept in a
 * singleton so the badge stays live regardless of which tab is on screen.
 * Refreshed by the shell heartbeat, the inbox screen on every load, and
 * after a thread is marked read.
 */
@Singleton
class MessagingCenter @Inject constructor(
    private val repo: MessagingRepository,
) {
    private val _totalUnread = MutableStateFlow(0)
    val totalUnread: StateFlow<Int> = _totalUnread.asStateFlow()

    /** Set from a payload that already carries the total (e.g. the inbox load). */
    fun set(total: Int) { _totalUnread.value = total.coerceAtLeast(0) }

    /** Pull the latest unread total. Silent on failure — the badge keeps its
     *  last value rather than flickering to zero on a transient error. */
    suspend fun refresh() {
        when (val r = repo.inbox()) {
            is ApiResult.Success -> _totalUnread.value = r.data.totalUnread
            else -> Unit
        }
    }
}
