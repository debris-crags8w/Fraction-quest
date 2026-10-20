import { PACK_VOICES, VOICE_FORMATS, type VoiceFile } from "./voice-pack-store";

export type VoiceSentenceAuditGroup = {
  source: string;
  theme: string;
  sentences: readonly { key: string }[];
};

export type VoicePackAuditRow = {
  source: string;
  theme: string;
  sentenceCount: number;
  missingSentences: number;
  missingFiles: number;
  missingByFormat: Record<VoiceFile["format"], number>;
  newSentences: number | null;
};

export type VoicePackAuditFormat = {
  format: VoiceFile["format"];
  expectedFiles: number;
  storedFiles: number;
  missingFiles: number;
};

export type VoicePackAuditVoice = {
  voice: string;
  storedFiles: number;
  matchingFiles: number;
  unreferencedFiles: number;
  unreferencedVoiceKeyPairs: number;
};

export type VoicePackAuditReport = {
  manifestSentences: number;
  expectedFiles: number;
  storedFiles: number;
  matchingFiles: number;
  missingSentences: number;
  missingFiles: number;
  unreferencedFiles: number;
  unreferencedVoiceKeyPairs: number;
  formats: VoicePackAuditFormat[];
  voices: VoicePackAuditVoice[];
  comparison: null | {
    previousSentences: number;
    sharedSentences: number;
    currentOnlySentences: number;
    previousOnlySentences: number;
  };
  groups: VoicePackAuditRow[];
};

const fileId = (file: VoiceFile) => `${file.voice}/${file.key}.${file.format}`;

export function buildVoicePackAudit(
  groups: readonly VoiceSentenceAuditGroup[],
  storedFiles: readonly VoiceFile[],
  previousKeys?: readonly string[],
): VoicePackAuditReport {
  const currentKeys = new Set(groups.flatMap((group) => group.sentences.map(({ key }) => key)));
  const previous = previousKeys === undefined ? null : new Set(previousKeys);
  const storedIds = new Set(storedFiles.map(fileId));
  const formats = Object.keys(VOICE_FORMATS) as VoiceFile["format"][];
  const expectedIds = new Set(
    [...currentKeys].flatMap((key) => PACK_VOICES.flatMap((voice) => formats.map((format) => `${voice}/${key}.${format}`))),
  );
  const matchingFiles = [...storedIds].filter((id) => expectedIds.has(id)).length;
  const missingKeys = [...currentKeys].filter((key) =>
    PACK_VOICES.some((voice) => formats.some((format) => !storedIds.has(`${voice}/${key}.${format}`))),
  );
  const unreferenced = [...storedIds].filter((id) => !expectedIds.has(id));
  const formatRows = formats.map((format): VoicePackAuditFormat => {
    const expectedFiles = currentKeys.size * PACK_VOICES.length;
    const storedCount = [...expectedIds].filter((id) => id.endsWith(`.${format}`) && storedIds.has(id)).length;
    return { format, expectedFiles, storedFiles: storedCount, missingFiles: expectedFiles - storedCount };
  });
  const voiceNames = [...new Set(storedFiles.map(({ voice }) => voice))].sort();
  const voiceRows = voiceNames.map((voice): VoicePackAuditVoice => {
    const ids = new Set(storedFiles.filter((file) => file.voice === voice).map(fileId));
    const matching = [...ids].filter((id) => expectedIds.has(id));
    const unreferenced = [...ids].filter((id) => !expectedIds.has(id));
    return {
      voice,
      storedFiles: ids.size,
      matchingFiles: matching.length,
      unreferencedFiles: unreferenced.length,
      unreferencedVoiceKeyPairs: new Set(unreferenced.map((id) => id.slice(0, id.lastIndexOf(".")))).size,
    };
  });

  const rows = groups.map((group): VoicePackAuditRow => {
    const keys = new Set(group.sentences.map(({ key }) => key));
    let missingSentences = 0;
    let missingFiles = 0;
    const missingByFormat = Object.fromEntries(formats.map((format) => [format, 0])) as Record<VoiceFile["format"], number>;
    for (const key of keys) {
      let sentenceIsMissing = false;
      for (const voice of PACK_VOICES) {
        for (const format of formats) {
          if (!storedIds.has(`${voice}/${key}.${format}`)) {
            missingFiles++;
            missingByFormat[format]++;
            sentenceIsMissing = true;
          }
        }
      }
      if (sentenceIsMissing) missingSentences++;
    }
    return {
      source: group.source,
      theme: group.theme,
      sentenceCount: keys.size,
      missingSentences,
      missingFiles,
      missingByFormat,
      newSentences: previous ? [...keys].filter((key) => !previous.has(key)).length : null,
    };
  });

  const unreferencedVoiceKeyPairs = new Set(unreferenced.map((id) => id.slice(0, id.lastIndexOf(".")))).size;
  return {
    manifestSentences: currentKeys.size,
    expectedFiles: expectedIds.size,
    storedFiles: storedIds.size,
    matchingFiles,
    missingSentences: missingKeys.length,
    missingFiles: expectedIds.size - matchingFiles,
    unreferencedFiles: unreferenced.length,
    unreferencedVoiceKeyPairs,
    formats: formatRows,
    voices: voiceRows,
    comparison: previous ? {
      previousSentences: previous.size,
      sharedSentences: [...currentKeys].filter((key) => previous.has(key)).length,
      currentOnlySentences: [...currentKeys].filter((key) => !previous.has(key)).length,
      previousOnlySentences: [...previous].filter((key) => !currentKeys.has(key)).length,
    } : null,
    groups: rows,
  };
}
