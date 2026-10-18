import { Router, type IRouter } from "express";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const allowedVoicePath = /^(?:af_heart|am_michael|bf_emma)\/[0-9a-f]{16}\.mp3$/;

// This public endpoint is intentionally restricted to the pre-generated voice pack.
router.get("/storage/public-objects/voice/:voice/:fileName", async (req, res) => {
  const voicePath = `${req.params.voice}/${req.params.fileName}`;
  if (!allowedVoicePath.test(voicePath)) {
    res.status(404).json({ error: "Object not found." });
    return;
  }

  const file = await storage.searchPublicObject(`voice/${voicePath}`);
  if (!file) {
    res.status(404).json({ error: "Object not found." });
    return;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const stream = file.createReadStream();
  stream.on("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    res.status(500).json({ error: "Unable to read voice audio." });
  });
  stream.pipe(res);
});

export default router;
