/**
 * Talks to the app's server, which owns App Storage, for the Voice pack workflow.
 *
 *   tsx scripts/upload-voice-pack.ts missing <index.json> <out.json>
 *       Writes the sentence keys that lack an MP3 or Opus file in App Storage (what the workflow must make).
 *   tsx scripts/upload-voice-pack.ts upload <voice-directory>
 *       Uploads every <voice>/<key>.mp3 and <key>.caf in the directory.
 *   tsx scripts/upload-voice-pack.ts check <index.json> [--prune]
 *       Fails unless every sentence in the index is stored in every voice and format. With --prune (only after a
 *       deploy), it also removes stored files the index no longer lists.
 *   tsx scripts/upload-voice-pack.ts sync <sentences.json> <index.json>
 *       Asks Replit to render and store only missing files (up to 10 missing sentence keys) then verifies the index.
 *
 * Environment: VOICE_PACK_UPLOAD_URL (the app's address), VOICE_PACK_UPLOAD_TOKEN (matches the server's).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Heart and the story cast (src/lib/cast-voices.ts): every voice a clip may be uploaded in.
const PACK_VOICES = ["af_heart", "bm_george", "am_onyx", "am_puck", "bf_emma", "am_echo", "af_nova"];
const PARALLEL = 8;

const [command, target, ...rest] = process.argv.slice(2);
const base = (process.env.VOICE_PACK_UPLOAD_URL ?? "").replace(/\/+$/, "");
const token = process.env.VOICE_PACK_UPLOAD_TOKEN ?? "";
if (!["missing", "upload", "check", "sync"].includes(command ?? "") || !target || !base || !token) {
  console.error("Usage: VOICE_PACK_UPLOAD_URL=... VOICE_PACK_UPLOAD_TOKEN=... tsx scripts/upload-voice-pack.ts missing|upload|check|sync <path> ...");
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

type CheckResult = { sentences: number; missing: number; firstMissing: string[]; removed: number; missingKeys?: string[] };

async function check(indexFile: string, query: string): Promise<CheckResult> {
  const response = await send(`${base}/api/voice-pack/check${query}`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: readFileSync(indexFile, "utf8"),
  });
  if (!response.ok) throw new Error(`The check failed: ${response.status} ${await response.text()}`);
  return await response.json() as CheckResult;
}

async function upload(root: string) {
  const files = PACK_VOICES.flatMap((voice) => {
    const dir = path.join(root, voice);
    return existsSync(dir) ? readdirSync(dir).filter((name) => /^[0-9a-f]{16}\.(mp3|caf)$/.test(name)).map((name) => ({ voice, name })) : [];
  });
  console.log(`Uploading ${files.length} audio files to ${base}...`);
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, async () => {
    while (next < files.length) {
      const { voice, name } = files[next++]!;
      const response = await send(`${base}/api/voice-pack/files/${voice}/${name}`, {
        method: "PUT",
        headers: { "content-type": name.endsWith(".caf") ? "audio/x-caf" : "audio/mpeg" },
        body: readFileSync(path.join(root, voice, name)),
      });
      if (response.status !== 204) throw new Error(`Upload of ${voice}/${name} failed: ${response.status} ${await response.text()}`);
      if (++done % 500 === 0) console.log(`  ${done} of ${files.length}`);
    }
  }));
}

try {
  if (command === "missing") {
    const result = await check(target!, "?list=1");
    writeFileSync(rest[0] ?? "missing.json", JSON.stringify(result.missingKeys ?? []));
    console.log(`${result.sentences} sentences; ${result.missingKeys?.length ?? 0} lack audio in App Storage.`);
  } else if (command === "upload") {
    await upload(target!);
  } else if (command === "sync") {
    const sentenceList = JSON.parse(readFileSync(target!, "utf8")) as unknown;
    if (!Array.isArray(sentenceList)) throw new Error("The sentence file must contain an array.");
    let response: Response | undefined;
    for (let attempt = 1; attempt <= 30; attempt++) {
      response = await send(`${base}/api/voice-pack/sync`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ sentences: sentenceList }),
      });
      if (response.status !== 409) break;
      const detail = await response.text();
      if (!detail.includes("already running")) throw new Error(`Replit sync failed: 409 ${detail}`);
      if (attempt === 30) throw new Error("Another Replit voice sync is still running after five minutes.");
      console.log("Another Replit voice sync is running; retrying in 10 seconds.");
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    if (!response?.ok) throw new Error(`Replit sync failed: ${response?.status} ${await response?.text()}`);
    const result = await response.json() as { sentences: number; generatedFiles: number; generatedSentences: number; remainingFiles: number };
    if (result.remainingFiles !== 0) throw new Error(`${result.remainingFiles} audio files remain missing.`);
    const final = await check(rest[0]!, "");
    if (final.missing) throw new Error(`Verification failed: ${final.missing} audio files are still missing.`);
    console.log(`Replit stored ${result.generatedFiles} missing files; all ${final.sentences} sentences now have audio.`);
  } else {
    const prune = rest.includes("--prune");
    const result = await check(target!, prune ? "?prune=1" : "");
    if (result.missing) {
      throw new Error(`App Storage is missing ${result.missing} audio files (first: ${result.firstMissing.join(", ")}).`);
    }
    console.log(`App Storage has all ${result.sentences} sentences in every voice and format${prune ? `; removed ${result.removed} unused files` : ""}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
