---
name: Kokoro pack storage
description: Where pre-generated voice audio lives and how every pull request keeps it complete.
---

The user chose Heart and Michael as the two natural voices and approved retiring Emma. Preserve that choice when reconciling upstream voice work. Each voice has MP3 and Opus audio in App Storage; keep the generated index and audio out of Git.

**Why this pair:** The user explicitly confirmed Heart and Michael and asked to combine them with the Opus and Wi-Fi workflow.

The Voice pack workflow runs on every pull request. It asks the server which of the PR's sentences lack audio (`POST /api/voice-pack/check?list=1`), makes exactly those with Kokoro, uploads them (`PUT /api/voice-pack/files/:voice/:key.(mp3|caf)`), and its job "Voice audio is in App Storage" passes only when every sentence is stored. That job should be a required check. A push to main re-runs it as a safety net. Manual runs offer `rerender` (re-make everything, after an encoding change) and `prune` (remove unused files, only after a deploy). Previously merged MP3 blobs remain in Git history unless a history rewrite is explicitly approved.

**Why:** The pack is thousands of files and tens of megabytes, which bloats source and deployments. Only the Replit server can write to App Storage (its sidecar credentials), so GitHub sends files to the server rather than writing storage itself. Checking on the PR means text never reaches main without its audio, and App Storage (not a committed list) is the source of truth, so a lost file is made again on the next run.

**How to apply:** Set `VOICE_PACK_UPLOAD_TOKEN` (32+ characters) in Replit Secrets for the published deployment, and the same token plus the app's public address as GitHub secrets `VOICE_PACK_UPLOAD_TOKEN` and `VOICE_PACK_UPLOAD_URL`; without them the check fails on every PR. Serve audio with a long immutable cache (files are named by sentence). Never prune before the live app stops using a file.
