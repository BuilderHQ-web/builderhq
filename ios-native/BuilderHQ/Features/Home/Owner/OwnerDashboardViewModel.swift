/// OwnerDashboardViewModel — state holder for the owner home tab.
///
/// Same shape as the builder side: an @Observable that fetches the
/// bundle from `/api/mobile/dashboard/owner`, exposes typed section
/// accessors, and tracks loading + reveal state so the screen can
/// show skeletons + cascade-reveal cleanly.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class OwnerDashboardViewModel {
    enum LoadState: Equatable {
        case initial
        case loading
        case loaded
        case error(message: String)
    }

    var bundle: ProjectsAPI.OwnerDashboardBundle? = nil
    var loadState: LoadState = .initial
    var hasRevealed: Bool = false

    func load() async {
        if bundle == nil {
            loadState = .initial
        } else {
            loadState = .loading
        }
        do {
            let next = try await ProjectsAPI.fetchOwnerDashboard()
            bundle = next
            loadState = .loaded
            if !hasRevealed {
                try? await Task.sleep(for: .milliseconds(40))
                withAnimation(.spring(response: 0.55, dampingFraction: 0.86)) {
                    hasRevealed = true
                }
            }
        } catch {
            loadState = .error(message: friendlyMessage(error))
        }
    }

    func refresh() async {
        do {
            bundle = try await ProjectsAPI.fetchOwnerDashboard()
            loadState = .loaded
        } catch {
            loadState = .error(message: friendlyMessage(error))
        }
    }

    /// Time-of-day greeting split for the typographic accent pair.
    func greetingPair(firstName: String) -> (plain: String, italic: String) {
        let hour = Calendar.current.component(.hour, from: Date())
        let prefix: String
        switch hour {
        case 5..<12: prefix = "Good morning,"
        case 12..<17: prefix = "Good afternoon,"
        case 17..<22: prefix = "Good evening,"
        default: prefix = "Working late,"
        }
        return (prefix, "\(firstName).")
    }

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? "Couldn't load your dashboard. Pull to refresh."
        }
        return "Couldn't load your dashboard. Pull to refresh."
    }
}
