/* A wrong worksheet answer is answered for the pick the child made (not one sentence for every pick), and a right answer
   always says why when the row has a reason to give. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { getWorksheet } from './learning-content';
import { misconceptionWrongs } from './misconceptions';
import { fractionMistakes } from './fraction-slips';
import { worksheetWhy, worksheetWrongReason } from './wrong-answer';
import { WHY } from './slip-reasons';

describe('worksheet feedback', () => {
  it('names the slip behind a wrong worksheet answer', () => {
    assert.equal(worksheetWrongReason('1/3 + 1/6 = ?', '3/6', '2/9'), WHY.acrossAdd);
    assert.equal(worksheetWrongReason('What is 2 groups of 3/8?', '6/8', '6/16'), WHY.onlyTop);
    assert.equal(worksheetWrongReason('Some made-up question with no known slip', '7', '8'), null);
  });

  it('has a reason for every known slip on every worksheet row, so the reply is about that pick', () => {
    let picks = 0; const silent: string[] = [];
    for (const m of MISSIONS) for (let variant = 0; variant < 3; variant++) for (const row of getWorksheet(m.id, variant)) {
      for (const pick of [...misconceptionWrongs(row.prompt, row.answer), ...fractionMistakes(row.prompt, row.answer)]) {
        picks++;
        if (!worksheetWrongReason(row.prompt, row.answer, pick)) silent.push(`${m.id}: ${row.prompt} / ${pick}`);
      }
    }
    assert.ok(picks > 5000, `only ${picks} slip picks`);
    assert.deepEqual(silent.slice(0, 5), []);
  });

  it('after a right answer shows the row\'s why, else its hint when the hint is a statement', () => {
    assert.equal(worksheetWhy({ why: 'Because.', hint: 'Count the parts.' }), 'Because.');
    assert.equal(worksheetWhy({ hint: 'Count the parts, not the cuts.' }), 'Count the parts, not the cuts.');
    assert.equal(worksheetWhy({ hint: 'What was 4 multiplied by to make 12?' }), undefined);
    assert.equal(worksheetWhy({ hint: 'What was 4 multiplied by to make 12? Multiply the numerator by the same number.' }), undefined);
  });

  it('gives a why to most worksheet rows now (it was 4 percent)', () => {
    let rows = 0; let withWhy = 0;
    for (const m of MISSIONS) for (const row of getWorksheet(m.id)) { rows++; if (worksheetWhy(row)) withWhy++; }
    assert.ok(withWhy / rows >= 0.85, `${withWhy} of ${rows} rows have a why`);
  });

  it('gives every worksheet row, on the lesson sheet and its redo sheets, its own why that is not the hint again', () => {
    // 1145 rows used to show the hint as the "why" and 266 had none (rescore 3).
    const missing: string[] = []; const echo: string[] = [];
    for (const m of MISSIONS) for (let variant = 0; variant < 5; variant++) for (const row of getWorksheet(m.id, variant)) {
      const why = row.why?.trim();
      if (!why) { missing.push(`${m.id} v${variant}: ${row.prompt}`); continue; }
      if (why === row.hint.trim() || row.hint.includes(why)) echo.push(`${m.id} v${variant}: ${row.prompt} / ${why}`);
    }
    assert.deepEqual(missing.slice(0, 8), [], `${missing.length} rows have no why`);
    assert.deepEqual(echo.slice(0, 8), [], `${echo.length} rows repeat the hint as the why`);
  });
});
