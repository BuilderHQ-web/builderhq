package au.com.builderhq.app.core.nav

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
import au.com.builderhq.app.core.model.Role
import au.com.builderhq.app.feature.marketplace.ProjectDetailScreen
import au.com.builderhq.app.feature.messaging.ChatScreen
import au.com.builderhq.app.feature.owner.EditProjectScreen
import au.com.builderhq.app.feature.owner.OwnerProjectDetailScreen
import au.com.builderhq.app.feature.owner.ProjectPublishWizard
import au.com.builderhq.app.feature.owner.TenderCompareScreen
import au.com.builderhq.app.feature.shell.MainScaffold
import au.com.builderhq.app.feature.tenders.TenderComposerScreen

/** Signed-in navigation. The bottom-nav shell is one destination; project
 *  detail is pushed full-screen over it (hiding the bottom bar). */
@Composable
fun MainNavHost(role: Role) {
    val nav = rememberNavController()
    val owner = role == Role.OWNER
    NavHost(
        navController = nav,
        startDestination = "shell",
        enterTransition = { slideInHorizontally(tween(Motion.BASE, easing = Motion.EaseOut)) { it / 6 } + fadeIn(tween(Motion.BASE)) },
        exitTransition = { scaleOut(targetScale = 0.96f, animationSpec = tween(Motion.BASE)) + fadeOut(tween(Motion.FAST)) },
        popEnterTransition = { scaleIn(initialScale = 0.96f, animationSpec = tween(Motion.BASE)) + fadeIn(tween(Motion.BASE)) },
        popExitTransition = { slideOutHorizontally(tween(Motion.BASE, easing = Motion.EaseOut)) { it / 6 } + fadeOut(tween(Motion.FAST)) },
    ) {
        composable("shell") {
            MainScaffold(
                role = role,
                onOpenProject = { slug -> nav.navigate(if (owner) "owner/project/$slug" else "project/$slug") },
                onOpenConversation = { id -> nav.navigate("chat/$id") },
                onCreateProject = { nav.navigate("owner/new") },
            )
        }
        // ── Builder ──
        composable(
            "project/{slug}",
            arguments = listOf(navArgument("slug") { type = NavType.StringType }),
        ) { entry ->
            val slug = entry.arguments?.getString("slug").orEmpty()
            ProjectDetailScreen(
                onBack = { nav.popBackStack() },
                onOpenTender = { nav.navigate("tender/$slug") },
                onOpenConversation = { id -> nav.navigate("chat/$id") },
            )
        }
        composable(
            "tender/{slug}",
            arguments = listOf(navArgument("slug") { type = NavType.StringType }),
        ) {
            TenderComposerScreen(onBack = { nav.popBackStack() }, onDone = { nav.popBackStack() })
        }
        composable(
            "chat/{conversationId}",
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType }),
        ) {
            ChatScreen(onBack = { nav.popBackStack() }, onOpenProject = { slug -> nav.navigate("project/$slug") })
        }
        // ── Owner ──
        composable(
            "owner/project/{slug}",
            arguments = listOf(navArgument("slug") { type = NavType.StringType }),
        ) { entry ->
            val slug = entry.arguments?.getString("slug").orEmpty()
            OwnerProjectDetailScreen(
                onBack = { nav.popBackStack() },
                onEdit = { nav.navigate("owner/project/$slug/edit") },
                onReview = { nav.navigate("owner/project/$slug/tenders") },
            )
        }
        composable(
            "owner/project/{slug}/tenders",
            arguments = listOf(navArgument("slug") { type = NavType.StringType }),
        ) {
            TenderCompareScreen(onBack = { nav.popBackStack() })
        }
        composable(
            "owner/project/{slug}/edit",
            arguments = listOf(navArgument("slug") { type = NavType.StringType }),
        ) {
            EditProjectScreen(onBack = { nav.popBackStack() }, onSaved = { nav.popBackStack() })
        }
        composable("owner/new") {
            ProjectPublishWizard(onClose = { nav.popBackStack() }, onPublished = { nav.popBackStack() })
        }
    }
}
