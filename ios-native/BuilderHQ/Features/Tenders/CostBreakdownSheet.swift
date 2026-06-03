/// CostBreakdownSheet — the itemized cost-breakdown editor.
///
/// Presented as a native bottom sheet from the tender composer (slides
/// up from the bottom, as requested). 28 trades is too many to dump on
/// a form, so the interaction is **build-a-list**, not fill-28-rows:
///
///   · A live "balance bar" at the top shows the breakdown total vs the
///     headline price, with a variance chip ("Balanced", "$X to
///     allocate", "$X over"). The bar fills + turns teal when balanced.
///   · "Your lines" — only the trades you've added, each with an inline
///     amount field + remove. Tap "Balance the remainder" to drop an
///     Other line that squares it to your price.
///   · "Add a trade" — the full catalogue, grouped by build phase and
///     searchable, revealed in a second sheet. Tap a trade → it's added
///     and you're back, focused on its amount.
///
/// Nothing is required: the server auto-balances on submit. This sheet
/// just lets a builder present a professional, itemized quote when they
/// want to — beautifully, without clutter.

import SwiftUI

struct CostBreakdownSheet: View {
    @Bindable var vm: TenderComposerViewModel
    let onClose: () -> Void

    @State private var showingCatalog = false
    @FocusState private var focusedLine: UUID?

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()

            VStack(spacing: 0) {
                grabberHeader
                balanceBar
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if vm.costLines.isEmpty {
                            emptyState
                        } else {
                            linesList
                        }
                        addTradeButton
                        Spacer(minLength: 24)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                }
                .scrollDismissesKeyboard(.interactively)
                footer
            }
        }
        .sheet(isPresented: $showingCatalog) {
            TradeCatalogSheet(
                addedTradeIds: Set(vm.costLines.map(\.trade)),
                onPick: { tradeId in
                    let id = vm.addCostLine(trade: tradeId)
                    showingCatalog = false
                    // Focus the new line's amount field after the sheet
                    // dismisses.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        focusedLine = id
                    }
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Header

    private var grabberHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("COST BREAKDOWN")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(2.0)
                    .foregroundStyle(Palette.accent)
                Text("Optional — itemise your quote")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
            }
            Spacer()
            Press(haptic: .tap, action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 32, height: 32)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 12)
    }

    // MARK: - Balance bar

    private var balanceBar: some View {
        let price = vm.priceAud ?? 0
        let total = vm.breakdownTotal
        let fraction = price > 0 ? min(Double(total) / Double(price), 1.0) : 0
        let tone = barTone

        return VStack(spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("ALLOCATED")
                        .font(.system(size: 9, weight: .bold))
                        .tracking(1.4)
                        .foregroundStyle(Palette.textDim)
                    Text(money(total))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.text)
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        .animation(.snappy(duration: 0.3), value: total)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("YOUR PRICE")
                        .font(.system(size: 9, weight: .bold))
                        .tracking(1.4)
                        .foregroundStyle(Palette.textDim)
                    Text(vm.priceAud == nil ? "—" : money(price))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.textMuted)
                        .monospacedDigit()
                }
            }

            // Progress track.
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Palette.surfaceElev)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [tone, tone.opacity(0.6)],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: max(6, geo.size.width * fraction))
                        .shadow(color: tone.opacity(0.5), radius: 6)
                        .animation(.snappy(duration: 0.35), value: fraction)
                }
            }
            .frame(height: 8)

            // Variance chip.
            HStack(spacing: 6) {
                Image(systemName: varianceIcon)
                    .font(.system(size: 10, weight: .bold))
                Text(varianceLabel)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.2)
                Spacer()
                if canBalance {
                    Press(haptic: .tap) {
                        vm.balanceRemainder()
                    } content: {
                        Text("Balance the remainder")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Palette.accent)
                    }
                }
            }
            .foregroundStyle(tone)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(tone.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }

    private var barTone: Color {
        guard vm.priceAud != nil, vm.breakdownLineCount > 0 else { return Palette.blueprintLine }
        if let v = vm.breakdownVariance {
            if v == 0 { return Palette.accent }
            if v > 0 { return Palette.warning }   // over
            return Palette.blueLight               // under (still to allocate)
        }
        return Palette.blueprintLine
    }

    private var canBalance: Bool {
        guard let v = vm.breakdownVariance else { return false }
        return v < 0   // money still to allocate
    }

    private var varianceIcon: String {
        guard let v = vm.breakdownVariance, vm.breakdownLineCount > 0 else {
            return "list.bullet"
        }
        if v == 0 { return "checkmark.seal.fill" }
        if v > 0 { return "exclamationmark.triangle.fill" }
        return "arrow.down.circle"
    }

    private var varianceLabel: String {
        guard vm.priceAud != nil else { return "Set a price to balance against" }
        guard vm.breakdownLineCount > 0 else { return "Add lines to itemise your quote" }
        guard let v = vm.breakdownVariance else { return "" }
        if v == 0 { return "Balanced — sums to your price" }
        if v > 0 { return "\(money(v)) over your price" }
        return "\(money(-v)) still to allocate"
    }

    // MARK: - Lines

    private var linesList: some View {
        VStack(spacing: 10) {
            ForEach(vm.costLines) { line in
                CostLineRow(
                    line: bindingFor(line),
                    isFocused: focusedLine == line.id,
                    onFocus: { focusedLine = line.id },
                    onRemove: { vm.removeCostLine(id: line.id) }
                )
                .focused($focusedLine, equals: line.id)
            }
        }
    }

    private func bindingFor(_ line: TenderComposerViewModel.DraftCostLine) -> Binding<TenderComposerViewModel.DraftCostLine> {
        Binding(
            get: {
                vm.costLines.first(where: { $0.id == line.id }) ?? line
            },
            set: { newValue in
                if let idx = vm.costLines.firstIndex(where: { $0.id == line.id }) {
                    vm.costLines[idx] = newValue
                }
            }
        )
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "list.bullet.rectangle.portrait")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Palette.accentLight)
            Text("Itemise your quote")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text("Break your price down by trade so the owner can compare bids line-by-line. Add only the trades you're quoting.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 12)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }

    // MARK: - Add trade

    private var addTradeButton: some View {
        Press(haptic: .tap) {
            showingCatalog = true
        } content: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 15, weight: .bold))
                Text("Add a trade")
                    .font(.system(size: 14, weight: .bold))
                Spacer()
                Image(systemName: "chevron.up")
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(Palette.accent)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Palette.accentMuted)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Palette.accent.opacity(0.4), lineWidth: 1)
            )
        }
    }

    // MARK: - Footer

    private var footer: some View {
        Press(haptic: .tap, action: onClose) {
            HStack(spacing: 8) {
                if vm.breakdownLineCount > 0 {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                }
                Text(vm.breakdownLineCount > 0
                     ? "Done · \(vm.breakdownLineCount) line\(vm.breakdownLineCount == 1 ? "" : "s")"
                     : "Done")
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundStyle(Palette.accentContrast)
            .frame(height: 52)
            .frame(maxWidth: .infinity)
            .background(Capsule().fill(Palette.accent))
            .shadow(color: Palette.accentGlow, radius: 18, x: 0, y: 8)
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 16)
        .background(
            LinearGradient(
                colors: [Palette.canvas.opacity(0), Palette.canvas.opacity(0.94)],
                startPoint: .top, endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }

    // MARK: - Helpers

    private func money(_ n: Int) -> String {
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.maximumFractionDigits = 0
        return "$\(fmt.string(from: NSNumber(value: n)) ?? "\(n)")"
    }
}

// MARK: - Cost line row

private struct CostLineRow: View {
    @Binding var line: TenderComposerViewModel.DraftCostLine
    let isFocused: Bool
    let onFocus: () -> Void
    let onRemove: () -> Void

    private var isOther: Bool { line.trade == "other" }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(TradeCatalog.label(line.trade))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    if let hint = TradeCatalog.trade(line.trade)?.hint, !isOther {
                        Text(hint)
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(Palette.textDim)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 8)

                HStack(spacing: 2) {
                    Text("$")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.textMuted)
                    TextField("0", text: $line.amountText)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.text)
                        .tint(Palette.accent)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .monospacedDigit()
                        .frame(width: 96)
                        .onChange(of: line.amountText) { _, v in
                            let digits = v.filter(\.isNumber)
                            if digits != v { line.amountText = digits }
                        }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Palette.surfaceElev)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(isFocused ? Palette.accent.opacity(0.55) : Palette.hairline, lineWidth: 1)
                )

                Press(haptic: .tap, action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Palette.textDim)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Palette.surface))
                        .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
                }
            }

            // Custom label field for "other" lines.
            if isOther {
                TextField("Name this line (e.g. Pool, Solar)", text: $line.label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Palette.surfaceElev)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Palette.hairline, lineWidth: 1)
                    )
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .cardSurface(.flat, radius: 16)
        .contentShape(Rectangle())
        .onTapGesture { onFocus() }
    }
}

// MARK: - Trade catalogue picker

/// Second sheet: the full 28-trade catalogue, grouped by build phase
/// and searchable. Tap a trade to add it. Already-added trades are
/// dimmed + checked (except "other", which can repeat).
private struct TradeCatalogSheet: View {
    let addedTradeIds: Set<String>
    let onPick: (String) -> Void

    @State private var query: String = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                header
                searchField
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        ForEach(visiblePhases, id: \.self) { phase in
                            phaseSection(phase)
                        }
                        Spacer(minLength: 24)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
    }

    private var header: some View {
        HStack {
            Text("Add a trade")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Palette.text)
            Spacer()
            Press(haptic: .tap) { dismiss() } content: {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 32, height: 32)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 12)
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.textDim)
            TextField("Search trades", text: $query)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Palette.text)
                .tint(Palette.accent)
                .autocorrectionDisabled()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .stroke(Palette.hairline, lineWidth: 1)
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
    }

    private var visiblePhases: [TradePhase] {
        TradePhase.allCases.filter { !filteredTrades(in: $0).isEmpty }
    }

    private func filteredTrades(in phase: TradePhase) -> [Trade] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let trades = TradeCatalog.trades(in: phase)
        guard !q.isEmpty else { return trades }
        return trades.filter {
            $0.label.lowercased().contains(q)
                || ($0.hint?.lowercased().contains(q) ?? false)
        }
    }

    private func phaseSection(_ phase: TradePhase) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Image(systemName: phase.icon)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.accent)
                Text(phase.rawValue.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
            }
            VStack(spacing: 8) {
                ForEach(filteredTrades(in: phase)) { trade in
                    tradeRow(trade)
                }
            }
        }
    }

    private func tradeRow(_ trade: Trade) -> some View {
        let added = trade.id != "other" && addedTradeIds.contains(trade.id)
        return Press(haptic: .select) {
            onPick(trade.id)
        } content: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(trade.label)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(added ? Palette.textDim : Palette.text)
                    if let hint = trade.hint {
                        Text(hint)
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(Palette.textDim)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 8)
                Image(systemName: added ? "checkmark.circle.fill" : "plus.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(added ? Palette.accent : Palette.accentLight)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .cardSurface(.flat, radius: 14)
            .opacity(added ? 0.6 : 1)
        }
    }
}
