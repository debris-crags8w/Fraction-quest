---
name: Admin TOTP setup
description: Security constraint for the admin dashboard's authenticator enrollment flow.
---

Keep the public admin page limited to sign-in. Do not include setup instructions, environment-variable names, setup-readiness status, or generator commands before authentication. Keep the TOTP seed out of admin HTML; enrollment uses the separately stored `ADMIN_TOTP_SECRET`, never a secret or QR rendered into the page.

**Why:** the page is reachable before the authenticator factor has been verified, so setup details and second-factor material should not be exposed there. The user explicitly does not want setup instructions embedded in the admin page.

**How to apply:** keep enrollment guidance in documentation, not the page. Some authenticator apps may require QR scanning; if needed, generate the `otpauth://` QR locally from the secret, never through an online QR generator. Test that the pre-auth page contains only generic sign-in guidance and never includes setup details or configured secret values.
