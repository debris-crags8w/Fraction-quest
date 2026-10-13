---
name: Runtime module side effects
description: Replit runtime modules may be added to project configuration when a language runtime is invoked.
---

Avoid invoking a language runtime for one-off shell metadata tasks when a built-in Node or shell utility will do. A `python3` shell invocation unexpectedly added `python-base-3.13` to `.replit`; the module was removed through package management.

**Why:** Runtime module changes can leave unrelated project configuration in a feature branch.

**How to apply:** After using or installing a language runtime, check `git status`. Remove accidental runtime additions through package-management functions, and check whether any workflow depends on them.
