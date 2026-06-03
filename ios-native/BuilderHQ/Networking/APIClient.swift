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

/// Base URL for every request.
///
/// DEBUG builds (Xcode → ⌘R from the simulator) hit `pnpm dev` over
/// plain HTTP at localhost:3000 so we can iterate on routes without a
/// production deploy. The Info.plist has a matching ATS exception so
/// the cleartext load is allowed for localhost only — production
/// security is unaffected.
///
/// RELEASE builds (TestFlight, App Store) always hit
/// `https://builderhq.com.au`.
///
/// Override in DEBUG by setting the `BHQ_API_BASE` environment
/// variable on the Xcode scheme — useful for testing against a staging
/// preview deploy or a Tailscale-served Mac. Falls through to
/// localhost when unset.
enum APIBase {
    static let url: URL = {
        #if DEBUG
        if let override = ProcessInfo.processInfo.environment["BHQ_API_BASE"],
           let url = URL(string: override) {
            return url
        }
        return URL(string: "http://localhost:3000")!
        #else
        return URL(string: "https://builderhq.com.au")!
        #endif
    }()
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
        // No key-conversion on the encoder. The server's mobile routes
        // use Zod schemas keyed in camelCase (`firstName`, `refreshToken`,
        // `deviceLabel`, …), so iOS sends the property names verbatim.
        // The decoder DOES convert from snake_case below because server
        // RESPONSES (DB-backed) come back snake_case — opposite direction,
        // opposite strategy.
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

    /// DELETE — typed response. No body (REST convention).
    func delete<Response: Decodable>(
        _ path: String,
        authed: Bool = true,
        as: Response.Type = Response.self
    ) async throws -> Response {
        try await request(
            path: path,
            method: "DELETE",
            body: Optional<EmptyBody>.none,
            authed: authed
        )
    }

    /// PATCH — typed body + typed response. Used for partial-update
    /// endpoints (e.g. tender draft autosave).
    func patch<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        authed: Bool = true,
        as: Response.Type = Response.self
    ) async throws -> Response {
        try await request(
            path: path,
            method: "PATCH",
            body: body,
            authed: authed
        )
    }

    /// PUT — typed body + typed response. Used for replace-all
    /// endpoints (e.g. tender cost lines).
    func put<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        authed: Bool = true,
        as: Response.Type = Response.self
    ) async throws -> Response {
        try await request(
            path: path,
            method: "PUT",
            body: body,
            authed: authed
        )
    }

    /// POST raw bytes (e.g. a PDF) with a custom content type and decode
    /// a typed JSON response. For binary uploads that don't fit the
    /// Codable-body path — today, the plan/quote extraction endpoints
    /// that read the file directly. Shares the same auth + proactive
    /// refresh + one-shot 401 retry as `request`, but uses a dedicated
    /// long-timeout session since payloads can be large.
    func postData<Response: Decodable>(
        _ path: String,
        data: Data,
        contentType: String,
        authed: Bool = true,
        as: Response.Type = Response.self
    ) async throws -> Response {
        try await sendData(
            path: path,
            data: data,
            contentType: contentType,
            authed: authed,
            isRetry: false
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
        if authed && !isRetry && (try? shouldRefreshProactively()) == true {
            _ = await refreshAccessToken()
        }

        // `URL.appending(path:)` treats the whole string as a single
        // path component and percent-encodes special chars — including
        // the `?` that separates path from query string. For requests
        // with query params (e.g. /api/.../browse?limit=20) the `?`
        // becomes `%3F` and the server can't match the route. Use
        // `URL(string:relativeTo:)` instead so the path/query split is
        // parsed correctly.
        guard let url = URL(string: path, relativeTo: APIBase.url) else {
            throw APIError.unknown(
                message: "Invalid URL path: \(path)",
                status: 0
            )
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try encoder.encode(body)
        }

        if authed {
            // `try?` flattens the optional from `get(_:)` (which is
            // `throws -> String?`), so the binding already produces
            // `String` — no second unwrap needed.
            if let token = try? KeychainStore.auth.get(KeychainStore.Key.accessToken) {
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
        case 409:
            throw APIError.conflict(message: message)
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

    /// Raw-body sibling of `request` — same auth/refresh/error mapping,
    /// but sends `data` verbatim with `contentType` and a generous
    /// upload timeout.
    private func sendData<Response: Decodable>(
        path: String,
        data: Data,
        contentType: String,
        authed: Bool,
        isRetry: Bool
    ) async throws -> Response {
        if authed && !isRetry && (try? shouldRefreshProactively()) == true {
            _ = await refreshAccessToken()
        }
        guard let url = URL(string: path, relativeTo: APIBase.url) else {
            throw APIError.unknown(message: "Invalid URL path: \(path)", status: 0)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue(contentType, forHTTPHeaderField: "Content-Type")
        req.httpBody = data
        if authed,
           let token = try? KeychainStore.auth.get(KeychainStore.Key.accessToken) {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Big PDFs (plan sets up to ~28MB) over a phone connection need
        // headroom — don't widen the shared 15/30s session.
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120
        config.timeoutIntervalForResource = 600
        let uploadSession = URLSession(configuration: config)

        let respData: Data
        let response: URLResponse
        do {
            (respData, response) = try await uploadSession.data(for: req)
        } catch let error as URLError {
            throw APIError.network(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.unknown(message: "Non-HTTP response", status: 0)
        }

        if http.statusCode == 401 && authed && !isRetry {
            if await refreshAccessToken() {
                return try await sendData(
                    path: path,
                    data: data,
                    contentType: contentType,
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
                return try decoder.decode(Response.self, from: respData)
            } catch {
                throw APIError.decoding(underlying: error)
            }
        }

        let envelope = try? decoder.decode(ServerErrorEnvelope.self, from: respData)
        let message = envelope?.error.message ?? "Request failed (\(http.statusCode))"
        switch http.statusCode {
        case 403: throw APIError.forbidden(message: message)
        case 404: throw APIError.notFound(message: message)
        case 409: throw APIError.conflict(message: message)
        case 400, 422:
            throw APIError.validation(
                message: message,
                fieldErrors: envelope?.error.details ?? [:]
            )
        case 429: throw APIError.rateLimited(message: message)
        case 500...599: throw APIError.server(message: message)
        default: throw APIError.unknown(message: message, status: http.statusCode)
        }
    }

    // MARK: - Refresh chain

    private func shouldRefreshProactively() throws -> Bool {
        // Need both an access token AND an expiry to decide. Either
        // missing → nothing to refresh proactively.
        guard
            (try KeychainStore.auth.get(KeychainStore.Key.accessToken)) != nil,
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
        // `try?` flattens the optional from `get(_:)`, so this binding
        // already produces the unwrapped `String`.
        guard let refreshToken = try? KeychainStore.auth.get(KeychainStore.Key.refreshToken)
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
