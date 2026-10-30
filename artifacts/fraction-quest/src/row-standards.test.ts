import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assessmentItemCount, buildAssessmentItems, getAssessmentDefinitions } from './assessments';
import { getWorksheet } from './learning-content';
import { standardsForMission } from './standard-catalog';

const rowsOf = (id: string) => Array.from({ length: 25 }, (_, variant) => getWorksheet(id, variant)).flat();
const has = (row: { standards?: string[] }, standard: string) => !!row.standards?.includes(standard);

describe('a worksheet row carries the standards it really tests, not the whole lesson list', () => {
  it('spot-the-mistake does not claim 4.NF.2: no row compares fractions with unlike denominators', () => {
    assert.ok(!standardsForMission('spot-the-mistake').includes('4.NF.2'));
    for (const row of rowsOf('spot-the-mistake')) assert.ok(!has(row, '4.NF.2'), row.prompt);
  });

  it('equal-parts claims 3.G.2 only on the rows that show a shape', () => {
    const rows = rowsOf('equal-parts');
    assert.ok(rows.some(row => row.area) && rows.some(row => !row.area));
    for (const row of rows) assert.equal(has(row, '3.G.2'), !!row.area, row.prompt);
    for (const row of rows) assert.ok(has(row, '3.NF.1'), row.prompt);
  });

  it('improper-fractions claims 3.NF.3c only on its whole-number rows (4/4 beside 1, 3 = 3/1, 8/4 = 2), and has all three on every sheet', () => {
    const kinds = {
      same: (prompt: string) => { const same = /^Put <, = or > in the gap: (\d+)\/(\d+) __ 1\.$/.exec(prompt); return !!same && same[1] === same[2]; },
      overOne: (prompt: string) => /^Write \d+ as a fraction with a denominator of 1\.$/.test(prompt),
      wholes: (prompt: string) => /^How many wholes are \d+\/\d+\?$/.test(prompt),
    };
    for (let variant = 0; variant < 25; variant++) {
      const rows = getWorksheet('improper-fractions', variant);
      for (const [kind, test] of Object.entries(kinds)) assert.ok(rows.some((row) => test(row.prompt)), `sheet ${variant} has no ${kind} row`);
      for (const row of rows) {
        const isWhole = Object.values(kinds).some((test) => test(row.prompt));
        assert.equal(has(row, '3.NF.3c'), isWhole, row.prompt);
        assert.ok(has(row, '3.NF.2b') || isWhole, row.prompt);
      }
    }
  });

  it('find-the-whole counts 5.NF.7b only when the part is one unit fraction (1/b of it)', () => {
    let unit = 0; let stretch = 0;
    for (const row of rowsOf('find-the-whole')) {
      const fraction = /(\d+)\/(\d+)/.exec(row.prompt)!;
      const isUnit = fraction[1] === '1';
      if (isUnit) unit++; else stretch++;
      assert.equal(has(row, '5.NF.7b'), isUnit, row.prompt);
    }
    assert.ok(unit > 0 && stretch > 0);
  });

  it('multiply-whole-by-fraction claims 4.NF.4a only on the n x 1/b rows', () => {
    let unit = 0; let other = 0;
    for (const row of rowsOf('multiply-whole-by-fraction')) {
      const isUnit = /^\d+ × 1\/\d+ = \?$/.test(row.prompt);
      if (isUnit) unit++; else other++;
      assert.equal(has(row, '4.NF.4a'), isUnit, row.prompt);
      assert.ok(has(row, '4.NF.4b'), row.prompt);
    }
    assert.ok(unit > 0 && other > 0);
  });
});

describe('Check-ins', () => {
  const definitions = getAssessmentDefinitions();
  const seeds = Array.from({ length: 30 }, (_, k) => 11 + k * 37);

  it('every form asks every standard it lists, in every seed (Grade 4 End has 14 standards)', () => {
    const grade4End = definitions.find(item => item.id === 'grade-4-end')!;
    assert.ok(grade4End.standards.length > 12);
    assert.equal(assessmentItemCount(grade4End), grade4End.standards.length);
    for (const definition of definitions) for (const seed of seeds) {
      const items = buildAssessmentItems(definition, seed);
      assert.equal(items.length, assessmentItemCount(definition), `${definition.id} ${seed}`);
      const missing = definition.standards.filter(standard => !items.some(item => item.standards.includes(standard)));
      assert.deepEqual(missing, [], `${definition.id} seed ${seed}`);
    }
  });

  it('asks shapes (fraction-of-area) and the decimal grids (compare-decimals-grid) somewhere', () => {
    const asked = new Set<string>();
    const shapeInGrade3 = { count: 0 };
    for (const definition of definitions) for (const seed of seeds) for (const item of buildAssessmentItems(definition, seed)) {
      asked.add(item.missionId);
      if (definition.id === 'grade-3-end' && item.standards.includes('3.G.2') && item.problem.area) shapeInGrade3.count++;
    }
    assert.ok(asked.has('fraction-of-area'), 'fraction-of-area is asked');
    assert.ok(asked.has('compare-decimals-grid'), 'compare-decimals-grid is asked');
    assert.ok(shapeInGrade3.count > 0, 'Grade 3 End asks 3.G.2 on a shape');
  });

  it('a read-only shape or decimal grid row in a Check-in has something to show', () => {
    for (const definition of definitions) for (const seed of seeds) for (const item of buildAssessmentItems(definition, seed)) {
      const p = item.problem;
      const hasPicture = p.model || p.area || p.rulerTask || p.linePlotTask || p.scaleTask || item.visualFractions || p.picture;
      assert.ok(hasPicture, `${definition.id} ${seed}: ${item.prompt}`);
      if (item.visualFractions) assert.ok(item.visualFractions.length > 0, item.prompt);
    }
  });
});
