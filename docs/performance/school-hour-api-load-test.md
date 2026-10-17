# Fraction Quest school-hour API load test

**Run date:** 2026-10-17  
**Environment:** Replit development database and local development API (`127.0.0.1:8080`)  
**Result:** All 3,500 synthetic sessions completed their checks; 31,500 measured requests returned successfully, with zero HTTP or data-integrity errors.

## Method

The repeatable runner is `artifacts/api-server/src/performance/school-hour-load.ts`. Run it only with the development API and database:

```sh
NODE_ENV=development pnpm --filter @workspace/api-server exec tsx src/performance/school-hour-load.ts
```

The script refuses non-development mode and non-loopback API addresses. It creates 3,500 uniquely named synthetic accounts, session rows, and learner profiles, then uses separate fixture sets for the 500-, 1,000-, and 2,000-session stages. A 20-request authenticated warm-up runs before measurement. Each measured session makes nine sequential API calls:

- Read the signed-in account (`GET /auth/me`).
- Read empty progress, write progress, then read it back.
- Read the learner profile, update its display name, read empty profile progress, write profile progress, then read it back.

Payloads are compared without relying on JSON object key order. The runner measures client-observed request and end-to-end session latency, samples API process RSS and CPU every 500 ms, and samples PostgreSQL connection/activity and database-wide counters. It deletes all synthetic users in `finally`; foreign-key cascades remove their sessions and progress/profile rows.

## Results

Latency values are milliseconds. Route p95 is the slowest per-route p95 within each stage; end-to-end p95 covers all nine sequential requests for one synthetic session.

| Concurrent sessions | Successful sessions | Measured requests | HTTP/data errors | End-to-end p50 / p95 | Slowest route p95 | API RSS mean / peak | API CPU mean / peak* | Peak DB connections / active / lock waiters |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 500 | 4,500 | 0 | 3,846 / 3,887 | 689 (`PUT /progress`) | 244 / 308 MB | 27.5% / 32.2% | 12 / 10 / 0 |
| 1,000 | 1,000 | 9,000 | 0 | 5,877 / 5,948 | 896 (`PUT /progress`) | 366 / 412 MB | 24.4% / 30.7% | 11 / 11 / 0 |
| 2,000 | 2,000 | 18,000 | 0 | 12,852 / 12,980 | 2,396 (`PUT /family/profiles/:profileId/progress`) | 486 / 510 MB | 21.6% / 41.8% | 11 / 11 / 0 |

\* CPU is the API process's share of the four-core host's total CPU capacity. The 20 warm-up requests are additional to the 31,500 measured requests.

All tested read-after-write checks matched their writes, including both account-level progress and per-learner-profile progress. All measured routes returned HTTP 200. The complete response counts were 500/1,000/2,000 for account reads and profile updates, and 1,000/2,000/4,000 for each progress read path (two reads per session).

### PostgreSQL activity observed

The development database's sampled peak active connection count was 10, 11, and 11 at 500, 1,000, and 2,000 sessions, respectively; the monitor observed no lock waiters. Database-wide `pg_stat_database` counter deltas were:

| Sessions | Commits | Rollbacks | Block reads / hits | Tuple inserts / updates |
| ---: | ---: | ---: | ---: | ---: |
| 500 | 6,876 | 1 | 0 / 152,865 | 11,000 / 500 |
| 1,000 | 17,432 | 0 | 0 / 155,700 | 1,000 / 1,764 |
| 2,000 | 34,828 | 0 | 1 / 428,916 | 2,004 / 4,649 |

These are database-wide cumulative statistics, not API-only query counts. PostgreSQL reported the 10,500 fixture-seed inserts in the 500-session interval, so the first tuple-insert delta includes fixture setup; tuple counters can also flush between sampling intervals. Do not interpret those deltas as the number of progress writes. The connection, active-query, and lock-wait samples are the more reliable per-stage activity indicators.

## Interpretation and limits

- Correctness held through 2,000 simultaneous authenticated sessions, but response latency rose with load: the 2,000-session journey had a 13.0-second p95, and its slowest individual route had a 2.4-second p95.
- API RSS grew from about 122 MB at the start of the 500-session stage to a 510 MB high-water mark at 2,000 sessions. RSS did not return to its earlier level between stages; the measurements include retained process memory.
- The API's PostgreSQL pool uses `pg` defaults (10 connections). At peak, the database showed roughly 10 active API connections plus the measurement connection, with no lock waits and almost no disk reads. The rising latency is consistent with requests queuing around the small API pool or the development database service, but this run did not separately time pool acquisition versus SQL execution. That is the documented capacity bottleneck; this result does not establish a production capacity limit.
- Authentication coverage here is for existing sessions (`GET /auth/me`) and profile reads/updates. Signup, login/password hashing, account recovery, classroom roster routes, and real production traffic were not load-tested.
- This was a development-environment controlled run, not a production-scale forecast. No production data or settings were accessed or changed. The synthetic account records were removed after the run.
