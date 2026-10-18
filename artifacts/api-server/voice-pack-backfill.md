# Daily voice-pack backfill

The daily job checks the lesson and story sentence list included in its deployed
revision and stores only missing Heart voice clips in App Storage. It is safe to
rerun: existing clips are skipped, and the job does not delete files.

## Replit Scheduled Deployment

After the current one-time backfill finishes, create a Scheduled Deployment in
the Replit Publishing tool:

- **Schedule:** once daily (for example, `0 3 * * *`)
- **Time zone:** `America/New_York`
- **Build command:** `pnpm install --frozen-lockfile`
- **Run command:** `pnpm --filter @workspace/api-server run daily-voice-backfill`
- **Timeout:** 2 hours

The job uses the same Replit App Storage integration as the API server. It does
not need a public URL, a GitHub Actions secret, or a separate always-on worker.
It checks both audio formats for every Heart sentence and reports checked,
missing, generated, and remaining file counts. It skips work when storage is
complete.

Each run is capped at 50 missing sentences (up to 100 audio files). A larger gap
fails before generation and prints the missing counts and the manual command for
an intentional batch. All writers use one expiring App Storage lock, renewed
between batches. The lock lives in the private storage directory, so the daily
run will not overlap an API/Actions sync or a manual generator. A stopped run
preserves completed files and can be retried.

The initial one-time Heart backfill is complete. Review the first scheduled run
to confirm its checked/missing/generated counts. After a lesson or story change
is merged, sync that revision into this Replit project and publish it. Replit
then redeploys the Scheduled Deployment with the updated sentence list for its
next run.

When the GitHub Actions voice-pack check is live and handling new text, disable
this daily deployment to avoid redundant work.

## Manual one-off

For a deliberate catch-up outside the schedule, use a Replit shell:

```sh
pnpm --filter @workspace/api-server run generate-voice-pack -- --voice af_heart
```

That command is a dry run. Add `--apply` to generate and store missing clips.
