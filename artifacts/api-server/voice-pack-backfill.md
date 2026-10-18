# Daily voice-pack backfill

The daily job checks the current lesson and story sentence list and stores only
missing Heart voice clips in App Storage. It is safe to rerun: existing clips
are skipped, and the job does not delete files.

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
The run log reports how many missing clips were stored. Replit alerts if a
scheduled run fails.

Do not enable the schedule while a bulk backfill is already running. The
scheduled job is intended for small daily additions after the initial pack is
populated. Review its run log after the first scheduled execution.

When the GitHub Actions voice-pack check is live and handling new text, disable
this daily deployment to avoid redundant work.

## Manual one-off

For a deliberate catch-up outside the schedule, use a Replit shell:

```sh
pnpm --filter @workspace/api-server run generate-voice-pack -- --voice af_heart
```

That command is a dry run. Add `--apply` to generate and store missing clips.
