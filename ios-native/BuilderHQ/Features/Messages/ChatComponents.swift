/// Chat thread components: the dynamic header, message bubbles + read-
/// receipt ticks, day separators, the unread divider, system-message
/// pills, and the composer. Kept together so ChatScreen reads as pure
/// composition.

import SwiftUI

// MARK: - Dynamic header

/// Rich, contextual chat header — avatar, name, role + project subtitle.
/// `elevated` (driven by scroll) fades in a hairline + blur so it lifts
/// off the thread as you scroll up.
struct ChatHeaderBar: View {
    let conversation: MessagingAPI.Conversation
    let elevated: Bool
    let onBack: () -> Void
    let onProject: () -> Void
    /// Set only when the other party is a builder — taps open their profile.
    var onBuilder: (() -> Void)? = nil

    private var roleLabel: String {
        conversation.other.role == "builder" ? "Builder" : "Project owner"
    }

    var body: some View {
        HStack(spacing: 11) {
            Press(haptic: .tap, action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Palette.text)
                    .frame(width: 30, height: 36)
                    .contentShape(Rectangle())
            }
            identity

            Spacer(minLength: 6)

            Press(haptic: .tap, action: onProject) {
                Image(systemName: "building.2.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                    .frame(width: 36, height: 36)
                    .background(Circle().fill(Palette.surface.opacity(0.6)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 6)
        .padding(.bottom, 10)
        .background(
            ZStack(alignment: .bottom) {
                Rectangle().fill(.ultraThinMaterial).opacity(elevated ? 1 : 0)
                Rectangle()
                    .fill(Palette.accent.opacity(0.16))
                    .frame(height: 0.5)
                    .opacity(elevated ? 1 : 0)
            }
            .ignoresSafeArea(edges: .top)
            .animation(.easeOut(duration: 0.2), value: elevated)
        )
    }

    /// Avatar + name — tappable (opens the builder profile) when `onBuilder` is set.
    @ViewBuilder
    private var identity: some View {
        if let onBuilder {
            Press(haptic: .tap, action: onBuilder) { identityRow(showChevron: true) }
        } else {
            identityRow(showChevron: false)
        }
    }

    private func identityRow(showChevron: Bool) -> some View {
        HStack(spacing: 11) {
            ZStack {
                Circle().fill(Palette.accentMuted)
                Text(conversation.other.initials)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accent)
            }
            .frame(width: 38, height: 38)
            .overlay(Circle().stroke(Palette.accent.opacity(0.35), lineWidth: 1))

            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 4) {
                    Text(conversation.other.displayName)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    if showChevron {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Palette.textDim)
                    }
                }
                Text("\(roleLabel) · \(conversation.projectTitle)")
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(Palette.textDim)
                    .lineLimit(1)
            }
        }
        .contentShape(Rectangle())
    }
}

// MARK: - Message bubble

struct MessageBubble: View {
    let message: MessagingAPI.Message
    let isMine: Bool
    let tick: ChatViewModel.Tick
    let onRetry: () -> Void

    private var createdAt: Date? { ChatTime.parse(message.createdAtIso) }

    var body: some View {
        HStack(spacing: 0) {
            if isMine { Spacer(minLength: 56) }
            // No maxWidth frame: the bubble hugs its text and only grows to
            // the cap set by the opposite Spacer (WhatsApp-style).
            VStack(alignment: isMine ? .trailing : .leading, spacing: 3) {
                Text(message.body)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(isMine ? .white : Palette.text)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 4) {
                    if let d = createdAt {
                        Text(ChatTime.bubbleTime(d))
                            .font(.system(size: 9.5, weight: .medium))
                            .foregroundStyle(isMine ? Color.white.opacity(0.7) : Palette.textDim)
                    }
                    if isMine { TickView(tick: tick) }
                }
            }
            .padding(.horizontal, 13)
            .padding(.vertical, 8)
            .background(bubbleBackground)
            .overlay(isMine ? nil : bubbleShape.stroke(Palette.hairline, lineWidth: 1))
            .shadow(color: isMine ? Palette.accentGlow.opacity(0.22) : .clear, radius: 10, y: 4)
            .onTapGesture { if tick == .failed { onRetry() } }
            if !isMine { Spacer(minLength: 56) }
        }
    }

    @ViewBuilder
    private var bubbleBackground: some View {
        if isMine {
            bubbleShape.fill(
                LinearGradient(
                    colors: [Color(hex: 0x14D2C5), Color(hex: 0x06978D)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
        } else {
            bubbleShape.fill(Palette.surfaceElev)
        }
    }

    private var bubbleShape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            topLeadingRadius: 20,
            bottomLeadingRadius: isMine ? 20 : 6,
            bottomTrailingRadius: isMine ? 6 : 20,
            topTrailingRadius: 20,
            style: .continuous
        )
    }
}

// MARK: - Read-receipt ticks

struct TickView: View {
    let tick: ChatViewModel.Tick

    var body: some View {
        switch tick {
        case .sending:
            Image(systemName: "clock")
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.6))
        case .failed:
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Palette.danger)
        case .delivered:
            doubleCheck(Color.white.opacity(0.5))
        case .read:
            doubleCheck(.white)
        }
    }

    private func doubleCheck(_ color: Color) -> some View {
        ZStack {
            Image(systemName: "checkmark").offset(x: -2.5)
            Image(systemName: "checkmark").offset(x: 1.5)
        }
        .font(.system(size: 7.5, weight: .black))
        .foregroundStyle(color)
        .frame(width: 14)
    }
}

// MARK: - Day separator

struct DaySeparatorView: View {
    let date: Date
    var body: some View {
        Text(ChatTime.daySeparator(date).uppercased())
            .font(.system(size: 10, weight: .bold)).tracking(0.8)
            .foregroundStyle(Palette.textMuted)
            .padding(.horizontal, 12).padding(.vertical, 5)
            .background(Capsule().fill(Palette.surface.opacity(0.7)))
            .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
    }
}

// MARK: - Unread divider

struct UnreadDividerView: View {
    var body: some View {
        HStack(spacing: 8) {
            line
            Text("UNREAD MESSAGES")
                .font(.system(size: 9.5, weight: .bold)).tracking(1.2)
                .foregroundStyle(Palette.accent)
            line
        }
        .padding(.vertical, 4)
    }
    private var line: some View {
        Rectangle().fill(Palette.accent.opacity(0.3)).frame(height: 1)
    }
}

// MARK: - System message

struct SystemMessageView: View {
    let message: MessagingAPI.Message
    var body: some View {
        Text(message.body)
            .font(.system(size: 11.5, weight: .medium))
            .foregroundStyle(Palette.textMuted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 14).padding(.vertical, 7)
            .background(Capsule().fill(Palette.surface.opacity(0.6)))
            .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
    }
}

// MARK: - Composer

struct ChatComposer: View {
    @Binding var draft: String
    let onSend: () -> Void
    @FocusState private var focused: Bool

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            HStack {
                TextField("Message", text: $draft, axis: .vertical)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .lineLimit(1...5)
                    .focused($focused)
                    .padding(.horizontal, 15)
                    .padding(.vertical, 10)
            }
            .background(
                RoundedRectangle(cornerRadius: 21, style: .continuous)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 21, style: .continuous)
                    .stroke(focused ? Palette.accent.opacity(0.5) : Palette.hairlineStrong, lineWidth: 1)
            )
            .animation(Motion.easeOut, value: focused)

            Button(action: onSend) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .frame(width: 42, height: 42)
                    .background(Circle().fill(canSend ? Palette.accent : Palette.surfaceElev))
                    .shadow(color: canSend ? Palette.accentGlow : .clear, radius: 10, y: 3)
                    .scaleEffect(canSend ? 1 : 0.92)
            }
            .disabled(!canSend)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: canSend)
            .sensoryFeedback(.impact(weight: .light), trigger: canSend)
        }
        .padding(.horizontal, 14)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .bottom))
    }
}
