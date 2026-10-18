---
name: Kokoro pack storage
description: Where pre-generated voice audio belongs and how to update it safely.
---

Store pre-generated Kokoro MP3s in App Storage and keep only the compact voice index in Git. Upload and verify the complete audio set before merging any index update. Scope cleanup to the current source tree; previously merged MP3 blobs remain in Git history unless a history rewrite is explicitly approved.

**Why:** The pack contains over twenty thousand MP3s and hundreds of megabytes, which creates avoidable source and deployment bloat.

**How to apply:** Keep audio under a dedicated storage namespace, serve it through a cached public route, verify every indexed sentence exists for every configured voice before removing stale objects, and treat history rewriting as a separate destructive action.
