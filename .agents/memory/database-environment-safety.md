---
name: Database environment safety
description: Replit's development versus published runtime markers and database URL handling.
---

Replit injects a runtime-managed `DATABASE_URL` for the current environment: the workspace uses the development database and the published app uses production. Never request, set, print, or log this value. Replit documents `REPLIT_DEPLOYMENT=1` as the published-runtime marker; do not infer deployment mode from `REPLIT_ENVIRONMENT`, which may be present in the agent shell without indicating an active published deployment.

**Why:** this workspace shell reported `REPLIT_ENVIRONMENT=production` even though deployment metadata confirmed the app was not published. Replit's documentation identifies `REPLIT_DEPLOYMENT`, not that shell label, as the production marker.

**How to apply:** align `NODE_ENV` with `REPLIT_DEPLOYMENT` before opening the DB pool, refuse schema pushes in production, and use Replit Publish for managed production schema changes. Use synthetic data in development; never clone learner records into the workspace.
