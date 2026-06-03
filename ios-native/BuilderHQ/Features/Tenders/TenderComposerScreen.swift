/// TenderComposerScreen — the builder's "submit a tender" form.
///
/// Presented as a fullScreenCover from the unlocked project detail.
/// Layout, top-down:
///   · Glass top bar: close (×) + "Your tender" + project title
///   · Hero price input — the headline number, big and tactile
///   · Duration (weeks) + Validity (segmented 7/14/30/60/90 days)
///   · Proposed start month (optional, MonthPicker)
///   · Pitch (optional) — why you, in your words
///   · Exclusions (optional) — chip add
///   · Conditions (optional)
///   · Sticky footer: "Save draft" (secondary) + "Submit tender"
///     (primary, gated on price + duration + validity)
///   · Submit → celebration → dismiss → detail refetches
///
/// Required fields mirror the server's readiness gate so the submit
/// button never promises a submit that'll bounce.

import SwiftUI
import UniformTypeIdentifiers

struct TenderComposerScreen: View {
    @State private var vm: TenderComposerViewModel
    /// Called after a successful submit so the detail screen can
    /// refetch and flip to the "tender submitted" state.
    let onSubmitted: () -> Void
    let onClose: () -> Void

    @State private var showCelebration: Bool = false
    @State private var exclusionDraft: String = ""
    @State private var showingBreakdown: Bool = false
    @State private var pickingDocs: Bool = false
    @State private var pickingQuote: Bool = false
    @FocusState private var focused: FieldFocus?

    private enum FieldFocus: Hashable {
        case price, duration, pitch, exclusion, conditions
    }

    private let docTypes: [UTType] = [
        .pdf, .image, .png, .jpeg, .plainText, .commaSeparatedText, .zip,
        UTType("com.microsoft.word.doc") ?? .data,
        UTType("org.openxmlformats.wordprocessingml.document") ?? .data,
        UTType("com.microsoft.excel.xls") ?? .data,
        UTType("org.openxmlformats.spreadsheetml.sheet") ?? .data,
        .data,
    ]

    init(
        slug: String,
        projectTitle: String,
        onSubmitted: @escaping () -> Void,
        onClose: @escaping () -> Void
    ) {
        _vm = State(
            initialValue: TenderComposerViewModel(
                slug: slug,
                projectTitle: projectTitle
            )
        )
        self.onSubmitted = onSubmitted
        self.onClose = onClose
    }

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            switch vm.loadState {
            case .loading:
                loadingState
            case .error(let message):
                errorState(message: message)
            case .ready:
                composer
            }

            if vm.isScanning {
                DocumentScanOverlay(title: scanTitle, subtitle: scanSubtitle)
                    .transition(.opacity)
                    .zIndex(2)
            }

            if showCelebration {
                celebration.transition(.opacity).zIndex(3)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: vm.isScanning)
        .task { await vm.load() }
        .onChange(of: vm.didSubmit) { _, submitted in
            guard submitted else { return }
            withAnimation(.spring(response: 0.5, dampingFraction: 0.82)) {
                showCelebration = true
            }
            Task {
                try? await Task.sleep(for: .milliseconds(2500))
                onSubmitted()
            }
        }
        .sheet(isPresented: $showingBreakdown) {
            CostBreakdownSheet(vm: vm, onClose: { showingBreakdown = false })
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .fileImporter(
            isPresented: $pickingDocs,
            allowedContentTypes: docTypes,
            allowsMultipleSelection: true,
            onCompletion: handleDocs
        )
        .fileImporter(
            isPresented: $pickingQuote,
            allowedContentTypes: [.pdf],
            allowsMultipleSelection: false,
            onCompletion: handleQuote
        )
    }

    /// The filename currently being scanned, for the overlay subtitle.
    private var scanningFilename: String? {
        vm.docs.last(where: {
            if case .uploading = $0.state { return true }
            return false
        })?.filename
    }

    /// Scanner overlay copy, derived from the scan phase.
    private var scanTitle: String {
        if case .uploading = vm.scanPhase { return "Uploading your quote" }
        return "Reading your quote"
    }

    private var scanSubtitle: String {
        if case .uploading = vm.scanPhase {
            return scanningFilename ?? "Securing your file…"
        }
        return "Pulling out the price, programme, and line items…"
    }

    private func handleQuote(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { return }
        let filename = url.lastPathComponent
        Task {
            await vm.scanQuote(
                filename: filename,
                contentType: "application/pdf",
                data: data
            )
        }
    }

    private func handleDocs(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result else { return }
        for url in urls {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else { continue }
            let filename = url.lastPathComponent
            let mime = docMime(for: url)
            Task {
                await vm.uploadDoc(filename: filename, contentType: mime, data: data)
            }
        }
    }

    private func docMime(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "pdf":  return "application/pdf"
        case "png":  return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "zip":  return "application/zip"
        case "doc":  return "application/msword"
        case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case "xls":  return "application/vnd.ms-excel"
        case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        case "csv":  return "text/csv"
        case "txt":  return "text/plain"
        default:     return "application/octet-stream"
        }
    }

    // MARK: - Composer

    private var composer: some View {
        VStack(spacing: 0) {
            topBar
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    // Fast path — scan a quote PDF and let Claude prefill.
                    scanQuoteEntry
                    if scanBannerVisible {
                        scanBanner.transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // The essentials — the only required fields.
                    priceHero
                    durationValidityBlock
                    startMonthBlock

                    // Everything below sharpens the bid but is optional.
                    Kicker("Strengthen your bid", trailing: "Optional")
                        .padding(.top, 4)

                    breakdownEntry
                    documentsBlock
                    pitchBlock
                    exclusionsBlock
                    conditionsBlock

                    if let banner = vm.bannerError {
                        bannerRow(banner)
                    }

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: focused) { _, f in
                // Editing a field clears its "from quote" highlight.
                switch f {
                case .price:      vm.clearAutofill(.price)
                case .duration:   vm.clearAutofill(.duration)
                case .pitch:      vm.clearAutofill(.pitch)
                case .conditions: vm.clearAutofill(.conditions)
                case .exclusion, .none: break
                }
            }

            footer
        }
    }

    // MARK: - Scan a quote (PDF autofill)

    /// The headline "fast path" — tap to pick a quote PDF and let Claude
    /// prefill the form. Deliberately the first thing in the scroll.
    private var scanQuoteEntry: some View {
        Press(haptic: .tap) {
            pickingQuote = true
        } content: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .fill(Palette.accentToBlue)
                    Image(systemName: "doc.text.viewfinder")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Palette.accentContrast)
                }
                .frame(width: 48, height: 48)
                .shadow(color: Palette.accentGlow.opacity(0.6), radius: 12, y: 4)

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text("Scan a quote to autofill")
                            .font(.system(size: 15.5, weight: .bold))
                            .foregroundStyle(Palette.text)
                        Text("AI")
                            .font(.system(size: 8.5, weight: .black))
                            .tracking(0.8)
                            .foregroundStyle(Palette.accentContrast)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1.5)
                            .background(Capsule().fill(Palette.accentLight))
                    }
                    Text("Upload your quote PDF — we'll pull the price, programme & line items for you to review.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 4)

                Image(systemName: "arrow.up.doc.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Palette.accent)
            }
            .padding(16)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Palette.accent.opacity(0.07))
                    BlueprintGrid(spacing: 18, tint: Palette.accentLight, minorOpacity: 0.05)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Palette.accent.opacity(0.35), lineWidth: 1)
            )
            .shadow(color: Palette.accentGlow.opacity(0.25), radius: 18, y: 6)
        }
    }

    private var scanBannerVisible: Bool {
        switch vm.scanPhase {
        case .done, .failed: return true
        default: return false
        }
    }

    @ViewBuilder
    private var scanBanner: some View {
        switch vm.scanPhase {
        case .done(let filled, let warnings):
            scanResultBanner(
                icon: "sparkles",
                tint: Palette.accent,
                title: filled > 0
                    ? "Filled \(filled) field\(filled == 1 ? "" : "s") from your quote"
                    : "We read your quote",
                body: filled > 0
                    ? "Review the highlighted fields and adjust anything before you submit."
                    : "We couldn't find new details to fill — add them below.",
                warnings: warnings
            )
        case .failed(let message):
            scanResultBanner(
                icon: "exclamationmark.triangle.fill",
                tint: Palette.warning,
                title: "Couldn't autofill from that quote",
                body: message,
                warnings: []
            )
        default:
            EmptyView()
        }
    }

    private func scanResultBanner(
        icon: String,
        tint: Color,
        title: String,
        body: String,
        warnings: [String]
    ) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(tint)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.text)
                Text(body)
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
                ForEach(warnings, id: \.self) { w in
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Palette.warning)
                            .padding(.top, 2)
                        Text(w)
                            .font(.system(size: 11.5, weight: .medium))
                            .foregroundStyle(Palette.textDim)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            Spacer(minLength: 4)
            Press(haptic: .tap) {
                withAnimation(.easeInOut(duration: 0.25)) { vm.dismissScanReview() }
            } content: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .frame(width: 26, height: 26)
                    .background(Circle().fill(Palette.surface))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(tint.opacity(0.09))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(tint.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: 12) {
            Press(haptic: .tap, action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
            VStack(alignment: .leading, spacing: 1) {
                Text("YOUR TENDER")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2.0)
                    .foregroundStyle(Palette.accent)
                Text(vm.projectTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(
            Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .top)
        )
    }

    // MARK: - Price hero

    private var priceHero: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Your price", required: true, autofill: .price)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("$")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.accent)
                TextField("0", text: priceBinding)
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .keyboardType(.numberPad)
                    .focused($focused, equals: .price)
                    .monospacedDigit()
                Spacer()
                Text("AUD")
                    .font(.system(size: 13, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(
                        focused == .price ? Palette.accent.opacity(0.6) : Palette.hairlineStrong,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: focused == .price ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: 16
            )
            .animation(Motion.easeOutSoft, value: focused == .price)

            if let pretty = prettyPrice {
                Text(pretty)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 4)
                    .transition(.opacity)
            }
        }
    }

    /// Digits-only binding so the field never holds non-numeric chars.
    private var priceBinding: Binding<String> {
        Binding(
            get: { vm.priceText },
            set: { vm.priceText = $0.filter(\.isNumber) }
        )
    }

    private var prettyPrice: String? {
        guard let n = vm.priceAud else { return nil }
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.maximumFractionDigits = 0
        let grouped = fmt.string(from: NSNumber(value: n)) ?? "\(n)"
        return "$\(grouped) fixed-price tender"
    }

    // MARK: - Duration + validity

    private var durationValidityBlock: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("Build duration", required: true, autofill: .duration)
                HStack(spacing: 10) {
                    TextField("0", text: durationBinding)
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.text)
                        .tint(Palette.accent)
                        .keyboardType(.numberPad)
                        .focused($focused, equals: .duration)
                        .monospacedDigit()
                        .frame(maxWidth: 80)
                    Text("weeks")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Palette.surface)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(
                            focused == .duration ? Palette.accent.opacity(0.6) : Palette.hairlineStrong,
                            lineWidth: 1
                        )
                )
            }

            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("Price valid for", required: true, autofill: .validity)
                HStack(spacing: 8) {
                    ForEach(TenderComposerViewModel.validityOptions, id: \.self) { days in
                        validityPill(days)
                    }
                }
            }
        }
    }

    private var durationBinding: Binding<String> {
        Binding(
            get: { vm.durationWeeksText },
            set: { vm.durationWeeksText = $0.filter(\.isNumber) }
        )
    }

    private func validityPill(_ days: Int) -> some View {
        let isActive = vm.validityDays == days
        return Press(haptic: .select) {
            vm.validityDays = days
            vm.clearAutofill(.validity)
        } content: {
            VStack(spacing: 1) {
                Text("\(days)")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text("days")
                    .font(.system(size: 9, weight: .bold))
                    .tracking(0.8)
            }
            .foregroundStyle(isActive ? Palette.accentContrast : Palette.text)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .fill(isActive ? Palette.accent : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .stroke(isActive ? .clear : Palette.cardBorder, lineWidth: 1)
            )
            .shadow(color: isActive ? Palette.accentGlow : .clear, radius: 12)
            .scaleEffect(isActive ? 1.02 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActive)
        }
    }

    // MARK: - Start month

    private var startMonthBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Earliest start", required: false, autofill: .startMonth)
            MonthPicker(selection: $vm.startMonth)
        }
    }

    // MARK: - Cost breakdown entry

    /// Compact entry card → opens the breakdown bottom sheet. Shows a
    /// live summary (line count + balance state) so the builder sees
    /// the breakdown's state without opening it.
    private var breakdownEntry: some View {
        Press(haptic: .tap) {
            showingBreakdown = true
            vm.clearAutofill(.breakdown)
        } content: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .fill(Palette.accentMuted)
                        .overlay(
                            RoundedRectangle(cornerRadius: 11, style: .continuous)
                                .stroke(Palette.accent.opacity(0.4), lineWidth: 1)
                        )
                    Image(systemName: "chart.bar.doc.horizontal.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }
                .frame(width: 42, height: 42)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("Cost breakdown")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Palette.text)
                        if vm.autofilledFields.contains(.breakdown) {
                            fromQuoteChip
                        }
                    }
                    Text(breakdownSummary)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(breakdownSummaryTone)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                if vm.breakdownLineCount > 0 {
                    Text("\(vm.breakdownLineCount)")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.accentContrast)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Palette.accent))
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .cardSurface(.flat, radius: 16)
        }
    }

    private var breakdownSummary: String {
        if vm.breakdownLineCount == 0 {
            return "Itemise your quote by trade"
        }
        if vm.breakdownBalanced {
            return "\(vm.breakdownLineCount) lines · balanced"
        }
        if let v = vm.breakdownVariance, v < 0 {
            return "\(vm.breakdownLineCount) lines · \(moneyShort(-v)) to allocate"
        }
        if let v = vm.breakdownVariance, v > 0 {
            return "\(vm.breakdownLineCount) lines · \(moneyShort(v)) over"
        }
        return "\(vm.breakdownLineCount) lines"
    }

    private var breakdownSummaryTone: Color {
        guard vm.breakdownLineCount > 0 else { return Palette.textDim }
        if vm.breakdownBalanced { return Palette.accent }
        if let v = vm.breakdownVariance, v > 0 { return Palette.warning }
        return Palette.textMuted
    }

    // MARK: - Documents

    private var documentsBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Documents", required: false)
            Text("Attach a detailed BoQ, insurance certificate, or supporting drawings (PDF, images, spreadsheets).")
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Palette.textDim)

            if !vm.docs.isEmpty {
                VStack(spacing: 8) {
                    ForEach(vm.docs) { doc in
                        tenderDocRow(doc)
                    }
                }
            }

            Press(haptic: .tap) {
                pickingDocs = true
            } content: {
                HStack(spacing: 8) {
                    Image(systemName: "paperclip")
                        .font(.system(size: 13, weight: .bold))
                    Text(vm.docs.isEmpty ? "Attach files" : "Add more")
                        .font(.system(size: 13, weight: .bold))
                    Spacer()
                    Text("PDF · IMG · XLS")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.textDim)
                }
                .foregroundStyle(Palette.accentLight)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Palette.surfaceElev)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Palette.hairlineStrong, lineWidth: 1)
                )
            }
        }
    }

    private func tenderDocRow(_ doc: TenderComposerViewModel.DocUpload) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(docGlyphBg(doc.state))
                    .frame(width: 32, height: 32)
                docGlyph(doc.state)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(doc.filename)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(docStatusText(doc))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(docStatusTone(doc.state))
            }
            Spacer(minLength: 8)
            Press(haptic: .tap) { vm.removeDoc(id: doc.id) } content: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .frame(width: 24, height: 24)
                    .background(Circle().fill(Palette.surface))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Palette.surfaceElev.opacity(0.6))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func docGlyph(_ state: TenderComposerViewModel.DocUpload.State) -> some View {
        switch state {
        case .completed:
            Image(systemName: "checkmark")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Palette.accent)
        case .failed:
            Image(systemName: "exclamationmark")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Palette.danger)
        case .uploading(let p):
            ZStack {
                Circle().stroke(Palette.hairline, lineWidth: 2).frame(width: 16, height: 16)
                Circle().trim(from: 0, to: max(0.05, p))
                    .stroke(Palette.accent, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    .frame(width: 16, height: 16).rotationEffect(.degrees(-90))
            }
        }
    }

    private func docGlyphBg(_ state: TenderComposerViewModel.DocUpload.State) -> Color {
        switch state {
        case .completed: return Palette.accentMuted
        case .failed:    return Palette.dangerMuted
        case .uploading: return Palette.surface
        }
    }

    private func docStatusText(_ doc: TenderComposerViewModel.DocUpload) -> String {
        switch doc.state {
        case .completed: return "Attached · \(prettyBytes(doc.sizeBytes))"
        case .failed(let m): return m
        case .uploading(let p): return "Uploading · \(Int(p * 100))%"
        }
    }

    private func docStatusTone(_ state: TenderComposerViewModel.DocUpload.State) -> Color {
        switch state {
        case .completed: return Palette.accent
        case .failed:    return Palette.danger
        case .uploading: return Palette.textMuted
        }
    }

    private func prettyBytes(_ n: Int) -> String {
        let kb = Double(n) / 1024
        if kb < 1024 { return String(format: "%.0f KB", kb) }
        return String(format: "%.1f MB", kb / 1024)
    }

    private func moneyShort(_ n: Int) -> String {
        if n >= 1_000_000 { return String(format: "$%.1fM", Double(n) / 1_000_000) }
        if n >= 1_000 { return "$\(n / 1000)k" }
        return "$\(n)"
    }

    // MARK: - Pitch

    private var pitchBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Your pitch", required: false, autofill: .pitch)
            Text("Why you're the right builder for this. Owners read this first.")
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Palette.textDim)
            textEditor(
                text: $vm.pitch,
                placeholder: "Recent similar builds, your team, what sets your quote apart…",
                focus: .pitch,
                minHeight: 120,
                limit: 2000
            )
        }
    }

    // MARK: - Exclusions

    private var exclusionsBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Exclusions", required: false, autofill: .exclusions)
            Text("Anything your price doesn't cover — landscaping, council fees, etc.")
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Palette.textDim)

            if !vm.exclusions.isEmpty {
                FlowChips(items: vm.exclusions) { item in
                    vm.removeExclusion(item)
                    vm.clearAutofill(.exclusions)
                }
            }

            HStack(spacing: 8) {
                TextField("Add an exclusion", text: $exclusionDraft)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .focused($focused, equals: .exclusion)
                    .submitLabel(.done)
                    .onSubmit(commitExclusion)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Palette.surface)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Palette.hairlineStrong, lineWidth: 1)
                    )
                Press(haptic: .tap, action: commitExclusion) {
                    Image(systemName: "plus")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .frame(width: 44, height: 44)
                        .background(Circle().fill(Palette.accent))
                        .opacity(exclusionDraft.trimmingCharacters(in: .whitespaces).isEmpty ? 0.4 : 1)
                }
                .disabled(exclusionDraft.trimmingCharacters(in: .whitespaces).isEmpty
                    || vm.exclusions.count >= 20)
            }
        }
    }

    private func commitExclusion() {
        vm.addExclusion(exclusionDraft)
        exclusionDraft = ""
        vm.clearAutofill(.exclusions)
    }

    // MARK: - Conditions

    private var conditionsBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Conditions", required: false, autofill: .conditions)
            textEditor(
                text: $vm.conditions,
                placeholder: "Payment schedule, assumptions, anything the owner should know…",
                focus: .conditions,
                minHeight: 90,
                limit: 2000
            )
        }
    }

    // MARK: - Footer

    private var footer: some View {
        VStack(spacing: 8) {
            if !vm.canSubmit {
                Text("Add \(missingPhrase) to submit")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.textDim)
            }
            HStack(spacing: 12) {
                Press(haptic: .tap) {
                    Task { await vm.saveDraft() }
                } content: {
                    Group {
                        if vm.isSaving {
                            ProgressView().tint(Palette.text).scaleEffect(0.8)
                        } else {
                            Text("Save draft")
                                .font(.system(size: 15, weight: .semibold))
                        }
                    }
                    .foregroundStyle(Palette.text)
                    .frame(height: 52)
                    .frame(maxWidth: .infinity)
                    .background(Capsule().fill(Palette.surface))
                    .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
                }
                .disabled(vm.isSaving || vm.isSubmitting)

                Button {
                    Task { await vm.submit() }
                } label: {
                    ZStack {
                        Capsule()
                            .fill(vm.canSubmit ? Palette.accent : Palette.surfaceElev)
                            .shadow(
                                color: vm.canSubmit ? Palette.accentGlow : .clear,
                                radius: 20, x: 0, y: 8
                            )
                        if vm.isSubmitting {
                            ProgressView().tint(Palette.accentContrast)
                        } else {
                            HStack(spacing: 8) {
                                Image(systemName: "paperplane.fill")
                                    .font(.system(size: 14, weight: .bold))
                                Text("Submit tender")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundStyle(vm.canSubmit ? Palette.accentContrast : Palette.textDim)
                        }
                    }
                    .frame(height: 52)
                    .frame(maxWidth: .infinity)
                }
                .disabled(!vm.canSubmit || vm.isSubmitting || vm.isSaving)
                .sensoryFeedback(.impact(weight: .medium), trigger: vm.isSubmitting)
            }
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

    private var missingPhrase: String {
        let parts = vm.missingForSubmit
        if parts.count <= 1 { return parts.first ?? "the required fields" }
        if parts.count == 2 { return "\(parts[0]) and \(parts[1])" }
        return parts.dropLast().joined(separator: ", ") + ", and " + (parts.last ?? "")
    }

    // MARK: - Celebration

    private var celebration: some View {
        CelebrationScene(
            symbol: "paperplane.fill",
            tone: .accent,
            titlePlain: "Tender",
            titleEmphasis: "sent.",
            subtitle: "The owner can see your bid now. You'll be notified if they shortlist or award it.",
            metric: tenderSentMetric
        )
    }

    /// "$420,000 · 24 weeks" recap on the celebration, when both are set.
    private var tenderSentMetric: String? {
        var parts: [String] = []
        if let price = vm.priceAud {
            let fmt = NumberFormatter()
            fmt.numberStyle = .decimal
            fmt.maximumFractionDigits = 0
            parts.append("$\(fmt.string(from: NSNumber(value: price)) ?? "\(price)")")
        }
        if let weeks = vm.durationWeeks {
            parts.append("\(weeks) week\(weeks == 1 ? "" : "s")")
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    // MARK: - Loading / error

    private var loadingState: some View {
        VStack(spacing: 16) {
            ProgressView().tint(Palette.accent)
            Text("Preparing your tender…")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.textMuted)
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't start your tender")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
            HStack(spacing: 12) {
                Press(haptic: .tap, action: onClose) {
                    Text("Close")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .padding(.horizontal, 22)
                        .frame(height: 46)
                        .background(Capsule().fill(Palette.surface))
                        .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
                }
                Press(haptic: .tap) {
                    Task { await vm.load() }
                } content: {
                    Text("Try again")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 22)
                        .frame(height: 46)
                        .background(Capsule().fill(Palette.accent))
                        .shadow(color: Palette.accentGlow, radius: 12, y: 4)
                }
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 28)
    }

    // MARK: - Shared bits

    private func sectionLabel(
        _ text: String,
        required: Bool,
        autofill: TenderComposerViewModel.AutofillField? = nil
    ) -> some View {
        HStack(spacing: 6) {
            Text(text.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(2.0)
                .foregroundStyle(Palette.textDim)
            if required {
                Text("REQUIRED")
                    .font(.system(size: 8, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Palette.accent)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(Palette.accentMuted))
            } else {
                Text("OPTIONAL")
                    .font(.system(size: 8, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Palette.textDim)
            }
            if let autofill, vm.autofilledFields.contains(autofill) {
                fromQuoteChip.transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: vm.autofilledFields)
    }

    /// Tiny teal marker shown beside fields the quote scan populated.
    private var fromQuoteChip: some View {
        HStack(spacing: 3) {
            Image(systemName: "sparkles")
                .font(.system(size: 8, weight: .bold))
            Text("FROM QUOTE")
                .font(.system(size: 8, weight: .bold))
                .tracking(1.0)
        }
        .foregroundStyle(Palette.accentContrast)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(Capsule().fill(Palette.accent))
    }

    private func textEditor(
        text: Binding<String>,
        placeholder: String,
        focus: FieldFocus,
        minHeight: CGFloat,
        limit: Int
    ) -> some View {
        ZStack(alignment: .topLeading) {
            if text.wrappedValue.isEmpty {
                Text(placeholder)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
            }
            TextEditor(text: text)
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(Palette.text)
                .tint(Palette.accent)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .focused($focused, equals: focus)
                .onChange(of: text.wrappedValue) { _, newValue in
                    if newValue.count > limit {
                        text.wrappedValue = String(newValue.prefix(limit))
                    }
                }
        }
        .frame(minHeight: minHeight)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(
                    focused == focus ? Palette.accent.opacity(0.6) : Palette.hairlineStrong,
                    lineWidth: 1
                )
        )
        .animation(Motion.easeOutSoft, value: focused == focus)
    }

    private func bannerRow(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .foregroundStyle(Palette.danger)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 12).fill(Palette.dangerMuted))
        .overlay(
            RoundedRectangle(cornerRadius: 12).stroke(Palette.danger.opacity(0.35), lineWidth: 1)
        )
    }
}

// MARK: - Flow chips (wrapping exclusion tags)

private struct FlowChips: View {
    let items: [String]
    let onRemove: (String) -> Void

    var body: some View {
        // Simple wrapping layout via a flexible grid of leading-aligned
        // chips. For the small counts here (≤20) this is plenty.
        FlexibleWrap(spacing: 8, lineSpacing: 8) {
            ForEach(items, id: \.self) { item in
                HStack(spacing: 6) {
                    Text(item)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    Press(haptic: .tap) { onRemove(item) } content: {
                        Image(systemName: "xmark")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Palette.textDim)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Capsule().fill(Palette.surfaceElev))
                .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
            }
        }
    }
}

/// Lightweight flow layout (iOS 16+ Layout protocol) — wraps children
/// onto new lines when they run out of horizontal room.
private struct FlexibleWrap: Layout {
    var spacing: CGFloat = 8
    var lineSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += lineHeight + lineSpacing
                lineHeight = 0
            }
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
        return CGSize(width: maxWidth, height: y + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var lineHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += lineHeight + lineSpacing
                lineHeight = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}
