import { voiceSentences } from "../../fraction-quest/scripts/voice-sentences";
import { appStorageVoicePack } from "../src/lib/voice-pack-store";
import { generateMissingVoicePack } from "../src/lib/voice-pack-sync";

const apply = process.argv.includes("--apply");
const result = await generateMissingVoicePack(appStorageVoicePack(), voiceSentences(), {
  apply,
  log: console.log,
});

if (result.dryRun && result.missingFiles > 0) {
  console.log(`${result.missingFiles} audio files are missing. No changes made. Run with --apply to generate and save them.`);
} else if (result.dryRun) {
  console.log("All configured voice audio is already in App Storage.");
} else {
  console.log(`Stored ${result.missingFiles} missing audio files (${result.generatedSentences} sentence/voice renders). No stored files were deleted.`);
}
