---
name: WebKit browser validation
description: Local Playwright WebKit compatibility and CI dependency setup.
---

In this workspace, Playwright can download WebKit, but the local runner is missing the native libraries needed to launch it. Generic names passed to the Replit system-dependency installer were not available in its package index. The pull-request workflow installs the required WebKit runtime dependencies through Playwright's `install --with-deps` command.

**Why:** A downloaded browser binary alone is not enough to run WebKit checks in this workspace.

**How to apply:** When local WebKit launch reports missing system libraries, don't keep retrying the browser binary download; rely on the pull-request runner's dependency installation to execute the WebKit spec.
