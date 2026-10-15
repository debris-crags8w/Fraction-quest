---
name: Admin console security and layout
description: Security and design rules for the owner admin page.
---

Keep the public admin page limited to generic sign-in. Do not include setup instructions, environment-variable names, setup-readiness status, or generator commands before authentication. Keep the TOTP seed out of admin HTML; enrollment uses the separately stored `ADMIN_TOTP_SECRET`, never a secret or QR rendered into the page. After sign-in, use a familiar, organized admin layout similar to WordPress.

**Why:** the page is reachable before the authenticator factor has been verified, so setup details and second-factor material should not be exposed there. The user preferred a WordPress-like admin experience and confirmed the refreshed layout is better.

**How to apply:** keep enrollment guidance in documentation, not the page. If an authenticator requires a QR, generate it locally from the secret, never through an online QR generator. Keep the pre-auth page generic and the authenticated console easy to navigate. Test that the pre-auth page contains no setup details or configured secret values.
