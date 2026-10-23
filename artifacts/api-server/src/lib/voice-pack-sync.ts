import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PACK_VOICES, VOICE_FORMATS, VoicePackSyncInProgressError, type VoicePackStore, type VoicePackSyncLock } from "./voice-pack-store";
import { cleanVoiceText, loadVoiceEngine, type VoiceEngine } from "./voice";
import { renderVoicePack, type PackSentence } from "./voice-pack-render";
import { CAST_VOICES, isCastVoice } from "./cast-voices";

/** Every voice the pack is made in: Heart for every sentence, and each story friend for their own film lines. */
export const RENDER_VOICES: readonly string[] = [...PACK_VOICES, ...CAST_VOICES];
/** The sentences one voice reads: Heart reads every sentence without a voice; a friend reads the lines marked for them. */
export const sentencesFor = (sentences: PackSentence[], voice: string) =>
  sentences.filter((sentence) => (isCastVoice(voice) ? sentence.voice === voice : !sentence.voice));

const BATCH_SIZE = 40;
type PackFile = { voice: string; key: string; format: keyof typeof VOICE_FORMATS };
export type SyncResult = {
  checkedSentences: number;
  checkedFiles: number;
  missingFiles: number;
  missingSentences: number;
  generatedFiles: number;
  generatedSentences: number;
  remainingFiles: number;
  dryRun: boolean;
};

export class VoicePackSyncLimitError extends Error {
  constructor(
    readonly checkedSentences: number,
    readonly checkedFiles: number,
    readonly missingSentences: number,
    readonly missingFiles: number,
    readonly limit: number,
  ) {
    super(`Checked ${checkedSentences} sentences (${checkedFiles} audio files); ${missingFiles} files are missing across ${missingSentences} sentences, above the automatic limit of ${limit}. No audio was generated. For an intentional manual batch, run "pnpm --filter @workspace/api-server run generate-voice-pack -- --apply".`);
    this.name = "VoicePackSyncLimitError";
  }
}

export const DAILY_VOICE_BACKFILL_LIMIT = 100;
/** Same FNV-1a sentence key used by the browser voice index. */
export function voicePackSentenceKey(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(cleanVoiceText(text) ?? "")) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

/** Check the complete lesson/story sentence list; on apply, render and store only files App Storage lacks. */
export async function generateMissingVoicePack(
  store: VoicePackStore,
  sentences: PackSentence[],
  options: { apply?: boolean; engine?: VoiceEngine; log?: (message: string) => void; maxMissingSentences?: number; maxSentencesPerRun?: number; voices?: readonly string[] } = {},
): Promise<SyncResult> {
  const lock = options.apply ? await store.acquireSyncLock?.() : undefined;
  try {
    return await generateMissingVoicePackUnlocked(store, sentences, options, lock);
  } finally {
    await lock?.release();
  }
}

async function generateMissingVoicePackUnlocked(
  store: VoicePackStore,
  sentences: PackSentence[],
  options: { apply?: boolean; engine?: VoiceEngine; log?: (message: string) => void; maxMissingSentences?: number; maxSentencesPerRun?: number; voices?: readonly string[] },
  lock?: VoicePackSyncLock,
): Promise<SyncResult> {
  const log = options.log ?? (() => undefined);
  const voices = options.voices ?? RENDER_VOICES;
  if (voices.length === 0 || voices.some((voice) => !RENDER_VOICES.includes(voice))) {
    throw new Error("Choose at least one configured voice.");
  }
  const stored = new Set((await store.list()).map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const missing: PackFile[] = [];
  for (const voice of voices) {
    for (const sentence of sentencesFor(sentences, voice)) {
      for (const format of Object.keys(VOICE_FORMATS) as PackFile["format"][]) {
        const id = `${voice}/${sentence.key}.${format}`;
        if (!stored.has(id)) missing.push({ voice, key: sentence.key, format });
      }
    }
  }

  const missingSentences = new Set(missing.map(({ voice, key }) => `${voice}/${key}`)).size;
  const checkedSentences = voices.reduce((total, voice) => total + sentencesFor(sentences, voice).length, 0);
  const checkedFiles = checkedSentences * Object.keys(VOICE_FORMATS).length;
  log(`Checked ${checkedSentences} sentences (${checkedFiles} audio files); missing ${missing.length} files across ${missingSentences} sentences.`);
  if (options.maxMissingSentences !== undefined && missingSentences > options.maxMissingSentences) {
    throw new VoicePackSyncLimitError(checkedSentences, checkedFiles, missingSentences, missing.length, options.maxMissingSentences);
  }
  if (!options.apply || missing.length === 0) {
    return {
      checkedSentences,
      checkedFiles,
      missingFiles: missing.length,
      missingSentences,
      generatedFiles: 0,
      generatedSentences: 0,
      remainingFiles: missing.length,
      dryRun: true,
    };
  }

  const engine = options.engine ?? await loadVoiceEngine();
  if (!engine) throw new Error("Kokoro did not load; no voice files were changed.");
  // A capped run renders the first sentences that need audio and leaves the rest for the next run.
  const thisRunKeys = options.maxSentencesPerRun === undefined ? null
    : new Set([...new Set(missing.map(({ voice, key }) => `${voice}/${key}`))].slice(0, options.maxSentencesPerRun));
  const thisRun = thisRunKeys ? missing.filter(({ voice, key }) => thisRunKeys.has(`${voice}/${key}`)) : missing;
  if (thisRun.length < missing.length) log(`This run renders ${thisRunKeys!.size} of ${missingSentences} sentences; the rest wait for the next run.`);
  const missingSet = new Set(thisRun.map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const needsRender = new Set(thisRun.map(({ voice, key }) => `${voice}/${key}`));
  let generatedSentences = 0;
  let generatedFiles = 0;
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fraction-quest-voice-pack-"));
  try {
    for (const voice of voices) {
      const voiceSentences = sentencesFor(sentences, voice).filter((sentence) =>
        needsRender.has(`${voice}/${sentence.key}`),
      );
      for (let start = 0; start < voiceSentences.length; start += BATCH_SIZE) {
        await lock?.renew();
        const batch = voiceSentences.slice(start, start + BATCH_SIZE);
        const requiredFormats = new Map(batch.map((sentence) => [
          sentence.key,
          missing.filter((file) => file.voice === voice && file.key === sentence.key).map(({ format }) => format),
        ]));
        await renderVoicePack(engine, voice, batch, tempRoot, undefined, requiredFormats);
        for (const sentence of batch) {
          for (const format of Object.keys(VOICE_FORMATS) as PackFile["format"][]) {
            const id = `${voice}/${sentence.key}.${format}`;
            if (!missingSet.has(id)) continue;
            const audio = await readFile(path.join(tempRoot, voice, `${sentence.key}.${format}`));
            await store.put({ voice, key: sentence.key, format }, audio);
            stored.add(id);
            generatedFiles++;
          }
          generatedSentences++;
        }
        await rm(path.join(tempRoot, voice), { recursive: true, force: true });
        log(`${voice}: stored ${Math.min(start + batch.length, voiceSentences.length)} of ${voiceSentences.length} sentences needing audio`);
      }
    }
  } catch (error) {
    log(`Sync stopped after storing ${generatedFiles} files for ${generatedSentences} sentences. Completed files remain in App Storage; rerun safely to continue.`);
    throw error;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
  const after = new Set((await store.list()).map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const remainingFiles = thisRun.filter(({ voice, key, format }) => !after.has(`${voice}/${key}.${format}`)).length;
  return {
    checkedSentences,
    checkedFiles,
    missingFiles: missing.length,
    missingSentences,
    generatedFiles,
    generatedSentences,
    remainingFiles,
    dryRun: false,
  };
}

/** Scheduled catch-up: renders at most DAILY_VOICE_BACKFILL_LIMIT sentences per run, so a large gap fills over a few days. */
export async function runDailyVoiceBackfill(
  store: VoicePackStore,
  sentences: PackSentence[],
  options: { log?: (message: string) => void; engine?: VoiceEngine } = {},
): Promise<SyncResult> {
  const log = options.log ?? (() => undefined);
  try {
    const result = await generateMissingVoicePack(store, sentences, {
      apply: true,
      engine: options.engine,
      voices: RENDER_VOICES,
      maxSentencesPerRun: DAILY_VOICE_BACKFILL_LIMIT,
      log,
    });
    if (result.remainingFiles > 0) {
      log(`Daily voice backfill verification failed: ${result.remainingFiles} files remain missing after generation.`);
      throw new Error(`${result.remainingFiles} voice files remain missing after the daily backfill.`);
    }
    const waiting = result.missingFiles - result.generatedFiles;
    log(`Daily voice backfill complete: checked ${result.checkedFiles} files across ${result.checkedSentences} sentences; missing ${result.missingFiles} files across ${result.missingSentences} sentences; generated ${result.generatedFiles} files; ${waiting} files wait for the next run.`);
    return result;
  } catch (error) {
    if (error instanceof VoicePackSyncInProgressError) {
      log("Daily voice backfill could not continue because the shared App Storage lock is busy or was lost; completed files are safe, and the job can be retried.");
    }
    throw error;
  }
}
