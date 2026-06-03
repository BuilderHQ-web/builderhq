/// ProfileHubViewModel — loads the right profile for the "You" tab.
///
/// Builders read the rich `BuilderAPI` bundle (+ FBA from the builder
/// dashboard); owners read the lighter owner profile. Identity (name,
/// email, role) comes from the live `AuthSession` so the header paints
/// instantly even before the network returns.

import Foundation
import Observation

@Observable
@MainActor
final class ProfileHubViewModel {
    enum LoadState: Equatable { case initial, loading, ready, error(String) }

    let role: AuthSession.Role
    var loadState: LoadState = .initial

    // Builder
    var builder: BuilderAPI.Bundle? = nil
    var fba: DashboardAPI.FbaStatus? = nil

    // Owner
    var owner: ProfileAPI.OwnerResponse? = nil

    init(role: AuthSession.Role) {
        self.role = role
    }

    var isBuilder: Bool { role == .builder || role == .admin }

    func load() async {
        if loadState == .initial { loadState = .loading }
        do {
            if isBuilder {
                builder = try await BuilderAPI.fetchBundle()
                // FBA is a bonus signal — never fail the screen on it.
                fba = (try? await DashboardAPI.fetchBuilderBundle())?.fba
            } else {
                owner = try await ProfileAPI.fetchOwner()
            }
            loadState = .ready
        } catch let error as APIError {
            // Keep any prior data; only hard-error with nothing to show.
            if builder == nil && owner == nil {
                loadState = .error(error.errorDescription ?? "Couldn't load your profile.")
            } else {
                loadState = .ready
            }
        } catch {
            if builder == nil && owner == nil {
                loadState = .error("Couldn't load your profile.")
            } else {
                loadState = .ready
            }
        }
    }
}
