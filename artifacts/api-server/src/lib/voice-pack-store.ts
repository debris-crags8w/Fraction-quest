/* The pre-made voice pack in App Storage: `<public prefix>/voice/<voice>/<key>.<format>`, each sentence as Opus in
   a .caf file (Apple browsers, the iPhone app included) and as an MP3 (everyone else). Each file is named by its sentence, so a
   stored file never changes and browsers may keep it for good. */
import type { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";

export const PACK_VOICES = ["af_heart"] as const;
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

const VOICE_SYNC_LOCK_TTL_MS = 2 * 60 * 60 * 1000;
/** App Storage refuses more than about one write per second to one object, so renewals are spaced well apart. */
const VOICE_SYNC_LOCK_RENEW_MS = 60 * 1000;

export class VoicePackSyncInProgressError extends Error {
  constructor(message = "Another voice-pack sync is already running. Retry after it finishes.") {
    super(message);
    this.name = "VoicePackSyncInProgressError";
  }
}

export interface VoicePackSyncLock {
  renew(): Promise<void>;
  release(): Promise<void>;
}

export interface VoicePackStore {
  read(file: VoiceFile): Readable;
  put(file: VoiceFile, audio: Buffer): Promise<void>;
  list(): Promise<VoiceFile[]>;
  remove(file: VoiceFile): Promise<void>;
  /** Optional for in-memory test stores; App Storage provides a shared cross-process lock. */
  acquireSyncLock?(): Promise<VoicePackSyncLock>;
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
  async function acquireSyncLock(): Promise<VoicePackSyncLock> {
    const privateDir = new ObjectStorageService().getPrivateObjectDir();
    const [bucketName, ...privatePrefixParts] = privateDir.replace(/^\/+|\/+$/g, "").split("/");
    if (!bucketName || privatePrefixParts.length === 0) {
      throw new Error("PRIVATE_OBJECT_DIR must include a bucket and private prefix for the voice sync lock.");
    }
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(`${privatePrefixParts.join("/")}/.fraction-quest-voice-sync.lock`);
    const owner = randomUUID();
    let generation = "";
    let renewedAt = 0;

    const writeLock = async (ifGenerationMatch: string | number) => {
      await file.save(JSON.stringify({ owner, expiresAt: Date.now() + VOICE_SYNC_LOCK_TTL_MS }), {
        resumable: false,
        preconditionOpts: { ifGenerationMatch },
        metadata: { contentType: "application/json", cacheControl: "no-store" },
      });
      const [metadata] = await file.getMetadata();
      if (!metadata.generation) throw new Error("App Storage did not return a generation for the voice sync lock.");
      generation = String(metadata.generation);
      renewedAt = Date.now();
    };
    const isPreconditionFailure = (error: unknown) => {
      const code = (error as { code?: unknown } | null)?.code;
      return code === 409 || code === 412;
    };

    try {
      await writeLock(0);
    } catch (error) {
      if (!isPreconditionFailure(error)) throw error;

      const [metadata] = await file.getMetadata();
      const [contents] = await file.download();
      let expiresAt = 0;
      try {
        const parsed = JSON.parse(contents.toString("utf8")) as { expiresAt?: unknown };
        if (typeof parsed.expiresAt === "number") expiresAt = parsed.expiresAt;
      } catch {
        // A malformed lock is only reclaimable after its storage timestamp is stale.
      }
      if (!expiresAt && metadata.updated) {
        const updatedAt = Date.parse(metadata.updated);
        if (Number.isFinite(updatedAt)) expiresAt = updatedAt + VOICE_SYNC_LOCK_TTL_MS;
      }
      if (!expiresAt || expiresAt > Date.now()) throw new VoicePackSyncInProgressError();
      if (!metadata.generation) throw new VoicePackSyncInProgressError();

      try {
        await file.delete({ ignoreNotFound: true, ifGenerationMatch: metadata.generation });
        await writeLock(0);
      } catch (reclaimError) {
        if (isPreconditionFailure(reclaimError)) throw new VoicePackSyncInProgressError();
        throw reclaimError;
      }
    }

    let released = false;
    let renewal: Promise<void> | null = null;
    return {
      renew() {
        if (released) throw new VoicePackSyncInProgressError("The voice-pack sync lock was already released.");
        if (!renewal && Date.now() - renewedAt < VOICE_SYNC_LOCK_RENEW_MS) return Promise.resolve();
        if (!renewal) {
          renewal = (async () => {
            try {
              await writeLock(generation);
            } catch {
              throw new VoicePackSyncInProgressError("The voice-pack sync lock expired or was replaced; stopping safely.");
            }
          })();
        }
        return renewal.finally(() => { renewal = null; });
      },
      async release() {
        if (released) return;
        released = true;
        try {
          await file.delete({ ignoreNotFound: true, ifGenerationMatch: generation });
        } catch (error) {
          if (isPreconditionFailure(error) || (error as { code?: unknown } | null)?.code === 404) return;
          throw error;
        }
      },
    };
  }
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
    acquireSyncLock,
  };
}

export type VoicePackCheck = { sentences: number; missing: string[]; removed: number };

/** Is every indexed sentence stored in every voice and format? With `prune`, and only then, remove files the
    index no longer lists (sentences it dropped, retired voices). */
/** `cast` lists each story friend's film lines, by voice (the index's `cast`); their files are checked and kept too. */
export async function checkVoicePack(store: VoicePackStore, keys: string[], prune = false, cast: Record<string, string[]> = {}): Promise<VoicePackCheck> {
  const stored = await store.list();
  const have = new Set(stored.map(({ voice, key, format }) => `${voice}/${key}.${format}`));
  const formats = Object.keys(VOICE_FORMATS) as VoiceFormat[];
  const wanted = [
    ...keys.flatMap((key) => PACK_VOICES.map((voice) => `${voice}/${key}`)),
    ...Object.entries(cast).flatMap(([voice, castKeys]) => castKeys.map((key) => `${voice}/${key}`)),
  ];
  const missing = wanted.flatMap((name) => formats.map((format) => `${name}.${format}`)).filter((name) => !have.has(name));
  let removed = 0;
  if (prune && missing.length === 0) {
    const listed = new Set(wanted);
    const stale = stored.filter(({ voice, key }) => !listed.has(`${voice}/${key}`));
    for (let i = 0; i < stale.length; i += 12) await Promise.all(stale.slice(i, i + 12).map((file) => store.remove(file)));
    removed = stale.length;
  }
  return { sentences: wanted.length, missing, removed };
}
