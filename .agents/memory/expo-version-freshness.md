---
name: Expo version freshness
description: Handling Expo SDK patch updates blocked by the workspace package mirror's release-age policy.
---

When Expo suggests SDK-compatible patch versions that are still inside the workspace package mirror's minimum release age, `expo install --fix` can fail even though the versions exist upstream. Do not bypass the release-age gate. Keep the current locked packages, report the remaining patch mismatch, and retry once the versions are eligible.

**Why:** the package mirror delays newly published versions as a supply-chain safety measure; installing early would defeat that protection.

**How to apply:** run Expo's compatibility checks, attempt the documented fix once, and if the mirror rejects the newer versions, verify TypeScript and the running preview with the existing lockfile instead.

Expo startup may also print a React Native DevTools error when its bundled native binary cannot load a missing system library. If Metro starts and the app bundles successfully, distinguish that nonfatal tooling warning from an app crash.

**Why:** this environment can run Metro and web previews even when the optional native DevTools binary is unavailable.

**How to apply:** check the workflow for `Starting Metro Bundler` and a successful bundle before treating the DevTools warning as a product failure.
