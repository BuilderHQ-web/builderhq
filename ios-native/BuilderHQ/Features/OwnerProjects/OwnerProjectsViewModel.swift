/// OwnerProjectsViewModel — state holder for the owner's Projects tab.
///
/// Owns:
///   · The full uncapped list of the owner's projects (drafts +
///     published + tendering + completed)
///   · Active scope pill (All / Drafts / Live / Completed) — drives
///     the server-side `status` filter on refetch
///   · Search query — drives the server-side `q` filter (debounced
///     in the view)
///   · Load + refresh state + reveal animation flag for the cascade
///
/// Mirrors `BrowseViewModel` in shape so the two screens feel like
/// siblings even though they hit different endpoints.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class OwnerProjectsViewModel {
    enum LoadState: Equatable {
        case initial
        case loading
        case loaded
        case error(message: String)
    }

    /// Pill at the top of the Projects tab. Maps to the server's
    /// `status` query param (except `.all`, which omits the param).
    enum Scope: String, Equatable, CaseIterable {
        case all
        case draft
        case published
        case tendering
        case completed
    }

    var items: [ProjectsAPI.OwnerProjectRow] = []
    var loadState: LoadState = .initial
    var hasRevealed: Bool = false

    // Filters
    var query: String = ""
    var scope: Scope = .all

    private var hasFetched = false
    private var fetchTask: Task<Void, Never>? = nil

    // MARK: - Fetch

    func loadIfNeeded() async {
        guard !hasFetched else { return }
        await reload()
    }

    func reload() async {
        fetchTask?.cancel()
        let task = Task { await runFetch() }
        fetchTask = task
        await task.value
    }

    func refresh() async {
        await runFetch()
    }

    private func runFetch() async {
        if items.isEmpty {
            loadState = .loading
        }
        do {
            let serverStatus: String? = scope == .all ? nil : scope.rawValue
            let response = try await ProjectsAPI.fetchMyProjects(
                status: serverStatus,
                query: query.isEmpty ? nil : query
            )
            if Task.isCancelled { return }
            items = response
            loadState = .loaded
            hasFetched = true
            if !hasRevealed {
                try? await Task.sleep(for: .milliseconds(40))
                withAnimation(.spring(response: 0.55, dampingFraction: 0.86)) {
                    hasRevealed = true
                }
            }
        } catch {
            if Task.isCancelled { return }
            loadState = .error(message: friendlyMessage(error))
        }
    }

    // MARK: - Counts (for the scope pills' badges)

    /// Number of projects matching a given scope across the full
    /// fetched set. We compute against `items` so the badge reflects
    /// the *current* server response — after `.draft` is selected,
    /// the badge for `.all` matches the count returned for drafts,
    /// not the historical total. (Re-fetching on every pill switch
    /// keeps counts honest.)
    func count(for scope: Scope) -> Int {
        switch scope {
        case .all:        return items.count
        case .draft:      return items.filter { $0.status == "draft" }.count
        case .published:  return items.filter { $0.status == "published" }.count
        case .tendering:  return items.filter { $0.status == "tendering" }.count
        case .completed:  return items.filter { $0.status == "completed" }.count
        }
    }

    // MARK: - Helpers

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? "Couldn't load your projects. Pull to refresh."
        }
        return "Couldn't load your projects. Pull to refresh."
    }
}
