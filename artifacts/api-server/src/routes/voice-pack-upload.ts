import { timingSafeEqual } from "node:crypto";
import express, { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { createRateLimiter } from "../lib/rate-limit";
import { appStorageVoicePack, checkVoicePack, isPackVoice, parseVoiceFileName, VoicePackSyncInProgressError, VOICE_FORMATS, VOICE_KEY, type VoicePackStore } from "../lib/voice-pack-store";
import { cleanVoiceText } from "../lib/voice";
import { generateMissingVoicePack, VoicePackSyncLimitError, voicePackSentenceKey } from "../lib/voice-pack-sync";
import type { PackSentence } from "../lib/voice-pack-render";

/* The Voice pack workflow sends the current sentence manifest here. Replit checks and writes audio directly to App
   Storage; GitHub Actions never renders or uploads clips. The authenticated routes are off (404) until the token is set. */
const failures = createRateLimiter({ max: 10, windowMs: 15 * 60_000 });

function requireUploadToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.VOICE_PACK_UPLOAD_TOKEN ?? "";
  if (expected.length < 32) { res.status(404).json({ error: "Not found." }); return; }
  const ip = req.ip ?? "unknown";
  if (failures.isLimited(ip)) { res.status(429).json({ error: "Too many attempts. Try again later." }); return; }
  const header = req.get("authorization") ?? "";
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    failures.hit(ip);
    res.status(401).json({ error: "Not allowed." });
    return;
  }
  next();
}

export function createVoicePackUploadRouter(
  store: () => VoicePackStore = appStorageVoicePack,
  sync: typeof generateMissingVoicePack = generateMissingVoicePack,
): IRouter {
  const router: IRouter = Router();
  let syncRunning = false;
  const PR_SYNC_SENTENCE_LIMIT = 10;

  // Kept for controlled one-off uploads; the PR workflow uses /sync instead.
  router.put("/voice-pack/files/:voice/:fileName", requireUploadToken, express.raw({ type: Object.values(VOICE_FORMATS), limit: "2mb" }), async (req, res) => {
    const { voice, fileName } = req.params as { voice: string; fileName: string };
    const parsed = parseVoiceFileName(fileName);
    if (!isPackVoice(voice) || !parsed) { res.status(400).json({ error: "Not a voice pack file name." }); return; }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.get("content-type") !== VOICE_FORMATS[parsed.format]) {
      res.status(400).json({ error: `Send the clip as ${VOICE_FORMATS[parsed.format]}.` });
      return;
    }
    await store().put({ voice, ...parsed }, req.body);
    res.status(204).end();
  });

  // The body is the voice index itself (index.json), sent as text: larger than the server's JSON limit.
  router.post("/voice-pack/check", requireUploadToken, express.text({ type: "text/plain", limit: "8mb" }), async (req, res) => {
    let keys: unknown;
    try { keys = (JSON.parse(String(req.body)) as { keys?: unknown }).keys; } catch { keys = null; }
    if (!Array.isArray(keys) || keys.some((key) => typeof key !== "string" || !VOICE_KEY.test(key))) {
      res.status(400).json({ error: "Send the voice index (index.json) as text/plain." });
      return;
    }
    // Removing unused files is only safe once the app's live index no longer lists them (after the merge).
    const result = await checkVoicePack(store(), keys as string[], req.query.prune === "1");
    // With ?list=1, also every sentence key that lacks a file, so the workflow makes exactly those.
    const missingKeys = req.query.list === "1" ? [...new Set(result.missing.map((name) => name.slice(name.indexOf("/") + 1, name.lastIndexOf("."))))] : undefined;
    res.json({ ...result, missing: result.missing.length, firstMissing: result.missing.slice(0, 10), ...(missingKeys ? { missingKeys } : {}) });
  });

  // A bounded PR sync: Replit renders into its own App Storage, never uploads audio through GitHub.
  router.post("/voice-pack/sync", requireUploadToken, express.text({ type: "text/plain", limit: "8mb" }), async (req, res) => {
    let body: unknown;
    try { body = JSON.parse(String(req.body)); } catch { body = null; }
    const values = (body as { sentences?: unknown } | null)?.sentences;
    if (!Array.isArray(values) || values.length > 10_000) {
      res.status(400).json({ error: "Send the current voice sentences as JSON text." }); return;
    }
    const sentences: PackSentence[] = [];
    const seen = new Set<string>();
    for (const value of values) {
      if (!value || typeof value !== "object") { res.status(400).json({ error: "A sentence entry is invalid." }); return; }
      const { key, text } = value as { key?: unknown; text?: unknown };
      const clean = cleanVoiceText(text);
      if (typeof key !== "string" || !VOICE_KEY.test(key) || !clean || clean !== text || voicePackSentenceKey(clean) !== key || seen.has(key)) {
        res.status(400).json({ error: "Sentence keys must match unique, clean sentence text." }); return;
      }
      seen.add(key);
      sentences.push({ key, text: clean });
    }
    if (syncRunning) { res.setHeader("Retry-After", "10"); res.status(409).json({ error: "A voice sync is already running. Retry after it finishes." }); return; }
    syncRunning = true;
    try {
      const result = await sync(store(), sentences, {
        apply: true,
        maxMissingSentences: PR_SYNC_SENTENCE_LIMIT,
      });
      if (result.remainingFiles > 0) {
        res.status(503).json({ error: `${result.remainingFiles} audio files remain missing after the Replit sync.` }); return;
      }
      res.json({ sentences: sentences.length, generatedFiles: result.generatedFiles, generatedSentences: result.generatedSentences, remainingFiles: 0 });
    } catch (error) {
      if (error instanceof VoicePackSyncInProgressError) {
        res.setHeader("Retry-After", "60");
        res.status(409).json({ error: error.message });
      } else if (error instanceof VoicePackSyncLimitError) {
        res.status(409).json({ error: error.message, missingSentences: error.missingSentences, limit: error.limit });
      } else {
        req.log?.error({ err: error }, "Replit voice pack sync failed");
        res.status(500).json({ error: "Replit could not complete the voice sync." });
      }
    } finally {
      syncRunning = false;
    }
  });

  return router;
}

export default createVoicePackUploadRouter();
