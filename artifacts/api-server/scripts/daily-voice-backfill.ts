import { voiceSentences } from "../../fraction-quest/scripts/voice-sentences";
import { appStorageVoicePack } from "../src/lib/voice-pack-store";
import { runDailyVoiceBackfill } from "../src/lib/voice-pack-sync";

console.log("Starting the bounded daily Heart voice backfill. Stored audio will not be deleted.");
await runDailyVoiceBackfill(appStorageVoicePack(), voiceSentences(), { log: console.log });
