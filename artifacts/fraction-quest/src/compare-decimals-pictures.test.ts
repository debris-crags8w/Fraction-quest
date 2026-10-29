import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAssessmentItems, getAssessmentDefinitions } from './assessments';
import { autoPicture } from './auto-picture';
import { getWorksheet, type WorksheetProblem } from './learning-content';
import { problemPicture, type ModelSpec } from './game';

/* "Compare: 0.4 __ 0.35." must draw BOTH decimals (one bar each, the same whole, in the order of the question), in the
   worksheet, on paper and in the Check-ins. It used to draw only the first, so the child had nothing to compare it with. */

const decimalsIn = (prompt: string) => (prompt.match(/\d*\.\d+/g) ?? []).map(Number);
const hundredths = (value: number) => Math.round(value * 100);

/** The amount (in hundredths) each drawn whole shows, in order. */
function drawnHundredths(picture: ModelSpec | undefined): number[] {
  if (!picture) return [];
  if (picture.kind === 'bars') return picture.bars.map((bar) => Math.round((bar.numerator * 100) / bar.denominator));
  if (picture.kind === 'area') return [picture.shaded.length, ...(picture.more ?? []).map((figure) => figure.shaded.length)];
  return [];
}

const compareRows = (variants = 12): WorksheetProblem[] =>
  Array.from({ length: variants }, (_, variant) => getWorksheet('compare-decimals', variant)).flat();

describe('compare-decimals pictures', () => {
  it('every "Compare: a __ b" worksheet row draws both decimals, one bar each, in the order of the question', () => {
    const rows = compareRows();
    assert.ok(rows.length >= 144);
    for (const row of rows) {
      const [a, b] = decimalsIn(row.prompt);
      assert.ok(a !== undefined && b !== undefined, row.prompt);
      assert.equal(row.picture?.kind, 'bars', `${row.prompt}: a bars picture`);
      assert.deepEqual(drawnHundredths(row.picture), [hundredths(a), hundredths(b)], `${row.prompt}: both decimals drawn`);
    }
  });

  it('draws them as Practice more does: each bar cut the way its decimal is written (0.3 in tenths, 0.25 in hundredths)', () => {
    for (const row of compareRows()) {
      const drawn = autoPicture(row.prompt);
      assert.deepEqual(row.picture, drawn, row.prompt);
    }
  });

  it('never labels a bar with its fraction or marks the larger one', () => {
    for (const row of compareRows()) {
      if (row.picture?.kind !== 'bars') continue;
      assert.ok(row.picture.bars.every((bar) => !bar.named && !bar.untilAnswered), row.prompt);
      assert.equal(row.picture.hideLabels, undefined, row.prompt);
    }
  });

  it('keeps its build step: the child copies the top bar, the first decimal, before answering', () => {
    for (const row of compareRows()) {
      const top = row.picture?.kind === 'bars' ? row.picture.bars[0]! : undefined;
      assert.ok(row.modelRequired, row.prompt);
      assert.deepEqual(row.model && { n: row.model.n, d: row.model.d }, top && { n: top.numerator, d: top.denominator }, `${row.prompt}: builds the first bar drawn`);
      assert.deepEqual(row.task, { kind: 'copy', n: top!.numerator, of: 'top bar' }, row.prompt);
    }
  });

  it('shows the same two bars wherever the row is drawn again (Practice more and paper take the picture)', () => {
    for (const row of compareRows(3)) assert.deepEqual(drawnHundredths(problemPicture(row)), drawnHundredths(row.picture), row.prompt);
  });

  it('the grid lesson draws every decimal it names (one grid each)', () => {
    for (let variant = 0; variant < 12; variant++) {
      for (const row of getWorksheet('compare-decimals-grid', variant)) {
        const named = decimalsIn(row.prompt);
        if (!named.length || !/Which is more|in order/.test(row.prompt)) continue;
        assert.deepEqual(drawnHundredths(row.picture), named.map(hundredths), row.prompt);
      }
    }
  });

  it('every Check-in item that compares two decimals has the picture with both decimals', () => {
    let seen = 0;
    for (const definition of getAssessmentDefinitions()) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const item of buildAssessmentItems(definition, seed)) {
          if (item.missionId !== 'compare-decimals') continue;
          seen++;
          const [a, b] = decimalsIn(item.prompt);
          assert.deepEqual(drawnHundredths(item.problem.picture), [hundredths(a), hundredths(b)], `${definition.id}: ${item.prompt}`);
        }
      }
    }
    assert.ok(seen > 20, `compare-decimals items still reach the Check-ins (${seen})`);
  });
});
