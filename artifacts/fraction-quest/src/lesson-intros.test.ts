import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { LESSON_INTROS, lessonIntroScript } from './lesson-intros';

describe('Teach first intros', () => {
  it('gives every lesson a goal, two or three steps and why the method works', () => {
    assert.deepEqual(Object.keys(LESSON_INTROS).sort(), MISSIONS.map((mission) => mission.id).sort(), 'one intro per lesson');
    for (const mission of MISSIONS) {
      const intro = LESSON_INTROS[mission.id];
      assert.match(intro.heading, /^How /, `${mission.id}: the heading says how`);
      assert.ok(intro.steps.length >= 2 && intro.steps.length <= 3, `${mission.id}: two or three steps`);
      for (const line of [intro.goal, ...intro.steps, intro.why]) {
        assert.ok(line.length <= 160, `${mission.id}: "${line}" is short`);
        assert.match(line, /[.?]$|[.?]”\.?$|”\.$/, `${mission.id}: "${line}" ends a sentence`);
        assert.doesNotMatch(line, /\s{2}/);
      }
    }
  });

  it('reads the goal, each step and why as one Listen script', () => {
    const intro = LESSON_INTROS['add-like-denominators'];
    assert.equal(lessonIntroScript(intro), 'Add fractions with the same denominator, like 1/4 + 2/4. Check that the denominators match. Add the numerators. Keep the denominator. The parts are the same size, so you are just counting more of them. The size of each part does not change.');
  });
});
