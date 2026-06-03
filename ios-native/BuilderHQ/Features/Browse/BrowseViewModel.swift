/// BrowseViewModel — state holder for the Projects (Browse) tab.
///
/// Owns:
///   · Active filters (search query, type chip, future budget chip)
///   · The current page of `BrowseProject` rows
///   · Load + refresh + paginate state
///   · The per-card local "saved" state — updated optimistically the
///     moment the heart is tapped, with a rollback on server failure
///
/// Refetches whenever the filter set changes. Paginates by tracking
/// `offset` + `hasMore`.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class BrowseViewModel {
    enum LoadState: Equatable {
        case initial
        case loading
        case loaded
        case loadingMore
        case error(message: String)
    }

    var items: [ProjectsAPI.BrowseProject] = []
    var loadState: LoadState = .initial
    var hasMore: Bool = false
    var hasRevealed: Bool = false

    // Filters
    var query: String = ""
    var typeFilter: String? = nil       // nil = all types
    var serviceAreaOnly: Bool = false
    var budgetFilters: Set<String> = []
    /// Scope pill — All / Saved / Unlocked. Drives the corresponding
    /// server-side scope. Switching scope refetches from offset 0.
    var scope: ProjectsAPI.BrowseScope = .all

    /// Set after the first successful fetch. Use this to decide
    /// whether `query` or filter changes should trigger a refetch.
    private var hasFetched = false
    private var fetchTask: Task<Void, Never>? = nil

    // MARK: - Fetch

    /// Initial load — fires when the screen first mounts. Idempotent.
    func loadIfNeeded() async {
        guard !hasFetched else { return }
        await reload()
    }

    /// Refilter from scratch. Resets offset + items.
    func reload() async {
        fetchTask?.cancel()
        let task = Task { await runFetch(reset: true) }
        fetchTask = task
        await task.value
    }

    /// Pull-to-refresh — same as reload but doesn't reset the
    /// `hasRevealed` cascade animation.
    func refresh() async {
        await runFetch(reset: true)
    }

    /// Paginate the next page. No-op if we're already loading more.
    func loadMore() async {
        guard hasMore, loadState != .loadingMore else { return }
        loadState = .loadingMore
        await runFetch(reset: false)
    }

    private func runFetch(reset: Bool) async {
        if reset {
            loadState = .loading
        }
        let filters = ProjectsAPI.BrowseFilters(
            q: query.isEmpty ? nil : query,
            type: typeFilter,
            budgets: budgetFilters.isEmpty ? nil : Array(budgetFilters),
            serviceAreaScope: serviceAreaOnly,
            scope: scope,
            limit: 20,
            offset: reset ? 0 : items.count
        )

        do {
            let response = try await ProjectsAPI.browse(filters)
            if Task.isCancelled { return }
            if reset {
                items = response.items
            } else {
                items.append(contentsOf: response.items)
            }
            hasMore = response.hasMore
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

    // MARK: - Save toggle (optimistic)

    func toggleSave(for project: ProjectsAPI.BrowseProject) async {
        guard let idx = items.firstIndex(where: { $0.id == project.id }) else { return }
        let nextState = !items[idx].isSaved
        items[idx] = mutate(items[idx], isSaved: nextState)

        do {
            let confirmed = nextState
                ? try await ProjectsAPI.save(slug: project.slug)
                : try await ProjectsAPI.unsave(slug: project.slug)
            // Sync to authoritative server state.
            if let stillIdx = items.firstIndex(where: { $0.id == project.id }),
               items[stillIdx].isSaved != confirmed {
                items[stillIdx] = mutate(items[stillIdx], isSaved: confirmed)
            }
        } catch {
            // Roll back.
            if let stillIdx = items.firstIndex(where: { $0.id == project.id }) {
                items[stillIdx] = mutate(items[stillIdx], isSaved: !nextState)
            }
        }
    }

    private func mutate(
        _ project: ProjectsAPI.BrowseProject,
        isSaved: Bool
    ) -> ProjectsAPI.BrowseProject {
        // BrowseProject is `let` — rebuild with the updated field.
        ProjectsAPI.BrowseProject(
            id: project.id,
            slug: project.slug,
            title: project.title,
            type: project.type,
            status: project.status,
            suburb: project.suburb,
            state: project.state,
            postcode: project.postcode,
            budgetBand: project.budgetBand,
            bedrooms: project.bedrooms,
            bathrooms: project.bathrooms,
            documentCount: project.documentCount,
            unlockedCount: project.unlockedCount,
            unlockCap: project.unlockCap,
            unlockPriceAud: project.unlockPriceAud,
            publishedAt: project.publishedAt,
            isSaved: isSaved,
            isUnlocked: project.isUnlocked
        )
    }

    // MARK: - Helpers

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? "Couldn't load projects. Pull to refresh."
        }
        return "Couldn't load projects. Pull to refresh."
    }
}
