/// ProjectDetailViewModel — state holder for the detail screen.
///
/// Fetches the tagged-union response from `/api/mobile/projects/[slug]`
/// and exposes per-mode helpers (locked preview vs unlocked builder).
/// Owns the in-flight save toggle + unlock action.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class ProjectDetailViewModel {
    let slug: String

    enum LoadState: Equatable {
        case initial
        case loading
        case loaded
        case error(message: String)
    }

    var response: ProjectsAPI.ProjectDetailResponse? = nil
    var loadState: LoadState = .initial

    // Unlock UX state — drives the sticky CTA's spinner + celebration.
    var isUnlocking: Bool = false
    var justUnlocked: Bool = false
    var unlockError: String? = nil

    // Save toggle in-flight state — optimistic update with rollback
    var isTogglingSave: Bool = false

    init(slug: String) {
        self.slug = slug
    }

    func load() async {
        if response == nil {
            loadState = .loading
        }
        do {
            let next = try await ProjectsAPI.detail(slug: slug)
            response = next
            loadState = .loaded
        } catch {
            loadState = .error(message: friendlyMessage(error))
        }
    }

    func refresh() async {
        do {
            response = try await ProjectsAPI.detail(slug: slug)
            loadState = .loaded
        } catch {
            loadState = .error(message: friendlyMessage(error))
        }
    }

    // MARK: - Save toggle

    func toggleSave() async {
        guard let response = response else { return }
        let currentlySaved = isSaved(response)
        let target = !currentlySaved
        // Optimistic mutation.
        applySaved(target)
        isTogglingSave = true
        defer { isTogglingSave = false }
        do {
            let confirmed = target
                ? try await ProjectsAPI.save(slug: slug)
                : try await ProjectsAPI.unsave(slug: slug)
            applySaved(confirmed)
        } catch {
            // Rollback on failure.
            applySaved(currentlySaved)
        }
    }

    func isSaved(_ resp: ProjectsAPI.ProjectDetailResponse) -> Bool {
        switch resp {
        case .preview(let p): return p.isSaved
        case .unlockedBuilder(let u): return u.isSaved
        case .owner: return false
        }
    }

    private func applySaved(_ value: Bool) {
        guard let response = response else { return }
        switch response {
        case .preview(var p):
            p = ProjectsAPI.ProjectDetailResponse.Preview(
                project: p.project,
                documentCount: p.documentCount,
                unlockedCount: p.unlockedCount,
                isSaved: value,
                unlock: p.unlock
            )
            self.response = .preview(p)
        case .unlockedBuilder(var u):
            u = ProjectsAPI.ProjectDetailResponse.UnlockedBuilder(
                project: u.project,
                documents: u.documents,
                unlockedCount: u.unlockedCount,
                isSaved: value,
                myTender: u.myTender,
                owner: u.owner
            )
            self.response = .unlockedBuilder(u)
        case .owner:
            break
        }
    }

    // MARK: - Unlock

    func unlock() async {
        unlockError = nil
        isUnlocking = true
        defer { isUnlocking = false }
        do {
            _ = try await ProjectsAPI.unlock(slug: slug)
            // Refetch so we transition from preview → unlocked_builder
            // shape (docs, address, etc.).
            try? await Task.sleep(for: .milliseconds(280))
            await refresh()
            justUnlocked = true
        } catch let error as APIError {
            unlockError = error.errorDescription ?? "Couldn't unlock."
        } catch {
            unlockError = "Couldn't unlock. Try again."
        }
    }

    // MARK: - Helpers

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? "Couldn't load project."
        }
        return "Couldn't load project."
    }
}
