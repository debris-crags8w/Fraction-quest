import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS } from './game';
import { FITTED_REASONS, MORE_REASON_IDEAS, REASON_IDEAS, getBuildChecks, getBuildPracticeChecks, getReviewCheck, type BuildCheck } from './learning-content';
import { REASON_SLIPS } from './reason-slips';

/* Every Build it "Which idea explains why?" item, in every lesson: the three steps, six sets of extra builds and three
   review rounds. The keyed right reason must be true for the item's own numbers, and no wrong reason may be.

   Most reasons are a general rule that is true (a lesson's key idea: "Equal parts first, then shade") or false (a real
   slip: "Add the denominators too") whatever the numbers; those were read by hand against every item. The reasons below
   make a claim about the item itself ("past one", "two places", "rename"), so a rule says when each one is true. */
type Judge = (check: BuildCheck, lesson: string) => boolean;
const fractions = (text: string) => [...text.matchAll(/(\d+)\/(\d+)/g)].map((m) => ({ n: Number(m[1]), d: Number(m[2]) }));
const mixed = (text: string) => [...text.matchAll(/(\d+) (\d+)\/(\d+)/g)].map((m) => ({ w: Number(m[1]), n: Number(m[2]), d: Number(m[3]) }));
const pastOne: Judge = (c) => c.target.n > c.target.d;
// Two amounts cut into different parts, so one must be renamed first.
const unlike: Judge = (c) => new Set(fractions(c.prompt).map((f) => f.d)).size >= 2;
const tenthsAndHundredths: Judge = (c) => /\b\d+\/10\b/.test(c.prompt) && /\b\d+\/100\b/.test(c.prompt);
const addsMixed: Judge = (c) => mixed(c.prompt).length >= 1 && /\+|\bthen\b.+\bmore\b|\bAdd\b/.test(c.prompt);
// "2 1/4 − 1 3/4": the parts taken are more than the parts there, so a whole is traded for parts.
const tradesWhole: Judge = (c) => { const [a, b] = mixed(c.prompt); return !!a && !!b && a.d === b.d && a.n < b.n; };
const factor = (c: BuildCheck, lesson: string) => {
  if (lesson === 'multiplication-scaling') return c.target.n / c.target.d;
  const said = /^Make (\d+)\/(\d+) ×/.exec(c.prompt);
  return lesson === 'bigger-or-smaller' && said ? Number(said[1]) / Number(said[2]) : null;
};
const scales = (want: 'less' | 'same' | 'more'): Judge => (c, lesson) => {
  const f = factor(c, lesson);
  return f !== null && (f < 1 ? 'less' : f > 1 ? 'more' : 'same') === want;
};
const unitPart: Judge = (c) => c.target.n === 1;
const RULES: Record<string, Judge> = {
  // Past one whole.
  'Keep jumping past one whole': pastOne, 'The jumps go on past 1': pastOne, 'Extra parts go past one whole': pastOne,
  'More parts than one whole': pastOne, 'Fill one whole, then keep going': pastOne,
  'Wholes plus the leftover parts': (c) => c.target.n > c.target.d && c.target.n % c.target.d !== 0,
  // A build that ends at or before 1 really does stop at one.
  'The line stops at one': (c) => c.target.n <= c.target.d,
  // Decimal places.
  'Two places after the point: hundredths': (c) => c.target.d === 100,
  'Tenths take one decimal place': (c) => c.target.d === 10,
  'Change tenths into hundredths first': tenthsAndHundredths, 'Make both hundredths, then add': tenthsAndHundredths,
  // Renaming is needed only when the parts differ.
  'Make the parts match first': unlike, 'Rename so the parts match': unlike, 'Rename, then add the numerators': unlike,
  'Rename, then take away': unlike, 'Rename the parts to match': unlike, 'Same-size parts, then solve': unlike,
  'Rename to match, then compare': unlike, 'Make the parts the same size': unlike, 'Match the parts, then order': unlike,
  'Rename, then count the parts': unlike,
  // Mixed numbers.
  'Add wholes, then parts': addsMixed, 'Add parts and wholes': addsMixed, 'Wholes together, parts together': addsMixed,
  'Turn wholes into parts first': tradesWhole, 'Trade a whole for parts': tradesWhole, 'Break a whole into parts': tradesWhole,
  // Adding or taking away.
  'Add numerators and keep the denominator': (c) => /\+|\bAdd\b/.test(c.prompt),
  'Same parts: add the numerators': (c) => /\+|\bAdd\b/.test(c.prompt),
  'Subtract numerators and keep the denominator': (c) => /−|\bCut off\b|\bPour out\b/.test(c.prompt),
  'Same parts: take away numerators': (c) => /−|\bCut off\b|\bPour out\b/.test(c.prompt),
  'Keep the denominator the same': (c) => /(\d+)\/(\d+) [+−] \d+\/\2\b|\d+ × \d+\/\d+/.test(c.prompt),
  'Only the numerators change': (c) => /(\d+)\/(\d+) [+−] \d+\/\2\b|\d+ × \d+\/\d+/.test(c.prompt),
  // Filling to one whole: the item completes a whole.
  'Fill up to one whole': (c) => /\+ \? = 1\b|not painted|\bleft\b/.test(c.prompt) || c.target.n === c.target.d,
  // One part, one group.
  'One equal part of the whole': unitPart, 'One group of the equal groups': unitPart, 'A unit fraction is 1 part': unitPart, 'Numerator 1 means one part': unitPart,
  // Line plots, measuring.
  'Longest minus shortest': (c) => /shortest/.test(c.prompt) && /longest/.test(c.prompt) && /difference/.test(c.prompt),
  'Find both ends, then subtract': (c) => /shortest/.test(c.prompt) && /longest/.test(c.prompt) && /difference/.test(c.prompt),
  'Subtract the shortest from the longest': (c) => /shortest/.test(c.prompt) && /longest/.test(c.prompt) && /difference/.test(c.prompt),
  'Count eighths from zero': (c) => c.target.d === 8,
  'Count inches in each foot': (c) => /\bf(?:oo|ee)t\b/.test(c.prompt) && /\binch/.test(c.prompt),
  'Count one whole only': (c) => /\bfill 1 cup\b/.test(c.prompt),
  // Scaling: the factor against 1. "Always" rules are true only where the item happens to agree, so never a wrong pick there.
  'Part of a group is less': scales('less'), 'Less than 1 makes it less': scales('less'), 'Multiplying always makes it smaller': scales('less'),
  'Times 1 keeps it the same': scales('same'), 'The size stays the same': scales('same'),
  'More than 1 makes it more': scales('more'), 'Multiplying always makes it bigger': scales('more'), 'A fraction of it is more': scales('more'), 'Bigger numbers always win': scales('more'),
  // Sharing or fitting.
  'Sharing makes smaller shares': (c) => /^Share\b/.test(c.prompt),
  'Dividing always makes it smaller': (c, lesson) => lesson === 'share-or-fit' && /^Share\b/.test(c.prompt),
  'Fitting counts how many pieces': (c) => /^How many .+ (?:fill|fit)\b/.test(c.prompt),
  // Recipes: doubling or n batches.
  'Doubling adds the amount again': (c) => /\bDouble it\b|\b2 batches\b/.test(c.prompt),
  'Add the amount to itself': (c) => /\bDouble it\b|\b2 batches\b/.test(c.prompt),
  'Two batches: twice as much': (c) => /\bDouble it\b|\b2 batches\b/.test(c.prompt),
  'Add one amount per batch': (c) => /\b\d+ batches\b/.test(c.prompt),
  // Each dime does add ten hundredths: true, so it can never be offered as a mistake.
  'Add ten for every dime': () => true,
};

function everyBuild(lesson: string): { where: string; check: BuildCheck }[] {
  return [
    ...getBuildChecks(lesson).map((check) => ({ where: check.id, check })),
    ...[0, 1, 2, 3, 4, 5].flatMap((batch) => getBuildPracticeChecks(lesson, batch).map((check) => ({ where: `extra set ${batch + 1}`, check }))),
    ...[0, 1, 2].map((round) => ({ where: `review ${round + 1}`, check: getReviewCheck(lesson, round) })),
  ];
}

describe('Build it reasons are true for their own item', () => {
  it('keys a right reason true for every build’s numbers and offers no wrong reason that is true', () => {
    const bad: string[] = []; const seen = new Set<string>();
    for (const { id } of MISSIONS) for (const { where, check } of everyBuild(id)) {
      seen.add(id + check.prompt + check.reasons[check.correctReason]);
      const right = check.reasons[check.correctReason]!;
      if (RULES[right] && !RULES[right](check, id)) bad.push(`${id} ${where}: "${check.prompt}" is keyed "${right}", false here`);
      check.reasons.forEach((reason, i) => {
        if (i !== check.correctReason && RULES[reason]?.(check, id)) bad.push(`${id} ${where}: "${check.prompt}" offers "${reason}" as wrong, but it is true here`);
      });
    }
    assert.ok(seen.size >= 1900, `expected every build (about 1,906 different ones), got ${seen.size}`);
    assert.deepEqual([...new Set(bad)], []);
  });
  it('never asks to add, take away or walk a zero amount ("then 0/3 mile more")', () => {
    const zero = new Set<string>();
    for (const { id } of MISSIONS) for (const { check } of everyBuild(id)) if (/(?<![\d./])0\/\d+/.test(check.prompt)) zero.add(`${id}: ${check.prompt}`);
    assert.deepEqual([...zero], []);
  });
  it('takes every reason from the hand-checked lists, so a new reason needs a look (and a rule if it depends on the numbers)', () => {
    for (const { id } of MISSIONS) {
      const rights = new Set([REASON_IDEAS[id], ...(MORE_REASON_IDEAS[id] ?? []), ...FITTED_REASONS.right]);
      const wrongs = new Set([...(REASON_SLIPS[id] ?? []), ...FITTED_REASONS.wrong]);
      for (const { where, check } of everyBuild(id)) check.reasons.forEach((reason, i) => {
        const from = i === check.correctReason ? rights : wrongs;
        assert.ok(from.has(reason), `${id} ${where}: "${reason}" is not from the lesson's checked reasons`);
      });
    }
  });
});
