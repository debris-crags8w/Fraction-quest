import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { generateQuestions } from './practice-bank';

/* "New questions" says every round is different, so a lesson's generator must have far more than 12 questions to draw on.
   A question is counted by its calculation, not its words: the numbers it asks (in any order) and its answer, so "1 unit by
   2/4 unit" for a rug and for a tile are one question. */
const SEEDS = 40;
const idsOf = (missionId: string) => MISSIONS.find((mission) => mission.id === missionId)!.questions.map((question) => question.id);
const numbersIn = (prompt: string) => prompt.match(/\d+ \d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?/g) ?? [];
const calculation = (question: { prompt: string; choices: string[]; correctChoice: number }) => {
  const answer = question.choices[question.correctChoice].replace(/[a-z ]+$/i, '');
  const numbers = numbersIn(question.prompt);
  return numbers.length < 2 ? `${question.prompt}|${answer}` : `${[...numbers].sort().join(',')}|${answer}`;
};
const distinctQuestions = (missionId: string) => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const question of generateQuestions(missionId, idsOf(missionId), seed * 7919, 12)) seen.add(calculation(question));
  }
  return seen.size;
};

describe('New questions have a wide pool', () => {
  it('draws on at least 20 different calculations in every lesson (40 rounds; comparing unit fractions has the fewest)', () => {
    const small = MISSIONS.map((mission) => [mission.id, distinctQuestions(mission.id)] as const).filter(([, count]) => count < 20);
    assert.deepEqual(small, [], 'lessons whose "New questions" keep repeating the same few calculations');
  });

  it('has at least 30 for the eight lessons that used to repeat the same 12 to 15, and for the side-length and leveling lessons', () => {
    for (const id of ['unit-fractions', 'benchmark-half', 'add-related-fractions', 'benchmarks-zero-one', 'simplify-fractions', 'estimate-fraction-operations', 'divide-fractions', 'tenths-decimals', 'fractional-side-area', 'line-plot-leveling']) {
      const count = distinctQuestions(id);
      assert.ok(count >= 30, `${id}: only ${count} different calculations in ${SEEDS} rounds`);
    }
  });

  it('never asks one calculation twice in a round of 10 ("2/3 or 2/4" and "2/4 or 2/3"; the same sizes for a rug and a tile)', () => {
    const repeats: string[] = []; let rounds = 0;
    for (const mission of MISSIONS) for (let seed = 201; seed <= 240; seed++) {
      rounds++;
      const seen = new Map<string, string>();
      for (const question of generateQuestions(mission.id, idsOf(mission.id), seed, 10)) {
        const key = calculation(question);
        if (seen.has(key)) { repeats.push(`${mission.id} seed ${seed}: "${seen.get(key)}" / "${question.prompt}"`); break; }
        seen.set(key, question.prompt);
      }
    }
    assert.deepEqual(repeats.slice(0, 8), [], `${repeats.length} of ${rounds} rounds ask one calculation twice`);
  });
});
