---
name: Development database bootstrap
description: Development API tests need the project's application schema applied, even when the database itself is already provisioned.
---

The Replit development database can exist without the application's tables. The API server still starts, and an unauthenticated request to `/api/auth/me` can return 401, so that check alone does not establish that account routes can read or write data.

**Why:** the account lifecycle could not be exercised until the existing Drizzle schema was applied to development.

**How to apply:** Before testing database-backed account or progress routes, confirm the expected tables exist. If they do not, apply the existing `lib/db` schema to development only; do not change production as part of local verification.
