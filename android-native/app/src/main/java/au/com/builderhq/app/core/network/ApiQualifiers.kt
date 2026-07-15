package au.com.builderhq.app.core.network

import javax.inject.Qualifier

/** OkHttp/Retrofit with NO auth (bearer interceptor + 401 authenticator).
 *  Used for the refresh + unauthenticated calls, so a refresh can't recurse
 *  through the authenticator. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BaseClient

/** OkHttp/Retrofit WITH the bearer interceptor + refresh authenticator. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthClient
