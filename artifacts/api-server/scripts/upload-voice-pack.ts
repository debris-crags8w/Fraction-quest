/**
 * Sends new voice pack audio to the app's server, which stores it in App Storage, then asks the server whether
 * every sentence in the index is stored in every voice. Run by the Voice pack workflow.
 *
 * Usage: tsx scripts/upload-voice-pack.ts <voice-directory> [--check-only] [--prune]
 *   <voice-directory> holds index.json and <voice>/<key>.mp3 files (only the new ones are needed).
 *   --check-only  upload nothing, just check the index against storage
 *   --prune       after a complete check, remove stored files the index no longer lists (only after the merge)
 * Environment: VOICE_PACK_UPLOAD_URL (the app's address), VOICE_PACK_UPLOAD_TOKEN (matches the server's).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const PACK_VOICES = ["af_heart", "am_michael", "bf_emma"];
const PARALLEL = 8;

const [root, ...flags] = process.argv.slice(2);
const base = (process.env.VOICE_PACK_UPLOAD_URL ?? "").replace(/\/+$/, "");
const token = process.env.VOICE_PACK_UPLOAD_TOKEN ?? "";
if (!root || !base || !token) {
  console.error("Usage: VOICE_PACK_UPLOAD_URL=... VOICE_PACK_UPLOAD_TOKEN=... tsx scripts/upload-voice-pack.ts <dir> [--check-only] [--prune]");
  process.exit(2);
}

/** Retries a request a few times: the server may be waking up. */
async function send(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
      if (response.status < 500 || attempt === 4) return response;
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
  }
}

async function upload() {
  const files = PACK_VOICES.flatMap((voice) => {
    const dir = path.join(root!, voice);
    return existsSync(dir) ? readdirSync(dir).filter((name) => /^[0-9a-f]{16}\.mp3$/.test(name)).map((name) => ({ voice, name })) : [];
  });
  console.log(`Uploading ${files.length} audio files to ${base}...`);
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, async () => {
    while (next < files.length) {
      const { voice, name } = files[next++]!;
      const response = await send(`${base}/api/voice-pack/files/${voice}/${name}`, {
        method: "PUT",
        headers: { "content-type": "audio/mpeg" },
        body: readFileSync(path.join(root!, voice, name)),
      });
      if (response.status !== 204) throw new Error(`Upload of ${voice}/${name} failed: ${response.status} ${await response.text()}`);
      if (++done % 500 === 0) console.log(`  ${done} of ${files.length}`);
    }
  }));
}

async function check(prune: boolean) {
  const response = await send(`${base}/api/voice-pack/check${prune ? "?prune=1" : ""}`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: readFileSync(path.join(root!, "index.json"), "utf8"),
  });
  if (!response.ok) throw new Error(`The check failed: ${response.status} ${await response.text()}`);
  const result = await response.json() as { sentences: number; missing: number; firstMissing: string[]; removed: number };
  if (result.missing) {
    throw new Error(`App Storage is missing ${result.missing} indexed audio files (first: ${result.firstMissing.join(", ")}).`);
  }
  console.log(`App Storage has all ${result.sentences} sentences in every voice${prune ? `; removed ${result.removed} unused files` : ""}.`);
}

try {
  if (!flags.includes("--check-only")) await upload();
  await check(flags.includes("--prune"));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
