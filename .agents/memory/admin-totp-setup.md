---
name: Admin TOTP setup
description: Security constraint for the admin dashboard's authenticator enrollment flow.
---

Keep the TOTP seed out of the admin HTML. The page may show whether configuration is complete, but enrollment must use the separately stored `ADMIN_TOTP_SECRET` rather than rendering it or a QR code in the page.

**Why:** the setup page can be reached before the authenticator factor has been verified; revealing the seed there would expose the second factor.

**How to apply:** document manual authenticator enrollment from the secret store and test that the admin page never includes configured secret values. Some authenticator apps may require a QR scan for third-party TOTP accounts; if needed, generate the `otpauth://` QR locally from the secret and never use an online QR generator or embed the seed/QR in the admin page.
