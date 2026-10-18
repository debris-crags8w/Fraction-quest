---
name: Kokoro pack storage
description: Where pre-generated voice audio belongs and how updates reach App Storage automatically.
---

Store pre-generated Kokoro MP3s in App Storage and keep only the compact voice index in Git. The Voice pack workflow uploads new audio through the API (`PUT /api/voice-pack/files/:voice/:key.mp3`), checks every indexed sentence is stored in every voice (`POST /api/voice-pack/check`), and only then opens the index pull request. Unused files are removed only by a manual workflow run with `prune`, after a deploy. Scope cleanup to the current source tree; previously merged MP3 blobs remain in Git history unless a history rewrite is explicitly approved.

**Why:** The pack contains over twenty thousand MP3s and hundreds of megabytes, which creates avoidable source and deployment bloat. Only the Replit server can write to App Storage (its sidecar credentials), so GitHub sends files to the server rather than writing storage itself.

**How to apply:** Set `VOICE_PACK_UPLOAD_TOKEN` (32+ characters) in Replit Secrets and the same token plus the app's public address as GitHub secrets `VOICE_PACK_UPLOAD_TOKEN` and `VOICE_PACK_UPLOAD_URL`. Without them the workflow falls back to the manual `sync-voice-pack` script. Serve audio with a long immutable cache (files are named by sentence). Never prune before the live app's index stops listing a file.
