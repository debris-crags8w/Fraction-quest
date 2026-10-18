import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PACK_VOICES, VOICE_FORMATS, type PackVoice, type VoicePackStore } from "./voice-pack-store";
import { cleanVoiceText, loadVoiceEngine, type VoiceEngine } from "./voice";
import { renderVoicePack, type PackSentence } from "./voice-pack-render";

const BATCH_SIZE = 40;
type PackFile = { voice: string; key: string; format: keyof typeof VOICE_FORMATS };
type SyncResult = { missingFiles: number; generatedSentences: number; remainingFiles: number; dryRun: boolean };

export class VoicePackSyncLimitError extends Error {
  constructor(readonly missingSentences: number, readonly limit: number) {
    super(`Found ${missingSentences} sentences missing audio; automatic PR sync is limited to ${limit}. In Replit, run "pnpm --filter @workspace/api-server run generate-voice-pack -- --apply" to backfill App Storage, then retry.`);
    this.name = "VoicePackSyncLimitError";
  }
}

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
  options: { apply?: boolean; engine?: VoiceEngine; log?: (message: string) => void; maxMissingSentences?: number; voices?: readonly PackVoice[] } = {},
): Promise<SyncResult> {
  const log = options.log ?? (() => undefined);
  const voices = options.voices ?? PACK_VOICES;
  if (voices.length === 0 || voices.some((voice) => !PACK_VOICES.includes(voice))) {
    throw new Error("Choose at least one configured voice.");
  }
  const stored = new Set((await store.list()).map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const missing: PackFile[] = [];
  for (const sentence of sentences) {
    for (const voice of voices) {
      for (const format of Object.keys(VOICE_FORMATS) as PackFile["format"][]) {
        const id = `${voice}/${sentence.key}.${format}`;
        if (!stored.has(id)) missing.push({ voice, key: sentence.key, format });
      }
    }
  }

  const missingSentences = new Set(missing.map(({ key }) => key)).size;
  if (options.maxMissingSentences !== undefined && missingSentences > options.maxMissingSentences) {
    throw new VoicePackSyncLimitError(missingSentences, options.maxMissingSentences);
  }
  if (!options.apply || missing.length === 0) {
    return { missingFiles: missing.length, generatedSentences: 0, remainingFiles: missing.length, dryRun: true };
  }

  const engine = options.engine ?? await loadVoiceEngine();
  if (!engine) throw new Error("Kokoro did not load; no voice files were changed.");
  const missingSet = new Set(missing.map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const needsRender = new Set(missing.map(({ voice, key }) => `${voice}/${key}`));
  let generatedSentences = 0;
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fraction-quest-voice-pack-"));
  try {
    for (const voice of voices) {
      const voiceSentences = sentences.filter((sentence) =>
        needsRender.has(`${voice}/${sentence.key}`),
      );
      for (let start = 0; start < voiceSentences.length; start += BATCH_SIZE) {
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
          }
          generatedSentences++;
        }
        await rm(path.join(tempRoot, voice), { recursive: true, force: true });
        log(`${voice}: stored ${Math.min(start + batch.length, voiceSentences.length)} of ${voiceSentences.length} sentences needing audio`);
      }
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
  const after = new Set((await store.list()).map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const remainingFiles = missing.filter(({ voice, key, format }) => !after.has(`${voice}/${key}.${format}`)).length;
  return { missingFiles: missing.length, generatedSentences, remainingFiles, dryRun: false };
}
