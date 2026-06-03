/// APIError — typed errors matching the server's error envelope.
///
/// The mobile API returns errors as `{ error: { code, message } }`
/// with codes from a known list. We model them as a typed enum so the
/// UI can branch on `.unauthorized` (boot to login) vs `.validation`
/// (show field errors) vs `.network` (offline banner) without
/// stringly-typed comparisons.

import Foundation

enum APIError: Error, LocalizedError {
    /// Network unreachable, DNS failure, request timeout.
    case network(URLError)
    /// 401 — access token missing/invalid/expired AND refresh failed.
    /// Triggers a forced sign-out on the auth session.
    case unauthorized
    /// 403 — authenticated but not allowed.
    case forbidden(message: String)
    /// 404.
    case notFound(message: String)
    /// 409 — duplicate / state-conflict (e.g. signup with existing
    /// email). Surfaced separately from validation so the UI can copy
    /// "already registered" hints without coercing it into a field error.
    case conflict(message: String)
    /// 422 / 400 — validation failure. `fieldErrors` is keyed by
    /// JSON path ("email", "password", etc.) when the server returns
    /// structured field-level errors.
    case validation(message: String, fieldErrors: [String: String])
    /// 429 — slow down.
    case rateLimited(message: String)
    /// 5xx — server fault.
    case server(message: String)
    /// Anything else we didn't expect.
    case unknown(message: String, status: Int)
    /// JSON we couldn't decode.
    case decoding(underlying: Error)

    var errorDescription: String? {
        switch self {
        case .network(let urlError):
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost:
                return "No internet connection. Check your network and try again."
            case .timedOut:
                return "Took too long — try again in a moment."
            default:
                return "Couldn't reach BuilderHQ. Check your connection."
            }
        case .unauthorized:
            return "Session expired. Sign in again."
        case .forbidden(let message),
             .notFound(let message),
             .conflict(let message),
             .validation(let message, _),
             .rateLimited(let message),
             .server(let message),
             .unknown(let message, _):
            return message
        case .decoding(let underlying):
            #if DEBUG
            // In DEBUG builds, surface the actual decode failure so we
            // can see which field broke. Release builds get the
            // friendly fallback.
            return "Decode failed: \(decodeDescription(underlying))"
            #else
            return "Couldn't read the server's response. Update the app if this keeps happening."
            #endif
        }
    }
}

/// Compact, human-readable description of a `DecodingError`. The raw
/// `Swift.Error` description is unhelpful — this picks out the field
/// path + reason so DEBUG builds can show useful info inline.
private func decodeDescription(_ error: Error) -> String {
    guard let decode = error as? DecodingError else {
        return error.localizedDescription
    }
    switch decode {
    case .keyNotFound(let key, let ctx):
        let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
        return "missing key '\(key.stringValue)' at \(path.isEmpty ? "root" : path)"
    case .typeMismatch(let type, let ctx):
        let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
        return "type mismatch for \(type) at \(path.isEmpty ? "root" : path) \u{2014} \(ctx.debugDescription)"
    case .valueNotFound(let type, let ctx):
        let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
        return "null where \(type) expected at \(path.isEmpty ? "root" : path)"
    case .dataCorrupted(let ctx):
        let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
        return "corrupted at \(path.isEmpty ? "root" : path): \(ctx.debugDescription)"
    @unknown default:
        return error.localizedDescription
    }
}

/// The decoded shape of an error response body. Matches the RN
/// `ApiError` type from `mobile/lib/api.ts`.
struct ServerErrorEnvelope: Decodable {
    let error: ErrorBody

    struct ErrorBody: Decodable {
        let code: String
        let message: String
        /// Optional field-level details for validation errors.
        let details: [String: String]?
    }
}
