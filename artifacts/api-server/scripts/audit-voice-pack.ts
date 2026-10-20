import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { voiceSentenceGroups, voiceSentences } from "../../fraction-quest/scripts/voice-sentences";
import { buildVoicePackAudit } from "../src/lib/voice-pack-audit";
import { appStorageVoicePack } from "../src/lib/voice-pack-store";

type PreviousIndex = { keys?: unknown };

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPreviousIndex = path.resolve(scriptDir, "../../fraction-quest/dist/public/voice/index.json");
const previousFlag = process.argv.indexOf("--previous");
const previousPath = previousFlag >= 0 ? process.argv[previousFlag + 1] : defaultPreviousIndex;

function readPreviousKeys(filePath: string | undefined): string[] | undefined {
  if (!filePath || !existsSync(filePath)) {
    if (previousFlag >= 0) throw new Error(`Previous voice index not found: ${filePath ?? "(missing path)"}`);
    return undefined;
  }
  const index = JSON.parse(readFileSync(filePath, "utf8")) as PreviousIndex;
  if (!Array.isArray(index.keys) || !index.keys.every((key) => typeof key === "string")) {
    throw new Error(`Previous voice index is invalid: ${filePath}`);
  }
  return [...new Set(index.keys)];
}

const groups = voiceSentenceGroups();
const current = voiceSentences();
const stored = await appStorageVoicePack().list();
const previousKeys = readPreviousKeys(previousPath);
const report = buildVoicePackAudit(groups, stored, previousKeys);

console.log("Heart voice-pack audit (read-only)");
console.log(`Current manifest: ${report.manifestSentences.toLocaleString()} unique sentences.`);
console.log(`Expected audio: ${report.expectedFiles.toLocaleString()} files (Heart voice × MP3 and CAF/Opus).`);
console.log(`App Storage: ${report.storedFiles.toLocaleString()} stored files; ${report.matchingFiles.toLocaleString()} match the current manifest.`);
console.log(`Missing: ${report.missingFiles.toLocaleString()} files across ${report.missingSentences.toLocaleString()} sentences.`);
console.log(`Stored but not referenced by the current manifest: ${report.unreferencedFiles.toLocaleString()} files across ${report.unreferencedVoiceKeyPairs.toLocaleString()} voice/key pairs. Nothing was removed.`);
console.log("Current Heart pack format inventory:");
for (const row of report.formats) {
  console.log(`  ${row.format}: ${row.storedFiles.toLocaleString()} of ${row.expectedFiles.toLocaleString()} stored; ${row.missingFiles.toLocaleString()} missing.`);
}
console.log("Stored audio by voice:");
for (const row of report.voices) {
  console.log(`  ${row.voice}: ${row.storedFiles.toLocaleString()} files; ${row.matchingFiles.toLocaleString()} match current Heart keys; ${row.unreferencedFiles.toLocaleString()} are not in the active pack.`);
}

if (previousKeys) {
  const relativePreviousPath = path.relative(process.cwd(), previousPath!);
  console.log(`Comparison with local previous build index ${relativePreviousPath} (${report.comparison!.previousSentences.toLocaleString()} keys; it may not match the last fully backfilled manifest):`);
  console.log(`  shared ${report.comparison!.sharedSentences.toLocaleString()}, current-only ${report.comparison!.currentOnlySentences.toLocaleString()}, previous-only ${report.comparison!.previousOnlySentences.toLocaleString()}.`);
} else {
  console.log("No earlier manifest was available; the report compares the current manifest with the stored-file listing.");
}

console.log("By source and theme (rows can overlap when the same sentence is used in multiple places):");
const columns = [
  ["source", 12], ["theme", 12], ["sentences", 11], ["new vs old", 11],
  ["missing sentences", 19], ["missing MP3", 12], ["missing CAF", 12], ["missing files", 14],
] as const;
console.log(columns.map(([name, width]) => name.padEnd(width)).join(" "));
for (const row of report.groups) {
  const values = [
    row.source, row.theme, row.sentenceCount.toLocaleString(),
    row.newSentences === null ? "n/a" : row.newSentences.toLocaleString(),
    row.missingSentences.toLocaleString(),
    row.missingByFormat.mp3.toLocaleString(),
    row.missingByFormat.caf.toLocaleString(),
    row.missingFiles.toLocaleString(),
  ];
  console.log(values.map((value, i) => value.padEnd(columns[i][1])).join(" "));
}

if (current.length !== report.manifestSentences) {
  throw new Error(`Audit source groups contain ${report.manifestSentences} keys, but the active voice manifest contains ${current.length}.`);
}
