/* Every reason a child hears is true for the pick it is said about (education rescore 4, section 4 a-f).
   a. "That is how many fit in one whole" only when the scoop is a unit fraction and there is at least one whole.
   b. A Practice-more right answer gives a reason: never the hint again, never a question.
   c. Named reasons for yes/no picks and the other low Practice-more lessons; "add all of them" only for a partial sum.
   d. Reasons, not checks; estimates by benchmarks; no misleading reasons; hints that do not say the answer.
   e. Every idea pick named; most plausible worksheet slips named.
   f. No dead built-in review question; no idea repeats one hint three times. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS, type PracticeQuestion } from './game';
import { SLIPS, worksheetWrongReason, wrongChoiceReason } from './wrong-answer';
import { WHY } from './slip-reasons';
import { generateQuestions } from './practice-bank';
import { getWorksheet } from './learning-content';
import { lessonCheckpoint } from './checkpoint';
import { ideaPracticeQuestions, ideaQuestion, isRound, lessonIdeas } from './lesson-ideas';

const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('a. dividing: "how many fit in one whole" only where it is true', () => {
  it('a unit scoop and at least one whole keeps the reason', () => {
    assert.equal(why('How many 1/3-cup scoops fill 2 cups? 2 ÷ 1/3 = ?', '6', '3'), WHY.oneWhole);
  });
  for (const [prompt, right, pick] of [
    ['How many 1/12 cup scoops fill 5/6 cup?', '10', '12'],
    ['How many 3/8 cup scoops fill 3/4 cup?', '2', '8'],
    ['How many 1/8 cup scoops fill 1/2 cup?', '4', '8'],
    ['How many 2/6 cup scoops fill 2/3 cup?', '2', '6'],
    ['3/5 ÷ 1/10 = ?', '6', '10'],
    ['6/10 ÷ 2/10 = ?', '3', '10'],
    ['6/8 ÷ 2/8 = ?', '3', '8'],
  ]) {
    it(`${prompt} pick ${pick} is not told to count every whole`, () => {
      const reason = why(prompt, right, pick);
      assert.ok(reason, 'the pick is still named');
      assert.notEqual(reason, WHY.oneWhole);
    });
  }
  it('less than one whole with a unit scoop says so', () => {
    assert.equal(why('How many 1/8 cup scoops fill 1/2 cup?', '4', '8'), WHY.oneWholeLess);
  });
});

describe('b. a Practice-more right answer gives its own reason', () => {
  it('no right-answer text equals or contains its hint, or asks a question', () => {
    const bad: string[] = [];
    for (const m of MISSIONS) {
      const ids = m.questions.map((q) => q.id);
      for (const seed of [977, 1954, 9001, 9137, 9271]) for (const q of generateQuestions(m.id, ids, seed, 12)) {
        const [right, hint] = [q.retryFeedback.trim(), q.hint.trim()];
        if (right === hint || right.includes(hint) || /\?/.test(right)) bad.push(`${m.id}: ${q.prompt} | ${right}`);
      }
    }
    assert.deepEqual([...new Set(bad)].slice(0, 12), []);
  });
});

const named = (id: string) => {
  const m = mission(id); const ids = m.questions.map((q) => q.id); let [all, hit] = [0, 0];
  for (const seed of [9001, 9137, 9271]) for (const q of generateQuestions(id, ids, seed, 12)) q.choices.forEach((_, i) => {
    if (i === q.correctChoice) return; all++; if (wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i)) hit++;
  });
  return hit / all;
};
const ask = (prompt: string, choices: string[], right: number, pick: number) => wrongChoiceReason(prompt, choices, right, pick);

describe('c. Practice-more wrong picks are named', () => {
  it('every lesson: at least 95% of wrong picks have a reason', () => {
    const low = MISSIONS.map((m) => [m.id, named(m.id)] as const).filter(([, share]) => share < 0.95).map(([id, share]) => `${id} ${(100 * share).toFixed(1)}%`);
    assert.deepEqual(low, []);
  });
  it('the picks that had no reason get a true one (rescore 5): near a benchmark, the other side of half, the jumps left to one, one of the two amounts', () => {
    const near = (prompt: string, right: string, pick: string) => ask(prompt, [right, pick], 0, 1);
    assert.equal(near('4/6 is near 1/2. Is it a little more or a little less?', 'A little more than 1/2', 'A little less than 1/2'), WHY.halfOfBottom);
    assert.equal(near('4/6 is near 1/2. Is it a little more or a little less?', 'A little more than 1/2', 'Exactly 1/2'), WHY.notExactHalf);
    assert.equal(near('7/8 is near 1. Is it a little more or a little less?', 'A little less than 1', 'A little more than 1'), WHY.topVsBottom);
    assert.equal(near('1/6 is near 0. Is it a little more or a little less?', 'A little more than 0', 'A little less than 0'), WHY.moreThanZero);
    assert.equal(why('Which is less than 1/2, 5/6 or 2/6?', '2/6', '5/6'), WHY.halfOfBottom);
    assert.equal(why('Each jump is 1/8. How many jumps from 0 to 5/8?', '5', '3'), WHY.jumpsToOne);
    assert.equal(why('A line has 3 equal spaces. Where is 2/3?', '2 jumps from 0', '1 jump from 0'), WHY.jumpsToOne);
    assert.equal(why('Max says 3/5 − 1/5 = 2/10. What is the right answer?', '2/5', '1/5'), WHY.takenAmount);
    assert.equal(why('Ana says 1/5 + 1/5 = 2/10. What is the right answer?', '2/5', '1/5'), WHY.oneAmount);
    assert.equal(why('Fill the blank: 4/12 = ?/3', '1', '0'), WHY.divideSame);
    assert.equal(why('Halves and eighths are different sizes. Rename 1/2 as eighths.', '4/8', '4/12'), WHY.askedDenominator);
    assert.equal(why('6 beads are shared into 3 equal groups. How many beads are in one group?', '2', '3'), WHY.groupsNotEach);
    assert.equal(why('Ana has 6 stickers. She gives away 1/2 of them. Then she gives away 1/3 of the rest. How many are left?', '2', '4'), WHY.skippedFirst);
  });
  it('equal-parts yes/no picks get their own reasons', () => {
    const fair = ['No, some parts are bigger', 'No, the shapes are different', 'Yes, same-size parts', 'Yes, it is cut into parts'];
    assert.equal(ask('Is this hexagon cut into equal parts?', fair, 2, 0), WHY.onlyLooksBigger); // a fair cut called unfair: the parts only look different
    assert.equal(ask('Is this hexagon cut into equal parts?', fair, 2, 1), WHY.shapeNotSize);
    assert.equal(ask('Is this hexagon cut into equal parts?', fair, 2, 3), WHY.cutNotEqual);
    const unfair = ['No, it is not cut', 'No, some parts are bigger', 'Yes, same-size parts', 'Yes, it is cut into parts'];
    assert.equal(ask('Is this square cut into equal parts?', unfair, 1, 0), WHY.isCut);
    assert.equal(ask('Is this square cut into equal parts?', unfair, 1, 2), WHY.lookAgainSize);
    const strip = ['No, the parts are unequal', 'No, there are 8 parts', 'Yes, all the same size', 'Yes, 6 equal parts'];
    assert.equal(ask('Is this ribbon cut into equal sixths?', strip, 1, 0), WHY.countFirst);
    assert.equal(ask('Is this ribbon cut into equal sixths?', strip, 1, 2), WHY.countFirst);
    assert.equal(ask('Is this ribbon cut into equal sixths?', strip, 1, 3), SLIPS.recountShaded);
  });
  it('"add all of them" only for a pick that is a partial sum', () => {
    const p = 'Plot these jars in eighths of a liter: 1/8, 2/8, 2/8, 7/8 liter. How much water in all?';
    assert.equal(why(p, '12/8', '5/8'), WHY.allAmounts); // 1 + 2 + 2
    assert.notEqual(why(p, '12/8', '13/8'), WHY.allAmounts);
    assert.notEqual(why(p, '12/8', '12/9'), WHY.allAmounts);
    assert.ok(why(p, '12/8', '13/8') && why(p, '12/8', '12/9'));
  });
});

const sheets = (id: string) => [0, 1, 2, 3, 4].flatMap((v) => getWorksheet(id, v));
describe('d. reasons, not checks; estimates by benchmarks', () => {
  it('no worksheet why is a bare "Check: …"', () => {
    const bad = MISSIONS.flatMap((m) => sheets(m.id).filter((r) => /^Check:/.test((r.why ?? '').trim())).map((r) => `${m.id}: ${r.why}`));
    assert.deepEqual([...new Set(bad)].slice(0, 6), []);
  });
  it('estimate whys never work out the exact sum or difference', () => {
    const rows = sheets('estimate-fraction-operations').filter((r) => /^Without finding/.test(r.prompt));
    assert.ok(rows.length > 10);
    for (const r of rows) {
      assert.doesNotMatch(r.why ?? '', /\d+\/\d+ [+−] \d+\/\d+ =/, r.why);
      assert.match(r.why ?? '', /1\/2|less than 1|more than 1/, r.why);
    }
  });
  it('estimate checkpoint and Practice-more right answers give a reason, and a difference gets no "two halves" hint', () => {
    const m = mission('estimate-fraction-operations');
    const qs = [...lessonCheckpoint(m), ...[1, 2, 3, 4, 5].flatMap((s) => generateQuestions(m.id, m.questions.map((q) => q.id), s * 131, 12))]
      .filter((q) => /^Without finding/.test(q.prompt));
    assert.ok(qs.length > 5);
    for (const q of qs) {
      assert.doesNotMatch(q.retryFeedback, /^[\d/ +−]+ is (?:less|more) than 1\.$/, q.retryFeedback);
      if (/difference/.test(q.prompt)) assert.doesNotMatch(q.hint, /halves/, q.hint);
    }
  });
});

describe('d. no misleading reasons, no bare right answers', () => {
  it('3 × 1/3 picked as 1/3: the groups come from the whole number, not a numerator', () => {
    for (const [p, r, k] of [['3 × 1/3 = ?', '3/3', '1/3'], ['What is 3 groups of 2/3?', '6/3', '2/3']]) {
      const reason = why(p, r, k);
      assert.ok(reason); assert.doesNotMatch(reason!, /numerator/);
    }
  });
  it('"7/10 = 5/10 + what?" picked as 12/10 is not told to look at a sign that is +', () => {
    const reason = why('7/10 = 5/10 + what?', '2/10', '12/10');
    assert.ok(reason); assert.doesNotMatch(reason!, /sign|takes away/);
  });
  it('the boxes outside an overlap are not "the part not colored"', () => {
    assert.equal(why('A square has 2 rows and 6 columns. Shade 1 row and 5 columns. How many boxes are in the overlap?', '5', '7'), WHY.outsideOverlap);
  });
  it('no right answer only restates the answer', () => {
    const bare = /^[\d/ +−×]+ is (less|more|greater) than [\d/]+\.$|^[\d/]+ is (nearer|closest to|closer to) [\d/]+\.$|^[\d/]+ (covers|is) the same (amount )?as [\d/]+\.$|^[\d/]+ and [\d/]+ are the same amount\.$/;
    const bad = MISSIONS.flatMap((m) => [...lessonCheckpoint(m), ...ideaPracticeQuestions(m).filter((q) => q.prompt)]
      .filter((q) => bare.test(q.retryFeedback.trim())).map((q) => `${m.id}: ${q.prompt} -> ${q.retryFeedback}`));
    assert.deepEqual(bad, []);
  });
});

describe('accuracy rescore 4: N4 and N5 reasons', () => {
  const whole = ['1/4 + 1/4', '2/5 + 1/5', '1/3 + 2/3', '1/3 + 3/3'];
  it('N4: a same-size sum that is not one whole is told so, not "a different size"', () => {
    for (const pick of [0, 1, 3]) {
      const reason = ask('Which sum makes one whole?', whole, 2, pick);
      assert.ok(reason); assert.notEqual(reason, WHY.sumOtherSize);
    }
    assert.equal(ask('Which sum makes one whole?', whole, 2, 0), WHY.notOneWhole);
  });
  it('N5: "How many Xs go on the line plot?" asks for every X, not one length', () => {
    const reason = ask('Ribbons are 1/4, 2/4, 3/4 and 4/4 inch long. How many Xs go on the line plot?', ['3', '1', '4', '5'], 2, 3);
    assert.equal(reason, WHY.oneXEvery);
  });
  it('N5: when one fraction already has the shared denominator, only the other is renamed', () => {
    assert.equal(why('2/4 + 14/16 = ?', '22/16', '16/16'), WHY.renameOther);
    assert.equal(why('1/3 + 1/4 = ?', '7/12', '2/4'), WHY.keptOne);
  });
});

describe('e. idea picks and worksheet slips are named', () => {
  it('every wrong pick on a lesson or idea question has a reason', () => {
    const none: string[] = [];
    for (const m of MISSIONS) for (const q of [...m.questions, ...(m.ideaQuestions ?? [])]) q.choices.forEach((c, i) => {
      if (i !== q.correctChoice && !wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i)) none.push(`${q.id}: ${q.prompt} | ${c}`);
    });
    assert.deepEqual(none, []);
  });
  it('more than 70% of the likely worksheet slips are named', () => {
    let [all, hit] = [0, 0];
    for (const m of MISSIONS) for (let v = 0; v < 3; v++) for (const r of getWorksheet(m.id, v)) {
      const f = /^(\d+)\/(\d+)$/.exec(r.answer); const picks: string[] = [];
      if (f) { const [a, b] = [+f[1], +f[2]]; if (a !== b) picks.push(`${b}/${a}`); picks.push(`${a + 1}/${b}`); if (a > 1) picks.push(`${a - 1}/${b}`); }
      else if (/^\d+$/.test(r.answer)) { const n = +r.answer; picks.push(String(n + 1)); if (n > 1) picks.push(String(n - 1)); }
      for (const p of picks) { all++; if (worksheetWrongReason(r.prompt, r.answer, p)) hit++; }
    }
    assert.ok(hit / all > 0.7, `${(100 * hit / all).toFixed(1)}%`);
  });
});

describe('f. hints vary inside an idea', () => {
  it('no idea gives the same hint on all three practices', () => {
    const same: string[] = [];
    for (const m of MISSIONS) (lessonIdeas(m.id) ?? []).forEach((idea, i) => {
      const hints = idea.practice.filter((p) => !isRound(p)).map((p) => ideaQuestion(m, (p as { question: string }).question)?.hint.trim());
      if (hints.length >= 3 && new Set(hints).size === 1) same.push(`${m.id} idea ${i + 1}: ${hints[0]}`);
    });
    assert.deepEqual(same, []);
  });
});

describe('the two percent lessons do not mirror each other', () => {
  it('percent-to-fraction never asks the inverse of what fractions-to-percent just asked', () => {
    const value = (text: string) => { const m = /(\d+)%|(\d+)\/(\d+)/.exec(text)!; return m[1] ? Number(m[1]) / 100 : Number(m[2]) / Number(m[3]); };
    const answers = (qs: { choices: string[]; correctChoice: number }[]) => new Set(qs.map((q) => value(q.choices[q.correctChoice]).toFixed(4)));
    const [earlier, later] = [mission('fractions-to-percent'), mission('percent-to-fraction')];
    const mirrored = (qs: PracticeQuestion[], against: Set<string>) => qs.filter((q) => against.has(value(q.choices[q.correctChoice]).toFixed(4))).map((q) => `${q.prompt} => ${q.choices[q.correctChoice]}`);
    // The lesson's own questions (same worksheet positions) against everything the lesson before asked; its checkpoint
    // against the lesson before's last question and checkpoint.
    assert.deepEqual(mirrored(later.questions, answers([...earlier.questions, ...lessonCheckpoint(earlier)])), []);
    assert.deepEqual(mirrored(lessonCheckpoint(later), answers([earlier.questions.at(-1)!, ...lessonCheckpoint(earlier)])), []);
  });
});
