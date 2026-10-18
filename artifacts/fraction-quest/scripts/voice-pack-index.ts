/* Finishes the voice pack after rendering: removes audio for sentences the app no longer has, and writes
   public/voice/index.json listing the sentences every pack voice has in every format: MP3 for the website and
   Opus (.caf) for the iOS app (the app only uses the pack for those).
   Usage: tsx scripts/voice-pack-index.ts <sentences.json> [voice dir]. */

import { readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PACK_FORMATS, PACK_VOICES, type VoicePackIndex } from '../src/lib/voice-pack';

/** The sentence keys that have every format in one voice's folder. */
function completeKeys(files: string[]): Set<string> {
  const byKey = new Map<string, Set<string>>();
  for (const file of files) {
    const match = /^(.+)\.(mp3|caf)$/.exec(file);
    if (match) byKey.set(match[1]!, (byKey.get(match[1]!) ?? new Set()).add(match[2]!));
  }
  return new Set([...byKey].filter(([, formats]) => PACK_FORMATS.every((format) => formats.has(format))).map(([key]) => key));
}

export function buildVoicePackIndex(keys: string[], dir: string): { index: VoicePackIndex; removed: number } {
  const wanted = new Set(keys);
  let removed = 0;
  const have = PACK_VOICES.map((voice) => {
    const voiceDir = path.join(dir, voice);
    const files = existsSync(voiceDir) ? readdirSync(voiceDir) : [];
    for (const file of files) {
      const match = /^(.+)\.(mp3|caf)$/.exec(file);
      if (!match || !wanted.has(match[1]!)) { rmSync(path.join(voiceDir, file)); removed++; }
    }
    return completeKeys(existsSync(voiceDir) ? readdirSync(voiceDir) : []);
  });
  const complete = keys.filter((key) => have.every((found) => found.has(key))).sort();
  return { index: { version: 1, voices: [...PACK_VOICES], keys: complete }, removed };
}

/** Builds the next index when existing audio is already in App Storage and only new files are local. */
export function buildNextVoicePackIndex(
  keys: string[],
  dir: string,
  previous: VoicePackIndex,
): { index: VoicePackIndex; added: number; removed: number } {
  const wanted = new Set(keys);
  const previousKeys = new Set(previous.keys);
  const addedKeys = [...wanted].filter((key) => !previousKeys.has(key));
  const renderedByVoice = PACK_VOICES.map((voice) => {
    const voiceDir = path.join(dir, voice);
    const files = existsSync(voiceDir) ? readdirSync(voiceDir) : [];
    return completeKeys(files);
  });
  const missing = addedKeys.filter((key) => !renderedByVoice.every((rendered) => rendered.has(key)));
  if (missing.length) {
    throw new Error(`Cannot publish voice index: ${missing.length} new sentences are missing one or more voice files.`);
  }

  return {
    index: { version: 1, voices: [...PACK_VOICES], keys: [...wanted].sort() },
    added: addedKeys.length,
    removed: [...previousKeys].filter((key) => !wanted.has(key)).length,
  };
}

if (process.argv[1]?.endsWith('voice-pack-index.ts')) {
  const [list, dir = 'public/voice', previousIndexPath] = process.argv.slice(2);
  const keys = (JSON.parse(readFileSync(list, 'utf8')) as { key: string }[]).map((entry) => entry.key);
  let index: VoicePackIndex;
  let added = 0;
  let removed: number;
  if (previousIndexPath) {
    const previous = existsSync(previousIndexPath)
      ? JSON.parse(readFileSync(previousIndexPath, 'utf8')) as VoicePackIndex
      : { version: 1 as const, voices: [...PACK_VOICES], keys: [] };
    ({ index, added, removed } = buildNextVoicePackIndex(keys, dir, previous));
  } else {
    ({ index, removed } = buildVoicePackIndex(keys, dir));
  }
  writeFileSync(path.join(dir, 'index.json'), `${JSON.stringify(index)}\n`);
  console.log(`Voice pack index: ${index.keys.length} sentences; ${added} new, ${removed} removed.`);
}
