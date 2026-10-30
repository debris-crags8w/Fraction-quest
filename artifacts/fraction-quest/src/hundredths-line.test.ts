import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAssessmentItems, getAssessmentDefinitions } from './assessments';
import { getWorksheet } from './learning-content';

/* 4.NF.6: a hundredths decimal on a number line (0.62 between 0.6 and 0.7), on the worksheet and in Check-ins. */
const lineRows = (variant: number) => getWorksheet('hundredths-decimals', variant).filter((row) => row.prompt === 'What decimal is at the dot?');

describe('hundredths on a number line', () => {
  it('every hundredths-decimals sheet has a dot on a line from one tenth to the next, and the answer is the dot', () => {
    const seen = new Set<string>();
    for (let variant = 0; variant < 25; variant++) {
      const rows = lineRows(variant);
      assert.equal(rows.length, 1, `sheet ${variant}`);
      const [row] = rows;
      const picture = row.picture;
      assert.ok(picture && picture.kind === 'line' && picture.ends, `sheet ${variant}: a drawn number line with its two ends named`);
      if (picture.kind !== 'line' || !picture.ends) continue;
      assert.equal(picture.denominator, 10, 'ten hundredths between the two tenths');
      assert.ok(picture.numerator > 0 && picture.numerator < 10, 'the dot sits between the ends, not on one');
      assert.ok(picture.hideHops, 'no hop arcs to count');
      const [from, to] = picture.ends.map(Number);
      assert.ok(Math.abs(to - from - 0.1) < 1e-9, `${picture.ends.join(' to ')} is one tenth`);
      assert.equal(Number(row.answer), Math.round((from + picture.numerator / 100) * 100) / 100, row.answer);
      assert.match(row.answer, /^0\.\d\d$/, 'a hundredths decimal');
      assert.equal(row.form, 'decimal', 'answered with number tiles');
      seen.add(row.answer);
    }
    assert.ok(seen.size >= 6, 'redo sheets bring new decimals');
  });

  it('is asked in Check-ins', () => {
    const asked = getAssessmentDefinitions().flatMap((definition) => Array.from({ length: 30 }, (_, k) => buildAssessmentItems(definition, 11 + k * 37)).flat())
      .filter((item) => item.missionId === 'hundredths-decimals' && item.prompt === 'What decimal is at the dot?');
    assert.ok(asked.length > 0, 'no Check-in asks it');
    for (const item of asked) assert.ok(item.standards.includes('4.NF.6'), item.standards.join(' '));
  });
});
