---
name: PostgreSQL load-test counters
description: Interpreting PostgreSQL cumulative activity statistics in staged API load tests.
---

PostgreSQL cumulative counters such as `pg_stat_database.tup_inserted` can surface fixture-seeding work after the load-test baseline, even when setup and measurement are separated. The counters are database-wide and do not attribute work to the API process.

**Why:** In a development load run, the first measured stage included the 10,500 synthetic fixture inserts in its tuple counter delta, although the inserts occurred before the measured requests.

**How to apply:** Keep fixture setup outside measured intervals, allow statistics to settle, report these counters as approximate database-wide deltas, and use sampled connection, active-query, and lock-wait observations for per-stage activity. Never present tuple deltas as API write counts without attribution.
