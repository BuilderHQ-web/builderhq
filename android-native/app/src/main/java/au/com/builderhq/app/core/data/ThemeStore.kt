package au.com.builderhq.app.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import au.com.builderhq.app.core.design.theme.ThemeMode
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Persisted appearance preference (System / Light / Dark).
 *
 * Plain (unencrypted) DataStore — nothing sensitive here, unlike
 * TokenStore's `bhq_secure`. Default is System so a fresh install
 * matches the phone; the value streams as a Flow so MainActivity's
 * composition re-themes live the moment the user flips the setting.
 */
private val Context.uiDataStore by preferencesDataStore(name = "bhq_ui")

@Singleton
class ThemeStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val themeKey = stringPreferencesKey("theme_mode")

    val mode: Flow<ThemeMode> = context.uiDataStore.data.map { prefs ->
        when (prefs[themeKey]) {
            "light" -> ThemeMode.Light
            "dark" -> ThemeMode.Dark
            else -> ThemeMode.System
        }
    }

    suspend fun set(mode: ThemeMode) {
        context.uiDataStore.edit { prefs ->
            prefs[themeKey] = when (mode) {
                ThemeMode.System -> "system"
                ThemeMode.Light -> "light"
                ThemeMode.Dark -> "dark"
            }
        }
    }
}
