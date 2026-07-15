package au.com.builderhq.app.feature.messaging

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Sender sentinel for an optimistic (not-yet-acked) outgoing message. Any
 *  value that isn't the other party's id reads as "mine" in the bubble logic. */
internal const val SELF_SENDER = "self"

private val zone: ZoneId get() = ZoneId.systemDefault()
private val clockFmt = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)
private val dayMonthFmt = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)

private fun instantOrNull(iso: String?): Instant? =
    if (iso.isNullOrBlank()) null else runCatching { Instant.parse(iso) }.getOrNull()

/** Inbox row timestamp: time if today, "Yesterday", weekday if <7d, else d MMM. */
internal fun formatInboxTime(iso: String?): String {
    val inst = instantOrNull(iso) ?: return ""
    val date = inst.atZone(zone).toLocalDate()
    val today = LocalDate.now()
    return when {
        date == today -> inst.atZone(zone).format(clockFmt)
        date == today.minusDays(1) -> "Yesterday"
        ChronoUnit.DAYS.between(date, today) < 7 ->
            date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
        else -> date.format(dayMonthFmt)
    }
}

/** Date-separator label inside a thread. */
internal fun formatDayLabel(iso: String?): String {
    val inst = instantOrNull(iso) ?: return ""
    val date = inst.atZone(zone).toLocalDate()
    val today = LocalDate.now()
    return when {
        date == today -> "Today"
        date == today.minusDays(1) -> "Yesterday"
        ChronoUnit.DAYS.between(date, today) < 7 ->
            date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
        else -> date.format(dayMonthFmt)
    }
}

/** Per-bubble clock time. */
internal fun formatClockTime(iso: String?): String {
    val inst = instantOrNull(iso) ?: return ""
    return inst.atZone(zone).format(clockFmt)
}

/** Milliseconds since [iso], or null if it can't be parsed. */
internal fun millisSince(iso: String?): Long? {
    val inst = instantOrNull(iso) ?: return null
    return System.currentTimeMillis() - inst.toEpochMilli()
}

/** "Read" tick: the other side's read pointer is at or after this message. */
internal fun isReadBy(otherLastReadIso: String?, messageCreatedIso: String?): Boolean {
    val read = instantOrNull(otherLastReadIso) ?: return false
    val created = instantOrNull(messageCreatedIso) ?: return false
    return !read.isBefore(created)
}
