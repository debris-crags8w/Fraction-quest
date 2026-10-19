/**
 * Uploads a complete pack or an incremental workflow artifact to App Storage.
 * The index in the supplied directory is the source of truth; after uploads are
 * verified, unreferenced voice files are removed from the storage prefix.
 *
 * Usage: pnpm --filter @workspace/api-server run sync-voice-pack -- <voice-artifact-directory>
 */
import { createReadStream, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { objectStorageClient, ObjectStorageService } from "../src/lib/objectStorage";
import { appStorageVoicePack, VOICE_CACHE_CONTROL } from "../src/lib/voice-pack-store";

const PACK_VOICES = ["af_heart"] as const;
const KEY_PATTERN = /^[0-9a-f]{16}$/;
const MAX_PARALLEL_UPLOADS = 12;
const storage = new ObjectStorageService();

type VoicePackIndex = {
  version: 1;
  voices: string[];
  keys: string[];
};

type Upload = { voice: (typeof PACK_VOICES)[number]; key: string; localPath: string };

function readIndex(root: string): VoicePackIndex {
  const indexPath = path.join(root, "index.json");
  if (!existsSync(indexPath)) throw new Error(`No index.json found in ${root}`);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as Partial<VoicePackIndex>;
  if (
    index.version !== 1 ||
    !Array.isArray(index.voices) ||
    !PACK_VOICES.every((voice) => index.voices?.includes(voice)) ||
    !Array.isArray(index.keys) ||
    index.keys.some((key) => typeof key !== "string" || !KEY_PATTERN.test(key)) ||
    new Set(index.keys).size !== index.keys.length
  ) {
    throw new Error("The voice pack index is invalid or does not include all supported voices.");
  }
  return index as VoicePackIndex;
}

function parsePublicRoot(searchPath: string): { bucketName: string; prefix: string } {
  const [bucketName, ...prefixParts] = searchPath.replace(/^\/+|\/+$/g, "").split("/");
  if (!bucketName || prefixParts.length === 0) {
    throw new Error("PUBLIC_OBJECT_SEARCH_PATHS must include a bucket and public prefix.");
  }
  return { bucketName, prefix: prefixParts.join("/") };
}

function collectUploads(root: string, index: VoicePackIndex): Upload[] {
  const indexedKeys = new Set(index.keys);
  const uploads: Upload[] = [];
  for (const voice of PACK_VOICES) {
    const voiceDir = path.join(root, voice);
    if (!existsSync(voiceDir)) continue;
    for (const fileName of readdirSync(voiceDir)) {
      const key = fileName.endsWith(".mp3") ? fileName.slice(0, -4) : "";
      if (!KEY_PATTERN.test(key) || !indexedKeys.has(key)) {
        throw new Error(`Unexpected file in voice artifact: ${voice}/${fileName}`);
      }
      uploads.push({ voice, key, localPath: path.join(voiceDir, fileName) });
    }
  }
  return uploads;
}

async function runLimited<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await work(item);
    }
  });
  await Promise.all(workers);
}

function parseStoredVoiceFile(name: string, prefix: string): { voice: string; key: string } | null {
  const relative = name.startsWith(`${prefix}/`) ? name.slice(prefix.length + 1) : name;
  const match = /^voice\/([^/]+)\/([0-9a-f]{16})\.mp3$/.exec(relative);
  return match ? { voice: match[1], key: match[2] } : null;
}

async function syncVoicePack(root: string): Promise<void> {
  const lock = await appStorageVoicePack().acquireSyncLock?.();
  if (!lock) throw new Error("App Storage does not support a shared voice sync lock.");
  try {
    await syncVoicePackUnlocked(root, lock);
  } finally {
    await lock.release();
  }
}

async function syncVoicePackUnlocked(root: string, lock: { renew(): Promise<void> }): Promise<void> {
  const index = readIndex(root);
  const uploads = collectUploads(root, index);
  const searchPaths = storage.getPublicObjectSearchPaths();
  const { bucketName, prefix } = parsePublicRoot(searchPaths[0]);
  const bucket = objectStorageClient.bucket(bucketName);

  console.log(`Uploading ${uploads.length} audio files to App Storage...`);
  await runLimited(uploads, MAX_PARALLEL_UPLOADS, async ({ voice, key, localPath }) => {
    await lock.renew();
    const objectName = `${prefix}/voice/${voice}/${key}.mp3`;
    const file = bucket.file(objectName);
    await pipeline(
      createReadStream(localPath),
      file.createWriteStream({
        resumable: false,
        metadata: {
          contentType: "audio/mpeg",
          cacheControl: VOICE_CACHE_CONTROL,
        },
      }),
    );
  });

  const [storedFiles] = await bucket.getFiles({ prefix: `${prefix}/voice/` });
  const storedKeysByVoice = new Map<string, Set<string>>();
  const staleFiles = [];
  const indexedKeys = new Set(index.keys);
  for (const file of storedFiles) {
    const parsed = parseStoredVoiceFile(file.name, prefix);
    if (!parsed) continue;
    if (!PACK_VOICES.includes(parsed.voice as (typeof PACK_VOICES)[number]) || !indexedKeys.has(parsed.key)) {
      staleFiles.push(file);
      continue;
    }
    const keys = storedKeysByVoice.get(parsed.voice) ?? new Set<string>();
    keys.add(parsed.key);
    storedKeysByVoice.set(parsed.voice, keys);
  }

  const missing = index.keys.flatMap((key) =>
    PACK_VOICES.filter((voice) => !storedKeysByVoice.get(voice)?.has(key)).map((voice) => `${voice}/${key}.mp3`),
  );
  if (missing.length) {
    throw new Error(
      `App Storage is missing ${missing.length} indexed audio files; stale objects were left untouched. ` +
        `First missing: ${missing[0]}`,
    );
  }

  if (!process.argv.includes("--prune")) {
    console.log(`Verified ${index.keys.length} sentences in all ${PACK_VOICES.length} voices. Stale audio retained; use --prune only after deploying the new index.`);
    return;
  }
  console.log(`Verified ${index.keys.length} sentences in all ${PACK_VOICES.length} voices; removing ${staleFiles.length} stale files...`);
  await runLimited(staleFiles, MAX_PARALLEL_UPLOADS, async (file) => {
    await lock.renew();
    await file.delete();
  });
  console.log("Voice pack sync complete.");
}

const argumentsAfterScript = process.argv.slice(2);
const rootArgument = argumentsAfterScript[0] === "--" ? argumentsAfterScript[1] : argumentsAfterScript[0];
if (!rootArgument) {
  throw new Error("Usage: sync-voice-pack.ts <voice-artifact-directory>");
}

syncVoicePack(path.resolve(process.env.INIT_CWD ?? process.cwd(), rootArgument)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
