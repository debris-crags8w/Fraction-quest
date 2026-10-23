// Usage: tsx scripts/render-voice-pack.ts <sentences.json> <out dir> <voice> [shard] [shards]
// Reads [{ key, text }] (from fraction-quest's scripts/voice-sentences.ts) and makes the missing MP3s for one voice.
import { readFile } from "node:fs/promises";
import { isRenderVoice, loadVoiceEngine } from "../src/lib/voice";
import { renderVoicePack, shardOf, type PackSentence } from "../src/lib/voice-pack-render";

const [list, outDir, voice, shard = "0", shards = "1"] = process.argv.slice(2);
if (!list || !outDir || !isRenderVoice(voice)) {
  console.error("Usage: render-voice-pack.ts <sentences.json> <out dir> <voice> [shard] [shards]");
  process.exit(2);
}
// Heart reads every sentence; a cast voice only its own film lines.
const listed = (JSON.parse(await readFile(list, "utf8")) as PackSentence[]).filter((sentence) => (sentence.voice ?? "af_heart") === voice);
const sentences = shardOf(listed, Number(shard), Number(shards));
const engine = await loadVoiceEngine();
if (!engine) { console.error("The Kokoro model could not load."); process.exit(1); }
const started = Date.now();
const result = await renderVoicePack(engine, voice, sentences, outDir, console.log);
console.log(`${voice} shard ${shard}/${shards}: ${result.made} made, ${result.skipped} skipped in ${Math.round((Date.now() - started) / 1000)} s`);
