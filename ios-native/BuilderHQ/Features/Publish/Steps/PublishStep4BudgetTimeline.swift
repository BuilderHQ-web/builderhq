/// PublishStep4BudgetTimeline — money + when.
///
/// Combined step (both questions land on one screen) because they're
/// inseparable in practice: "I want to spend ~$X and start in Y" is
/// one decision. Splitting them would add a needless screen.
///
/// Two sections stacked:
///   1. Budget — vertical BandPicker of 7 ranges from "<500k" to "$5M+"
///   2. Timeline — MonthPicker for start month, optional MonthPicker
///      for target completion. Most owners only pick start; completion
///      is collapsed under a "Add a completion target" reveal.

import SwiftUI

struct PublishStep4BudgetTimeline: View {
    @Bindable var vm: ProjectPublishViewModel

    @State private var showsCompletion: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 6) {
                stepLabel("Budget + timeline")
                Text("Builders use this to decide whether to tender. Be honest — vague budgets get fewer responses.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    budgetSection
                    timelineSection
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear {
            showsCompletion = vm.draft.targetCompletionMonth != nil
        }
    }

    private var budgetSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("BUDGET")
                .font(.system(size: 10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(Palette.textDim)
            BandPicker(
                options: budgetOptions,
                selection: $vm.draft.budgetBand
            )
        }
    }

    private var timelineSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("TARGET START")
                .font(.system(size: 10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(Palette.textDim)
            MonthPicker(selection: $vm.draft.targetStartMonth)

            if showsCompletion {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("TARGET COMPLETION")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.6)
                            .foregroundStyle(Palette.textDim)
                        Spacer()
                        Button {
                            withAnimation(Motion.easeOutSoft) {
                                showsCompletion = false
                                vm.draft.targetCompletionMonth = nil
                            }
                        } label: {
                            Text("Remove")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Palette.textDim)
                        }
                    }
                    MonthPicker(
                        selection: $vm.draft.targetCompletionMonth,
                        earliestYear: MonthPicker.parseYear(
                            from: vm.draft.targetStartMonth
                        ) ?? Calendar.current.component(.year, from: Date()),
                        yearCount: 4
                    )
                }
                .padding(.top, 14)
                .transition(.opacity.combined(with: .move(edge: .top)))
            } else {
                Press(haptic: .tap) {
                    withAnimation(Motion.easeOutSoft) {
                        showsCompletion = true
                    }
                } content: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 13, weight: .semibold))
                        Text("Add a completion target")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(Palette.accentLight)
                    .padding(.top, 10)
                }
            }
        }
        .animation(Motion.easeOutSoft, value: showsCompletion)
    }

    private var budgetOptions: [BandOption<String>] {
        [
            .init(value: "under_500k", title: "Under $500k"),
            .init(value: "500k_1m",    title: "$500k – $1M"),
            .init(value: "1m_1_5m",    title: "$1M – $1.5M"),
            .init(value: "1_5m_2m",    title: "$1.5M – $2M"),
            .init(value: "2m_3m",      title: "$2M – $3M"),
            .init(value: "3m_5m",      title: "$3M – $5M"),
            .init(value: "over_5m",    title: "Over $5M"),
        ]
    }

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }
}
