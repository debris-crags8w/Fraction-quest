---
name: Artifact workflow port recovery
description: Recover artifact previews when prior workflow child processes keep their injected ports occupied.
---

Artifact workflow restarts can leave earlier child servers alive. If a restart fails with `EADDRINUSE`, treat it as a stale-process conflict until listener checks show otherwise; repeated restarts can create more competing servers.

**Why:** Restarting the same services repeatedly reproduced port conflicts because earlier workflow child processes continued serving on the assigned ports.

**How to apply:** Inspect the listeners and confirm the expected HTTP ports. Stop only process groups belonging to stale artifact workflows, then restart each configured workflow once and verify its logs and port. Keep using the injected port; do not mask the conflict by accepting an alternate port.
