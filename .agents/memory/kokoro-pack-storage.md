---
name: Kokoro pack storage
description: Where pre-generated voice audio belongs and how updates reach App Storage automatically.
---

The user chose two natural voices, Heart and Michael, and approved deleting Emma's stored audio. Keep that choice when incorporating upstream work that independently reduced the app to Heart alone. Store pre-generated Kokoro MP3s in App Storage and keep only the compact voice index in Git. Verify complete audio coverage before merging index changes. Prune retired files only after the live app no longer offers them; a GitHub merge alone is not a deployment. Previously merged MP3 blobs remain in Git history unless a history rewrite is explicitly approved.

**Why:** The user explicitly confirmed Heart and Michael. Audio in Git creates avoidable source and deployment bloat. Deleting stored audio before publishing the matching app can make older live clients fall back to expensive synthesis.

**How to apply:** Set `VOICE_PACK_UPLOAD_TOKEN` (32+ characters) in Replit Secrets and the same token plus the app's public address as GitHub secrets `VOICE_PACK_UPLOAD_TOKEN` and `VOICE_PACK_UPLOAD_URL`. Without them the workflow falls back to the manual `sync-voice-pack` script. Serve audio with a long immutable cache (files are named by sentence). Never prune before the live app's index stops listing a file.
