/// BuilderHQ — @main entry point.
///
/// SwiftUI-first app. The first view is the auth gate, which decides
/// between the onboarding flow (signed-out) or the main tab shell
/// (signed-in) based on the AuthSession's hydrated state.
///
/// Atmosphere (the dark canvas + faint grid + accent blooms that ties
/// to the landing page) is applied via the AmbientBackground view
/// modifier installed at the root. Every screen sits on top.

import SwiftUI

@main
struct BuilderHQApp: App {
    /// Auth state hydrated from the Keychain at boot. Created here so
    /// the entire app tree observes the same session.
    @State private var session = AuthSession()

    /// User-selected appearance (System / Light / Dark) — set from
    /// Settings, applied at the root so every Palette dynamic color,
    /// sheet, and the status bar follows in one move.
    @AppStorage(AppearanceMode.storageKey)
    private var appearanceRaw = AppearanceMode.system.rawValue

    init() {
        // Load Instrument Serif at app launch so it's ready by the
        // first paint. SwiftUI's `.custom(...)` font lookup is name-
        // based — once registered, any view can reach for it.
        FontRegistration.registerCustomFonts()

        // Force every UITabBar in the app to use our brand teal as
        // the selection tint, including the icon, label, and any
        // system-rendered selection chrome. `.tint()` on the SwiftUI
        // TabView is supposed to do this but iOS quietly fights back
        // with system blue on some renderer paths — locking it at the
        // appearance level is the only durable fix.
        //
        // Built as UIKit dynamic providers directly: appearance
        // proxies snapshot whatever they're handed, and
        // `UIColor(Color)` can flatten a dynamic SwiftUI color to its
        // current resolution — these must keep adapting per theme.
        let brandTeal = UIColor(hex: 0x00D4C8)
        let unselected = UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(hex: 0x5A6789)   // Palette.textDim, dark
                : UIColor(hex: 0x78828D)   // Palette.textDim, light
        }

        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithDefaultBackground()
        // Selected
        tabAppearance.stackedLayoutAppearance.selected.iconColor = brandTeal
        tabAppearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: brandTeal,
        ]
        tabAppearance.inlineLayoutAppearance.selected.iconColor = brandTeal
        tabAppearance.inlineLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: brandTeal,
        ]
        tabAppearance.compactInlineLayoutAppearance.selected.iconColor = brandTeal
        tabAppearance.compactInlineLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: brandTeal,
        ]
        // Unselected
        tabAppearance.stackedLayoutAppearance.normal.iconColor = unselected
        tabAppearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: unselected,
        ]
        tabAppearance.inlineLayoutAppearance.normal.iconColor = unselected
        tabAppearance.inlineLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: unselected,
        ]
        tabAppearance.compactInlineLayoutAppearance.normal.iconColor = unselected
        tabAppearance.compactInlineLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: unselected,
        ]

        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        // Belt-and-suspenders for older iOS renderer fallbacks.
        UITabBar.appearance().tintColor = brandTeal
        UITabBar.appearance().unselectedItemTintColor = unselected
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .preferredColorScheme(
                    (AppearanceMode(rawValue: appearanceRaw) ?? .system).colorScheme
                )
                .tint(Palette.accent)
        }
    }
}

/// Routes between auth (signed out), the role-specific onboarding
/// wizard (signed in but profile not yet completed), and the main tab
/// shell (signed in + onboarded). Renders nothing while the session is
/// hydrating to avoid a flash.
///
/// The onboarding gate mirrors the web's (app) layout check — both
/// roles must finish their wizard before the dashboard is reachable.
struct RootView: View {
    @Environment(AuthSession.self) private var session

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            switch session.state {
            case .loading:
                // Splash. The launch screen storyboard handles cold
                // start; once Swift takes over we're already on dark
                // canvas, so just no content briefly.
                Color.clear
            case .signedOut:
                AuthFlow()
            case .signedIn(let user):
                if user.needsOnboarding {
                    OnboardingFlow(user: user)
                } else {
                    MainTabs()
                }
            }
        }
    }
}
