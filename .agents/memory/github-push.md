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

Workflow files need the GitHub App's `workflow` permission in addition to repository write access. Git CLI push can fail for missing credentials even when the connected GitHub App can publish workflow changes through the Git Data API.

**Why:** A GitHub App connection with the workflow permission successfully published a tree containing `.github/workflows` files after Git CLI push failed authentication.

**How to apply:** use the Git Data API path when CLI authentication fails: upload exact local blobs, verify each returned SHA, create a tree and compare its SHA with the local tree, then create a commit and update the branch ref only after rereading it. If GitHub rejects the write, check the integration's permissions and reauthorize only when `getIntegrationReauthorizationContext` reports OAuth.

GitHub's Git Database API can normalize commit messages or metadata and produce a different commit SHA even when the intended tree and parent match.

**Why:** API-created commits in a pushed feature branch had the expected tree and parent chain but different SHAs from their local counterparts.

**How to apply:** if exact local commit IDs matter, inspect and reproduce the API's exact message and metadata bytes. Otherwise, verify every uploaded blob, each tree against its local counterpart, and each intended parent; recheck the target ref before updating it, and never force-move an existing branch.

Large file output from CodeExecution `shellExec` can be shortened even when `maxOutputBytes` is higher and `truncated` is false; this can create GitHub blobs whose content looks right but whose SHA does not match the local Git object.

**Why:** a tree-hash check caught incomplete file transfers while publishing a review PR; fetching the Git blob through shell output did not preserve its complete bytes.

**How to apply:** transfer large blobs in compressed base64 or small base64 chunks, reconstruct the raw bytes in the impure function, and verify each Git blob SHA plus the final tree SHA before creating refs or PRs.

Retargeting an open pull request to `main` may not start checks if the branch was updated before the retarget and the workflow does not listen for pull-request edits. Check for runs after changing the base; if none start, a no-content fast-forward commit can trigger the normal synchronize checks without changing the PR diff.

**Why:** An update made while a PR targeted a review branch did not start CI; changing its base to `main` also left checks absent, while a no-content commit triggered them.

**How to apply:** Verify the PR base, head, and required check list first. Use a non-forced commit only when the tree will stay unchanged, then wait for all required checks before merging.

## Short-lived branches and pull requests

For new app work, start from the latest `main` on a short-lived branch and submit a pull request to `main`; do not accumulate new work on a long-lived review branch.

**Why:** the user asked that new work use short branches from `main` and a pull request, like the paper-fold change.

**How to apply:** fetch `github/main` before starting, create the work branch from that commit, push it and open a pull request, then return the workspace to `main` after merge.

When the workspace branch contains unrelated task or review commits, base the review pull request on clean `github/main` and carry over only the current feature.

**Why:** automated task merges can leave unrelated changes in the active local history; including them in a feature PR creates duplicate or cross-scope review work.

**How to apply:** compare the feature diff against both the active branch and remote `main`, preserve unrelated local changes on their existing branch or stash, and verify the PR file list contains only the requested work.

## Preserve local branch backups

When removing a merged GitHub review branch, retain its local-only history under a clearly named backup branch unless the user asks to discard it.

**Why:** the user confirmed that keeping the local backup is harmless and preferred over losing its unpublished commits.

**How to apply:** after verifying the review work is in `main`, remove the remote review ref and stale remote-tracking ref, but rename rather than force-delete a divergent local branch; keep the active workspace on `main`.

Before deleting a GitHub branch associated with a merged PR, verify that its current tip matches a merged PR head or is already an ancestor of `main`. A branch-name match alone is not enough.

**Why:** a branch associated with a merged PR still had newer commits that were not included in `main`; the GitHub connector also enforced a 10-requests-per-second limit during bulk ref deletion.

**How to apply:** recheck branch and PR state immediately before deletion, preserve any tip that is neither merged nor in `main`, create local backups for otherwise-unreachable commits, and keep bulk API writes below the connector's rate limit. Verify the remote branch list after cleanup.
