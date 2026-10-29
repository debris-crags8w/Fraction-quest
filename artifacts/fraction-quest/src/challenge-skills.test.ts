/* Skill guard for the Unit challenges. teach-extras.test.ts already checks their VOCABULARY (no word or sign before the
   lesson that teaches it). This file checks the SKILLS: a unit's challenge only asks what a lesson of that unit, or an
   earlier one, has taught. Each skill below is a pattern for how a puzzle shows it, plus the lessons that teach it
   (the unit of the earliest one is the earliest a puzzle may ask it). It also checks that a puzzle's standard tags are
   true to what it asks.

   What it reads: each puzzle's question, its explanation and the right choice, and each step's question and right choice.
   What it cannot see: a skill told only in plain words with no number pattern (for example "she pours out what Mia
   poured" with unlike parts), wrong choices (they are checked for vocabulary only), and a skill a picture needs that has
   no figure rule (bars and the fold picture). A puzzle that passes is not proof it is taught; a puzzle that fails
   always needs a lesson or a rewording. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHALLENGES, type ChallengeFigure, type ChallengeQuestion } from './challenges';
import { MISSIONS } from './game';
import { FRACTION_STANDARDS, MISSION_STANDARDS } from './standard-catalog';

const lesson = (id: string) => {
  const found = MISSIONS.find((mission) => mission.id === id);
  assert.ok(found, `${id} is a lesson`);
  return found;
};
const unitOf = (puzzle: ChallengeQuestion) => Number(/^u(\d+)-/.exec(puzzle.id)![1]);

type Frac = { n: number; d: number };
const FRACTION = /\b(\d+)\/(\d+)\b/g;
const fractionsIn = (text: string): Frac[] => [...text.matchAll(FRACTION)].map((match) => ({ n: Number(match[1]), d: Number(match[2]) }));
const PART_NAMES = 'halves|thirds?|fourths?|fifths?|sixths?|eighths?|tenths?|twelfths?';
const same = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;
const isHalf = (f: Frac) => f.n * 2 === f.d;

type Skill = {
  name: string;
  /** The lessons that teach it. A puzzle may ask it from the unit of the earliest of them. */
  taughtBy: string[];
  /** Does this sentence need the skill? `item` is the puzzle it belongs to. */
  asks: (text: string, item: ChallengeQuestion) => boolean;
};
const matches = (...patterns: RegExp[]) => (text: string) => patterns.some((pattern) => pattern.test(text));

const SKILLS: Skill[] = [
  // "1/4 of 12", "1/3 of them", "12 in 4 equal groups": a fraction of a group of things is lesson 53 (called grade 5 in the standards map).
  { name: 'a fraction of a group', taughtBy: ['sets-unit-fractions'],
    asks: matches(/\b\d+\/\d+ of (?:\d+|them|those|the rest)\b/i, /\b\d+ in \d+ (?:equal )?groups\b/i) },
  // "6 marbles are 1/4 of a bag. How many in the bag?", "3 fifths is 12. What is 1 fifth?": find the whole from a part (lesson 78).
  { name: 'find the whole from a part', taughtBy: ['find-the-whole'],
    asks: matches(/\b\d+ [a-z]+ (?:is|are) \d+\/\d+ of (?:a|the|it)\b/i, /\bThat is \d+\/\d+ of the\b/, /\b\d+\/\d+ of (?:a|the) [a-z ]+? (?:is|are) \d+/i,
      /\bhow (?:long|many|much|big)\b[^?.]*\bthe whole\b/i, /\bhow many\b[^?.]* there in all\b/i,
      new RegExp(`\\b\\d+ (?:${PART_NAMES}) (?:is|are) \\d+\\b(?!\\/|\\.\\d)`, 'i')) },
  // "in simplest form", or a picture of 8 of 12 whose answer is 2/3 (see the picture rule below).
  { name: 'simplifying a fraction', taughtBy: ['simplify-fractions'],
    asks: matches(/\bsimplest form\b|\blowest terms\b|\bsimplif|\bdivide the numerator and denominator\b/i) },
  // "3/4 = 6/8", "Write 3/4 in eighths", "the same as 1/3": naming one amount with another fraction. Half is taught earlier (lesson 7: half of the parts).
  { name: 'renaming a fraction (equivalent fractions)', taughtBy: ['equivalent-models', 'build-equivalents'],
    asks: (text) => [...text.matchAll(/\b(\d+)\/(\d+) = (\d+)\/(\d+)\b/g)].some((m) => {
      const a = { n: Number(m[1]), d: Number(m[2]) }; const b = { n: Number(m[3]), d: Number(m[4]) };
      return same(a, b) && !(a.n === b.n && a.d === b.d) && !isHalf(a) && !isHalf(b);
    }) || new RegExp(`\\b(?:Write|Change) \\S+(?: and \\S+)? (?:in|to) (?:${PART_NAMES})\\b`, 'i').test(text)
      || /\bthe same as \d+\/\d+/i.test(text) && !/\bthe same as 1\/2\b/i.test(text) },
  // "Use twelfths", "Use 40ths": a common denominator to compare or add unlike fractions (lesson 41).
  { name: 'a common denominator', taughtBy: ['compare-unlike-fractions'], asks: matches(new RegExp(`\\bUse (?:${PART_NAMES}|\\d+ths)\\b`, 'i')) },
  // "1/2 + 1/3": adding or taking away fractions with different denominators (lesson 49).
  { name: 'adding or subtracting unlike fractions', taughtBy: ['add-unlike-fractions'],
    asks: (text) => [...text.matchAll(/\d+\/\d+(?: [+−] \d+\/\d+)+/g)].some((sum) => {
      const bottoms = new Set(fractionsIn(sum[0]).map((f) => f.d));
      // Tenths with hundredths (3/10 + 25/100) is lesson 35, which unit 8 teaches.
      return bottoms.size > 1 && !(bottoms.size === 2 && bottoms.has(10) && bottoms.has(100));
    }) },
  // "3 × 2/3", "3/4 × 5": a whole number times a fraction (lesson 37).
  { name: 'a whole number times a fraction', taughtBy: ['unit-fraction-multiples', 'multiply-whole-by-fraction'], asks: matches(/\b\d+ × \d+\/\d+|\d+\/\d+ × \d+\b(?!\/)/) },
  // "3/4 × 2/3", "3/4 of 2/3", "half of 3/4": a fraction of a fraction (lesson 56).
  { name: 'a fraction times a fraction', taughtBy: ['multiply-fractions'], asks: matches(/\d+\/\d+ × \d+\/\d+|\d+\/\d+ of \d+\/\d+|\bhalf of \d+\/\d+/i) },
  // "How many cups can you fill?", "How many 1/3 cups fill 4 cups?" with fractions: how many fit (lesson 70).
  { name: 'how many fit (dividing by a fraction)', taughtBy: ['divide-whole-by-unit-fraction'],
    asks: (text) => /\d+\/\d+/.test(text) && (/\bhow many (?:whole )?\S+(?: \S+)? (?:can|could|will)\b/i.test(text) || /\bhow many \d+\/\d+[^?]* (?:fill|fit)\b/i.test(text)) },
  // "1/2 of a pizza is shared by 4 friends": sharing a fraction (lesson 69).
  { name: 'sharing a fraction', taughtBy: ['unit-fraction-divided-whole'], asks: matches(/\d+\/\d+[^.?]*\bshared?\b|\bshared?\b[^.?]*\d+\/\d+/i) },
  // "more than 1/2", "closest to 1": the half and whole benchmarks (lesson 7).
  { name: 'benchmarks (half, 0 and 1)', taughtBy: ['benchmark-half'], asks: matches(/\b(?:more|less) than 1\/2\b|\b(?:closest|closer) to (?:0|1|1\/2)\b|\bshort of 1\b|\bhalf full\b/i) },
  // "Which is bigger", "put in order": comparing sizes (lesson 5).
  { name: 'comparing fraction sizes', taughtBy: ['unit-size'], asks: matches(/\b(?:bigger|biggest|smaller|smallest|more than|less than|in order)\b/i) },
  // "1 1/2 + 2 1/2", "3 1/4 − 1 3/4": adding or subtracting mixed numbers (lessons 28 and 29).
  { name: 'adding or subtracting mixed numbers', taughtBy: ['add-mixed-numbers', 'subtract-mixed-numbers'], asks: matches(/\d+ \d+\/\d+ [+−] \d+ \d+\/\d+/) },
  // A fraction over 1 ("9/8"): fractions beyond one (lesson 12).
  { name: 'a fraction beyond one', taughtBy: ['number-line-beyond-one'], asks: (text) => fractionsIn(text).some((f) => f.n > f.d) },
];

/** Skills a picture needs: a number line (lesson 10) and a line plot (lesson 14). */
const FIGURE_SKILLS: Record<string, Pick<Skill, 'name' | 'taughtBy'>> = {
  line: { name: 'a number line', taughtBy: ['number-line-basics'] },
  lineplot: { name: 'a line plot', taughtBy: ['build-line-plots'] },
};

const firstUnit = (skill: Pick<Skill, 'taughtBy'>) => Math.min(...skill.taughtBy.map((id) => lesson(id).unit));

/** What a child reads or must work out: the question, the explanation and the right choice, and each step's question and right choice. */
const sentences = (puzzle: ChallengeQuestion): { where: string; text: string }[] => [
  { where: 'question', text: puzzle.prompt }, { where: 'right choice', text: puzzle.choices[puzzle.correct]! }, { where: 'explanation', text: puzzle.explanation },
  ...(puzzle.steps ?? []).flatMap((step, i) => [{ where: `step ${i + 1}`, text: step.prompt }, { where: `step ${i + 1} right choice`, text: step.choices[step.correct]! }]),
];

/** A picture of n of d equal parts whose right answer is a smaller fraction (8 of 12 shaded, answer 2/3) needs simplifying. */
function pictureNeedsSimplifying(puzzle: ChallengeQuestion): boolean {
  const figure: ChallengeFigure | undefined = puzzle.figure;
  if (figure?.kind !== 'grid' && figure?.kind !== 'dots') return false;
  const answer = /^(\d+)\/(\d+)$/.exec(puzzle.choices[puzzle.correct]!);
  if (!answer) return false;
  const total = figure.rows * figure.cols;
  return Number(answer[2]) !== total && Number(answer[1]) * total === figure.shaded.length * Number(answer[2]);
}

/** Skills a puzzle needs, with the sentence that shows it. */
function skillsNeeded(puzzle: ChallengeQuestion): { skill: Pick<Skill, 'name' | 'taughtBy'>; where: string; text: string }[] {
  const found: { skill: Pick<Skill, 'name' | 'taughtBy'>; where: string; text: string }[] = [];
  for (const { where, text } of sentences(puzzle)) for (const skill of SKILLS) if (skill.asks(text, puzzle)) found.push({ skill, where, text });
  if (pictureNeedsSimplifying(puzzle)) found.push({ skill: SKILLS.find((skill) => skill.name === 'simplifying a fraction')!, where: 'picture', text: 'the right answer is the shaded fraction in simplest form' });
  if (puzzle.figure && FIGURE_SKILLS[puzzle.figure.kind]) found.push({ skill: FIGURE_SKILLS[puzzle.figure.kind]!, where: 'picture', text: puzzle.figure.kind });
  return found;
}

const PUZZLES = Object.values(CHALLENGES).flat();

describe('unit challenge skills', () => {
  it('names real lessons for every skill, and a skill rule that finds what it should (the guard is checked too)', () => {
    for (const skill of [...SKILLS, ...Object.values(FIGURE_SKILLS)]) for (const id of skill.taughtBy) lesson(id);
    const asks = (name: string, text: string) => SKILLS.find((skill) => skill.name === name)!.asks(text, PUZZLES[0]!);
    assert.ok(asks('a fraction of a group', 'Ana eats 1/4 of 12 squares.'));
    assert.ok(asks('a fraction of a group', 'There are 20 apples. 1/4 of them are red.'));
    assert.ok(!asks('a fraction of a group', '1/2 of a pizza is shared by 4 friends.'));
    assert.ok(asks('find the whole from a part', '6 marbles are 1/4 of a bag. How many marbles are in the bag?'));
    assert.ok(asks('find the whole from a part', '1/4 of a toy train is 2 cars long. How long is the whole train?'));
    assert.ok(asks('find the whole from a part', '3 fifths is 12. What is 1 fifth?'));
    assert.ok(!asks('find the whole from a part', '3 tenths is 0.3.'));
    assert.ok(!asks('find the whole from a part', 'Each bar is one whole. How much is shaded in all?'));
    assert.ok(asks('renaming a fraction (equivalent fractions)', '3/4 = 6/8. 7/8 is more than 6/8.'));
    assert.ok(!asks('renaming a fraction (equivalent fractions)', 'Half of 6 is 3. So 3/6 = 1/2.'), 'half is taught in lesson 7');
    assert.ok(asks('adding or subtracting unlike fractions', 'What is 1/2 + 1/3?'));
    assert.ok(!asks('adding or subtracting unlike fractions', '3/8 + 4/8 = 7/8.'));
    assert.ok(asks('how many fit (dividing by a fraction)', 'Each cake needs 2/3 cup. How many whole cakes can Jo make?'));
    assert.ok(!asks('how many fit (dividing by a fraction)', 'A frog jumps 1/3 each time. How many jumps to get from 0 to 2?'));
    // A picture of 4 of 12 whose answer is 1/3 needs simplifying; 4 of 12 with the answer 4/12 does not.
    const dots = (answer: string): ChallengeQuestion => ({ id: 'u2-x', points: 3, prompt: '', choices: ['a', 'b', 'c', answer], correct: 3, explanation: '', figure: { kind: 'dots', rows: 3, cols: 4, shaded: [0, 1, 2, 3] } });
    assert.ok(pictureNeedsSimplifying(dots('1/3')));
    assert.ok(!pictureNeedsSimplifying(dots('4/12')));
  });

  it('only asks skills taught by the end of its unit', () => {
    const early: string[] = [];
    for (const puzzle of PUZZLES) {
      for (const { skill, where, text } of skillsNeeded(puzzle)) {
        if (firstUnit(skill) > unitOf(puzzle)) early.push(`${puzzle.id} (unit ${unitOf(puzzle)}): ${skill.name}, first taught in unit ${firstUnit(skill)} (${skill.taughtBy[0]}). ${where}: "${text}"`);
      }
    }
    assert.deepEqual(early, [], 'skills asked before a lesson teaches them');
  });

  it('tags each puzzle with a standard it really asks', () => {
    const catalogued = new Set<string>(FRACTION_STANDARDS.map((standard) => standard.id));
    const unitStandards = (unit: number) => new Set(MISSIONS.filter((mission) => mission.unit === unit).flatMap((mission) => mission.standards ?? []));
    // A unit challenge also revisits earlier units. Each such tag must come from a skill the puzzle really uses, or be listed here with its reason.
    const REVIEW: Record<string, string> = {
      'u2-p1': '3.NF.1: naming n of d equal parts on a picture, a review in the unit that teaches comparing',
      'u10-c5': '4.MD.2: a measurement story with fractions of a liter, from unit 9',
      'u13-c2': '4.NF.4b, 4.NF.4c: a fraction times a whole number in a story, from unit 9',
      'u14-p1': '4.NF.6: the unit teaches percent, which the catalog has no standard for; each percent puzzle carries the fraction or decimal standard it converts',
      'u14-c2': '4.NF.7, same', 'u14-c4': '4.NF.6, same',
    };
    const unjustified: string[] = [];
    for (const puzzle of PUZZLES) {
      const tags = puzzle.standards ?? [];
      for (const tag of tags) assert.ok(catalogued.has(tag), `${puzzle.id}: ${tag} is not a catalogued standard`);
      const fromSkills = new Set(skillsNeeded(puzzle).flatMap(({ skill }) => skill.taughtBy.flatMap((id) => MISSION_STANDARDS[id] ?? [])));
      const fromUnit = unitStandards(unitOf(puzzle));
      for (const tag of tags) {
        if (fromUnit.has(tag as never) || fromSkills.has(tag as never) || REVIEW[puzzle.id]?.includes(tag)) continue;
        unjustified.push(`${puzzle.id}: ${tag} is not a standard of unit ${unitOf(puzzle)}'s lessons or of a skill the puzzle uses`);
      }
    }
    assert.deepEqual(unjustified, []);
    // A listed review tag really is not otherwise justified (so the list cannot go stale).
    for (const id of Object.keys(REVIEW)) {
      const puzzle = PUZZLES.find((item) => item.id === id)!;
      const fromSkills = new Set(skillsNeeded(puzzle).flatMap(({ skill }) => skill.taughtBy.flatMap((lessonId) => MISSION_STANDARDS[lessonId] ?? [])));
      assert.ok((puzzle.standards ?? []).some((tag) => !unitStandards(unitOf(puzzle)).has(tag as never) && !fromSkills.has(tag as never)), `${id} no longer needs a review entry`);
    }
  });

  it('tags find-the-whole puzzles with the standard the catalog gives find-the-whole, and division puzzles are not tagged as a multiple of a unit fraction', () => {
    const wholeStandards = MISSION_STANDARDS['find-the-whole']!;
    const wrong: string[] = [];
    for (const puzzle of PUZZLES) {
      const needed = skillsNeeded(puzzle).map(({ skill }) => skill.name);
      const tags = puzzle.standards ?? [];
      if (needed.includes('find the whole from a part') && !wholeStandards.some((standard) => tags.includes(standard))) wrong.push(`${puzzle.id}: finds the whole but is tagged ${tags.join(', ')} (catalog: ${wholeStandards.join(', ')})`);
      if (needed.includes('how many fit (dividing by a fraction)') && tags.includes('4.NF.4a')) wrong.push(`${puzzle.id}: divides, so it is not 4.NF.4a (multiples of a unit fraction)`);
    }
    assert.deepEqual(wrong, []);
  });
});
