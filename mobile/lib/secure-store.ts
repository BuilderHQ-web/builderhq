/**
 * Encrypted key/value store — wraps expo-secure-store with a typed
 * façade for the handful of secrets we hold:
 *
 *   · access_token       — 15-min mobile JWT for Authorization header
 *   · refresh_token      — 60-day opaque token, exchanged at /refresh
 *   · access_expires_at  — ISO-8601 when access_token expires, used
 *                          for proactive refresh ~2 min before expiry
 *   · user_id            — currently-signed-in user's UUID (cached so
 *                          boot doesn't always need a network hop)
 *   · push_token         — Expo push notification token (cached locally
 *                          so we don't re-register on every cold start)
 *
 * SecureStore writes to the iOS Keychain (with `kSecAttrAccessible`
 * set to AfterFirstUnlock) and Android Keystore — both encrypted at
 * rest, both survive backups. NOT for large blobs — anything bigger
 * than ~2KB will fail silently on some Android devices. Use
 * AsyncStorage for that.
 */
import * as SecureStore from "expo-secure-store";

type Key =
  | "access_token"
  | "refresh_token"
  | "access_expires_at"
  | "user_id"
  | "push_token";

export async function get(key: Key): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function set(key: Key, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      // Keep the secret available even when the app is backgrounded.
      // Anything stricter (e.g. WHEN_PASSCODE_SET) means a user who
      // turns off their device passcode loses the auth session.
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch {
    // Surfaced as a silent failure — the caller already handles the
    // not-signed-in path, and a Secure Store write failure would crash
    // login in a useless way.
  }
}

export async function clear(key: Key): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    clear("access_token"),
    clear("refresh_token"),
    clear("access_expires_at"),
    clear("user_id"),
    clear("push_token"),
  ]);
}
