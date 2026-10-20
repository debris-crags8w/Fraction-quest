import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVoicePackAudit } from "./lib/voice-pack-audit";
import type { VoiceFile } from "./lib/voice-pack-store";

const file = (key: string, format: VoiceFile["format"], voice: string = "af_heart"): VoiceFile => ({
  key,
  format,
  voice,
});

test("the voice-pack audit counts missing formats by source and theme without pruning stored files", () => {
  const groups = [
    { source: "lesson", theme: "everyday", sentences: [{ key: "aaaaaaaaaaaaaaaa" }, { key: "bbbbbbbbbbbbbbbb" }] },
    { source: "practice", theme: "everyday", sentences: [{ key: "bbbbbbbbbbbbbbbb" }, { key: "cccccccccccccccc" }] },
  ];
  const stored = [
    file("aaaaaaaaaaaaaaaa", "mp3"),
    file("aaaaaaaaaaaaaaaa", "mp3"),
    file("aaaaaaaaaaaaaaaa", "caf"),
    file("bbbbbbbbbbbbbbbb", "mp3"),
    file("dddddddddddddddd", "mp3"),
    file("dddddddddddddddd", "caf"),
  ];
  const before = [...stored];

  const report = buildVoicePackAudit(groups, stored, [
    "aaaaaaaaaaaaaaaa",
    "bbbbbbbbbbbbbbbb",
    "dddddddddddddddd",
  ]);

  assert.equal(report.manifestSentences, 3);
  assert.equal(report.expectedFiles, 6);
  assert.equal(report.storedFiles, 5);
  assert.equal(report.matchingFiles, 3);
  assert.equal(report.missingSentences, 2);
  assert.equal(report.missingFiles, 3);
  assert.equal(report.unreferencedFiles, 2);
  assert.equal(report.unreferencedVoiceKeyPairs, 1);
  assert.deepEqual(report.formats, [
    { format: "mp3", expectedFiles: 3, storedFiles: 2, missingFiles: 1 },
    { format: "caf", expectedFiles: 3, storedFiles: 1, missingFiles: 2 },
  ]);
  assert.deepEqual(report.voices, [
    { voice: "af_heart", storedFiles: 5, matchingFiles: 3, unreferencedFiles: 2, unreferencedVoiceKeyPairs: 1 },
  ]);
  assert.deepEqual(report.comparison, {
    previousSentences: 3,
    sharedSentences: 2,
    currentOnlySentences: 1,
    previousOnlySentences: 1,
  });
  assert.deepEqual(report.groups, [
    {
      source: "lesson", theme: "everyday", sentenceCount: 2, missingSentences: 1, missingFiles: 1,
      missingByFormat: { mp3: 0, caf: 1 }, newSentences: 0,
    },
    {
      source: "practice", theme: "everyday", sentenceCount: 2, missingSentences: 2, missingFiles: 3,
      missingByFormat: { mp3: 1, caf: 2 }, newSentences: 1,
    },
  ]);
  assert.deepEqual(stored, before);
});
