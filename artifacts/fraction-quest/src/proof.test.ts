import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { falseClaims, prove, writtenClaims, type ProofItem } from './proof';
import { allProofItems, allWrittenTexts, exampleAnswer, gameProofItems } from './proof-items';
import { AREA_CUTS, pieceArea } from './area-shapes';
import { PART_FINDER_ROUNDS } from './part-finder';

describe('accuracy proof engine', () => {
  it('solves every question the app can ask again, and agrees with every answer', () => {
    const items = allProofItems();
    assert.ok(items.length > 15_000, `only ${items.length} questions`);
    const unsolved: string[] = []; const wrong: string[] = [];
    for (const item of items) {
      const result = prove(item);
      const where = `${item.source} · ${item.lesson}: ${item.prompt}`;
      if (result === null) unsolved.push(where);
      else if (!result.ok) wrong.push(`${where} — ${result.why} (${result.rule})`);
    }
    assert.deepEqual(wrong, [], `${wrong.length} answers disagree with the proof engine:\n${wrong.slice(0, 15).join('\n')}`);
    assert.deepEqual(unsolved, [], `${unsolved.length} questions have no proof rule. Add a rule to proof.ts, or work the question out `
      + `by hand and add it to proof-key.ts:\n${unsolved.slice(0, 15).join('\n')}`);
  });

  it('gives every multiple-choice question distinct choices and a valid right answer', () => {
    for (const item of allProofItems({ sheets: 0, seeds: 2, checkInSeeds: [] })) {
      if (!item.choices) continue;
      const where = `${item.source} · ${item.lesson}: ${item.prompt}`;
      assert.equal(new Set(item.choices.map((c) => c.trim())).size, item.choices.length, `${where}: a choice is repeated`);
      assert.ok(item.correct !== undefined && item.correct >= 0 && item.correct < item.choices.length, `${where}: no right choice`);
    }
  });

  it('checks every sum written in an explanation, hint, feedback line, intro or story', () => {
    const texts = allWrittenTexts();
    const claims = texts.reduce((count, { text }) => count + writtenClaims(text).length, 0);
    assert.ok(claims > 4000, `only ${claims} written sums found`);
    const wrong = texts.flatMap(({ where, text }) => falseClaims(text).map((claim) => `${where}: ${claim} («${text}»)`));
    assert.deepEqual([...new Set(wrong)], [], 'written sums that are not true');
  });

  it('also reads Learn pages, scene text, word cards, wrong-tap reasons and Check-in hints', () => {
    const texts = allWrittenTexts();
    const kinds = (where: string) => where.replace(/^Check-in \S+ /, 'Check-in ').replace(/^[a-z0-9-]+ /, '');
    const claimsBy = new Map<string, number>(); const countBy = new Map<string, number>();
    for (const { where, text } of texts) { const k = kinds(where); countBy.set(k, (countBy.get(k) ?? 0) + 1); claimsBy.set(k, (claimsBy.get(k) ?? 0) + writtenClaims(text).length); }
    for (const [kind, least] of [['Learn page', 400], ['Learn scene', 1000], ['Teach scene', 800], ['word card', 50], ['wrong-tap reason', 20_000], ['Check-in hint', 500], ['Find my level hint', 50]] as const)
      assert.ok((countBy.get(kind) ?? 0) >= least, `only ${countBy.get(kind) ?? 0} ${kind} texts are checked`);
    assert.ok((claimsBy.get('Learn scene') ?? 0) > 400 && (claimsBy.get('Teach scene') ?? 0) > 250, 'the sums in scene text are read');
    assert.ok(texts.length > 60_000, `only ${texts.length} texts`);
  });

  it('also reads the story: chapter text, secrets, the finale and the film labels', () => {
    const count = (prefix: string) => allWrittenTexts({ sheets: 0, seeds: 1 }).filter(({ where }) => where.startsWith(prefix)).length;
    for (const [prefix, least] of [['story chapter', 400], ['story secret', 80], ['story finale', 8], ['story opening', 1], ['film label', 60]] as const)
      assert.ok(count(prefix) >= least, `only ${count(prefix)} ${prefix} texts are checked`);
  });

  it('also reads the wrong-choice reasons each challenge puzzle carries', () => {
    const reasons = allWrittenTexts({ sheets: 0, seeds: 1 }).filter(({ where }) => /^challenge unit \d+ wrong-choice reason$/.test(where));
    assert.ok(reasons.length >= 44, `only ${reasons.length} challenge wrong-choice reasons are checked`);
  });

  it('reads written sums the way a child does (the claim checker itself is checked)', () => {
    // A sum a story character gets wrong on purpose is not a false claim; a blank to fill is not a sum yet.
    assert.deepEqual(falseClaims('Sam wrote 1/4 + 2/4 = 3/8.'), []);
    assert.deepEqual(falseClaims('1/4 + 2/4 = 3/8.'), ['1/4 + 2/4 = 3/8']);
    assert.deepEqual(falseClaims('5/6 = 1/6 + ?/6. The ? is the missing number. So 5/6 = 1/6 + 4/6.'), []);
    assert.deepEqual(falseClaims('1/4 + 2/4 = 3/8.'), ['1/4 + 2/4 = 3/8']);
    assert.deepEqual(falseClaims('So 2 × 3 = 7 cakes.'), ['2 × 3 = 7']);
    assert.deepEqual(falseClaims('0.5 = 5 hundredths.'), ['0.5 = 5']);
    assert.deepEqual(falseClaims('3/4 × 2/3 = 6/12 = 2/3'), ['3/4 × 2/3 = 6/12 = 2/3']);
    for (const right of ['3/4 = 9/12 and 5/6 = 10/12.', '8 − 1 − 2 = 5 slices left.', '0.7 = 70 hundredths.', '1 + 1 + 2 + 3 = 7 fourths.',
      '2/5 = 40% and 0.3 = 30%. 100% − 40% − 30% = 30%.', '12 ÷ 4 = 3.', '7/4 = 1 3/4.', '1 and 3/4 = 7/4.']) assert.deepEqual(falseClaims(right), [], right);
    // A sum at the end of a sentence is still read, not skipped.
    assert.deepEqual(writtenClaims('That is 3 × 2/3 = 6/3. So 2 cups.'), ['3 × 2/3 = 6/3']);
    assert.deepEqual(writtenClaims('1 fourth + 2 fourths = 3 fourths.'), [], 'words are left alone');
  });

  it('turns each game round into its question with the game\'s own answer', () => {
    const games = gameProofItems();
    for (const source of ['Fraction War', 'Fraction Line-Up', 'Frog Hop', 'Stack Tower']) assert.ok(games.some((item) => item.source === source), source);
    assert.ok(games.every((item) => !/orders accepted/.test(item.answer ?? '')), 'every Line-Up round has exactly one right order');
    assert.equal(exampleAnswer('Which is bigger, 1/3 or 1/8?', '1/3 is bigger.'), '1/3');
    assert.equal(exampleAnswer('Each jump is 1/4. What is 7 jumps from 0?', '7/4, or 1 and 3/4.'), '7/4');
    assert.equal(exampleAnswer('Fill the blank: 2/3 = ?/6', '4/6'), '4');
  });

  it('checks that every Part Finder cake can really be shared, matched and tiled', () => {
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    for (const round of PART_FINDER_ROUNDS) {
      const areas = AREA_CUTS[round.cut].map(pieceArea);
      assert.ok(near(areas.reduce((a, b) => a + b, 0), 1), `${round.id}: the pieces make one whole cake`);
      if (round.mode === 'sort') {
        // Put the pieces into round.shares equal shares (a search over every way to deal them out).
        const shares = round.shares!; const goal = 1 / shares;
        const deal = (i: number, totals: number[]): boolean => i === areas.length ? totals.every((t) => near(t, goal))
          : totals.some((t, s) => t + areas[i] <= goal + 1e-9 && deal(i + 1, totals.map((u, k) => (k === s ? u + areas[i] : u))));
        assert.ok(near(round.targetArea, goal) && deal(0, Array(shares).fill(0)), `${round.id}: ${shares} equal shares exist`);
      } else if (round.mode === 'tile') {
        for (const area of areas) assert.ok(near(area * Math.round(1 / area), 1), `${round.id}: a piece of ${area} tiles the cake`);
      } else {
        const sums = areas.reduce((set, area) => new Set([...set, ...[...set].map((t) => t + area)]), new Set([0]));
        assert.ok([...sums].some((t) => near(t, round.targetArea)), `${round.id}: some pieces make ${round.targetArea}`);
      }
    }
  });

  it('catches planted mistakes (the checker itself is checked)', () => {
    const base = { source: 'test', lesson: 'test' };
    const fails = (item: ProofItem, label: string) => { const r = prove({ ...base, ...item }); assert.ok(r && !r.ok, `${label}: ${JSON.stringify(r)}`); };
    const passes = (item: ProofItem, label: string) => { const r = prove({ ...base, ...item }); assert.ok(r?.ok, `${label}: ${JSON.stringify(r)}`); };
    passes({ ...base, prompt: '2/3 − 1/3 = ?', answer: '1/3' }, 'right difference');
    fails({ ...base, prompt: '2/3 − 1/3 = ?', answer: '2/3' }, 'wrong difference');
    fails({ ...base, prompt: 'Write 4/8 in simplest form.', answer: '2/4' }, 'not simplest');
    fails({ ...base, prompt: 'Write 1/2 with a denominator of 8.', answer: '1/2' }, 'wrong denominator');
    fails({ ...base, prompt: 'Put 1/4, 3/4, 2/4 in order, smallest first.', answer: '1/4, 3/4, 2/4' }, 'wrong order');
    fails({ ...base, prompt: 'Put <, = or > in the gap: 3/4 __ 2/3.', answer: '<' }, 'wrong sign');
    fails({ ...base, prompt: 'Which is bigger, 1/3 or 1/4?', choices: ['1/3', '1/4', '1/5', '1/6'], correct: 1 }, 'wrong choice');
    fails({ ...base, prompt: 'Which is the same as 1/2?', choices: ['2/4', '3/6', '1/3', '2/3'], correct: 0 }, 'two right choices');
    fails({ ...base, prompt: 'What fraction is shaded?', answer: '2/5', pictures: [{ kind: 'bar', n: 3, d: 5 }] }, 'picture disagrees');
    fails({ ...base, prompt: 'Is this square cut into equal parts?', answer: 'yes', pictures: [{ kind: 'area', cut: 'fourths-unequal' }] }, 'unequal parts');
    passes({ ...base, prompt: 'Is this square cut into equal parts?', answer: 'yes', pictures: [{ kind: 'area', cut: 'fourths-mixed' }] }, 'mixed fourths are equal');
    fails({ ...base, prompt: 'Make 2/8 + 3/8.', target: { kind: 'bar', n: 6, d: 8 } }, 'wrong build');
    fails({ ...base, prompt: 'Which is closest to 1/2?', choices: ['3/8', '5/8', '1/8', '7/8'], correct: 0 }, 'tie between choices');
    fails({ ...base, prompt: 'How many minutes are in 3/4 hour?', answer: '40' }, 'wrong conversion');
    fails({ ...base, prompt: 'A jug is 4/6 full. Is that more or less than half?', choices: ['Less than half', 'More than half'], correct: 0 }, 'hand-checked key');
    // The picture is read for adding, subtracting and comparing too.
    const bars = (...fractions: [number, number][]) => ({ kind: 'bars' as const, bars: fractions.map(([numerator, denominator]) => ({ numerator, denominator })) });
    const sign = { prompt: 'Pick the sign: 3/4 __ 2/3', choices: ['3/4 < 2/3', '3/4 = 2/3', '3/4 > 2/3', "You can't tell"], correct: 2 };
    passes({ ...base, ...sign, pictures: [bars([3, 4], [2, 3])] }, 'comparison picture draws both amounts');
    fails({ ...base, ...sign, pictures: [bars([3, 4], [1, 5])] }, 'comparison picture draws another fraction');
    fails({ ...base, ...sign, pictures: [bars([3, 4])] }, 'comparison picture leaves out one amount');
    passes({ ...base, prompt: 'Compare: 0.3 __ 0.25.', answer: '>', pictures: [bars([30, 100])] }, 'a worksheet row may draw the first amount only');
    fails({ ...base, prompt: 'Compare: 0.3 __ 0.25.', answer: '>', pictures: [bars([7, 8])] }, 'a worksheet picture for other numbers');
    const sum = { prompt: '2/5 + 1/5 = ?', choices: ['3/5', '3/10', '2/5', '1/5'], correct: 0 };
    passes({ ...base, ...sum, pictures: [bars([2, 5])] }, 'a sum picture draws an amount that is added');
    fails({ ...base, ...sum, pictures: [bars([4, 7])] }, 'a sum picture for other numbers');
    fails({ ...base, prompt: '2/5 + 1/5 = ?', answer: '3/5', pictures: [bars([3, 5], [3, 5])] }, 'a sum picture that shows only the answer');
    fails({ ...base, prompt: 'Which is bigger, 1/3 or 1/4?', choices: ['1/3', '1/4', 'They are equal', "You can't tell"], correct: 0, pictures: [bars([1, 3], [1, 8])] }, 'a bigger-or-smaller picture of other numbers');
  });
});
