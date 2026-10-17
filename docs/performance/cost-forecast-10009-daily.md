# Fraction Quest cost forecast for 10,009 daily learners

**Prepared:** 2026-10-17
**Scope:** Gross monthly Replit cloud usage for a hypothetical published app, before plan credits or included allowances.

## Bottom line

At 10,009 daily active learners, the modeled total is **about $33/month in a low-usage case, $76/month in the expected case, and $181/month in a deliberately heavy case**.

These are scenario estimates, not a current bill. The deployment service reports that this Repl has no published deployment, so there is no production traffic or deployment bill to measure. The database estimate assumes Replit-managed production PostgreSQL; if production uses another provider, replace that line with its actual rates.

| Monthly charge | Low | Expected | High |
|---|---:|---:|---:|
| Autoscale base fee | $1.00 | $1.00 | $1.00 |
| API request charges | $0.24 | $1.08 | $2.40 |
| Non-voice API compute (estimated) | $0.01 | $0.03 | $0.07 |
| New Kokoro synthesis compute (estimated) | $0.08 | $0.84 | $8.39 |
| API JSON data transfer (assumed) | $0.03 | $0.14 | $0.72 |
| Kokoro WAV data transfer (measured sample) | $2.45 | $12.25 | $24.50 |
| Static web data transfer | $0.20 | $0.84 | $21.26 |
| PostgreSQL compute | $28.80 | $57.60 | $115.20 |
| PostgreSQL storage | $0.35 | $1.75 | $7.00 |
| **Estimated total** | **$33.16** | **$75.54** | **$180.54** |

Values are rounded independently, so displayed rows may not sum to the displayed total exactly.

## Replit rates used

Rates below were checked against Replit’s cloud pricing documentation on the preparation date:

- **Autoscale:** $1/month base fee, $0.60 per million compute units, $0.40 per million requests, and $0.05/GiB outbound transfer.
- **Compute units:** 18 units per CPU-second and 2 units per GiB of RAM-second.
- **Static deployments:** hosting is free; outbound transfer is $0.05/GiB after any applicable plan allowance.
- **Replit production PostgreSQL:** $0.16 per active compute hour and $0.35/GiB-month of storage. Compute suspends after five idle minutes and resumes on the next query.

Sources: [August 2026 cloud pricing update](https://docs.replit.com/billing/aug-cloud-billing-updates), [publishing and database billing](https://docs.replit.com/billing/about-usage-based-billing).

## Scenario assumptions

All cases use **10,009 daily active learners for 30 days**, or 300,270 learner-days. Daily active learners are not treated as simultaneous users.

| Assumption | Low | Expected | High |
|---|---:|---:|---:|
| Non-voice API requests per learner-day | 2 | 9 | 20 |
| API response data per learner-day | 2 KiB | 10 KiB | 50 KiB |
| New audio clips downloaded per learner-day | 1 | 5 | 10 |
| Uncached voice-and-text synthesis combinations per month | 1,000 | 10,000 | 100,000 |
| Database active time per day | 6 hours | 12 hours | 24 hours |
| Database stored data | 1 GiB | 5 GiB | 20 GiB |
| Static bundle downloads per learner-month | 1 | 4.3 (weekly) | 30 (daily, uncached) |
| Static bundle size used for transfer | 0.40 MiB gzip | 0.40 MiB gzip | 1.45 MiB uncompressed |

The storage scenarios are independent planning assumptions: daily active users do not reveal how many total accounts or years of progress are stored. The API payload sizes are assumptions, not measurements from real learner records.

## Measurements used

### Web delivery

A production build after syncing GitHub’s latest `main` measured **1.45 MiB of static files** and **0.40 MiB when gzip-compressed**. The forecast charges static transfer, not static hosting. Real transfer depends on browser and edge caching, compression, and how often users receive a new hashed bundle.

### API and database

The development-only synthetic load test ran 500, 1,000, and 2,000 concurrent authenticated sessions. It created and cleaned up 3,500 synthetic accounts, measured 31,500 requests plus 20 warm-up requests, and recorded zero HTTP or data-integrity errors.

| Concurrent sessions | Stage time | End-to-end p95 | API CPU mean | API RSS mean / peak | Peak DB connections |
|---:|---:|---:|---:|---:|---:|
| 500 | 5.86 sec | 5.82 sec | 21.01% of 4-core host | 673 / 735 MiB | 11 |
| 1,000 | 17.22 sec | 17.18 sec | 11.26% of 4-core host | 815 / 883 MiB | 11 |
| 2,000 | 55.10 sec | 55.02 sec | 6.41% of 4-core host | 892 / 893 MiB | 12 |

There were no database lock waiters. The run took place against the development API and database, after the Kokoro model had been loaded; it did not touch production data. Cleanup ran at the end.

The earlier load-test report recorded a 13.0-second p95 at 2,000 sessions, while this repeat run recorded 55.0 seconds. That variation makes this development test unsuitable as a production capacity guarantee. For the rough Autoscale compute estimate, the latest run’s CPU and memory samples imply a median of about **0.175 compute units per nine-request synthetic journey**; the estimate scales that figure linearly with the assumed request count.

### Kokoro

A fresh local-development synthesis returned a **175,244-byte WAV** containing **3.65 seconds of audio**. The request took 2.64 seconds wall time; the container CPU counter increased by about 7.5 CPU-seconds. The CPU measurement includes all processes in the workspace container, so it may include unrelated activity and should be treated as approximate.

For each uncached voice/text combination, the estimate uses 7.5 CPU-seconds plus an approximate 0.9 GiB of resident model/API memory for 2.64 seconds. At the published Autoscale rates, that is about **$0.000084 per uncached synthesis**. The assumed monthly synthesis counts therefore cost about $0.08, $0.84, and $8.39. This is not one synthesis per Listen press: the server caches generated voice/text combinations, and the WAV response is marked immutable so browsers can reuse it.

## What drives the total

1. **Database active hours are the largest cost.** At the expected assumption, 12 active hours per day costs $57.60/month before storage. A sustained 24-hour active database costs $115.20/month before storage.
2. **Audio delivery matters more than synthesis compute.** Five fresh 175 KB audio downloads per learner-day is about $12.25/month of outbound transfer. Repeated clips can be served from cache; the estimate counts only fresh downloads.
3. **Ordinary API compute and request charges are small in this model.** The expected case is about $1.11 for requests plus $0.03 for compute, before the Autoscale base fee.
4. **Static hosting is already the low-cost option.** The production web artifact is configured for static serving; its transfer cost is small when browser caching works.

## Cost-reduction options

- Keep the web app on static hosting and publish the API as Autoscale rather than an always-running VM, if its cold-start behavior is acceptable.
- Preserve the immutable cache headers on Kokoro WAVs. The app already has server and browser caches; avoid changing URLs for unchanged voice/text pairs.
- If consistent Kokoro voices are not essential for every learner, offering device-native speech instead of server Kokoro avoids most Kokoro synthesis and WAV-transfer charges, at the cost of less consistent voices across devices.
- The `/api/voice/status` endpoint starts loading the Kokoro model when called. Avoid calling it for visitors who have natural voice turned off or who have not entered a voice-related flow.
- Once published, compare these assumptions with actual Usage-dashboard compute, request, transfer, and database active-hour readings. No production usage data was available for this forecast.

## Limits

- This is a usage model before plan credits, included allowances, taxes, or any account-level adjustments.
- There is no published deployment in this Repl, so production traffic, actual deployment type, database provider, and real monthly charges were not available to measure.
- The voice workload, progress payload sizes, static cache hit rate, registered-account count, and database storage are assumptions or development measurements, not production observations.
- No deployment or production database settings were changed.
