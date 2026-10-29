/* A wrong tap gets the exact, true reason for that wrong choice (package J).
   1. Same-numerator "which is bigger" questions say the bottom-number idea; no comparison question falls back to a
      generic reply.
   2. A specific real-slip reason beats the general counting heuristics unless the question is a shading count.
   3. "Find the whole": one part is not the whole. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { generateQuestions } from './practice-bank';
import { SLIPS, wrongChoiceReason } from './wrong-answer';
import { WHY } from './slip-reasons';

const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
const keyOf = (text: string | null) => {
  if (!text) return text;
  const hit = [...Object.entries(WHY).map(([k, v]) => [`WHY.${k}`, v]), ...Object.entries(SLIPS).map(([k, v]) => [`SLIPS.${k}`, v])]
    .find(([, v]) => v === text);
  return hit ? hit[0] : `text:${text}`;
};
const expectKey = (prompt: string, right: string, pick: string, key: string) =>
  assert.equal(keyOf(why(prompt, right, pick)), key, `${prompt} / pick ${pick}`);

/** [prompt, right answer, wrong pick, the reason key it now gets] */
const TABLE: [string, string, string, string][] = [
  // 1. Bigger denominator is not a bigger fraction (same numerator, unit fractions too), picking either way.
  ['Which is bigger, 1/4 or 1/6?', '1/4', '1/6', 'WHY.bigBottom'],
  ['Which part is bigger, 1/4 or 1/6?', '1/4', '1/6', 'WHY.bigBottom'],
  ['Which is smaller: 1/3 or 1/6?', '1/6', '1/3', 'WHY.bigBottom'],
  ['Which is bigger, 2/3 or 2/8?', '2/3', '2/8', 'WHY.bigBottom'],
  ['Which is smaller, 4/6 or 4/8?', '4/8', '4/6', 'WHY.bigBottom'],
  ['Quick review · Unit fraction size: Which part is bigger, 1/4 or 1/6?', '1/4', '1/6', 'WHY.bigBottom'],
  // Same bottom number: the pieces match, so count the pieces.
  ['Which is bigger, 4/6 or 2/6?', '4/6', '2/6', 'WHY.sameSizeCount'],
  ['Which is smaller, 2/6 or 5/6?', '2/6', '5/6', 'WHY.sameSizeCount'],
  // Different top and bottom, and a decimal beside a fraction.
  ['Which is bigger, 5/8 or 1/2?', '5/8', '1/2', 'WHY.sizeAndCount'],
  ['Which is bigger, 0.8 or 5/10?', '0.8', '5/10', 'WHY.sameWay'],
  // "They are equal" and "You can't tell" get the reason that fits these two numbers.
  ['Which is bigger, 1/4 or 1/6?', '1/4', 'They are equal', 'WHY.sameCountSizes'],
  ['Which is bigger, 2/3 or 2/8?', '2/3', 'They match', 'WHY.sameCountSizes'],
  ['Which is bigger, 4/6 or 2/6?', '4/6', 'They are equal', 'WHY.sameSizeCounts'],
  ['Which is smaller, 1/3 or 2/3?', '1/3', 'They match', 'WHY.sameSizeCounts'],
  ['Which is bigger, 5/8 or 1/2?', '5/8', 'They are equal', 'WHY.bothDiffer'],
  ['Which is bigger, 0.8 or 5/10?', '0.8', 'They are equal', 'WHY.sameWay'],
  ['Which is bigger, 1/4 or 1/6?', '1/4', "You can't tell", 'WHY.canTellSize'],
  ['Which is bigger, 4/6 or 2/6?', '4/6', "You can't tell", 'WHY.canTellSize'],
  ['Which is bigger, 0.8 or 5/10?', '0.8', "You can't tell", 'WHY.sameWay'],
  // The top number counts, the bottom number sizes.
  ['Which has bigger parts, 1/6 or 5/6?', 'The parts are the same size', '5/6', 'WHY.topCounts'],
  ['Which has bigger parts, 1/6 or 5/6?', 'The parts are the same size', '1/6', 'WHY.topCounts'],
  // The two are equal (practice-bank questions): look at the size of the parts and how many there are.
  ['Which is bigger, 8/12 or 2/3?', 'They are equal', '8/12', 'WHY.sizeAndCount'],
  ['Which is bigger, 1/2 or 6/12?', 'They are equal', '1/2', 'WHY.sizeAndCount'],
  // 2. The specific slip beats the general counting sentences when the question is not a shading count.
  ['What is 1/3 + 1/6?', '3/6', '3/9', 'WHY.addedBottoms'],
  ['What is 1/2 − 1/3?', '1/6', '1/5', 'WHY.addedBottoms'],
  ['5/6 − 1/3 = ?', '3/6', '3/9', 'WHY.addedBottoms'],
  ['A board is 1/3 meter. Another is 1/6 meter. How long are they together?', '3/6 meter', '3/9 meter', 'WHY.addedBottoms'],
  ['A recipe uses 3/6 cup, then 3/6 cup more. How much in all?', '6/6 cup', '6/12 cup', 'SLIPS.addTops'],
  ['2/6 of a garden is planted. Then 3/6 more is planted. How much is still empty?', '1/6', '1/12', 'WHY.sameBottom'],
  ['Cut every half into 2 equal spaces. What is 1 new space?', '1/4', '1/3', 'SLIPS.recountParts'],
  ['0 to 1 has 6 equal spaces. What is 1 jump?', '1/6', '1/7', 'WHY.ticks'],
  ['1/8 + 1/2 = ?', '5/8', '4/8', 'WHY.oneAmount'],
  ['5/6 − 1/2 = ?', '2/6', '3/6', 'WHY.takenAmount'],
  ['Which of these fractions is less than 1 whole?', '2/3', '3/2', 'WHY.notLess'],
  ['Write 4 × 1/3 as one fraction.', '4/3', '4/7', 'WHY.onlyTop'],
  ['2 loaves are shared fairly by 3 friends. How much does each friend get?', '2/3 loaf', '2/5 loaf', 'WHY.addedForShare'],
  ['2 loaves are shared fairly by 3 friends. How much does each friend get?', '2/3 loaf', '3/2 loaves', 'WHY.shareFlip'],
  ['1 loaf is shared fairly by 4 friends. How much does each friend get?', '1/4 loaf', '4/1 loaves', 'WHY.shareFlip'],
  ['A bag has 12 marbles. 7 are green. What is the chance of picking green?', '7/12', '7/19', 'WHY.countOnce'],
  ['Which is the same as 1/3?', '2/6', '6/2', 'WHY.upsideDown'],
  ['Write 1/4 as a decimal.', '0.25', '1.4', 'WHY.decSideBySide'],
  ['Write 3/10 as a decimal.', '0.3', '3.0', 'WHY.decWhole'],
  ['What is 1/3 of 1/3?', '1/9', '2/6', 'WHY.addedAcross'],
  // ...and where the sentence is about something else, the true specific one is written for it.
  ['Which fraction is one whole?', '3/3', '3/6', 'WHY.allPartsWhole'],
  ['1/4 + ? = 1. What is the missing part?', '3/4', '2/4', 'WHY.notYetWhole'],
  ['1/4 + ? = 1. What is the missing part?', '3/4', '4/4', 'WHY.addedWhole'],
  ['1/4 + ? = 1. What is the missing part?', '3/4', '1/4', 'WHY.sameAgain'],
  ['To find 3/4 − 3/8, the parts must match. What is 3/4 in eighths?', '6/8', '7/8', 'WHY.addedSame'],
  ['To find 3/4 − 3/8, the parts must match. What is 3/4 in eighths?', '6/8', '3/8', 'WHY.keptTop'],
  ['Halves and sixths are different sizes. Rename 1/2 as sixths.', '3/6', '6/3', 'WHY.upsideDown'],
  ['Halves and sixths are different sizes. Rename 1/2 as sixths.', '3/6', '1/6', 'WHY.keptTop'],
  // The shading-count questions keep the counting sentences, which are true there.
  ['A shape has 9 equal parts. 1 is colored. What fraction is colored?', '1/9', '9/1', 'SLIPS.flipped'],
  ['A shape has 9 equal parts. 1 is colored. What fraction is colored?', '1/9', '1/8', 'SLIPS.recountParts'],
  ['A shape has 3 equal parts. 1 is colored. What fraction is colored?', '1/3', '1/4', 'SLIPS.allParts'],
  ['This hexagon is on a classroom poster. What fraction of the hexagon is colored?', '1/6', '2/6', 'SLIPS.recountShaded'],
  // 3. Find the whole: one part is not the whole.
  ["6 stickers are 3/4 of Ana's stickers. How many stickers does Ana have?", '8', '2', 'WHY.onePartOnly'],
  ['Tom read 8 pages. That is 2/3 of his book. How many pages are in the book?', '12', '4', 'WHY.onePartOnly'],
  ['A piece of ribbon is 6 meters long. It is 2/5 of the whole ribbon. How many meters long is the whole ribbon?', '15 meters', '3 meters', 'WHY.onePartOnly'],
  ["6 stickers are 3/4 of Ana's stickers. How many stickers does Ana have?", '8', '24', 'WHY.onePartFirst'],
  // The "just one group" reason stays true for a part of a group.
  ['What is 2/3 of 12?', '8', '4', 'WHY.oneGroup'],
  // A generic "number from the question" gets the real slip where one exists.
  ['What is 1/4 of 12 toy cars?', '3 cars', '4 cars', 'WHY.splitDenominator'],
  ['A fence is 20 meters long. How long is 1/4 of it?', '5 meters', '4 meters', 'WHY.splitDenominator'],
];

describe('the exact reason for a wrong tap', () => {
  for (const [prompt, right, pick, key] of TABLE) {
    it(`${prompt} -> ${pick}: ${key}`, () => expectKey(prompt, right, pick, key));
  }

  it('says the bottom-number idea in kid words, with no digit and no answer given away', () => {
    assert.match(WHY.bigBottom, /More equal parts make each part smaller/);
    assert.match(WHY.bigBottom, /bigger bottom number is not a bigger fraction/);
    for (const key of ['bigBottom', 'sameSizeCount', 'sameCountSizes', 'sameSizeCounts', 'bothDiffer', 'sizeAndCount', 'canTellSize', 'sameWay',
      'topCounts', 'allPartsWhole', 'notYetWhole', 'onePartOnly', 'addedBottoms'] as const) {
      const sentence = WHY[key];
      assert.ok(sentence, `${key} exists`);
      assert.doesNotMatch(sentence, /\d/, `${key} has a digit`);
      assert.doesNotMatch(sentence, /\b(?:bigger|smaller) (?:one|fraction) is\b|\bthe (?:right|correct) answer\b/i, `${key} names the answer`);
    }
  });

  const GENERIC = new Set<string | null>([null, SLIPS.tooSmall, SLIPS.tooBig, SLIPS.notSame, SLIPS.canTell]);
  const questions = MISSIONS.flatMap((m) => [...m.questions, ...(m.ideaQuestions ?? [])]);
  const wrongChoices = questions.flatMap((q) => q.choices.flatMap((choice, i) => i === q.correctChoice ? [] : [{ q, choice, i }]));
  const reasonOf = ({ q, i }: { q: (typeof questions)[number]; i: number }) => wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i);
  const isWhichBigger = (prompt: string) => {
    const p = prompt.replace(/^Quick review · [^:]+: /, '');
    return /\bwhich\b/i.test(p) && /\b(?:bigger|biggest|smaller|smallest|greater|larger)\b/i.test(p) && !/\border\b/i.test(p);
  };

  it('never falls back to a generic reply on a which-is-bigger or which-is-smaller question', () => {
    const which = wrongChoices.filter(({ q }) => isWhichBigger(q.prompt));
    assert.ok(which.length >= 50, `only ${which.length} wrong choices on which-is-bigger questions`);
    const generic = which.filter((w) => GENERIC.has(reasonOf(w)));
    assert.equal(generic.length, 0, generic.slice(0, 5).map((w) => `${w.q.prompt} / ${w.choice}`).join('; '));
  });

  it('does the same for the "Practice more" which-is-bigger questions, equal pairs included', () => {
    let checked = 0;
    const generic: string[] = [];
    for (const m of MISSIONS) {
      const ids = m.questions.map((q) => q.id);
      for (let seed = 1; seed <= 12; seed++) for (const q of generateQuestions(m.id, ids, seed * 7919 + 5, 12)) {
        if (!isWhichBigger(q.prompt)) continue;
        q.choices.forEach((choice, i) => {
          if (i === q.correctChoice) return;
          checked++;
          if (GENERIC.has(wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i))) generic.push(`${q.prompt} / ${choice}`);
        });
      }
    }
    assert.ok(checked >= 300, `only ${checked} generated wrong choices`);
    assert.deepEqual(generic.slice(0, 5), []);
  });

  it('gives more wrong choices a specific reason than before (63.9 percent had a reason, about 55.8 a specific one)', () => {
    const generic = new Set<string | null>([SLIPS.notSame, SLIPS.canTell, WHY.justNumber, SLIPS.recountShaded, SLIPS.recountParts]);
    const reasons = wrongChoices.map(reasonOf);
    const said = reasons.filter(Boolean).length / reasons.length;
    const specific = reasons.filter((r) => r && !generic.has(r)).length / reasons.length;
    assert.ok(said >= 0.639, `${(said * 100).toFixed(1)}% have a reason`);
    assert.ok(specific >= 0.58, `${(specific * 100).toFixed(1)}% have a specific reason`);
  });

  it('keeps the general counting sentences for shading questions and drops them from the rest', () => {
    // "parts plus shaded" is only true where a child counts shaded and total parts in a picture.
    for (const w of wrongChoices) {
      const reason = reasonOf(w);
      if (reason === SLIPS.allParts) assert.match(w.q.prompt, /shaded|colou?red|equal (?:parts|tiles|pieces)|friends share|loaves/i, `${w.q.id}: ${w.q.prompt} / ${w.choice}`);
    }
  });
});
