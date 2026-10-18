import { timingSafeEqual } from "node:crypto";
import express, { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { createRateLimiter } from "../lib/rate-limit";
import { appStorageVoicePack, checkVoicePack, isPackVoice, parseVoiceFileName, VOICE_FORMATS, VOICE_KEY, type VoicePackStore } from "../lib/voice-pack-store";

/* The Voice pack workflow uploads new audio here, then asks whether every indexed sentence is stored before it
   opens the index pull request. Only this server can write to App Storage (through Replit's sidecar), so GitHub
   sends the files rather than writing them itself. Off (404) until VOICE_PACK_UPLOAD_TOKEN is set. */
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

export function createVoicePackUploadRouter(store: () => VoicePackStore = appStorageVoicePack): IRouter {
  const router: IRouter = Router();

  // One clip per request (<key>.mp3 or <key>.caf), so every request stays small and quick.
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
    res.json({ ...result, missing: result.missing.length, firstMissing: result.missing.slice(0, 10) });
  });

  return router;
}

export default createVoicePackUploadRouter();
