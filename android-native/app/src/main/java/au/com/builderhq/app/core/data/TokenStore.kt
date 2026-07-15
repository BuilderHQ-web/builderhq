package au.com.builderhq.app.core.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.tokenDataStore by preferencesDataStore(name = "bhq_secure")

/**
 * Keystore-encrypted session storage. Tokens are encrypted by [CryptoManager]
 * before being written to an app-private DataStore — never plaintext on disk.
 */
@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
    private val crypto: CryptoManager,
) {
    private object Keys {
        val ACCESS = stringPreferencesKey("access")
        val REFRESH = stringPreferencesKey("refresh")
        val EXPIRES = longPreferencesKey("access_expires_at")
        val USER_ID = stringPreferencesKey("user_id")
    }

    val hasSession: Flow<Boolean> =
        context.tokenDataStore.data.map { it[Keys.REFRESH] != null }

    suspend fun save(access: String, refresh: String, accessExpiresAtEpochMs: Long, userId: String) {
        context.tokenDataStore.edit {
            it[Keys.ACCESS] = crypto.encrypt(access)
            it[Keys.REFRESH] = crypto.encrypt(refresh)
            it[Keys.EXPIRES] = accessExpiresAtEpochMs
            it[Keys.USER_ID] = userId
        }
    }

    suspend fun saveTokens(access: String, refresh: String, accessExpiresAtEpochMs: Long) {
        context.tokenDataStore.edit {
            it[Keys.ACCESS] = crypto.encrypt(access)
            it[Keys.REFRESH] = crypto.encrypt(refresh)
            it[Keys.EXPIRES] = accessExpiresAtEpochMs
        }
    }

    suspend fun clear() {
        context.tokenDataStore.edit { it.clear() }
    }

    suspend fun accessToken(): String? = decrypt(read(Keys.ACCESS))
    suspend fun refreshToken(): String? = decrypt(read(Keys.REFRESH))
    suspend fun accessExpiresAt(): Long =
        context.tokenDataStore.data.map { it[Keys.EXPIRES] ?: 0L }.first()

    private suspend fun read(key: Preferences.Key<String>): String? =
        context.tokenDataStore.data.map { it[key] }.first()

    private fun decrypt(blob: String?): String? =
        blob?.let { runCatching { crypto.decrypt(it) }.getOrNull() }
}
