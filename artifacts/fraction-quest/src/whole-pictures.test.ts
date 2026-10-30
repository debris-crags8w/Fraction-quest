/* Pictures for "how many wholes" questions do not hand over the answer, and pictures for questions that state an
   amount show that amount (wave 3).
   - "How many wholes are 12/6?": never as many bars, or as many full bars, as the answer (one spare bar).
   - "Write 2 whole bars as a fraction…": exactly 2 bars. "Write 8/8 as a whole number.": 8/8 is drawn.
   - On the worksheet (improper-fractions, whole-numbers-as-fractions), the bar to copy for "How many wholes" has a
     spare whole too, so the bars to copy (each marked "one whole") are not the answer. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS, type ModelSpec, type PracticeQuestion } from './game';
import { lessonCheckpoint } from './checkpoint';
import { generateQuestions, getExtraPractice } from './practice-bank';
import { getWorksheet } from './learning-content';

const LESSONS = ['whole-numbers-as-fractions', 'improper-fractions'];

function everyQuestion(id: string): [string, PracticeQuestion][] {
  const mission = MISSIONS.find((m) => m.id === id)!;
  const ids = mission.questions.map((q) => q.id);
  return [
    ...mission.questions.map((q): [string, PracticeQuestion] => ['lesson', q]),
    ...(mission.ideaQuestions ?? []).map((q): [string, PracticeQuestion] => ['idea', q]),
    ...lessonCheckpoint(mission).map((q): [string, PracticeQuestion] => ['checkpoint', q]),
    ...getExtraPractice(id, ids).map((q): [string, PracticeQuestion] => ['practice more', q]),
    ...Array.from({ length: 60 }, (_, s) => generateQuestions(id, ids, s * 31 + 5, 12)).flat().map((q): [string, PracticeQuestion] => ['new questions', q]),
  ];
}
const barsOf = (model: ModelSpec) => (model.kind === 'bars' ? model.bars.filter((bar) => !('untilAnswered' in bar && bar.untilAnswered)) : null);
/** How many whole bars a picture draws (a bar of 9/1 is 9 wholes), and how many of them are full. */
const drawnWholes = (bars: { numerator: number; denominator: number }[]) => bars.reduce((sum, b) => sum + Math.max(1, Math.ceil(b.numerator / b.denominator)), 0);
const fullWholes = (bars: { numerator: number; denominator: number }[]) => bars.reduce((sum, b) => sum + Math.floor(b.numerator / b.denominator), 0);

describe('whole-number pictures', () => {
  it('"How many wholes" pictures never show the answer as a count of bars or of full bars', () => {
    const bad = new Set<string>();
    for (const id of LESSONS) for (const [where, q] of everyQuestion(id)) {
      const m = /^How many wholes are (\d+)\/(\d+)\?$/.exec(q.prompt);
      const bars = barsOf(q.model);
      if (!m || !bars) continue;
      const answer = Number(m[1]) / Number(m[2]);
      if (drawnWholes(bars) === answer || fullWholes(bars) === answer) bad.add(`${id} ${where}: ${q.prompt} drawn ${bars.map((b) => `${b.numerator}/${b.denominator}`).join(',')}`);
    }
    assert.deepEqual([...bad], []);
  });

  it('a question that states the bars or the amount draws them', () => {
    const bad = new Set<string>();
    for (const id of LESSONS) for (const [where, q] of everyQuestion(id)) {
      const bars = barsOf(q.model);
      const write = /^Write (\d+) whole bars as a fraction/.exec(q.prompt);
      const one = /^Write (\d+)\/(\d+) as a whole number\.$/.exec(q.prompt);
      const drawn = bars?.map((b) => `${b.numerator}/${b.denominator}`).join(',') ?? q.model.kind;
      if (write && (!bars || drawnWholes(bars) !== Number(write[1]))) bad.add(`${id} ${where}: ${q.prompt} drawn ${drawn}`);
      if (one && !bars?.some((b) => b.numerator === Number(one[1]) && b.denominator === Number(one[2]))) bad.add(`${id} ${where}: ${q.prompt} drawn ${drawn}`);
    }
    assert.deepEqual([...bad], []);
  });

  it('worksheet "How many wholes" rows give the bar to copy one spare whole', () => {
    for (const id of LESSONS) for (let variant = 0; variant <= 8; variant++) for (const row of getWorksheet(id, variant)) {
      const m = /^How many wholes are (\d+)\/(\d+)\?$/.exec(row.prompt);
      if (!m || !row.model) continue;
      assert.equal(row.model.wholes, Number(row.answer) + 1, `${id} sheet ${variant}: ${row.prompt}`);
    }
  });
});
