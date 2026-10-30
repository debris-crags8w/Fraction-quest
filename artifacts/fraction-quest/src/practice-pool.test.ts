import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { generateQuestions } from './practice-bank';

/* "New questions" says every round is different, so a lesson's generator must have far more than 12 questions to draw on. */
const SEEDS = 40;
const distinctQuestions = (missionId: string) => {
  const ids = MISSIONS.find((mission) => mission.id === missionId)!.questions.map((question) => question.id);
  const seen = new Set<string>();
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const question of generateQuestions(missionId, ids, seed * 7919, 12)) seen.add(`${question.prompt}|${question.choices[question.correctChoice]}`);
  }
  return seen.size;
};

describe('New questions have a wide pool', () => {
  it('draws on at least 30 different questions in every lesson (40 rounds)', () => {
    const small = MISSIONS.map((mission) => [mission.id, distinctQuestions(mission.id)] as const).filter(([, count]) => count < 30);
    assert.deepEqual(small, [], 'lessons whose "New questions" keep repeating the same few');
  });

  it('has at least 30 for the eight lessons that used to repeat the same 12 to 15', () => {
    for (const id of ['unit-fractions', 'benchmark-half', 'add-related-fractions', 'benchmarks-zero-one', 'simplify-fractions', 'estimate-fraction-operations', 'divide-fractions', 'tenths-decimals']) {
      const count = distinctQuestions(id);
      assert.ok(count >= 30, `${id}: only ${count} different questions in ${SEEDS} rounds`);
    }
  });
});
