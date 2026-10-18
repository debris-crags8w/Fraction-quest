import { Router, type IRouter } from "express";
import { appStorageVoicePack, isPackVoice, parseVoiceFileName, VOICE_CACHE_CONTROL, VOICE_FORMATS, type VoicePackStore } from "../lib/voice-pack-store";

/* This public endpoint is intentionally restricted to the pre-generated voice pack. It streams straight from App
   Storage with no separate existence check (one storage round trip, not two), and since each file is named by its
   sentence and never changes, browsers may keep it for good. */
export function createStorageRouter(store: () => VoicePackStore = appStorageVoicePack): IRouter {
  const router: IRouter = Router();
  router.get("/storage/public-objects/voice/:voice/:fileName", (req, res) => {
    const { voice, fileName } = req.params;
    const parsed = parseVoiceFileName(fileName);
    if (!isPackVoice(voice) || !parsed) {
      res.status(404).json({ error: "Object not found." });
      return;
    }

    // Headers wait for the first bytes, so a missing file can still answer 404.
    const stream = store().read({ voice, ...parsed });
    stream.once("data", (first: Buffer) => {
      res.setHeader("Content-Type", VOICE_FORMATS[parsed.format]);
      res.setHeader("Cache-Control", VOICE_CACHE_CONTROL);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.write(first);
      stream.pipe(res);
    });
    stream.once("end", () => { if (!res.headersSent) res.status(404).json({ error: "Object not found." }); });
    stream.on("error", (error: Error & { code?: number }) => {
      if (res.headersSent) { res.destroy(error); return; }
      if (error.code === 404) res.status(404).json({ error: "Object not found." });
      else res.status(500).json({ error: "Unable to read voice audio." });
    });
    res.on("close", () => { if (!res.writableEnded) stream.destroy(); });
  });
  return router;
}

export default createStorageRouter();
