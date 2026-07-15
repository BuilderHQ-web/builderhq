package au.com.builderhq.app.feature.auth

import android.net.Uri
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import au.com.builderhq.app.core.design.theme.Motion
import au.com.builderhq.app.feature.shell.WelcomeScreen

private object AuthRoutes {
    const val WELCOME = "welcome"
    const val LOGIN = "login"
    const val SIGNUP = "signup"
    const val FORGOT = "forgot"
    const val VERIFY = "verify/{email}"
    const val RESET = "reset/{email}"
    fun verify(email: String) = "verify/${Uri.encode(email)}"
    fun reset(email: String) = "reset/${Uri.encode(email)}"
}

/** The signed-out flow. Verify + reset establish a session via the
 *  SessionRepository, which flips SessionState → RootApp swaps this whole
 *  graph out for the main shell. So there's no "navigate to home" here. */
@Composable
fun AuthNavHost() {
    val nav = rememberNavController()
    NavHost(
        navController = nav,
        startDestination = AuthRoutes.WELCOME,
        enterTransition = { slideInHorizontally(tween(Motion.BASE, easing = Motion.EaseOut)) { it / 6 } + fadeIn(tween(Motion.BASE)) },
        exitTransition = { scaleOut(targetScale = 0.96f, animationSpec = tween(Motion.BASE)) + fadeOut(tween(Motion.FAST)) },
        popEnterTransition = { scaleIn(initialScale = 0.96f, animationSpec = tween(Motion.BASE)) + fadeIn(tween(Motion.BASE)) },
        popExitTransition = { slideOutHorizontally(tween(Motion.BASE, easing = Motion.EaseOut)) { it / 6 } + fadeOut(tween(Motion.FAST)) },
    ) {
        composable(AuthRoutes.WELCOME) {
            WelcomeScreen(
                onGetStarted = { nav.navigate(AuthRoutes.SIGNUP) },
                onLogin = { nav.navigate(AuthRoutes.LOGIN) },
            )
        }
        composable(AuthRoutes.LOGIN) {
            LoginScreen(
                onBack = { nav.popBackStack() },
                onForgot = { nav.navigate(AuthRoutes.FORGOT) },
                onSignUp = { nav.navigate(AuthRoutes.SIGNUP) { popUpTo(AuthRoutes.WELCOME) } },
            )
        }
        composable(AuthRoutes.SIGNUP) {
            SignUpScreen(
                onBack = { nav.popBackStack() },
                onLogin = { nav.navigate(AuthRoutes.LOGIN) { popUpTo(AuthRoutes.WELCOME) } },
                onCodeSent = { email -> nav.navigate(AuthRoutes.verify(email)) },
            )
        }
        composable(AuthRoutes.FORGOT) {
            ForgotPasswordScreen(
                onBack = { nav.popBackStack() },
                onCodeSent = { email -> nav.navigate(AuthRoutes.reset(email)) },
            )
        }
        composable(
            AuthRoutes.VERIFY,
            arguments = listOf(navArgument("email") { type = NavType.StringType }),
        ) {
            VerifyScreen(onBack = { nav.popBackStack() })
        }
        composable(
            AuthRoutes.RESET,
            arguments = listOf(navArgument("email") { type = NavType.StringType }),
        ) {
            ResetPasswordScreen(onBack = { nav.popBackStack() })
        }
    }
}
