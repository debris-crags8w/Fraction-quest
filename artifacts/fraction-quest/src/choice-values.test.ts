import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS } from './game';
import { generateQuestions, getExtraPractice, hasGenerator } from './practice-bank';
import { lessonCheckpoint } from './checkpoint';
import { answerValue } from './learning-content';
import { withoutUnit } from './measure-units';

/* Two choices worth the same amount ("0.4 / 4 / 4.0", "2/2 liter / 4/4 liter") let a child rule out both at once, so every
   generated choice set has four (or as many as it had) choices of different values. The one exception is a choice set with
   "They are equal", which offers the two equal amounts it compares ("Which is bigger, 10/12 or 5/6?"). */
const value = (choice: string) => answerValue(withoutUnit(choice.trim()));

function clash(question: { prompt: string; choices: string[] }): string | null {
  const { prompt, choices } = question;
  if (choices.some((choice) => /\bequal\b/i.test(choice))) return null;
  for (let i = 0; i < choices.length; i++) for (let j = i + 1; j < choices.length; j++) {
    const a = value(choices[i]!); const b = value(choices[j]!);
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 1e-9) continue;
    return `${prompt} | ${choices.join(' / ')}`;
  }
  return null;
}

describe('generated choices all have different values', () => {
  it('never offers two choices of equal value, over 40 seeds of every generator, Practice more and every Check-in', () => {
    const bad = new Map<string, string>(); let asked = 0;
    for (const mission of MISSIONS) {
      if (!hasGenerator(mission.id)) continue;
      const ids = mission.questions.map((question) => question.id);
      const sets = [getExtraPractice(mission.id, ids), lessonCheckpoint(mission)];
      for (let seed = 0; seed < 40; seed++) {
        const made = generateQuestions(mission.id, ids, seed * 4111 + 7, 12);
        assert.equal(made.length, 12, `${mission.id} seed ${seed}: a full set of questions`);
        sets.push(made);
      }
      for (const question of sets.flat()) {
        asked++;
        assert.ok(question.choices.length >= 2 && question.correctChoice < question.choices.length, `${mission.id}: ${question.prompt}`);
        const found = clash(question);
        if (found) bad.set(`${mission.id}: ${found.replace(/\d+/g, '#')}`, `${mission.id}: ${found}`);
      }
    }
    assert.ok(asked > 30000, `checked ${asked} questions`);
    assert.deepEqual([...bad.values()].slice(0, 20), [], `${bad.size} kinds of question offer two choices of equal value`);
  });
});
