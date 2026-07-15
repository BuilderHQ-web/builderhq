package au.com.builderhq.app.feature.messaging

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import au.com.builderhq.app.core.data.MessagingCenter
import au.com.builderhq.app.core.data.MessagingRepository
import au.com.builderhq.app.core.design.components.Kicker
import au.com.builderhq.app.core.design.components.PrimaryButton
import au.com.builderhq.app.core.design.components.SkeletonBox
import au.com.builderhq.app.core.design.components.StaggeredEntrance
import au.com.builderhq.app.core.design.components.pressable
import au.com.builderhq.app.core.design.theme.Bhq
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.dto.ConversationDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InboxUi(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<ConversationDto> = emptyList(),
    val totalUnread: Int = 0,
    val error: String? = null,
)

@HiltViewModel
class InboxViewModel @Inject constructor(
    private val repo: MessagingRepository,
    private val center: MessagingCenter,
) : ViewModel() {
    var ui by mutableStateOf(InboxUi()); private set

    init { load() }

    fun refresh() {
        if (ui.refreshing || ui.loading) return
        ui = ui.copy(refreshing = true, error = null)
        fetch()
    }

    /** Silent background poll — never shows a spinner or clears the list. */
    fun poll() {
        if (ui.loading || ui.refreshing) return
        fetch()
    }

    private fun load() {
        ui = ui.copy(loading = true, error = null)
        fetch()
    }

    private fun fetch() {
        viewModelScope.launch {
            when (val r = repo.inbox()) {
                is ApiResult.Success -> {
                    ui = ui.copy(
                        loading = false, refreshing = false,
                        items = r.data.items, totalUnread = r.data.totalUnread, error = null,
                    )
                    center.set(r.data.totalUnread)
                }
                is ApiResult.Error -> ui = ui.copy(loading = false, refreshing = false, error = r.message)
                is ApiResult.NetworkError ->
                    ui = ui.copy(loading = false, refreshing = false, error = "No connection. Check your internet and try again.")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    onOpenConversation: (String) -> Unit,
    vm: InboxViewModel = hiltViewModel(),
) {
    val ui = vm.ui
    FocusPolling(15_000) { vm.poll() }
    Column(Modifier.fillMaxSize()) {
        InboxHeader(ui.totalUnread)
        Crossfade(
            targetState = ui.loading,
            animationSpec = tween(Motion.BASE),
            modifier = Modifier.weight(1f).fillMaxWidth(),
            label = "inboxBody",
        ) { loading ->
            if (loading) {
                InboxSkeleton()
            } else {
                PullToRefreshBox(
                    isRefreshing = ui.refreshing,
                    onRefresh = vm::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    when {
                        ui.error != null && ui.items.isEmpty() ->
                            InboxEmpty("Couldn't load", ui.error, onRetry = vm::refresh)
                        ui.items.isEmpty() ->
                            InboxEmpty(
                                "No conversations yet",
                                "Unlock a project and message the owner — your conversations land here.",
                            )
                        else -> LazyColumn(
                            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 28.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            itemsIndexed(ui.items, key = { _, c -> c.id }) { i, c ->
                                StaggeredEntrance(index = i) {
                                    ConversationRow(c, onClick = { onOpenConversation(c.id) })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InboxHeader(totalUnread: Int) {
    Column(
        Modifier.statusBarsPadding().padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 10.dp),
    ) {
        Kicker("Inbox")
        Spacer(Modifier.height(7.dp))
        Text("Messages", color = Bhq.colors.text, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(2.dp))
        Text(
            if (totalUnread > 0) "$totalUnread unread" else "All conversations",
            color = if (totalUnread > 0) Bhq.colors.accentLight else Bhq.colors.textMuted, fontSize = 13.sp,
        )
    }
}

@Composable
private fun ConversationRow(c: ConversationDto, onClick: () -> Unit) {
    val unread = c.unreadCount > 0
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Bhq.brushes.row)
            .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = if (unread) 0.22f else 0.10f), RoundedCornerShape(18.dp))
            .pressable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        InitialsAvatar(c.other.initials.ifBlank { c.other.displayName }, size = 48)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    c.other.displayName.ifBlank { "BuilderHQ member" },
                    color = Bhq.colors.text, fontSize = 15.sp,
                    fontWeight = if (unread) FontWeight.Bold else FontWeight.SemiBold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    formatInboxTime(c.lastMessageAtIso),
                    color = if (unread) Bhq.colors.accentLight else Bhq.colors.textDim, fontSize = 11.sp,
                    fontWeight = if (unread) FontWeight.SemiBold else FontWeight.Normal,
                )
            }
            Spacer(Modifier.height(2.dp))
            Text(c.projectTitle, color = Bhq.colors.textDim, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(5.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    c.lastMessagePreview ?: "Conversation started",
                    color = if (unread) Bhq.colors.textMuted else Bhq.colors.textDim, fontSize = 13.sp,
                    fontWeight = if (unread) FontWeight.Medium else FontWeight.Normal,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                )
                if (unread) {
                    Spacer(Modifier.width(8.dp))
                    UnreadBadge(c.unreadCount)
                }
            }
        }
    }
}

@Composable
private fun UnreadBadge(count: Int) {
    Box(
        Modifier
            .defaultMinSize(minWidth = 20.dp)
            .height(20.dp)
            .clip(CircleShape)
            .background(Bhq.colors.accent)
            .padding(horizontal = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (count > 99) "99+" else "$count",
            color = Bhq.colors.accentContrast, fontSize = 10.sp, fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun InboxSkeleton() {
    Column(
        Modifier.padding(start = 20.dp, end = 20.dp, top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        repeat(4) {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Bhq.brushes.row).padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SkeletonBox(Modifier.size(48.dp), cornerRadius = 24.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    SkeletonBox(Modifier.fillMaxWidth(0.5f).height(14.dp))
                    Spacer(Modifier.height(8.dp))
                    SkeletonBox(Modifier.fillMaxWidth(0.8f).height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun InboxEmpty(title: String, copy: String, onRetry: (() -> Unit)? = null) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(
                Modifier.fillParentMaxSize().padding(36.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier.size(66.dp).clip(RoundedCornerShape(20.dp))
                        .background(Bhq.colors.accent.copy(alpha = 0.10f))
                        .border(1.dp, Bhq.colors.blueprintLine.copy(alpha = 0.18f), RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.ChatBubbleOutline, contentDescription = null, tint = Bhq.colors.accentLight, modifier = Modifier.size(28.dp))
                }
                Spacer(Modifier.height(18.dp))
                Text(title, color = Bhq.colors.text, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                Spacer(Modifier.height(8.dp))
                Text(copy, color = Bhq.colors.textMuted, fontSize = 14.sp, lineHeight = 20.sp, textAlign = TextAlign.Center)
                if (onRetry != null) {
                    Spacer(Modifier.height(22.dp))
                    PrimaryButton("Try again", onClick = onRetry)
                }
            }
        }
    }
}
