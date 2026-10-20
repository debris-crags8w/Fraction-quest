import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { prove, type ProofItem } from './proof';
import { allProofItems } from './proof-items';

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
    fails({ ...base, prompt: 'A jug is 6/10 full. Is that more or less than half?', choices: ['Less than half', 'More than half'], correct: 0 }, 'hand-checked key');
  });
});
