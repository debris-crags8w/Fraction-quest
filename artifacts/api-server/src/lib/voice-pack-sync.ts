import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PACK_VOICES, VOICE_FORMATS, type VoicePackStore } from "./voice-pack-store";
import { loadVoiceEngine, type VoiceEngine } from "./voice";
import { renderVoicePack, type PackSentence } from "./voice-pack-render";

const BATCH_SIZE = 40;
type PackFile = { voice: string; key: string; format: keyof typeof VOICE_FORMATS };
type SyncResult = { missingFiles: number; generatedSentences: number; dryRun: boolean };

/** Check the complete lesson/story sentence list; on apply, render and store only files App Storage lacks. */
export async function generateMissingVoicePack(
  store: VoicePackStore,
  sentences: PackSentence[],
  options: { apply?: boolean; engine?: VoiceEngine; log?: (message: string) => void } = {},
): Promise<SyncResult> {
  const log = options.log ?? (() => undefined);
  const stored = new Set((await store.list()).map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const missing: PackFile[] = [];
  for (const sentence of sentences) {
    for (const voice of PACK_VOICES) {
      for (const format of Object.keys(VOICE_FORMATS) as PackFile["format"][]) {
        const id = `${voice}/${sentence.key}.${format}`;
        if (!stored.has(id)) missing.push({ voice, key: sentence.key, format });
      }
    }
  }

  if (!options.apply || missing.length === 0) {
    return { missingFiles: missing.length, generatedSentences: 0, dryRun: true };
  }

  const engine = options.engine ?? await loadVoiceEngine();
  if (!engine) throw new Error("Kokoro did not load; no voice files were changed.");
  const missingSet = new Set(missing.map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const needsRender = new Set(missing.map(({ voice, key }) => `${voice}/${key}`));
  let generatedSentences = 0;
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fraction-quest-voice-pack-"));
  try {
    for (const voice of PACK_VOICES) {
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
  return { missingFiles: missing.length, generatedSentences, dryRun: false };
}
