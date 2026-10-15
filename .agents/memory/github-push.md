---
name: GitHub sync and push
description: Check for upstream changes before editing and safely publish branches when Git CLI authentication fails.
---

Before making local code changes, check GitHub for newer commits and merge them into the workspace first. Continuous monitoring between turns is unavailable, so repeat this check at the start of each work session.

**Why:** the user instructed that newer GitHub changes must be merged before local edits.

**How to apply:** fetch and inspect the relevant GitHub branch before editing; merge newer commits first, resolve any conflicts, and verify the working branch. Do not edit app code before completing this check.

When Git CLI pushes fail with authentication errors despite the GitHub integration being active, the connected GitHub App can still write through the Git Data API. Build a tree from the current remote branch tip, create the commit with the intended parent(s), and update the branch without force.

**Why:** Git CLI authentication can fail even when the connected GitHub App has repository write access; conflict resolution may need a merge commit with both the PR head and updated base as parents.

**How to apply:** check integration status and repository write access, preserve full repository paths when building monorepo trees, and compare every uploaded Git blob SHA with its local Git blob SHA before creating a tree. Compare the resulting tree SHA with the local commit tree. For a merge-resolution commit, include both source and updated-base parent SHAs and all changed paths in the tree. Re-read the branch ref immediately before updating it; if it moved, fetch and merge the new commit, then rebuild on that base. Verify the final ref and tree, and never force-update the branch as a workaround.

Workflow files need the GitHub App's `workflow` permission in addition to repository write access. In this environment, reconnecting to grant that permission still did not unblock writes to `.github/workflows`; ordinary file updates succeeded, but workflow writes remained blocked.

**Why:** GitHub Actions files carry elevated permission because they can expose workflow tokens, and the connector's workflow-file write path may remain blocked after reauthorization.

**How to apply:** check `getIntegrationReauthorizationContext` after a 403 and reauthorize only when it reports OAuth. Retry the blocked workflow write once; if it still fails, stop retrying, preserve local changes, and clearly report which files reached GitHub.

GitHub's Git Database API can omit the final newline from a commit message when creating a commit, producing a different commit SHA even when tree, parent, author, committer, and visible message match the local commit.

**Why:** a code-only review-branch publish created a matching tree but initially failed the exact-commit check because the API-normalized message had no trailing newline.

**How to apply:** treat a commit SHA mismatch as a stop before moving the branch ref. Inspect the GitHub-created commit object and reproduce its exact message bytes locally if matching local and remote refs matters; update the remote only after verifying tree and parent and rechecking the branch ref.

Large file output from CodeExecution `shellExec` can be shortened even when `maxOutputBytes` is higher and `truncated` is false; this can create GitHub blobs whose content looks right but whose SHA does not match the local Git object.

**Why:** a tree-hash check caught incomplete file transfers while publishing a review PR; fetching the Git blob through shell output did not preserve its complete bytes.

**How to apply:** transfer large blobs in compressed base64 or small base64 chunks, reconstruct the raw bytes in the impure function, and verify each Git blob SHA plus the final tree SHA before creating refs or PRs.

## Short-lived branches and pull requests

For new app work, start from the latest `main` on a short-lived branch and submit a pull request to `main`; do not accumulate new work on a long-lived review branch.

**Why:** the user asked that new work use short branches from `main` and a pull request, like the paper-fold change.

**How to apply:** fetch `github/main` before starting, create the work branch from that commit, push it and open a pull request, then return the workspace to `main` after merge.

## Preserve local branch backups

When removing a merged GitHub review branch, retain its local-only history under a clearly named backup branch unless the user asks to discard it.

**Why:** the user confirmed that keeping the local backup is harmless and preferred over losing its unpublished commits.

**How to apply:** after verifying the review work is in `main`, remove the remote review ref and stale remote-tracking ref, but rename rather than force-delete a divergent local branch; keep the active workspace on `main`.
