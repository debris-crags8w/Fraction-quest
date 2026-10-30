/* Singular and plural, and subject-verb agreement, in the sentences a child reads and hears ("7 parts are more than 6",
   "1 more half", "more than 1 tenth"). Scans every generated and written question, hint, reason and worksheet row,
   and the source text of the lesson pages. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { generateQuestions } from './practice-bank';
import { lessonCheckpoint } from './checkpoint';
import { getWorksheet } from './learning-content';

const UNITS = 'parts?|pieces?|slices?|jumps?|groups?|copies|halves|half|thirds?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?|twelfths?|hundredths?';
const PLURAL_ONLY = 'parts|pieces|slices|jumps|groups|halves|thirds|fourths|fifths|sixths|sevenths|eighths|ninths|tenths|twelfths|hundredths';
const BAD: [RegExp, string][] = [
  [new RegExp(`(?<![/\\d.])\\b(?:[0-9]*[02-9]|[0-9]*1[0-9]|[2-9]) (?:${PLURAL_ONLY}) is (?:more|less|bigger|smaller|greater)\\b`, 'i'), 'plural count with "is"'],
  [new RegExp(`(?<![/\\d.])\\b(?:1|one) (?:${PLURAL_ONLY})\\b(?! of\\b)`, 'i'), 'one with a plural noun'],
  [new RegExp(`(?<![/\\d.])\\b(?:[2-9]|[0-9]{2,}) (?:part|piece|slice|jump|group|half|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|twelfth|hundredth)(?![a-z])`, 'i'), 'a number above one with a singular noun'],
  [/\bmore halve\b|\band 1 halve\b/i, 'halve'],
  [new RegExp(`(?<![/\\d.])\\b(?:1|one) (?:part|piece|slice|jump|group|half|third|fourth|fifth|sixth|tenth|hundredth) are\\b`, 'i'), 'one with "are"'],
  [/\b(?:a|an) (?:eighth|eighths)s?\b(?<!an eighth)/i, 'a eighth'],
];
const find = (text: string) => BAD.flatMap(([re, why]) => (re.test(text) ? [`${why}: ${text}`] : []));

describe('grammar of generated and written lesson text', () => {
  it('has no wrong singular, plural or verb in any question, hint, reason or worksheet row', () => {
    const hits = new Set<string>();
    const scan = (text?: string) => { if (text) for (const h of find(text)) hits.add(h); };
    for (const m of MISSIONS) {
      const ids = m.questions.map((q) => q.id);
      const all = [...m.questions, ...(m.ideaQuestions ?? []), ...lessonCheckpoint(m)];
      for (let seed = 1; seed <= 20; seed++) all.push(...generateQuestions(m.id, ids, seed * 31 + 3, 12));
      for (const q of all) for (const text of [q.prompt, q.hint, q.retryFeedback, q.explanation, ...q.choices]) scan(text);
      for (let v = 0; v < 6; v++) for (const row of getWorksheet(m.id, v)) for (const text of [row.prompt, row.hint, row.answer, (row as { explain?: string }).explain, (row as { why?: string }).why]) scan(text);
    }
    assert.deepEqual([...hits].slice(0, 10), []);
  });

  it('has none in the lesson-page source text either', () => {
    const hits: string[] = [];
    for (const file of readdirSync(new URL('.', import.meta.url)).filter((f) => /^(?:game|learning-content|teach-extras|teach-scenes|practice-bank|intro-copy|lesson-intros)\.tsx?$/.test(f))) {
      // Only text inside quotes: a number above one beside a singular noun in a code comment is not a sentence.
      for (const [index, line] of readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').entries()) {
        if (/^\s*\/[/*]/.test(line)) continue;
        const [first] = BAD;
        if (first[0].test(line)) hits.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
      }
    }
    assert.deepEqual(hits.slice(0, 10), []);
  });
});
