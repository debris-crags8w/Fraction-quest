/* The pre-made voice pack in App Storage: `<public prefix>/voice/<voice>/<key>.<format>`, each sentence as Opus in
   a .caf file (Apple browsers, the iPhone app included) and as an MP3 (everyone else). Each file is named by its sentence, so a
   stored file never changes and browsers may keep it for good. */
import type { Readable } from "node:stream";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";

export const PACK_VOICES = ["af_heart", "am_michael"] as const;
export type PackVoice = (typeof PACK_VOICES)[number];
export const VOICE_KEY = /^[0-9a-f]{16}$/;
export const VOICE_CACHE_CONTROL = "public, max-age=31536000, immutable";
/** Every sentence is stored in each format, by file extension, with its content type. */
export const VOICE_FORMATS = { mp3: "audio/mpeg", caf: "audio/x-caf" } as const;
export type VoiceFormat = keyof typeof VOICE_FORMATS;

export const isPackVoice = (voice: string): voice is PackVoice => (PACK_VOICES as readonly string[]).includes(voice);

/** `<key>.<format>` for a pack file name, or null. */
export function parseVoiceFileName(fileName: string): { key: string; format: VoiceFormat } | null {
  const match = /^([0-9a-f]{16})\.(mp3|caf)$/.exec(fileName);
  return match ? { key: match[1]!, format: match[2] as VoiceFormat } : null;
}

export type VoiceFile = { voice: string; key: string; format: VoiceFormat };

export interface VoicePackStore {
  read(file: VoiceFile): Readable;
  put(file: VoiceFile, audio: Buffer): Promise<void>;
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
  const object = ({ voice, key, format }: VoiceFile) => { const { bucket, prefix } = root(); return bucket.file(`${prefix}/${voice}/${key}.${format}`); };
  return {
    read: (file) => object(file).createReadStream(),
    async put(file, audio) {
      await object(file).save(audio, { resumable: false, metadata: { contentType: VOICE_FORMATS[file.format], cacheControl: VOICE_CACHE_CONTROL } });
    },
    async list() {
      const { bucket, prefix } = root();
      const [files] = await bucket.getFiles({ prefix: `${prefix}/` });
      return files.flatMap((stored) => {
        const [voice, fileName, ...rest] = stored.name.slice(prefix.length + 1).split("/");
        const parsed = voice && fileName && !rest.length ? parseVoiceFileName(fileName) : null;
        return parsed ? [{ voice, ...parsed }] : [];
      });
    },
    async remove(file) { await object(file).delete({ ignoreNotFound: true }); },
  };
}

export type VoicePackCheck = { sentences: number; missing: string[]; removed: number };

/** Is every indexed sentence stored in every voice and format? With `prune`, and only then, remove files the
    index no longer lists (sentences it dropped, retired voices). */
export async function checkVoicePack(store: VoicePackStore, keys: string[], prune = false): Promise<VoicePackCheck> {
  const stored = await store.list();
  const have = new Set(stored.map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const formats = Object.keys(VOICE_FORMATS) as VoiceFormat[];
  const missing = keys.flatMap((key) => PACK_VOICES.flatMap((voice) => formats.map((format) => `${voice}/${key}.${format}`)))
    .filter((name) => !have.has(name));
  let removed = 0;
  if (prune && missing.length === 0) {
    const listed = new Set(keys);
    const stale = stored.filter(({ voice, key }) => !isPackVoice(voice) || !listed.has(key));
    for (let i = 0; i < stale.length; i += 12) await Promise.all(stale.slice(i, i + 12).map((file) => store.remove(file)));
    removed = stale.length;
  }
  return { sentences: keys.length, missing, removed };
}
