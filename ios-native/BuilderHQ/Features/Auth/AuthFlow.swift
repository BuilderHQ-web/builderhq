/// AuthFlow — the signed-out entry experience.
///
/// Week 2: real login screen against /api/mobile/auth/login. The
/// sign-up flow (account creation) lives elsewhere — currently a
/// future task. For builders + project owners who already have an
/// account from the web, this is the entry point.
///
/// Future additions in this flow:
///   · SignupScreen — three-step sign-up (email, password, role)
///   · ForgotPasswordScreen — request a magic-link / reset email
///   · MagicLinkScreen — for Bubble-migrated users with claim tokens

import SwiftUI

struct AuthFlow: View {
    var body: some View {
        LoginScreen()
            .transition(.opacity)
    }
}
