/// APIClient — the thin HTTP layer that talks to `builderhq.com.au`.
///
/// Auth model: bearer JWT with refresh-token rotation (industry
/// standard for native apps; the same pattern Stripe/Linear/Slack use
/// and what the RN client at `mobile/lib/api.ts` already implements
/// against the SAME server endpoints).
///
/// Lifecycle per request:
///   1. Check cached `access_expires_at`. If within 2 min of expiry,
///      proactively refresh BEFORE firing the actual request. Saves a
///      round-trip vs. waiting for the 401.
///   2. Attach `Authorization: Bearer <accessToken>` if `authed = true`.
///   3. Encode body (Codable) as JSON; decode response (Codable).
///   4. If the request returns 401 anyway (server clock skew, race),
///      attempt one refresh + one retry. If that also 401s → kick the
///      forced-logout handler.
///
/// Concurrency: a single in-flight refresh promise serialises racing
/// requests. Without this, six dashboard widgets firing on boot would
/// each call /refresh in parallel, racing through the rotation chain
/// and tripping the theft-detection alarm.

import Foundation

/// Endpoints (today: production only — debug builds can override via
/// build config later).
enum APIBase {
    static let url = URL(string: "https://builderhq.com.au")!
}

/// Refresh access tokens this many seconds before they expire.
private let REFRESH_LEAD_SECONDS: TimeInterval = 120

@MainActor
final class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private var inflightRefresh: Task<Bool, Never>?

    /// Called when the refresh chain dies. AuthSession registers a
    /// handler that wipes the keychain + flips state to .signedOut.
    var onForcedLogout: (() async -> Void)?

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        config.waitsForConnectivity = false
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        // Server returns ISO-8601 with milliseconds. Use a custom
        // strategy that tolerates both with and without fractional sec.
        self.decoder.dateDecodingStrategy = .custom { d in
            let str = try d.singleValueContainer().decode(String.self)
            if let date = ISO8601DateFormatter.fractional.date(from: str) {
                return date
            }
            if let date = ISO8601DateFormatter.plain.date(from: str) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: try d.singleValueContainer(),
                debugDescription: "Unparseable ISO-8601 date: \(str)"
            )
        }

        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Public surface

    /// GET — typed response.
    func get<Response: Decodable>(
        _ path: String,
        authed: Bool = true,
        as: Response.Type = Response.self
    ) async throws -> Response {
        try await request(
            path: path,
            method: "GET",
            body: Optional<EmptyBody>.none,
            authed: authed
        )
    }

    /// POST — typed body + typed response.
    func post<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        authed: Bool = true,
        as: Response.Type = Response.self
    ) async throws -> Response {
        try await request(
            path: path,
            method: "POST",
            body: body,
            authed: authed
        )
    }

    /// POST that doesn't need to read the response (e.g. logout).
    func postDiscarding<Body: Encodable>(
        _ path: String,
        body: Body,
        authed: Bool = true
    ) async throws {
        let _: EmptyResponse = try await request(
            path: path,
            method: "POST",
            body: body,
            authed: authed
        )
    }

    // MARK: - Internal — core request flow

    private func request<Body: Encodable, Response: Decodable>(
        path: String,
        method: String,
        body: Body?,
        authed: Bool,
        isRetry: Bool = false
    ) async throws -> Response {
        // Proactive refresh — only on authed requests, not on retries.
        if authed && !isRetry && (try? await shouldRefreshProactively()) == true {
            _ = await refreshAccessToken()
        }

        let url = APIBase.url.appending(path: path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try encoder.encode(body)
        }

        if authed {
            if let token = try? KeychainStore.auth.get(KeychainStore.Key.accessToken),
               let token = token {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch let error as URLError {
            throw APIError.network(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.unknown(message: "Non-HTTP response", status: 0)
        }

        // 401 path: retry once after refresh.
        if http.statusCode == 401 && authed && !isRetry {
            if await refreshAccessToken() {
                return try await request(
                    path: path,
                    method: method,
                    body: body,
                    authed: authed,
                    isRetry: true
                )
            }
            await fireForcedLogout()
            throw APIError.unauthorized
        }

        if http.statusCode == 401 {
            await fireForcedLogout()
            throw APIError.unauthorized
        }

        if (200..<300).contains(http.statusCode) {
            if Response.self == EmptyResponse.self {
                return EmptyResponse() as! Response
            }
            do {
                return try decoder.decode(Response.self, from: data)
            } catch {
                throw APIError.decoding(underlying: error)
            }
        }

        // Try to decode the structured error envelope. Fall back to a
        // generic message if the body isn't shaped as expected.
        let envelope = try? decoder.decode(ServerErrorEnvelope.self, from: data)
        let message = envelope?.error.message ?? "Request failed (\(http.statusCode))"

        switch http.statusCode {
        case 403:
            throw APIError.forbidden(message: message)
        case 404:
            throw APIError.notFound(message: message)
        case 400, 422:
            throw APIError.validation(
                message: message,
                fieldErrors: envelope?.error.details ?? [:]
            )
        case 429:
            throw APIError.rateLimited(message: message)
        case 500...599:
            throw APIError.server(message: message)
        default:
            throw APIError.unknown(message: message, status: http.statusCode)
        }
    }

    // MARK: - Refresh chain

    private func shouldRefreshProactively() async throws -> Bool {
        guard let _ = try KeychainStore.auth.get(KeychainStore.Key.accessToken),
              let expiresAtStr = try KeychainStore.auth.get(KeychainStore.Key.accessExpiresAt)
        else {
            return false
        }
        let formatter = ISO8601DateFormatter.fractional
        guard let expiresAt = formatter.date(from: expiresAtStr)
                ?? ISO8601DateFormatter.plain.date(from: expiresAtStr)
        else { return true }
        return expiresAt.timeIntervalSinceNow < REFRESH_LEAD_SECONDS
    }

    /// Single in-flight refresh task. If two callers hit it
    /// simultaneously, the second awaits the first's result.
    private func refreshAccessToken() async -> Bool {
        if let existing = inflightRefresh {
            return await existing.value
        }
        let task = Task<Bool, Never> { [weak self] in
            guard let self = self else { return false }
            return await self.performRefresh()
        }
        inflightRefresh = task
        let result = await task.value
        // Release the lock on the next runloop tick so any caller
        // that joined the wait JUST after sees the result.
        Task { @MainActor in self.inflightRefresh = nil }
        return result
    }

    private func performRefresh() async -> Bool {
        guard let refreshToken = try? KeychainStore.auth.get(KeychainStore.Key.refreshToken),
              let refreshToken = refreshToken
        else { return false }

        let url = APIBase.url.appending(path: "/api/mobile/auth/refresh")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        let body = RefreshRequest(refreshToken: refreshToken)
        req.httpBody = try? encoder.encode(body)

        do {
            let (data, response) = try await session.data(for: req)
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode) else {
                // 401 → refresh chain dead. Wipe the keychain so we
                // never try this token again, and let the caller
                // surface unauthorized.
                if let http = response as? HTTPURLResponse, http.statusCode == 401 {
                    try? KeychainStore.auth.clearAll()
                }
                return false
            }
            let refreshed = try decoder.decode(RefreshResponse.self, from: data)
            try KeychainStore.auth.set(
                KeychainStore.Key.accessToken,
                value: refreshed.accessToken
            )
            try KeychainStore.auth.set(
                KeychainStore.Key.refreshToken,
                value: refreshed.refreshToken
            )
            try KeychainStore.auth.set(
                KeychainStore.Key.accessExpiresAt,
                value: refreshed.accessExpiresAt
            )
            return true
        } catch {
            return false
        }
    }

    private func fireForcedLogout() async {
        guard let handler = onForcedLogout else { return }
        await handler()
    }
}

// MARK: - Helper Codable types

struct EmptyBody: Encodable {}
struct EmptyResponse: Decodable {}

private struct RefreshRequest: Encodable {
    let refreshToken: String
}

private struct RefreshResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let accessExpiresAt: String
}

// MARK: - ISO-8601 formatters

private extension ISO8601DateFormatter {
    static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}
