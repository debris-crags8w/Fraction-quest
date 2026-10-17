// Usage: tsx scripts/render-voice-pack.ts <sentences.json> <out dir> <voice> [shard] [shards]
// Reads [{ key, text }] (from fraction-quest's scripts/voice-sentences.ts) and makes the missing MP3s for one voice.
import { readFile } from "node:fs/promises";
import { isVoiceId, loadVoiceEngine } from "../src/lib/voice";
import { renderVoicePack, shardOf, type PackSentence } from "../src/lib/voice-pack-render";

const [list, outDir, voice, shard = "0", shards = "1"] = process.argv.slice(2);
if (!list || !outDir || !isVoiceId(voice)) {
  console.error("Usage: render-voice-pack.ts <sentences.json> <out dir> <voice> [shard] [shards]");
  process.exit(2);
}
const sentences = shardOf(JSON.parse(await readFile(list, "utf8")) as PackSentence[], Number(shard), Number(shards));
const engine = await loadVoiceEngine();
if (!engine) { console.error("The Kokoro model could not load."); process.exit(1); }
const started = Date.now();
const result = await renderVoicePack(engine, voice, sentences, outDir, console.log);
console.log(`${voice} shard ${shard}/${shards}: ${result.made} made, ${result.skipped} skipped in ${Math.round((Date.now() - started) / 1000)} s`);
