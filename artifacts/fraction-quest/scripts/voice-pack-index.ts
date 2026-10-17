/* Finishes the voice pack after rendering: removes audio for sentences the app no longer has, and writes
   public/voice/index.json listing the sentences every pack voice has (the app only uses the pack for those).
   Usage: tsx scripts/voice-pack-index.ts <sentences.json> [voice dir]. */

import { readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PACK_VOICES, type VoicePackIndex } from '../src/lib/voice-pack';

export function buildVoicePackIndex(keys: string[], dir: string): { index: VoicePackIndex; removed: number } {
  const wanted = new Set(keys);
  let removed = 0;
  const have = PACK_VOICES.map((voice) => {
    const voiceDir = path.join(dir, voice);
    const files = existsSync(voiceDir) ? readdirSync(voiceDir) : [];
    const found = new Set<string>();
    for (const file of files) {
      const key = file.replace(/\.mp3$/, '');
      if (file.endsWith('.mp3') && wanted.has(key)) found.add(key);
      else { rmSync(path.join(voiceDir, file)); removed++; }
    }
    return found;
  });
  const complete = keys.filter((key) => have.every((found) => found.has(key))).sort();
  return { index: { version: 1, voices: [...PACK_VOICES], keys: complete }, removed };
}

if (process.argv[1]?.endsWith('voice-pack-index.ts')) {
  const [list, dir = 'public/voice'] = process.argv.slice(2);
  const keys = (JSON.parse(readFileSync(list, 'utf8')) as { key: string }[]).map((entry) => entry.key);
  const { index, removed } = buildVoicePackIndex(keys, dir);
  writeFileSync(path.join(dir, 'index.json'), `${JSON.stringify(index)}\n`);
  console.log(`Voice pack: ${index.keys.length} of ${keys.length} sentences in all voices; ${removed} old files removed.`);
}
