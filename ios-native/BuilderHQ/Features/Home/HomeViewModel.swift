/// HomeViewModel — state holder for the builder dashboard.
///
/// One @Observable backing the entire Home tab. Fetches the bundle
/// from `/api/mobile/dashboard/builder` on mount + on pull-to-refresh,
/// exposes typed accessors per section, and tracks loading + error
/// state so the screen can render skeleton placeholders cleanly while
/// waiting for the server.
///
/// Deliberately keeps the "first-load reveal" animation state inside
/// the view model (`hasRevealed`) so re-renders triggered by section
/// updates don't replay the cascade.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class HomeViewModel {
    enum LoadState: Equatable {
        case initial         // very first paint — render full skeleton
        case loading         // a fetch is in flight + we have prior data
        case loaded
        case error(message: String)
    }

    /// Server bundle. Nil until the first fetch completes successfully.
    var bundle: DashboardAPI.BuilderBundle? = nil

    /// Drives skeleton vs real rendering + retry UI.
    var loadState: LoadState = .initial

    /// True once we've played the first-load reveal cascade. Stops the
    /// stagger from replaying every time we refetch.
    var hasRevealed: Bool = false

    /// Pull-to-refresh sets this to true while a fetch is in flight so
    /// the custom indicator can show a spinning state. Distinct from
    /// `loadState == .loading` because we want PTR to keep showing
    /// real data underneath; only the indicator changes.
    var isRefreshing: Bool = false

    // MARK: - Fetch

    func load() async {
        // First load → skeleton + reveal cascade.
        if bundle == nil {
            loadState = .initial
        } else {
            loadState = .loading
        }

        do {
            let next = try await DashboardAPI.fetchBuilderBundle()
            bundle = next
            loadState = .loaded
            // Trigger the reveal cascade on first successful paint.
            // Delay by one runloop tick so the bundle assignment has
            // propagated through SwiftUI and the sections exist in the
            // tree before we animate them in.
            if !hasRevealed {
                try? await Task.sleep(for: .milliseconds(40))
                withAnimation(.spring(response: 0.55, dampingFraction: 0.86)) {
                    hasRevealed = true
                }
            }
        } catch {
            let message = friendlyMessage(error)
            loadState = .error(message: message)
        }
    }

    /// Pull-to-refresh entry. Keeps the existing rendered data; only
    /// updates `isRefreshing` so the dial indicator can animate.
    func refresh() async {
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            bundle = try await DashboardAPI.fetchBuilderBundle()
            loadState = .loaded
        } catch {
            loadState = .error(message: friendlyMessage(error))
        }
    }

    // MARK: - Derived view state

    /// First-name greeting derived from AuthSession.user.name on the
    /// caller side. View passes it in to keep the VM decoupled from
    /// auth env.
    func greeting(firstName: String) -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning, \(firstName)"
        case 12..<17: return "Good afternoon, \(firstName)"
        case 17..<22: return "Good evening, \(firstName)"
        default: return "Working late, \(firstName)"
        }
    }

    /// Time-of-day greeting split into a (plain, italic) pair so the
    /// header can render the name in Instrument Serif accent. The
    /// italic portion is just the name with a trailing period — gives
    /// the headline a typographic punctuation moment.
    func greetingPair(firstName: String) -> (plain: String, italic: String) {
        let hour = Calendar.current.component(.hour, from: Date())
        let prefix: String = {
            switch hour {
            case 5..<12: return "Good morning,"
            case 12..<17: return "Good afternoon,"
            case 17..<22: return "Good evening,"
            default: return "Working late,"
            }
        }()
        return (prefix, "\(firstName).")
    }

    /// True when the dashboard should render the verification callout
    /// instead of the FBA hero. Builders without approval don't get
    /// FBA credits regardless, so the two states are mutually exclusive
    /// in the hero slot.
    var showsApprovalCallout: Bool {
        guard let bundle = bundle else { return false }
        return bundle.profile.approvalStatus != "approved"
    }

    /// True when the FBA hero card can render — approved AND active.
    var showsFbaHero: Bool {
        guard let bundle = bundle else { return false }
        if bundle.profile.approvalStatus != "approved" { return false }
        if case .active = bundle.fba { return true }
        return false
    }

    // MARK: - Error helpers

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? "Something went wrong. Pull to refresh."
        }
        return "Something went wrong. Pull to refresh."
    }
}
