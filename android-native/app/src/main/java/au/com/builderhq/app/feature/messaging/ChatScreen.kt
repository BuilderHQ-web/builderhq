package au.com.builderhq.app.feature.messaging

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.Done
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.MessagingCenter
import au.com.builderhq.app.core.data.MessagingRepository
import au.com.builderhq.app.core.design.components.AmbientBackground
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.rememberHaptics
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.ConversationDto
import au.com.builderhq.app.core.network.dto.MessageDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

data class ThreadUi(
    val loading: Boolean = true,
    val conversation: ConversationDto? = null,
    val messages: List<MessageDto> = emptyList(),
    val myLastReadAtIso: String? = null,
    val error: String? = null,
    val sendError: String? = null,
)

@HiltViewModel
class ThreadViewModel @Inject constructor(
    private val repo: MessagingRepository,
    private val center: MessagingCenter,
    savedState: SavedStateHandle,
) : ViewModel() {
    val conversationId: String = savedState.get<String>("conversationId").orEmpty()
    var ui by mutableStateOf(ThreadUi()); private set

    private val pendingIds = mutableSetOf<String>()
    private var tempCounter = 0

    init { load(true) }

    fun retry() = load(true)

    /** Silent 4s poll — merges in server messages, keeps un-acked temps. */
    fun poll() { if (conversationId.isNotEmpty()) load(false) }

    private fun load(showSpinner: Boolean) {
        if (conversationId.isEmpty()) {
            ui = ui.copy(loading = false, error = "This conversation is unavailable.")
            return
        }
        if (showSpinner) ui = ui.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.thread(conversationId)) {
                is ApiResult.Success -> {
                    val temps = ui.messages.filter { it.id in pendingIds }
                    ui = ui.copy(
                        loading = false,
                        conversation = r.data.conversation,
                        messages = r.data.messages + temps,
                        myLastReadAtIso = r.data.myLastReadAtIso,
                        error = null,
                    )
                }
                is ApiResult.Error ->
                    ui = ui.copy(loading = false, error = if (ui.conversation == null) r.message else ui.error)
                is ApiResult.NetworkError ->
                    ui = ui.copy(
                        loading = false,
                        error = if (ui.conversation == null) "No connection. Check your internet and try again." else ui.error,
                    )
            }
        }
    }

    /** Idempotent — bumps my read pointer and refreshes the tab badge. */
    fun markRead() {
        if (conversationId.isEmpty()) return
        viewModelScope.launch {
            when (val r = repo.markRead(conversationId)) {
                is ApiResult.Success -> {
                    ui = ui.copy(myLastReadAtIso = r.data.myLastReadAtIso ?: ui.myLastReadAtIso)
                    center.refresh()
                }
                else -> Unit
            }
        }
    }

    /** Optimistic send: temp bubble appears instantly, then reconciles with
     *  the real row (or drops + reports on failure). */
    fun send(bodyText: String, onResult: (Boolean) -> Unit) {
        val trimmed = bodyText.trim()
        if (trimmed.isEmpty() || conversationId.isEmpty()) { onResult(false); return }
        val tempId = "temp-${tempCounter++}"
        pendingIds.add(tempId)
        val temp = MessageDto(
            id = tempId, conversationId = conversationId, senderId = SELF_SENDER,
            kind = "user", body = trimmed, createdAtIso = Instant.now().toString(),
        )
        ui = ui.copy(messages = ui.messages + temp, sendError = null)
        viewModelScope.launch {
            when (val r = repo.send(conversationId, trimmed)) {
                is ApiResult.Success -> {
                    pendingIds.remove(tempId)
                    val real = r.data.message
                    // Drop the temp *and* any copy a concurrent poll already pulled,
                    // then append once — no transient duplicate.
                    ui = ui.copy(
                        messages = ui.messages.filterNot { it.id == tempId || it.id == real.id } + real,
                        conversation = ui.conversation?.copy(
                            lastMessageAtIso = real.createdAtIso,
                            lastMessagePreview = real.body.take(140),
                        ),
                    )
                    onResult(true)
                }
                is ApiResult.Error -> {
                    pendingIds.remove(tempId)
                    ui = ui.copy(messages = ui.messages.filterNot { it.id == tempId }, sendError = r.message)
                    onResult(false)
                }
                is ApiResult.NetworkError -> {
                    pendingIds.remove(tempId)
                    ui = ui.copy(
                        messages = ui.messages.filterNot { it.id == tempId },
                        sendError = "No connection. Your message wasn't sent.",
                    )
                    onResult(false)
                }
            }
        }
    }
}

@Composable
fun ChatScreen(
    onBack: () -> Unit,
    onOpenProject: (String) -> Unit,
    vm: ThreadViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    // Mark read on open…
    LaunchedEffect(ui.conversation?.id) { if (ui.conversation != null) vm.markRead() }
    // …and whenever a fresh *incoming* message becomes the latest.
    val lastId = ui.messages.lastOrNull()?.id
    LaunchedEffect(lastId) {
        val last = ui.messages.lastOrNull() ?: return@LaunchedEffect
        val conv = ui.conversation ?: return@LaunchedEffect
        if (last.senderId == conv.other.id) vm.markRead()
    }
    FocusPolling(4_000) { vm.poll() }

    AmbientBackground {
        Column(Modifier.fillMaxSize()) {
            ThreadHeader(ui.conversation, onBack, onOpenProject)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when {
                    ui.conversation != null -> ThreadBody(ui, Modifier.fillMaxSize())
                    ui.loading -> CenterBox { CircularProgressIndicator(color = Bhq.colors.accentLight, strokeWidth = 2.dp, modifier = Modifier.size(26.dp)) }
                    else -> ErrorCenter(ui.error ?: "Couldn't load this conversation.", vm::retry)
                }
            }
            Composer(enabled = ui.conversation != null, sendError = ui.sendError, onSend = vm::send)
        }
    }
}

// ── Header ──────────────────────────────────────────────────────────

@Composable
private fun ThreadHeader(conv: ConversationDto?, onBack: () -> Unit, onOpenProject: (String) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(Bhq.colors.scrimSoft)
            .statusBarsPadding()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CircleIconBtn(Icons.AutoMirrored.Rounded.ArrowBack, "Back", onBack)
        Spacer(Modifier.width(10.dp))
        if (conv != null) {
            InitialsAvatar(conv.other.initials.ifBlank { conv.other.displayName }, size = 36)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    conv.other.displayName.ifBlank { "BuilderHQ member" },
                    color = Bhq.colors.text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(1.dp))
                PresenceLine(conv)
            }
            Spacer(Modifier.width(10.dp))
            CircleIconBtn(Icons.Rounded.Info, "View project") { onOpenProject(conv.projectSlug) }
        } else {
            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun PresenceLine(conv: ConversationDto) {
    val active = (millisSince(conv.other.lastReadAtIso) ?: Long.MAX_VALUE) < 5 * 60 * 1000
    if (active) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(6.dp).clip(CircleShape).background(Bhq.colors.accent))
            Spacer(Modifier.width(5.dp))
            Text("Active now", color = Bhq.colors.accentLight, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        }
    } else {
        Text(conv.projectTitle, color = Bhq.colors.textDim, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ── Message list ────────────────────────────────────────────────────

@Composable
private fun ThreadBody(ui: ThreadUi, modifier: Modifier) {
    val conv = ui.conversation ?: return
    val rows = remember(ui.messages) { buildRows(ui.messages, conv.other.id) }
    val listState = rememberLazyListState()
    LaunchedEffect(rows.size) {
        if (rows.isNotEmpty()) listState.animateScrollToItem(rows.size - 1)
    }
    if (rows.isEmpty()) {
        EmptyThread(conv.other.displayName.ifBlank { "them" }, modifier)
        return
    }
    val lastMessageId = ui.messages.lastOrNull()?.id
    LazyColumn(
        state = listState,
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
    ) {
        items(rows.size) { i ->
            when (val row = rows[i]) {
                is ChatRow.Day -> DateSeparator(row.label)
                is ChatRow.Msg ->
                    if (row.isSystem) {
                        SystemRow(row.message)
                    } else {
                        Bubble(
                            message = row.message,
                            isOther = row.isOther,
                            startsGroup = row.startsGroup,
                            endsGroup = row.endsGroup,
                            showReceipt = !row.isOther && row.message.id == lastMessageId,
                            otherLastReadIso = conv.other.lastReadAtIso,
                        )
                    }
            }
        }
    }
}

@Composable
private fun DateSeparator(label: String) {
    Box(Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .clip(RoundedCornerShape(50))
                .background(Bhq.colors.fillFaint)
                .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.10f), RoundedCornerShape(50))
                .padding(horizontal = 12.dp, vertical = 5.dp),
        ) {
            Text(
                label.uppercase(), color = Bhq.colors.textMuted, fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold, letterSpacing = 1.2.sp,
            )
        }
    }
}

@Composable
private fun Bubble(
    message: MessageDto,
    isOther: Boolean,
    startsGroup: Boolean,
    endsGroup: Boolean,
    showReceipt: Boolean,
    otherLastReadIso: String?,
) {
    val pending = message.id.startsWith("temp-")
    val r = 18.dp
    val tight = 6.dp
    val shape = RoundedCornerShape(
        topStart = if (isOther && !startsGroup) tight else r,
        topEnd = if (!isOther && !startsGroup) tight else r,
        bottomStart = if (isOther && !endsGroup) tight else r,
        bottomEnd = if (!isOther && !endsGroup) tight else r,
    )
    Column(
        Modifier.fillMaxWidth().padding(top = if (startsGroup) 6.dp else 2.dp),
        horizontalAlignment = if (isOther) Alignment.Start else Alignment.End,
    ) {
        Box(
            Modifier
                .widthIn(max = 300.dp)
                .clip(shape)
                .then(
                    if (isOther) {
                        Modifier
                            .background(Bhq.colors.fillSubtle)
                            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.10f), shape)
                    } else {
                        Modifier.background(Brush.linearGradient(listOf(Bhq.colors.accent, Bhq.colors.accentDeep)))
                    },
                )
                .padding(horizontal = 14.dp, vertical = 9.dp),
        ) {
            Text(
                message.body,
                color = if (isOther) Bhq.colors.text else Bhq.colors.accentContrast,
                fontSize = 15.sp, lineHeight = 20.sp,
            )
        }
        if (endsGroup) {
            Spacer(Modifier.height(3.dp))
            Row(
                Modifier.padding(horizontal = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(formatClockTime(message.createdAtIso), color = Bhq.colors.textDim, fontSize = 10.sp)
                if (showReceipt) {
                    Spacer(Modifier.width(4.dp))
                    when {
                        pending -> Icon(Icons.Rounded.Schedule, "Sending", tint = Bhq.colors.textDim, modifier = Modifier.size(12.dp))
                        isReadBy(otherLastReadIso, message.createdAtIso) ->
                            Icon(Icons.Rounded.DoneAll, "Read", tint = Bhq.colors.accentLight, modifier = Modifier.size(13.dp))
                        else -> Icon(Icons.Rounded.Done, "Sent", tint = Bhq.colors.textDim, modifier = Modifier.size(13.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SystemRow(message: MessageDto) {
    Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .clip(RoundedCornerShape(14.dp))
                .background(Bhq.colors.accent.copy(alpha = 0.10f))
                .border(1.dp, Bhq.colors.accent.copy(alpha = 0.28f), RoundedCornerShape(14.dp))
                .padding(horizontal = 14.dp, vertical = 6.dp),
        ) {
            Text(
                message.body, color = Bhq.colors.accentLight, fontSize = 11.5f.sp,
                fontWeight = FontWeight.Medium, textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun EmptyThread(otherName: String, modifier: Modifier) {
    Column(
        modifier.padding(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier.size(60.dp).clip(CircleShape)
                .background(Bhq.colors.accent.copy(alpha = 0.10f))
                .border(1.dp, Bhq.colors.accent.copy(alpha = 0.30f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.ArrowUpward, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.height(14.dp))
        Text("Say hello", color = Bhq.colors.text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(
            "Send the first message to $otherName.",
            color = Bhq.colors.textMuted, fontSize = 13.sp, lineHeight = 19.sp, textAlign = TextAlign.Center,
        )
    }
}

// ── Composer ────────────────────────────────────────────────────────

@Composable
private fun Composer(
    enabled: Boolean,
    sendError: String?,
    onSend: (String, (Boolean) -> Unit) -> Unit,
) {
    var draft by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    val hasText = draft.trim().isNotEmpty()
    val haptics = rememberHaptics()

    Column(
        Modifier
            .fillMaxWidth()
            .background(Bhq.colors.scrimStrong)
            .navigationBarsPadding()
            .imePadding()
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        if (sendError != null) {
            Text(sendError, color = Bhq.colors.danger, fontSize = 12.sp, modifier = Modifier.padding(start = 6.dp, bottom = 6.dp))
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Box(
                Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp, max = 130.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(Bhq.colors.fillSubtle)
                    .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.12f), RoundedCornerShape(22.dp))
                    .padding(horizontal = 14.dp, vertical = 11.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (draft.isEmpty()) Text("Message", color = Bhq.colors.textDim, fontSize = 15.sp)
                BasicTextField(
                    value = draft, onValueChange = { draft = it }, enabled = enabled,
                    textStyle = TextStyle(color = Bhq.colors.text, fontSize = 15.sp, lineHeight = 20.sp),
                    cursorBrush = SolidColor(Bhq.colors.accent),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            AnimatedVisibility(
                visible = hasText && enabled,
                enter = scaleIn() + fadeIn(),
                exit = scaleOut() + fadeOut(),
            ) {
                Row {
                    Spacer(Modifier.width(8.dp))
                    SendButton(enabled = !sending) {
                        val body = draft.trim()
                        if (body.isEmpty() || sending) return@SendButton
                        sending = true
                        draft = ""
                        haptics.press()
                        onSend(body) { ok -> sending = false; if (!ok) draft = body }
                    }
                }
            }
        }
    }
}

@Composable
private fun SendButton(enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(44.dp).clip(CircleShape).background(Bhq.colors.accent).pressable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Rounded.ArrowUpward, contentDescription = "Send", tint = Bhq.colors.accentContrast, modifier = Modifier.size(20.dp))
    }
}

// ── Bits ────────────────────────────────────────────────────────────

@Composable
private fun CircleIconBtn(icon: ImageVector, label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(Bhq.colors.fillSubtle)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.10f), CircleShape)
            .pressable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = Bhq.colors.text, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun CenterBox(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() }
}

@Composable
private fun ErrorCenter(message: String, onRetry: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(message, color = Bhq.colors.textMuted, fontSize = 14.sp, textAlign = TextAlign.Center)
        Spacer(Modifier.height(14.dp))
        Box(
            Modifier.clip(RoundedCornerShape(50)).border(1.dp, Bhq.colors.accent.copy(alpha = 0.4f), RoundedCornerShape(50))
                .pressable(onClick = onRetry).padding(horizontal = 18.dp, vertical = 10.dp),
        ) {
            Text("Try again", color = Bhq.colors.accentLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── Row model ───────────────────────────────────────────────────────

private sealed interface ChatRow {
    data class Day(val label: String) : ChatRow
    data class Msg(
        val message: MessageDto,
        val isOther: Boolean,
        val isSystem: Boolean,
        val startsGroup: Boolean,
        val endsGroup: Boolean,
    ) : ChatRow
}

/** Flatten messages (oldest → newest) into date separators + grouped bubbles. */
private fun buildRows(messages: List<MessageDto>, otherId: String): List<ChatRow> {
    val rows = mutableListOf<ChatRow>()
    messages.forEachIndexed { i, m ->
        val day = formatDayLabel(m.createdAtIso)
        val prev = messages.getOrNull(i - 1)
        val next = messages.getOrNull(i + 1)
        val prevDay = prev?.let { formatDayLabel(it.createdAtIso) }
        val nextDay = next?.let { formatDayLabel(it.createdAtIso) }
        if (day != prevDay) rows.add(ChatRow.Day(day))
        val startsGroup = prev == null || prev.senderId != m.senderId || prev.kind != m.kind || prevDay != day
        val endsGroup = next == null || next.senderId != m.senderId || next.kind != m.kind || nextDay != day
        rows.add(
            ChatRow.Msg(
                message = m,
                isOther = m.senderId == otherId,
                isSystem = m.kind == "system",
                startsGroup = startsGroup,
                endsGroup = endsGroup,
            ),
        )
    }
    return rows
}
