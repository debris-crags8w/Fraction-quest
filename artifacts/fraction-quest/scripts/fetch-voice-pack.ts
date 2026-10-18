/* Puts the voice pack inside the iOS app: downloads every indexed sentence's Opus clip (af_heart/<key>.caf) from
   App Storage, through the app's public voice route, into the web build, so `npx cap sync ios` bundles it and the
   app reads aloud at once and offline. Clips are kept in a local cache between builds (each file is named by its
   sentence, so a cached clip never goes stale); only new ones are downloaded. Fails if any clip can't be fetched.

   Usage (after `pnpm run build`): VOICE_PACK_SOURCE_URL=https://<your-app>.replit.app pnpm run fetch-voice-pack
   [build dir, default dist/public] [cache dir, default .voice-pack-cache] */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PACK_VOICES, type VoicePackIndex } from '../src/lib/voice-pack';

const PARALLEL = 16;

/** The clips the app needs (`<voice>/<key>.caf`) and which of them the cache doesn't have yet. */
export function planVoicePackFetch(index: VoicePackIndex, cached: (file: string) => boolean): { wanted: string[]; download: string[] } {
  const wanted = PACK_VOICES.flatMap((voice) => index.keys.map((key) => `${voice}/${key}.caf`));
  return { wanted, download: wanted.filter((file) => !cached(file)) };
}

async function fetchClip(source: string, file: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${source}/api/storage/public-objects/voice/${file}`);
      if (response.ok) {
        const audio = Buffer.from(await response.arrayBuffer());
        if (audio.length > 0) return audio;
      }
      if (response.status === 404 || attempt === 4) throw new Error(`${file}: ${response.status}`);
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt)); // the server may be waking up
  }
}

async function main() {
  const [buildDir = 'dist/public', cacheDir = '.voice-pack-cache'] = process.argv.slice(2);
  const source = (process.env.VOICE_PACK_SOURCE_URL ?? '').replace(/\/+$/, '');
  if (!source) throw new Error('Set VOICE_PACK_SOURCE_URL to the app\'s address, for example https://your-app.replit.app');
  const indexPath = path.join(buildDir, 'voice', 'index.json');
  if (!existsSync(indexPath)) throw new Error(`${indexPath} is missing: run the web build first.`);
  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as VoicePackIndex;

  const { wanted, download } = planVoicePackFetch(index, (file) => existsSync(path.join(cacheDir, file)));
  console.log(`Voice pack: ${wanted.length} clips, ${download.length} to download from ${source}...`);
  const failed: string[] = [];
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, download.length) }, async () => {
    while (next < download.length) {
      const file = download[next++]!;
      try {
        const audio = await fetchClip(source, file);
        const target = path.join(cacheDir, file);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(`${target}.part`, audio); // then move into place: a stopped build never caches half a clip
        renameSync(`${target}.part`, target);
      } catch {
        failed.push(file);
      }
      if (++done % 1000 === 0) console.log(`  ${done} of ${download.length}`);
    }
  }));
  if (failed.length) {
    throw new Error(`${failed.length} clips could not be downloaded (first: ${failed.slice(0, 5).join(', ')}). `
      + 'Run the Voice pack workflow with "rerender" so App Storage has every Opus clip, then build again.');
  }

  // Copy exactly the indexed clips into the build (nothing stale), Opus only: the app never plays the MP3s.
  for (const voice of PACK_VOICES) rmSync(path.join(buildDir, 'voice', voice), { recursive: true, force: true });
  for (const file of wanted) {
    mkdirSync(path.dirname(path.join(buildDir, 'voice', file)), { recursive: true });
    copyFileSync(path.join(cacheDir, file), path.join(buildDir, 'voice', file));
  }
  const bytes = PACK_VOICES.reduce((sum, voice) => sum + readdirSync(path.join(buildDir, 'voice', voice))
    .reduce((total, name) => total + statSync(path.join(buildDir, 'voice', voice, name)).size, 0), 0);
  console.log(`Bundled ${wanted.length} clips (${(bytes / 1048576).toFixed(1)} MB) into ${path.join(buildDir, 'voice')}. Next: npx cap sync ios`);
}

if (process.argv[1]?.endsWith('fetch-voice-pack.ts')) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
