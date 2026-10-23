import { voiceSentences } from "../../fraction-quest/scripts/voice-sentences";
import { appStorageVoicePack } from "../src/lib/voice-pack-store";
import { generateMissingVoicePack, RENDER_VOICES } from "../src/lib/voice-pack-sync";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const voiceIndex = args.indexOf("--voice");
const requestedVoice = voiceIndex === -1 ? undefined : args[voiceIndex + 1];
if (voiceIndex !== -1 && (!requestedVoice || !RENDER_VOICES.includes(requestedVoice))) {
  throw new Error(`Use --voice with a configured voice: ${RENDER_VOICES.join(", ")}.`);
}
const voices = requestedVoice ? [requestedVoice] : undefined;
if (voices) console.log(`Selected voice: ${voices[0]}`);
const result = await generateMissingVoicePack(appStorageVoicePack(), voiceSentences(), {
  apply,
  log: console.log,
  voices,
});

if (result.dryRun && result.missingFiles > 0) {
  console.log(`${result.missingFiles} audio files are missing. No changes made. Run with --apply to generate and save them.`);
} else if (result.dryRun) {
  console.log(`Checked ${result.checkedFiles} files across ${result.checkedSentences} sentences; all configured voice audio is already in App Storage.`);
} else {
  console.log(`Checked ${result.checkedFiles} files across ${result.checkedSentences} sentences; ${result.missingFiles} were missing, ${result.generatedFiles} generated, and ${result.remainingFiles} remain missing. No stored files were deleted.`);
}
