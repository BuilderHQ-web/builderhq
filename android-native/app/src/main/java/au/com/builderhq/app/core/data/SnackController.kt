package au.com.builderhq.app.core.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class SnackMessage(
    val id: Long,
    val text: String,
    val actionLabel: String?,
    val isError: Boolean,
)

/**
 * App-wide transient messaging. Any ViewModel injects this and calls
 * [show]/[error]; the single [SnackHost] in the root renders + auto-dismisses.
 * Optional one-tap action (e.g. "Retry") is stored by id so the lambda never
 * has to survive serialization.
 */
@Singleton
class SnackController @Inject constructor() {
    private val _current = MutableStateFlow<SnackMessage?>(null)
    val current: StateFlow<SnackMessage?> = _current.asStateFlow()

    private val actions = HashMap<Long, () -> Unit>()
    private var seq = 0L

    fun show(text: String, isError: Boolean = false, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
        seq += 1
        val id = seq
        if (actionLabel != null && onAction != null) actions[id] = onAction
        _current.value = SnackMessage(id, text, actionLabel, isError)
    }

    fun error(text: String, actionLabel: String? = null, onAction: (() -> Unit)? = null) =
        show(text, isError = true, actionLabel = actionLabel, onAction = onAction)

    fun runAction(id: Long) { actions.remove(id)?.invoke(); dismiss(id) }

    fun dismiss(id: Long) {
        actions.remove(id)
        if (_current.value?.id == id) _current.value = null
    }
}
