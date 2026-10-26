import { Router, type IRouter } from "express";
import { createRateLimiter, memoryRateLimitStore } from "../lib/rate-limit";
import { cleanVoiceText, DEFAULT_VOICE, isVoiceCached, isVoiceId, loadVoiceEngine, speechWav, voiceState } from "../lib/voice";

const router: IRouter = Router();
// New sentences cost CPU; cached ones are free. A lesson page reads a handful of sentences at a time.
// This guards cost, not security, so it counts in this process: no database write for each new sentence.
const synthesisLimit = createRateLimiter({ name: "voice-synthesis", max: 60, windowMs: 60_000, store: memoryRateLimitStore() });

/** Is the natural voice available? Also starts loading the model, so the first Listen is quick. */
router.get("/voice/status", (_req, res) => {
  void loadVoiceEngine();
  res.set("Cache-Control", "no-store");
  res.json(voiceState());
});

/** The WAV for one sentence: GET /api/voice/speech?voice=af_heart&text=... (cacheable forever: same input, same audio). */
router.get("/voice/speech", async (req, res) => {
  const text = cleanVoiceText(req.query.text);
  const voice = req.query.voice === undefined ? DEFAULT_VOICE : req.query.voice;
  if (!text || !isVoiceId(voice)) {
    res.status(400).json({ error: "Send a voice and up to 400 characters of text." });
    return;
  }
  const key = req.ip ?? "unknown";
  if (!(await isVoiceCached(voice, text))) {
    if (await synthesisLimit.isLimited(key)) {
      res.status(429).json({ error: "Too many new sentences at once. Try again in a minute." });
      return;
    }
    await synthesisLimit.hit(key);
  }
  try {
    const wav = await speechWav(voice, text);
    res.set({ "Content-Type": "audio/wav", "Content-Length": String(wav.length), "Cache-Control": "public, max-age=31536000, immutable" });
    res.end(wav);
  } catch {
    res.status(503).json({ error: "The natural voice is not available right now." });
  }
});

export default router;
