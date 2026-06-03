/// KeychainStore — hardware-backed secure storage for auth tokens.
///
/// Why we don't use UserDefaults: tokens stored there are plaintext
/// in the app's plist, accessible to anything that can read the
/// sandbox. Keychain is encrypted by the Secure Enclave on modern
/// iPhones, requires biometric / passcode to read after device lock,
/// and survives app reinstalls (when the user's iCloud Keychain is
/// on).
///
/// Why we don't use SwiftKeychainWrapper / KeychainAccess: the SecItem
/// API is fine. ~40 lines of code for what we need. Less is more.
///
/// API:
///   let store = KeychainStore(service: "com.builderhq.app.auth")
///   try store.set("access_token", value: token)
///   let token = try store.get("access_token")
///   try store.delete("access_token")
///   try store.clearAll()

import Foundation
import Security

struct KeychainStore {
    enum KeychainError: Error {
        case unexpectedStatus(OSStatus)
        case encodingFailed
    }

    let service: String

    init(service: String) {
        self.service = service
    }

    // MARK: - Read

    /// Returns nil if the key isn't present. Throws only on unexpected
    /// keychain errors (corruption, sandbox issues).
    func get(_ key: String) throws -> String? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = kCFBooleanTrue
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            guard let data = result as? Data,
                  let value = String(data: data, encoding: .utf8) else {
                throw KeychainError.encodingFailed
            }
            return value
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - Write

    /// Upsert. Creates the item if absent, updates if present.
    func set(_ key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }

        let query = baseQuery(for: key)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            // Accessible after first unlock — the standard balance
            // between security and convenience for auth tokens. Apps
            // can refresh the session in the background but the
            // device must be unlocked at least once after boot.
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]

        // Try update first.
        let updateStatus = SecItemUpdate(
            query as CFDictionary,
            attributes as CFDictionary
        )
        if updateStatus == errSecSuccess { return }
        if updateStatus != errSecItemNotFound {
            throw KeychainError.unexpectedStatus(updateStatus)
        }

        // Insert.
        var insertItem = query
        for (k, v) in attributes { insertItem[k] = v }
        let addStatus = SecItemAdd(insertItem as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw KeychainError.unexpectedStatus(addStatus)
        }
    }

    // MARK: - Delete

    func delete(_ key: String) throws {
        let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Wipes every item under this service. Used on sign-out.
    func clearAll() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - Internal

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}

/// Single shared instance — all auth code goes through this.
extension KeychainStore {
    static let auth = KeychainStore(service: "com.builderhq.app.auth")

    /// Token keys used by AuthSession + APIClient.
    enum Key {
        static let accessToken      = "access_token"
        static let refreshToken     = "refresh_token"
        static let accessExpiresAt  = "access_expires_at"
        static let userId           = "user_id"
    }
}
