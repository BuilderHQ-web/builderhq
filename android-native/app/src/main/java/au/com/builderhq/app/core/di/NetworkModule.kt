package au.com.builderhq.app.core.di

import au.com.builderhq.app.BuildConfig
import au.com.builderhq.app.core.data.TokenStore
import au.com.builderhq.app.core.network.AuthApi
import au.com.builderhq.app.core.network.AuthClient
import au.com.builderhq.app.core.network.AuthInterceptor
import au.com.builderhq.app.core.network.BaseClient
import au.com.builderhq.app.core.network.DashboardApi
import au.com.builderhq.app.core.network.MessagingApi
import au.com.builderhq.app.core.network.OwnerApi
import au.com.builderhq.app.core.network.OwnerTendersApi
import au.com.builderhq.app.core.network.ProjectsApi
import au.com.builderhq.app.core.network.RefreshApi
import au.com.builderhq.app.core.network.TendersApi
import au.com.builderhq.app.core.network.UploadApi
import au.com.builderhq.app.core.network.TokenAuthenticator
import au.com.builderhq.app.core.network.bhqJson
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun json(): Json = bhqJson

    @Provides @Singleton
    fun loggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }

    // ── un-authenticated client (refresh + open endpoints) ──
    @Provides @Singleton @BaseClient
    fun baseClient(logging: HttpLoggingInterceptor): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

    @Provides @Singleton
    fun refreshApi(@BaseClient client: OkHttpClient, json: Json): RefreshApi =
        buildRetrofit(client, json).create(RefreshApi::class.java)

    @Provides @Singleton
    fun authInterceptor(tokenStore: TokenStore): AuthInterceptor =
        AuthInterceptor(tokenStore)

    @Provides @Singleton
    fun tokenAuthenticator(tokenStore: TokenStore, refreshApi: RefreshApi): TokenAuthenticator =
        TokenAuthenticator(tokenStore, refreshApi)

    // ── authenticated client (bearer + refresh-on-401) ──
    @Provides @Singleton @AuthClient
    fun authClient(
        logging: HttpLoggingInterceptor,
        authInterceptor: AuthInterceptor,
        authenticator: TokenAuthenticator,
    ): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .authenticator(authenticator)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

    @Provides @Singleton @AuthClient
    fun authRetrofit(@AuthClient client: OkHttpClient, json: Json): Retrofit =
        buildRetrofit(client, json)

    @Provides @Singleton
    fun authApi(@AuthClient retrofit: Retrofit): AuthApi =
        retrofit.create(AuthApi::class.java)

    @Provides @Singleton
    fun projectsApi(@AuthClient retrofit: Retrofit): ProjectsApi =
        retrofit.create(ProjectsApi::class.java)

    @Provides @Singleton
    fun tendersApi(@AuthClient retrofit: Retrofit): TendersApi =
        retrofit.create(TendersApi::class.java)

    @Provides @Singleton
    fun messagingApi(@AuthClient retrofit: Retrofit): MessagingApi =
        retrofit.create(MessagingApi::class.java)

    @Provides @Singleton
    fun dashboardApi(@AuthClient retrofit: Retrofit): DashboardApi =
        retrofit.create(DashboardApi::class.java)

    @Provides @Singleton
    fun ownerApi(@AuthClient retrofit: Retrofit): OwnerApi =
        retrofit.create(OwnerApi::class.java)

    @Provides @Singleton
    fun ownerTendersApi(@AuthClient retrofit: Retrofit): OwnerTendersApi =
        retrofit.create(OwnerTendersApi::class.java)

    // R2 presigned uploads go through the un-authenticated client.
    @Provides @Singleton
    fun uploadApi(@BaseClient client: OkHttpClient, json: Json): UploadApi =
        buildRetrofit(client, json).create(UploadApi::class.java)

    private fun buildRetrofit(client: OkHttpClient, json: Json): Retrofit {
        val base = BuildConfig.API_BASE_URL.let { if (it.endsWith("/")) it else "$it/" }
        return Retrofit.Builder()
            .baseUrl(base)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }
}
