---
name: Kokoro pack storage
description: Where pre-generated voice audio lives and how every pull request keeps it complete.
---

The user chose Heart and Michael as the two natural voices and approved retiring Emma. Preserve that choice when reconciling upstream voice work. Each voice has MP3 and Opus audio in App Storage; keep the generated index and audio out of Git.

**Why this pair:** The user explicitly confirmed Heart and Michael and asked to combine them with the Opus and Wi-Fi workflow.

The Voice pack workflow sends the current sentence manifest to the authenticated Replit API. Replit compares it with App Storage, renders small PR gaps with Kokoro, writes directly to storage, and verifies the result; GitHub does not render or upload the audio. The check should be required. Keep automatic PR sync bounded so a forgotten full-pack backfill cannot unexpectedly launch thousands of renders; use the Replit batch command for a large gap. Previously merged MP3 blobs remain in Git history unless a history rewrite is explicitly approved.

**Why:** The pack is thousands of files and tens of megabytes, which bloats source and deployments. The Replit app server can write directly to App Storage; GitHub Actions must call its public API rather than access storage itself. A bounded PR check prevents text reaching main without audio while keeping bulk regeneration intentional.

**How to apply:** Set `VOICE_PACK_UPLOAD_TOKEN` (32+ characters) in Replit Secrets for the published API, and the same token plus the published app's base address as GitHub secrets `VOICE_PACK_UPLOAD_TOKEN` and `VOICE_PACK_UPLOAD_URL`; no separate API host is needed because the API is under `/api`. A Scheduled Deployment cannot access App Storage, so use the deployed app server. Serve audio with a long immutable cache (files are named by sentence). Never prune before the live app stops using a file.
