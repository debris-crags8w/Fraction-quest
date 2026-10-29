import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { answerMatches, getWorksheet } from './learning-content';
import { generateQuestions } from './practice-bank';
import { prove } from './proof';

/* 4.NF.6 also asks to locate a decimal on a number line: the tenths lesson practises reading one. */
describe('locating a decimal on a number line (4.NF.6)', () => {
  it('has a number line row on every tenths-decimals worksheet, answered as a decimal', () => {
    for (let variant = 0; variant < 8; variant++) {
      const rows = getWorksheet('tenths-decimals', variant).filter((row) => row.model?.kind === 'line');
      assert.equal(rows.length, 1, `sheet ${variant}`);
      const row = rows[0];
      assert.equal(row.prompt, 'What decimal is at the dot?');
      assert.equal(row.model!.d, 10);
      assert.equal(row.answer, `0.${row.model!.n}`);
      assert.ok(answerMatches(row, row.answer) && !answerMatches(row, `${row.model!.n}.0`));
      assert.equal(getWorksheet('tenths-decimals', variant).length, 12, 'a sheet still has 12 rows');
      assert.ok(!row.hint.includes(row.answer), 'the hint does not give the answer');
    }
  });

  it('asks it in Practice more and New questions, with real tenths slips as wrong choices, and the proof engine agrees', () => {
    const ids = MISSIONS.find((m) => m.id === 'tenths-decimals')!.questions.map((q) => q.id);
    const asked = new Map<string, string>();
    for (let seed = 1; seed <= 40; seed++) for (const q of generateQuestions('tenths-decimals', ids, seed * 7919, 12)) {
      if ((q.model as { kind?: string } | undefined)?.kind !== 'line') continue;
      assert.equal(q.prompt, 'What decimal is at the dot?');
      const right = q.choices[q.correctChoice];
      const n = (q.model as unknown as { numerator: number; denominator: number }).numerator;
      assert.equal(right, `0.${n}`);
      assert.equal(q.choices.length, 4);
      assert.ok(q.choices.every((c) => !/\.0\d/.test(c)), `no hundredths before lesson 31: ${q.choices.join(' ')}`);
      const result = prove({ source: 'practice', lesson: 'tenths-decimals', prompt: q.prompt, choices: q.choices, correct: q.correctChoice, pictures: [q.model as never] });
      assert.ok(result?.ok, `${q.choices.join(' ')}: ${result && !result.ok ? result.why : 'no rule'}`);
      asked.set(right, q.choices.join(' '));
    }
    assert.ok(asked.size >= 6, `only ${asked.size} different dots in 40 rounds`);
  });

  it('writes no hundredths form (0.05, 3/100) as a wrong choice in any tenths round: hundredths are taught in the next lesson', () => {
    const ids = MISSIONS.find((m) => m.id === 'tenths-decimals')!.questions.map((q) => q.id);
    for (let seed = 1; seed <= 60; seed++) for (const q of generateQuestions('tenths-decimals', ids, seed, 12)) {
      for (const choice of q.choices) assert.doesNotMatch(choice, /\.\d\d|\/100\b/, `${q.prompt} → ${q.choices.join(' ')}`);
    }
  });
});
