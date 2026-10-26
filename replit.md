# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm sync:github` — fetch and merge the configured GitHub branch into the current branch before local edits; requires a clean working tree and never pushes
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Database safety

- Replit provides separate development and published databases through its runtime-managed `DATABASE_URL`. Do not add or override `DATABASE_URL` in Secrets.
- The API checks that `NODE_ENV` matches the Replit published-deployment marker before opening a database pool. Development must run with `NODE_ENV=development`.
- Drizzle schema-push commands are blocked in production. Use Replit Publish to review and apply managed production schema changes.
- Do not copy live learner records into development. Account and progress behavior tests use synthetic in-memory data, including `artifacts/fraction-quest/src/account-flow.test.ts`.

## Running the API tests locally

The API tests load the database package, which throws "DATABASE_URL must be set" without it. On a clean machine, start a throwaway Postgres 16 and export `DATABASE_URL` in your shell (not in Replit Secrets), as CI does (`.github/workflows/pull-request-checks.yml`):

```sh
docker run --rm -d --name fq-test-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fraction_quest_test postgres:16
# or, with a local install: createdb fraction_quest_test
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/fraction_quest_test
pnpm --filter @workspace/api-server test
```

- The test database starts empty and CI does not push the schema. `rate-limit.test.ts` creates its own `rate_limits` table; the other tests do not query the database, and the rate limiter counts in memory when its table is missing.
- Schema pushes (`pnpm --filter @workspace/db run push`) are development-only and blocked in production (`lib/db/src/environment-guard.ts`). New tables reach the published database through Replit Publish.
- Never point `DATABASE_URL` at the real development or published database. Use a disposable one and stop it afterwards (`docker stop fq-test-db`).
- Leave `NODE_ENV` unset or `development`, and `REPLIT_DEPLOYMENT` unset: the guard rejects a mismatch.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

- Before editing files, run `pnpm sync:github`. It defaults to `github/main`; set `GITHUB_REMOTE` or `GITHUB_BRANCH` to use another configured remote or branch. It stops on a dirty working tree, reports merge conflicts and aborts that attempted merge, and never pushes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
