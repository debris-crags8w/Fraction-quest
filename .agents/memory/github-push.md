---
name: GitHub push fallback
description: A safe fallback when the local Git CLI cannot authenticate to GitHub.
---

When Git CLI pushes fail with authentication errors despite the GitHub integrations being active, the connected GitHub App can still write through the Git Data API. Build a tree from the current remote base, create a single-parent commit, and update the branch without force.

**Why:** the source-control connection was reported as active but `git push` rejected the workspace credentials; the GitHub App API connection had repository write access.

**How to apply:** check integration status and repository write access, confirm the branch has not changed since choosing the base commit, then verify the updated ref and compare its tree SHA with the intended local tree. Never force-update the branch as a workaround.
