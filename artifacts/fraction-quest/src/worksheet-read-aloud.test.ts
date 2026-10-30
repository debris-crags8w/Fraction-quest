/* A wrong worksheet answer read aloud (sound on) says the same as the screen and its Listen button: the named slip,
   then the hint. Before, the automatic read-aloud said only "Not yet." and the hint. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { WHY } from './slip-reasons';
import { worksheetFeedbackSpeech } from './wrong-answer';

test('the worksheet feedback text names the slip, then the hint', () => {
  const row = { prompt: '1/3 + 1/6 = ?', answer: '3/6', hint: 'Make both fractions sixths first. Then add the numerators.' };
  assert.equal(worksheetFeedbackSpeech(row, '2/9'), `Not yet. ${WHY.acrossAdd} ${row.hint}`);
  // No named slip: the hint alone.
  assert.equal(worksheetFeedbackSpeech({ prompt: 'Some made-up question', answer: '7', hint: 'Count again.' }, '8'), 'Not yet. Count again.');
});

test('the automatic read-aloud and the Listen button both use that text', () => {
  const source = readFileSync(new URL('./LearningLab.tsx', import.meta.url), 'utf8');
  const row = source.slice(source.indexOf('export function Row('));
  assert.match(row, /useReadAloud\([^;]*worksheetFeedbackSpeech\(p, draft\)/, 'the read-aloud says the named slip');
  assert.doesNotMatch(row, /useReadAloud\([^;]*`Not yet\. \$\{p\.hint\}`/, 'the read-aloud no longer skips the slip');
  assert.match(row, /SectionListenHeader text=\{worksheetFeedbackSpeech\(p, draft\)\}/, 'the Listen button says the same');
});
