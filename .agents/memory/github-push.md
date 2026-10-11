---
name: GitHub sync and push
description: Check for upstream changes before editing and safely publish branches when Git CLI authentication fails.
---

Before making local code changes, check GitHub for newer commits and merge them into the workspace first. Continuous monitoring between turns is unavailable, so repeat this check at the start of each work session.

**Why:** the user instructed that newer GitHub changes must be merged before local edits.

**How to apply:** fetch and inspect the relevant GitHub branch before editing; merge newer commits first, resolve any conflicts, and verify the working branch. Do not edit app code before completing this check.

When Git CLI pushes fail with authentication errors despite the GitHub integrations being active, the connected GitHub App can still write through the Git Data API. Build a tree from the current remote base, create a single-parent commit, and update the branch without force.

**Why:** the source-control connection was reported as active but `git push` rejected the workspace credentials; the GitHub App API connection had repository write access.

**How to apply:** check integration status and repository write access, confirm the branch has not changed since choosing the base commit, and compare every uploaded Git blob SHA with the corresponding local Git blob SHA before creating a tree. Content can be truncated or altered during transfer; abort on any mismatch. Then verify the updated ref and compare its tree SHA with the intended local tree. Never force-update the branch as a workaround.
