/* Worksheet rows (every redo sheet, which Check-ins and print use too) get a picture that shows the amounts they name
   (wave 3). A sum or difference of fractions never shows only empty bars: "4 1/3 − 2 1/2" used to draw 6 empty bars
   because 4 1/3 is too long for a bar. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS, problemPicture } from './game';
import { getWorksheet } from './learning-content';

describe('worksheet row pictures', () => {
  it('no sum or difference of fractions is pictured with only empty bars', () => {
    const bad = new Set<string>();
    for (const mission of MISSIONS) for (let variant = 0; variant <= 12; variant++) for (const problem of getWorksheet(mission.id, variant)) {
      if (!/\d\/\d+ [+−] (?:\d+ )?\d+\/\d+/.test(problem.prompt)) continue;
      const picture = problemPicture(problem);
      if (picture.kind === 'bars' && picture.bars.every((bar) => bar.numerator === 0)) bad.add(`${mission.id}: ${problem.prompt}`);
    }
    assert.deepEqual([...bad], []);
  });
});
