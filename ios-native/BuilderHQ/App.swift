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

    init() {
        // Load Instrument Serif at app launch so it's ready by the
        // first paint. SwiftUI's `.custom(...)` font lookup is name-
        // based — once registered, any view can reach for it.
        FontRegistration.registerCustomFonts()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .preferredColorScheme(.dark)
                .tint(Palette.accent)
        }
    }
}

/// Routes between auth (signed out) and the main app shell (signed in).
/// Renders nothing while the session is hydrating to avoid a flash.
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
            case .signedIn:
                MainTabs()
            }
        }
    }
}
