/* The pre-made voice pack in App Storage: `<public prefix>/voice/<voice>/<key>.mp3`. Each file is named by its
   sentence, so a stored file never changes and browsers may keep it for good. */
import type { Readable } from "node:stream";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";

export const PACK_VOICES = ["af_heart"] as const;
export type PackVoice = (typeof PACK_VOICES)[number];
export const VOICE_KEY = /^[0-9a-f]{16}$/;
export const VOICE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const isPackVoice = (voice: string): voice is PackVoice => (PACK_VOICES as readonly string[]).includes(voice);

export type VoiceFile = { voice: string; key: string };

export interface VoicePackStore {
  read(voice: PackVoice, key: string): Readable;
  put(voice: PackVoice, key: string, audio: Buffer): Promise<void>;
  list(): Promise<VoiceFile[]>;
  remove(file: VoiceFile): Promise<void>;
}

/** App Storage, through the first public search path (bucket plus public prefix). */
export function appStorageVoicePack(): VoicePackStore {
  const root = () => {
    const [searchPath] = new ObjectStorageService().getPublicObjectSearchPaths();
    const [bucketName, ...prefixParts] = searchPath!.replace(/^\/+|\/+$/g, "").split("/");
    if (!bucketName || prefixParts.length === 0) throw new Error("PUBLIC_OBJECT_SEARCH_PATHS must include a bucket and public prefix.");
    return { bucket: objectStorageClient.bucket(bucketName), prefix: `${prefixParts.join("/")}/voice` };
  };
  const file = ({ voice, key }: VoiceFile) => { const { bucket, prefix } = root(); return bucket.file(`${prefix}/${voice}/${key}.mp3`); };
  return {
    read: (voice, key) => file({ voice, key }).createReadStream(),
    async put(voice, key, audio) {
      await file({ voice, key }).save(audio, { resumable: false, metadata: { contentType: "audio/mpeg", cacheControl: VOICE_CACHE_CONTROL } });
    },
    async list() {
      const { bucket, prefix } = root();
      const [files] = await bucket.getFiles({ prefix: `${prefix}/` });
      return files.flatMap((stored) => {
        const match = /^([^/]+)\/([0-9a-f]{16})\.mp3$/.exec(stored.name.slice(prefix.length + 1));
        return match ? [{ voice: match[1]!, key: match[2]! }] : [];
      });
    },
    async remove(stored) { await file(stored).delete({ ignoreNotFound: true }); },
  };
}

export type VoicePackCheck = { sentences: number; missing: string[]; removed: number };

/** Is every indexed sentence stored in every voice? With `prune`, and only then, remove files the index no longer lists. */
export async function checkVoicePack(store: VoicePackStore, keys: string[], prune = false): Promise<VoicePackCheck> {
  const stored = await store.list();
  const have = new Set(stored.map(({ voice, key }) => `${voice}/${key}`));
  const missing = keys.flatMap((key) => PACK_VOICES.filter((voice) => !have.has(`${voice}/${key}`)).map((voice) => `${voice}/${key}.mp3`));
  let removed = 0;
  if (prune && missing.length === 0) {
    const listed = new Set(keys);
    const stale = stored.filter(({ voice, key }) => !isPackVoice(voice) || !listed.has(key));
    for (let i = 0; i < stale.length; i += 12) await Promise.all(stale.slice(i, i + 12).map((file) => store.remove(file)));
    removed = stale.length;
  }
  return { sentences: keys.length, missing, removed };
}
