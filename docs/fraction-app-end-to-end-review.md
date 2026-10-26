# Fraction Quest End-to-End Review (Product + Security)

Date: 2026-10-26
Reviewer mode: end-to-end QA + security review

## Executive summary
Fraction Quest has strong curriculum/test depth and broad unit coverage, with 493/493 app tests passing in this run. The highest-priority risks are security hardening at the API edge (rate limiting durability and CORS policy strictness), plus operational reliability for repeatable server-side verification in CI/local environments.

## Release readiness verdict
**Ready with fixes** — suitable for continued staged rollout, but high-priority security hardening should be completed before wider exposure.

## Findings by severity

### High

1. **Rate limiting is process-local and resettable**
   - **Impact:** Login/recovery/join throttles can be bypassed across restarts or multi-instance deployments, weakening brute-force protection.
   - **Evidence:** `artifacts/api-server/src/lib/rate-limit.ts` documents an in-memory limiter and restart reset behavior; used by auth and classroom join routes in `artifacts/api-server/src/routes/auth.ts` and `artifacts/api-server/src/routes/family.ts`.
   - **Repro steps:** Run multiple API instances or restart the server between attempts; observe counters reset and attempts resume.
   - **Recommendation:** Replace the in-memory buckets with shared durable storage (e.g., Redis-backed limiter), preserving per-IP and per-account keys.

2. **CORS policy is currently fully open by default**
   - **Impact:** Expands cross-origin attack surface and increases risk if credentialed cross-origin behavior is later enabled or misconfigured.
   - **Evidence:** `artifacts/api-server/src/app.ts` uses `app.use(cors())` without an explicit allowlist.
   - **Repro steps:** Send cross-origin requests from any origin and inspect permissive CORS headers.
   - **Recommendation:** Pin CORS to explicit production origins, explicitly define credential policy, and separate dev/prod CORS configurations.

### Medium

3. **Server test workflow is not reproducible in a clean environment without extra setup**
   - **Impact:** Slower feedback loops and reduced confidence in backend changes, especially for security-sensitive auth flows.
   - **Evidence:** Running `corepack pnpm --filter @workspace/api-server test` failed here due to missing `DATABASE_URL` and blocked optional build scripts; app tests passed (`493/493`).
   - **Repro steps:** Run API tests in a fresh environment without DB provisioning/env injection.
   - **Recommendation:** Add a documented/local default test DB strategy (or isolated test harness), and ensure required test env setup is explicit in contributor docs and CI.

4. **Parental consent is self-attested at account creation**
   - **Impact:** Compliance/usability risk for child-focused product contexts where stronger consent assurance may be needed.
   - **Evidence:** Consent is accepted through request payload checks in `artifacts/api-server/src/routes/auth.ts` and `artifacts/api-server/src/routes/privacy.ts`.
   - **Repro steps:** Submit `parentConsent: true` at signup to satisfy gate.
   - **Recommendation:** Add a stronger consent-verification flow appropriate for policy obligations (jurisdiction-dependent), or document accepted risk and legal basis.

5. **Accessibility regression checks are mostly manual/feature-specific**
   - **Impact:** A11y regressions can reach release despite good component-level intent.
   - **Evidence:** Existing tests cover behavior and reduced-motion (`artifacts/fraction-quest/src/reduced-motion.test.ts`), but no automated WCAG/axe pass is present in test scripts.
   - **Repro steps:** Review `artifacts/fraction-quest/package.json` test commands; no dedicated automated a11y check target.
   - **Recommendation:** Add automated accessibility checks (keyboard, label, contrast, focus order) into CI for core learner flows.

### Low

6. **Progress/profile state is stored in browser localStorage in plain form**
   - **Impact:** Shared-device privacy risk if browser profiles are not isolated.
   - **Evidence:** Local storage usage in `artifacts/fraction-quest/src/game.ts`, `artifacts/fraction-quest/src/lib/fun.ts`, and `artifacts/fraction-quest/src/account.tsx`.
   - **Repro steps:** Complete lessons, inspect browser localStorage keys.
   - **Recommendation:** Consider optional at-rest obfuscation/encryption or shorter retention/clear-on-sign-out for shared-device mode.

7. **Math-engine robustness can be further strengthened with invariant/property tests**
   - **Impact:** Lower risk of edge-case regressions in fraction equivalence/simplification/comparison logic as content grows.
   - **Evidence:** Existing deterministic tests are broad (`artifacts/fraction-quest/src/concept-games.test.ts`, `artifacts/fraction-quest/src/game.test.ts`), but property-style invariant checks are limited.
   - **Repro steps:** N/A (quality hardening recommendation).
   - **Recommendation:** Add invariant tests for equivalence, ordering, and normalization across randomized valid fraction inputs.

## What is working well
- Wide curriculum and gameplay validation footprint (`493` passing tests across `85` suites in app package).
- Good defensive input validation in API schemas and route handling.
- Session handling uses httpOnly cookies and password hashing with scrypt.
- Parent-consent gating is present on data-read/write paths.

## Validation notes from this review run
- ✅ `corepack pnpm --filter @workspace/fraction-quest test` passed (`493/493`).
- ⚠️ `corepack pnpm --filter @workspace/api-server test` did not fully pass in this environment (missing `DATABASE_URL`; optional build script approvals required).
