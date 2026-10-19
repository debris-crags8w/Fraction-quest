# Daily voice-pack backfill

The daily job checks the lesson and story sentence list included in its deployed
revision and stores only missing Heart voice clips in App Storage. It is safe to
rerun: existing clips are skipped, and the job does not delete files.

## Replit Scheduled Deployment

The root `.replit` file declares a Scheduled Deployment for this job. It runs
daily at 3:00 a.m. in `America/New_York` and stops after two hours if a run
hangs. Publish the scheduled job in Replit's Publishing tool to activate it;
it is safe to publish while audio gaps remain. Each run fills at most 100
sentences, leaving any remaining gaps for later runs. If Publishing asks for a
build command, use `pnpm install --frozen-lockfile`.

The job uses the same Replit App Storage integration as the API server. It does
not need a public URL, a GitHub Actions secret, or a separate always-on worker.
It checks both audio formats for every Heart sentence and reports checked,
missing, generated, and remaining file counts. It skips work when storage is
complete.

Each run renders at most 100 missing sentences (up to 200 audio files) and leaves
the rest for the next run, so a large lesson change fills over a few days without
anyone stepping in. The log says how many files wait for the next run. All writers use one expiring App Storage lock, renewed
at most once a minute between batches. The lock lives in the private storage directory, so the daily
run will not overlap an API/Actions sync or a manual generator. A stopped run
preserves completed files and can be retried.

Review the first scheduled run to confirm its checked/missing/generated counts. After a lesson or story change
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
