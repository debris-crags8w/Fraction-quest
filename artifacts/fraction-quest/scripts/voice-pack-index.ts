/* Writes public/voice/index.json, the list of sentences the app plays from the voice pack: every sentence the app
   can read aloud (scripts/voice-sentences.ts), by key. It is made from the app's own text at build time, never
   committed, so it always matches the code. The Voice pack check on every pull request makes sure App Storage has
   each sentence's audio before the text can merge; a sentence still missing it falls back to the voice server.
   Usage: tsx scripts/voice-pack-index.ts [out file, default public/voice/index.json] */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PACK_VOICES, type VoicePackIndex } from '../src/lib/voice-pack';
import { voiceSentences } from './voice-sentences';

/** Heart's keys, plus each story friend's film lines by voice (`cast`). */
export function buildVoicePackIndex(sentences: { key: string; voice?: string }[]): VoicePackIndex {
  const sorted = (list: { key: string }[]) => [...new Set(list.map((sentence) => sentence.key))].sort();
  const cast: Record<string, string[]> = {};
  for (const voice of [...new Set(sentences.flatMap((sentence) => (sentence.voice ? [sentence.voice] : [])))].sort()) {
    cast[voice] = sorted(sentences.filter((sentence) => sentence.voice === voice));
  }
  return { version: 1, voices: [...PACK_VOICES], keys: sorted(sentences.filter((sentence) => !sentence.voice)), ...(Object.keys(cast).length ? { cast } : {}) };
}

if (process.argv[1]?.endsWith('voice-pack-index.ts')) {
  const out = process.argv[2] ?? 'public/voice/index.json';
  const index = buildVoicePackIndex(voiceSentences());
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(index)}\n`);
  console.log(`Voice pack index: ${index.keys.length} sentences, ${Object.values(index.cast ?? {}).reduce((total, keys) => total + keys.length, 0)} story friend lines.`);
}
