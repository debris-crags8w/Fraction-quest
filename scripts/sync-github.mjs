#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const remote = process.env.GITHUB_REMOTE?.trim() || "github";
const branch = process.env.GITHUB_BRANCH?.trim() || "main";
const trackingRef = `refs/remotes/${remote}/${branch}`;
const label = `${remote}/${branch}`;

function runGit(args) {
  return spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function fail(message) {
  console.error(`GitHub sync: ${message}`);
  process.exit(1);
}

function gitOutput(args, description) {
  const result = runGit(args);
  if (result.error) {
    fail(`${description}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${description}${result.stderr ? `\n${result.stderr.trim()}` : ""}`);
  }
  return result.stdout.trim();
}

function isAncestor(ancestor, descendant) {
  const result = runGit(["merge-base", "--is-ancestor", ancestor, descendant]);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  fail(`Could not compare commits${result.stderr ? `\n${result.stderr.trim()}` : ""}`);
}

function abortMerge() {
  const result = runGit(["merge", "--abort"]);
  if (result.status === 0) return true;
  console.error(
    `GitHub sync: automatic merge abort failed${result.stderr ? `\n${result.stderr.trim()}` : ""}`,
  );
  return false;
}

gitOutput(["rev-parse", "--show-toplevel"], "Run this command inside a Git working tree");

const currentBranchResult = runGit(["symbolic-ref", "--quiet", "--short", "HEAD"]);
if (currentBranchResult.status !== 0 || !currentBranchResult.stdout.trim()) {
  fail("A named local branch is required; detached HEAD was not changed.");
}
const currentBranch = currentBranchResult.stdout.trim();

const branchFormat = runGit(["check-ref-format", "--branch", branch]);
if (branchFormat.status !== 0) {
  fail(`Invalid branch name: ${branch}`);
}

const remoteResult = runGit(["remote", "get-url", remote]);
if (remoteResult.status !== 0) {
  fail(`Configured Git remote '${remote}' was not found.`);
}

const statusResult = runGit(["status", "--porcelain=v1", "--untracked-files=all"]);
if (statusResult.status !== 0) {
  fail(`Could not inspect the working tree${statusResult.stderr ? `\n${statusResult.stderr.trim()}` : ""}`);
}
if (statusResult.stdout.length > 0) {
  const paths = statusResult.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3))
    .join(", ");
  fail(`Working tree has local changes (${paths}). Commit or stash them, then retry; nothing was fetched or merged.`);
}

const fetch = runGit([
  "fetch",
  "--no-tags",
  remote,
  `refs/heads/${branch}:${trackingRef}`,
]);
if (fetch.status !== 0) {
  fail(`Could not fetch ${label}${fetch.stderr ? `\n${fetch.stderr.trim()}` : ""}`);
}

const localSha = gitOutput(["rev-parse", "--verify", "HEAD^{commit}"], "Could not read the current commit");
const upstreamSha = gitOutput(
  ["rev-parse", "--verify", `${trackingRef}^{commit}`],
  `Could not read fetched branch ${label}`,
);

if (localSha === upstreamSha) {
  console.log(`GitHub sync: ${currentBranch} is already up to date with ${label}. No merge was needed.`);
  process.exit(0);
}

if (isAncestor(localSha, upstreamSha)) {
  const merge = runGit(["merge", "--ff-only", upstreamSha]);
  if (merge.status !== 0) {
    fail(`Could not fast-forward to ${label}${merge.stderr ? `\n${merge.stderr.trim()}` : ""}`);
  }
  console.log(`GitHub sync: fast-forwarded ${currentBranch} to ${label}. No push was performed.`);
  process.exit(0);
}

if (isAncestor(upstreamSha, localSha)) {
  console.log(`GitHub sync: ${currentBranch} is ahead of ${label}; no merge was needed. No push was performed.`);
  process.exit(0);
}

const mergeBase = runGit(["merge-base", localSha, upstreamSha]);
if (mergeBase.status !== 0 || !mergeBase.stdout.trim()) {
  fail(`The current branch and ${label} have unrelated histories; refusing to merge.`);
}

const merge = runGit(["merge", "--no-edit", upstreamSha]);
if (merge.status === 0) {
  console.log(`GitHub sync: merged ${label} into ${currentBranch}. No push was performed.`);
  process.exit(0);
}

const conflicts = runGit(["diff", "--name-only", "--diff-filter=U"]);
if (conflicts.stdout.trim()) {
  const conflictPaths = conflicts.stdout.trim().split("\n").join(", ");
  if (abortMerge()) {
    fail(`Merge conflict in ${conflictPaths}. The attempted merge was aborted; resolve the conflict and retry.`);
  }
  fail(`Merge conflict in ${conflictPaths}. The merge could not be aborted; inspect the working tree before continuing.`);
}

const mergeInProgress = runGit(["rev-parse", "--quiet", "--verify", "MERGE_HEAD"]);
if (mergeInProgress.status === 0) {
  abortMerge();
}
fail(`Could not merge ${label}${merge.stderr ? `\n${merge.stderr.trim()}` : ""}`);
