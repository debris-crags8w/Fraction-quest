# Daily voice-pack backfill

The bounded backfill checks the lesson and story sentence list in the current
Replit workspace and stores only missing Heart voice clips in App Storage. It is
safe to rerun: existing clips are skipped, and the job does not delete files.

## Replit Routine

The daily Routine is managed in Replit's Routines interface, not in this
repository or the `.replit` deployment settings. It runs at 3:00 a.m. in
`America/New_York` and invokes:

```sh
pnpm --filter @workspace/api-server run daily-voice-backfill
```

The Routine does not publish the website. It runs against the current Replit
workspace, so sync the latest merged lesson and story text into the workspace
before the Routine needs to include it.

The command uses the same Replit App Storage integration as the API server. It
does not need a public URL, a GitHub Actions secret, or an always-on worker. It
checks both audio formats for every Heart sentence and reports checked, missing,
generated, and remaining counts. It skips generation when storage is complete.

Each run renders at most 100 missing sentences (up to 200 audio files) and leaves
the rest for a later run. All writers use one expiring App Storage lock, renewed
at most once a minute between batches. A stopped run preserves completed files
and can be retried. The Routine instruction should not delete or prune stored
audio and should report errors rather than retrying repeatedly.

The GitHub voice-pack workflow runs on pull requests, relevant pushes to `main`,
and manual dispatch; it is not a daily cron. Once that workflow is reliably
checking and filling missing audio for new text, disable the Routine to avoid
redundant work.

## Manual one-off

For a deliberate dry run in a Replit shell:

```sh
pnpm --filter @workspace/api-server run generate-voice-pack -- --voice af_heart
```

Add `--apply` to generate and store missing clips.
